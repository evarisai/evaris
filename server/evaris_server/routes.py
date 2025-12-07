"""API routes for evaris-server internal endpoints."""

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from prisma import enums as prisma_enums
from prisma.fields import Json as PrismaJson
from prisma.types import EvalInclude, EvalWhereInput

from evaris_server.auth import InternalAuthContext, verify_internal_request
from evaris_server.db import Database, get_database
from evaris_server.runner import RunnerService
from evaris_server.schemas import (
    EvalListItem,
    EvalListResponse,
    EvalStatus,
    EvalSummary,
    EvaluateRequest,
    EvaluateResponse,
    HealthResponse,
    LogRequest,
    LogResponse,
    MetricScore,
    MetricSummary,
    TestResultOutput,
    TraceRequest,
    TraceResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check(db: Database = Depends(get_database)) -> HealthResponse:
    """Health check endpoint."""
    db_healthy = await db.health_check()

    return HealthResponse(
        status="ok" if db_healthy else "degraded",
        version="0.1.0",
        database="connected" if db_healthy else "disconnected",
    )


@router.post(
    "/internal/evaluate",
    response_model=EvaluateResponse,
    tags=["evaluate"],
    status_code=status.HTTP_201_CREATED,
)
async def run_evaluation(
    request: EvaluateRequest,
    auth: Annotated[InternalAuthContext, Depends(verify_internal_request)],
    db: Database = Depends(get_database),
) -> EvaluateResponse:
    """Run an evaluation with specified metrics."""
    runner = RunnerService(db=db)

    try:
        result = await runner.run_assessment(
            request=request,
            organization_id=auth.organization_id,
            project_id=auth.project_id,
            user_id=auth.user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}",
        )


@router.get(
    "/internal/evaluations",
    response_model=EvalListResponse,
    tags=["evaluate"],
)
async def list_evaluations(
    auth: Annotated[InternalAuthContext, Depends(verify_internal_request)],
    db: Database = Depends(get_database),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: EvalStatus | None = Query(default=None, alias="status"),
) -> EvalListResponse:
    """List evaluations for the authenticated organization/project."""
    async with db.with_org_context(auth.organization_id) as client:
        where: EvalWhereInput = {"projectId": auth.project_id}
        if status_filter:
            where["status"] = prisma_enums.EvalStatus(status_filter.value)

        total = await client.eval.count(where=where)

        evals = await client.eval.find_many(
            where=where,
            order={"createdAt": "desc"},
            skip=offset,
            take=limit,
        )

        evaluations = [
            EvalListItem(
                eval_id=e.id,
                organization_id=e.organizationId,
                project_id=e.projectId,
                name=e.name,
                status=EvalStatus(e.status),
                total=e.total,
                passed=e.passed,
                failed=e.failed,
                accuracy=e.accuracy,
                created_at=e.createdAt,
                completed_at=e.completedAt,
            )
            for e in evals
        ]

        return EvalListResponse(
            evaluations=evaluations,
            total=total,
            limit=limit,
            offset=offset,
        )


@router.get(
    "/internal/evaluations/{eval_id}",
    response_model=EvaluateResponse,
    tags=["evaluate"],
)
async def get_evaluation(
    eval_id: str,
    auth: Annotated[InternalAuthContext, Depends(verify_internal_request)],
    db: Database = Depends(get_database),
    include_results: bool = Query(default=True),
) -> EvaluateResponse:
    """Get a single evaluation by ID with full results."""
    async with db.with_org_context(auth.organization_id) as client:
        include: EvalInclude | None = {"testResults": include_results} if include_results else None

        evaluation = await client.eval.find_unique(
            where={"id": eval_id},
            include=include,
        )

        if not evaluation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evaluation {eval_id} not found",
            )

        if evaluation.projectId != auth.project_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evaluation {eval_id} not found",
            )

        summary = None
        if evaluation.summary:
            summary_data = (
                evaluation.summary
                if isinstance(evaluation.summary, dict)
                else json.loads(evaluation.summary)
            )
            metrics_summary = {}
            for name, data in summary_data.get("metrics", {}).items():
                metrics_summary[name] = MetricSummary(
                    accuracy=data.get("accuracy", 0),
                    avg_score=data.get("avg_score", data.get("mean", 0)),
                    min_score=data.get("min_score"),
                    max_score=data.get("max_score"),
                )
            summary = EvalSummary(
                total=evaluation.total or 0,
                passed=evaluation.passed or 0,
                failed=evaluation.failed or 0,
                accuracy=evaluation.accuracy or 0,
                avg_latency_ms=summary_data.get("avg_latency_ms"),
                metrics=metrics_summary,
            )

        results = None
        if include_results and hasattr(evaluation, "testResults") and evaluation.testResults:
            results = []
            for tr in evaluation.testResults:
                scores_data = (
                    tr.scores if isinstance(tr.scores, list) else json.loads(tr.scores or "[]")
                )
                scores = [
                    MetricScore(
                        name=s.get("name", ""),
                        score=s.get("score", 0),
                        passed=s.get("passed", False),
                        threshold=s.get("threshold", 0.5),
                        reasoning=s.get("reasoning"),
                        metadata=s.get("metadata", {}),
                    )
                    for s in scores_data
                ]
                results.append(
                    TestResultOutput(
                        id=tr.id,
                        input=tr.input,
                        expected=tr.expected,
                        actual_output=tr.actualOutput,
                        scores=scores,
                        passed=tr.passed,
                        latency_ms=tr.latencyMs,
                        error=tr.error,
                        metadata=cast(dict[str, Any], tr.metadata) if tr.metadata else {},
                    )
                )

        return EvaluateResponse(
            eval_id=evaluation.id,
            organization_id=evaluation.organizationId,
            project_id=evaluation.projectId,
            name=evaluation.name,
            status=EvalStatus(evaluation.status),
            summary=summary,
            results=results,
            created_at=evaluation.createdAt,
            completed_at=evaluation.completedAt,
            metadata=cast(dict[str, Any], evaluation.metadata) if evaluation.metadata else {},
        )


@router.post(
    "/internal/trace",
    response_model=TraceResponse,
    tags=["observability"],
    status_code=status.HTTP_201_CREATED,
)
async def store_trace(
    request: TraceRequest,
    auth: Annotated[InternalAuthContext, Depends(verify_internal_request)],
    db: Database = Depends(get_database),
) -> TraceResponse:
    """Store a trace with spans."""
    trace_id = f"trace_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    duration_ms = request.duration_ms
    if duration_ms is None and request.spans:
        duration_ms = sum(s.duration_ms or 0 for s in request.spans)

    try:
        async with db.with_org_context(auth.organization_id) as client:
            await client.trace.create(
                data={
                    "id": trace_id,
                    "traceId": trace_id,
                    "organizationId": auth.organization_id,
                    "rootSpanName": request.spans[0].name if request.spans else request.name,
                    "serviceName": "evaris-sdk",
                    "duration": int(duration_ms or 0),
                    "spanCount": len(request.spans),
                    "startTime": now,
                    "evalId": request.eval_id,
                }
            )

            span_count = await _create_spans(
                client=client,
                trace_id=trace_id,
                spans=request.spans,
                parent_span_id=None,
            )

        return TraceResponse(
            trace_id=trace_id,
            organization_id=auth.organization_id,
            project_id=auth.project_id,
            name=request.name,
            span_count=span_count,
            duration_ms=duration_ms,
            created_at=now,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store trace: {str(e)}",
        )


async def _create_spans(
    client,
    trace_id: str,
    spans: list,
    parent_span_id: str | None,
) -> int:
    """Recursively create spans in the database."""
    count = 0

    for span in spans:
        span_id = f"span_{uuid.uuid4().hex[:12]}"

        await client.span.create(
            data={
                "id": span_id,
                "spanId": span_id,
                "traceId": trace_id,
                "parentSpanId": parent_span_id,
                "operationName": span.name,
                "serviceName": "evaris-sdk",
                "startTime": 0,
                "duration": int(span.duration_ms or 0),
                "attributes": json.dumps(span.metadata) if span.metadata else "{}",
            }
        )
        count += 1

        if span.children:
            count += await _create_spans(
                client=client,
                trace_id=trace_id,
                spans=span.children,
                parent_span_id=span_id,
            )

    return count


@router.post(
    "/internal/log",
    response_model=LogResponse,
    tags=["observability"],
    status_code=status.HTTP_201_CREATED,
)
async def store_log(
    request: LogRequest,
    auth: Annotated[InternalAuthContext, Depends(verify_internal_request)],
    db: Database = Depends(get_database),
) -> LogResponse:
    """Store a log entry."""
    log_id = f"log_{uuid.uuid4().hex[:12]}"
    timestamp = request.timestamp or datetime.now(timezone.utc)

    try:
        async with db.with_org_context(auth.organization_id) as client:
            await client.log.create(
                data={
                    "id": log_id,
                    "organizationId": auth.organization_id,
                    "level": prisma_enums.LogLevel(request.level.value),
                    "source": request.source,
                    "agentId": request.agent_id,
                    "message": request.message,
                    "metadata": PrismaJson(request.metadata if request.metadata else {}),
                    "timestamp": timestamp,
                    "evalId": request.eval_id,
                }
            )

        return LogResponse(
            log_id=log_id,
            organization_id=auth.organization_id,
            project_id=auth.project_id,
            level=request.level,
            created_at=timestamp,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store log: {str(e)}",
        )
