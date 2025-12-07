from typing import Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class TestCase(BaseModel):
    input: str
    expected: Optional[str] = None
    actual_output: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class MetricScore(BaseModel):
    name: str
    score: float
    passed: bool
    reasoning: Optional[str] = None


class TestResultItem(BaseModel):
    input: str
    expected: Optional[str]
    actual_output: str
    scores: list[MetricScore]
    passed: bool
    latency_ms: Optional[float] = None


class AssessmentSummary(BaseModel):
    total: int
    passed: int
    failed: int
    accuracy: float
    avg_latency_ms: Optional[float] = None


class AssessmentResult(BaseModel):
    eval_id: str
    status: str
    summary: AssessmentSummary
    results: list[TestResultItem]
    created_at: datetime
    completed_at: Optional[datetime] = None


class Span(BaseModel):
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    input: Optional[dict[str, Any]] = None
    output: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    children: list["Span"] = Field(default_factory=list)


class TraceResult(BaseModel):
    trace_id: str
    name: str
    duration_ms: float
    span_count: int
    created_at: datetime


class LogResult(BaseModel):
    log_id: str
    created_at: datetime
