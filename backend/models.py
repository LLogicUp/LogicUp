from pydantic import BaseModel


class HintRequest(BaseModel):
    problem: str = ""           # 문제 설명 -> ""로 생략 가능
    problem_number: int = 0     # BOJ 문제 번호
    code: str                   # 사용자 코드
    expected_output: str = ""   # 정답 예시 출력 -> ""로 생략 가능
    expected_input: str = ""    # 정답 예시 입력 -> ""로 생략 가능
    error_log: str = ""         # 에러 메시지
    hint_level: int = 1         # 1: 오류 위치, 2: 관련 개념, 3: 의사코드
