from pydantic import BaseModel


class HintRequest(BaseModel):
    submission_id: int | None = None
    problem: str = ""
    problem_url: str = ""
    code: str
    expected_output: str = ""
    expected_input: str = ""
    error_log: str = ""
    hint_level: int = 1
