import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import HintRequest
from boj import fetch_boj_problem
from config import groq_client, logger
from prompts import SYSTEM_PROMPT, build_prompt
from database import get_db
from db_models import Submission, Hint
from schemas import HistoryItem, HistoryResponse

router = APIRouter()


@router.get("/health")
def health_check():
    logger.info("헬스체크 요청")
    return {"status": "서버 정상 작동 중"}


@router.post("/hint")
def get_hint(request: HintRequest, db: Session = Depends(get_db)):
    logger.info(f"힌트 요청 수신 | level={request.hint_level} | problem_number={request.problem_number} | code_length={len(request.code)}")

    if request.problem_number:
        boj = fetch_boj_problem(request.problem_number)
        problem = boj.get("problem", "")
        expected_input = boj.get("expected_input", "")
        expected_output = boj.get("expected_output", "")
        source = "baekjoon"
        external_problem_id = str(request.problem_number)
    else:
        problem = request.problem
        expected_input = request.expected_input
        expected_output = request.expected_output
        source = "direct"
        external_problem_id = None
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
    explanation = result.get("explanation", "")
    pseudocode = result.get("pseudocode", "")

    submission = Submission(
        source=source,
        external_problem_id=external_problem_id,
        problem=problem,
        expected_input=expected_input,
        expected_output=expected_output,
        code=request.code,
        error_log=request.error_log,
    )
    db.add(submission)
    db.flush()

    hint = Hint(
        submission_id=submission.id,
        hint_level=request.hint_level,
        explanation=explanation,
        pseudocode=pseudocode,
    )
    db.add(hint)
    db.commit()

    logger.info(f"힌트 응답 완료 | level={request.hint_level} | submission_id={submission.id} | hint_id={hint.id}")

    return {"explanation": explanation, "pseudocode": pseudocode}


@router.get("/history", response_model=HistoryResponse)
def get_history(page: int = 1, limit: int = 10, db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    total = db.query(Hint).count()
    hints = (
        db.query(Hint)
        .join(Submission)
        .order_by(Hint.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        HistoryItem(
            hint_id=h.id,
            submission_id=h.submission_id,
            source=h.submission.source,
            external_problem_id=h.submission.external_problem_id,
            problem=h.submission.problem,
            hint_level=h.hint_level,
            explanation=h.explanation,
            pseudocode=h.pseudocode,
            code_snippet=h.submission.code[:200],
            created_at=h.created_at,
        )
        for h in hints
    ]

    return HistoryResponse(items=items, page=page, limit=limit, total=total)
