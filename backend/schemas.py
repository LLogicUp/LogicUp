from datetime import datetime
from pydantic import BaseModel


class HintResponse(BaseModel):
    submission_id: int
    hint_id: int
    hint_level: int
    explanation: str
    pseudocode: str
    error_categories: list[str]


class HistoryItem(BaseModel):
    hint_id: int
    submission_id: int
    source: str
    external_problem_id: str | None
    problem: str
    hint_level: int
    explanation: str
    pseudocode: str
    code_snippet: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    page: int
    limit: int
    total: int


class ProblemSummary(BaseModel):
    external_problem_id: str
    hint_count: int
    last_hint_at: datetime

    model_config = {"from_attributes": True}


class ProblemListResponse(BaseModel):
    items: list[ProblemSummary]


class SubmissionSummary(BaseModel):
    submission_id: int
    source: str
    external_problem_id: str | None
    problem_snippet: str
    hint_count: int
    last_hint_at: datetime

    model_config = {"from_attributes": True}


class SubmissionListResponse(BaseModel):
    items: list[SubmissionSummary]


class DirectProblemSummary(BaseModel):
    problem: str          # 필터 키로 사용하는 전체 텍스트
    problem_snippet: str  # 표시용 앞 80자
    hint_count: int
    last_hint_at: datetime

    model_config = {"from_attributes": True}


class DirectProblemListResponse(BaseModel):
    items: list[DirectProblemSummary]
