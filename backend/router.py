import json
from fastapi import APIRouter
from models import HintRequest
from boj import fetch_boj_problem
from config import groq_client, logger
from prompts import SYSTEM_PROMPT, build_prompt

router = APIRouter()


@router.get("/health")
def health_check():
    logger.info("헬스체크 요청")
    return {"status": "서버 정상 작동 중"}


@router.post("/hint")
def get_hint(request: HintRequest):
    logger.info(f"힌트 요청 수신 | level={request.hint_level} | problem_number={request.problem_number} | code_length={len(request.code)}")

    if request.problem_number:
        boj = fetch_boj_problem(request.problem_number)
        problem = boj.get("problem", "")
        expected_input = boj.get("expected_input", "")
        expected_output = boj.get("expected_output", "")
    else:
        problem = request.problem
        expected_input = request.expected_input
        expected_output = request.expected_output
        logger.info("직접 입력 문제 사용")

    if not problem:
        logger.warning("문제 내용이 비어있음")

    prompt = build_prompt(problem, expected_input, expected_output, request.code, request.error_log, request.hint_level)

    logger.info(f"LLM 요청 시작 | model=openai/gpt-oss-120b | prompt_length={len(prompt)}")

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    raw_content = response.choices[0].message.content
    logger.info(f"LLM 응답 수신 | response_length={len(raw_content)}")

    result = json.loads(raw_content)
    logger.info(f"힌트 응답 완료 | level={request.hint_level} | has_pseudocode={bool(result.get('pseudocode', ''))}")

    return {
        "explanation": result.get("explanation", ""),
        "pseudocode": result.get("pseudocode", ""),
    }
