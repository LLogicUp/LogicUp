import json
from fastapi import APIRouter
from models import HintRequest
from boj import fetch_boj_problem
from config import groq_client, logger
from prompts import SYSTEM_PROMPT, build_prompt

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "서버 정상 작동 중"}


@router.post("/hint")
def get_hint(request: HintRequest):
    if request.problem_number:
        boj = fetch_boj_problem(request.problem_number)  # 크롤링 이후 딕셔너리 반환
        problem = boj.get("problem", "")
        expected_input = boj.get("expected_input", "")
        expected_output = boj.get("expected_output", "")
    else:
        problem = request.problem
        expected_input = request.expected_input
        expected_output = request.expected_output

    prompt = build_prompt(problem, expected_input, expected_output, request.code, request.error_log, request.hint_level)

    logger.info(f"힌트 요청 | level={request.hint_level} | code_length={len(request.code)} | error_log={request.error_log[:100]}")

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",  # Groq 응답 모델
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    result = json.loads(response.choices[0].message.content)
    logger.info(f"힌트 응답 완료 | level={request.hint_level}")
    return {
        "explanation": result.get("explanation", ""),
        "pseudocode": result.get("pseudocode", ""),
    }
