from datetime import datetime
from pydantic import BaseModel


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
