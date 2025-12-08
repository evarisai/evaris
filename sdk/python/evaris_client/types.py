from typing import Any, Awaitable, Optional, Union, Callable
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum


class EvalStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"


class ObservationType(str, Enum):
    SPAN = "SPAN"
    GENERATION = "GENERATION"
    EVENT = "EVENT"


class TraceStatus(str, Enum):
    OK = "OK"
    ERROR = "ERROR"
    UNSET = "UNSET"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ComplianceFramework(str, Enum):
    ABC = "ABC"
    SOC2 = "SOC2"
    GDPR = "GDPR"
    EU_AI_ACT = "EU_AI_ACT"


class ComplianceStatus(str, Enum):
    COMPLIANT = "COMPLIANT"
    WARNING = "WARNING"
    VIOLATION = "VIOLATION"
    UNCHECKED = "UNCHECKED"


class TestCase(BaseModel):
    input: Union[str, dict[str, Any]]
    expected: Optional[Union[str, dict[str, Any]]] = None
    actual_output: Union[str, dict[str, Any]]
    context: Optional[Union[str, dict[str, Any]]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MetricScore(BaseModel):
    name: str
    score: float = Field(ge=0.0, le=1.0)
    passed: bool
    threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    reasoning: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class TestResultItem(BaseModel):
    id: str
    input: Union[str, dict[str, Any]]
    expected: Optional[Union[str, dict[str, Any]]] = None
    actual_output: Union[str, dict[str, Any]]
    context: Optional[Union[str, dict[str, Any]]] = None
    scores: list[MetricScore]
    passed: bool
    overall_score: Optional[float] = None
    latency_ms: Optional[float] = None
    token_count: Optional[int] = None
    cost: Optional[float] = None
    error: Optional[str] = None
    error_type: Optional[str] = None


class AssessmentSummary(BaseModel):
    total: int
    passed: int
    failed: int
    accuracy: float
    avg_latency_ms: Optional[float] = None
    total_cost: Optional[float] = None
    total_tokens: Optional[int] = None


class AssessmentResult(BaseModel):
    eval_id: str
    name: str
    status: EvalStatus
    progress: int = Field(default=0, ge=0, le=100)
    summary: Optional[AssessmentSummary] = None
    results: list[TestResultItem] = Field(default_factory=list)
    project_id: Optional[str] = None
    experiment_id: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    total_cost: Optional[float] = None


class AssessmentProgressEvent(BaseModel):
    eval_id: str
    progress: int = Field(ge=0, le=100)
    status: EvalStatus
    current_test: Optional[int] = Field(default=None, ge=0)
    total_tests: Optional[int] = Field(default=None, ge=0)
    current_result: Optional[TestResultItem] = None
    message: Optional[str] = None


class EvalConfig(BaseModel):
    """Configuration for the agent/model being evaluated."""
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    prompt: Optional[str] = None
    system_prompt: Optional[str] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None


class JudgeConfig(BaseModel):
    """Configuration for the LLM-as-Judge.

    The judge is separate from the agent being evaluated. By default, the judge
    uses OpenRouter for inference, which provides access to multiple models.

    Default model: anthropic/claude-3.5-sonnet (via OpenRouter)

    Environment variables:
        OPENROUTER_API_KEY: Required for OpenRouter inference
        EVARIS_JUDGE_MODEL: Override default judge model

    Example:
        judge_config = JudgeConfig(
            model="anthropic/claude-3.5-sonnet",
            temperature=0.0,  # Low temp for consistent judging
        )
    """
    model: str = "anthropic/claude-3.5-sonnet"
    temperature: float = 0.0
    max_tokens: int = 2048
    provider: str = "openrouter"
    reasoning_effort: Optional[str] = None


class Observation(BaseModel):
    span_id: str
    parent_span_id: Optional[str] = None
    type: ObservationType = ObservationType.SPAN
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None
    status: TraceStatus = TraceStatus.UNSET
    status_message: Optional[str] = None
    model: Optional[str] = None
    model_params: Optional[dict[str, Any]] = None
    input: Optional[Union[str, dict[str, Any]]] = None
    output: Optional[Union[str, dict[str, Any]]] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost: Optional[float] = None
    event_name: Optional[str] = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    events: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    children: list["Observation"] = Field(default_factory=list)


class TraceResult(BaseModel):
    trace_id: str
    name: str
    duration_ms: float
    observation_count: int
    total_tokens: Optional[int] = None
    total_cost: Optional[float] = None
    session_id: Optional[str] = None
    created_at: datetime


class LogResult(BaseModel):
    log_id: str
    created_at: datetime


class ComplianceRule(BaseModel):
    id: str
    name: str
    description: str
    status: ComplianceStatus
    score: Optional[float] = None
    passed: Optional[bool] = None
    evidence: Optional[str] = None
    reasoning: Optional[str] = None
    suggestion: Optional[str] = None


class ComplianceCheckResult(BaseModel):
    framework: ComplianceFramework
    status: ComplianceStatus
    score: float
    total_rules: int
    passed_rules: int
    warning_rules: int
    violation_rules: int
    rules: list[ComplianceRule]
    checked_at: datetime


class ExperimentConfig(BaseModel):
    name: str
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    parent_id: Optional[str] = None


class ExperimentResult(BaseModel):
    experiment_id: str
    name: str
    version: int
    project_id: str
    evals: list[AssessmentResult] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


ProgressCallback = Callable[[AssessmentProgressEvent], None]
AsyncProgressCallback = Callable[[AssessmentProgressEvent], Awaitable[None]]
