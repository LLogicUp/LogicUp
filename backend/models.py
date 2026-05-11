from pydantic import BaseModel, Field


class HintRequest(BaseModel):
    submission_id: int | None = None
    problem: str = ""
    problem_url: str = ""
    language: str = "c"
    code: str = Field(..., max_length=100_000)
    expected_output: str = ""
    expected_input: str = ""
    error_log: str = ""
    hint_level: int = 1
