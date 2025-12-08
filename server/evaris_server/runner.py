"""Runner service - runs LLM judge and computes metrics."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from prisma import enums as prisma_enums
from prisma.fields import Json as PrismaJson

from evaris_server.config import Settings, get_settings
from evaris_server.db import Database
from evaris_server.schemas import (
    EvalStatus,
    EvalSummary,
    EvaluateRequest,
    EvaluateResponse,
    MetricScore,
    MetricSummary,
    TestCaseInput,
    TestResultOutput,
)

logger = logging.getLogger(__name__)


class RunnerService:
    """Service for running assessments using the evaris metrics engine."""

    def __init__(self, db: Database, settings: Settings | None = None):
        self.db = db
        self.settings = settings or get_settings()

    def _get_metric_instance(self, metric_name: str) -> Any:
        """Get a metric instance by name from the registry."""
        from evaris.core.registry import get_metric_registry

        registry = get_metric_registry()
        try:
            metric_class = registry.get(metric_name)
            return metric_class()
        except KeyError:
            raise ValueError(f"Unknown metric: {metric_name}")

    async def _run_metric(
        self,
        metric_name: str,
        metric: Any,
        test_case: TestCaseInput,
    ) -> MetricScore:
        """Run a single metric on a test case."""
        from evaris.types import TestCase as EvarisTestCase

        metadata = dict(test_case.metadata or {})
        if test_case.context is not None:
            metadata["context"] = test_case.context

        evaris_tc = EvarisTestCase(
            input=test_case.input,
            expected=test_case.expected,
            actual_output=test_case.actual_output,
            metadata=metadata,
        )

        try:
            result = await metric.a_measure(evaris_tc, test_case.actual_output)

            return MetricScore(
                name=metric_name,
                score=result.score,
                passed=result.passed,
                threshold=getattr(result, "threshold", 0.5),
                reasoning=result.metadata.get("reasoning"),
                reasoning_steps=result.metadata.get("reasoning_steps"),
                reasoning_type=result.metadata.get("reasoning_type"),
                metadata=result.metadata,
            )
        except Exception as e:
            return MetricScore(
                name=metric_name,
                score=0.0,
                passed=False,
                threshold=0.5,
                reasoning=f"Error: {str(e)}",
                metadata={"error": str(e)},
            )

    async def run_assessment(
        self,
        request: EvaluateRequest,
        organization_id: str,
        project_id: str,
        user_id: str,
    ) -> EvaluateResponse:
        """Run assessment and store results."""
        assessment_id = f"assessment_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        metrics = []
        for metric_name in request.metrics:
            try:
                metric = self._get_metric_instance(metric_name)
                metrics.append((metric_name, metric))
            except ValueError as e:
                logger.warning("Invalid metric requested: %s", e)

        if not metrics:
            raise ValueError("No valid metrics specified")

        results: list[TestResultOutput] = []
        metric_stats: dict[str, dict[str, Any]] = {
            name: {"scores": [], "passed": 0, "count": 0} for name, _ in metrics
        }

        for i, test_case in enumerate(request.test_cases):
            scores: list[MetricScore] = []

            for metric_name, metric in metrics:
                score = await self._run_metric(metric_name, metric, test_case)
                scores.append(score)

                metric_stats[metric_name]["scores"].append(score.score)
                metric_stats[metric_name]["count"] += 1
                if score.passed:
                    metric_stats[metric_name]["passed"] += 1

            all_passed = all(s.passed for s in scores)
            result_id = f"{assessment_id}_result_{i}"

            results.append(
                TestResultOutput(
                    id=result_id,
                    input=test_case.input,
                    expected=test_case.expected,
                    actual_output=test_case.actual_output,
                    scores=scores,
                    passed=all_passed,
                    metadata=test_case.metadata,
                )
            )

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed

        metrics_summary: dict[str, MetricSummary] = {}
        for name, stats in metric_stats.items():
            if stats["count"] > 0:
                scores_list = stats["scores"]
                avg_score = sum(scores_list) / len(scores_list)
                accuracy = stats["passed"] / stats["count"]

                std_dev = None
                if len(scores_list) > 1:
                    mean = avg_score
                    variance = sum((x - mean) ** 2 for x in scores_list) / len(scores_list)
                    std_dev = variance**0.5

                metrics_summary[name] = MetricSummary(
                    accuracy=accuracy,
                    avg_score=avg_score,
                    min_score=min(scores_list) if scores_list else None,
                    max_score=max(scores_list) if scores_list else None,
                    std_dev=std_dev,
                )

        summary = EvalSummary(
            total=total,
            passed=passed,
            failed=failed,
            accuracy=passed / total if total > 0 else 0.0,
            metrics=metrics_summary,
        )

        completed_at = datetime.now(timezone.utc)
        status = EvalStatus.PASSED if failed == 0 else EvalStatus.FAILED

        await self._store_assessment(
            assessment_id=assessment_id,
            organization_id=organization_id,
            project_id=project_id,
            dataset_id=request.dataset_id,
            name=request.name,
            status=status,
            summary=summary,
            results=results,
            metadata=request.metadata,
            created_at=now,
            completed_at=completed_at,
        )

        return EvaluateResponse(
            eval_id=assessment_id,
            organization_id=organization_id,
            project_id=project_id,
            name=request.name,
            status=status,
            summary=summary,
            results=results,
            created_at=now,
            completed_at=completed_at,
            metadata=request.metadata,
        )

    async def _store_assessment(
        self,
        assessment_id: str,
        organization_id: str,
        project_id: str,
        dataset_id: str | None,
        name: str,
        status: EvalStatus,
        summary: EvalSummary,
        results: list[TestResultOutput],
        metadata: dict[str, Any],
        created_at: datetime,
        completed_at: datetime | None,
    ) -> None:
        """Store assessment and results in the database using Prisma."""
        summary_dict = {
            "total": summary.total,
            "passed": summary.passed,
            "failed": summary.failed,
            "accuracy": summary.accuracy,
            "avg_latency_ms": summary.avg_latency_ms,
            "metrics": {
                name: {
                    "accuracy": ms.accuracy,
                    "avg_score": ms.avg_score,
                    "min_score": ms.min_score,
                    "max_score": ms.max_score,
                    "std_dev": ms.std_dev,
                }
                for name, ms in summary.metrics.items()
            },
        }

        # Map local enum to Prisma enum
        prisma_status = prisma_enums.EvalStatus(status.value)

        async with self.db.with_org_context(organization_id) as client:
            await client.eval.create(
                data={
                    "id": assessment_id,
                    "name": name,
                    "status": prisma_status,
                    "organizationId": organization_id,
                    "projectId": project_id,
                    "datasetId": dataset_id,
                    "total": summary.total,
                    "passed": summary.passed,
                    "failed": summary.failed,
                    "accuracy": summary.accuracy,
                    "summary": PrismaJson(summary_dict),
                    "metadata": PrismaJson(metadata if metadata else {}),
                    "completedAt": completed_at,
                }
            )

            for result in results:
                scores_data = [
                    {
                        "name": s.name,
                        "score": s.score,
                        "passed": s.passed,
                        "threshold": s.threshold,
                        "reasoning": s.reasoning,
                        "reasoning_steps": s.reasoning_steps,
                        "reasoning_type": s.reasoning_type,
                        "metadata": s.metadata,
                    }
                    for s in result.scores
                ]

                await client.testresult.create(
                    data={
                        "id": result.id,  # type: ignore[typeddict-item]
                        "evalId": assessment_id,
                        "input": PrismaJson(result.input),
                        "expected": PrismaJson(result.expected) if result.expected else None,
                        "actualOutput": PrismaJson(result.actual_output),
                        "scores": PrismaJson(scores_data),
                        "passed": result.passed,
                        "latencyMs": result.latency_ms,
                        "error": result.error,
                        "metadata": PrismaJson(result.metadata if result.metadata else {}),
                    }
                )
