import json
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from models import HintRequest
from boj import fetch_boj_problem
from config import groq_client, logger
from prompts import SYSTEM_PROMPT, build_prompt
from database import get_db
from db_models import Submission, Hint
from schemas import HistoryItem, HistoryResponse, ProblemSummary, ProblemListResponse, SubmissionSummary, SubmissionListResponse, DirectProblemSummary, DirectProblemListResponse
from auth import get_current_user

router = APIRouter()


@router.get("/health")
def health_check():
    logger.info("헬스체크 요청")
    return {"status": "서버 정상 작동 중"}


@router.post("/hint")
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"힌트 요청 수신 | user_id={current_user_id} | level={request.hint_level} | problem_number={request.problem_number} | code_length={len(request.code)}")

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
        user_id=current_user_id,
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

    try:
        db.commit()
    except Exception:
        logger.exception(f"힌트 저장 실패 | user_id={current_user_id}")
        raise

    logger.info(f"힌트 응답 완료 | user_id={current_user_id} | level={request.hint_level} | submission_id={submission.id} | hint_id={hint.id}")

    return {"explanation": explanation, "pseudocode": pseudocode}


@router.get("/history/submissions", response_model=SubmissionListResponse)
def get_submission_list(
    source: Optional[str] = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"제출 목록 조회 | user_id={current_user_id} | source={source}")

    query = (
        db.query(
            Submission.id.label("submission_id"),
            Submission.source,
            Submission.external_problem_id,
            Submission.problem,
            func.count(Hint.id).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .filter(Submission.user_id == current_user_id)
    )

    if source is not None:
        query = query.filter(Submission.source == source)

    rows = (
        query
        .group_by(Submission.id)
        .order_by(func.max(Hint.created_at).desc())
        .all()
    )

    return SubmissionListResponse(items=[
        SubmissionSummary(
            submission_id=row.submission_id,
            source=row.source,
            external_problem_id=row.external_problem_id,
            problem_snippet=row.problem[:80] if row.problem else "",
            hint_count=row.hint_count,
            last_hint_at=row.last_hint_at,
        )
        for row in rows
    ])


@router.get("/history/problems", response_model=ProblemListResponse)
def get_problem_list(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"백준 문제 목록 조회 | user_id={current_user_id}")

    rows = (
        db.query(
            Submission.external_problem_id,
            func.count(Hint.id).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .filter(
            Submission.user_id == current_user_id,
            Submission.source == "baekjoon",
            Submission.external_problem_id.isnot(None),
        )
        .group_by(Submission.external_problem_id)
        .order_by(func.max(Hint.created_at).desc())
        .all()
    )

    return ProblemListResponse(items=[
        ProblemSummary(
            external_problem_id=row.external_problem_id,
            hint_count=row.hint_count,
            last_hint_at=row.last_hint_at,
        )
        for row in rows
    ])


@router.get("/history/direct-problems", response_model=DirectProblemListResponse)
def get_direct_problem_list(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"직접입력 문제 목록 조회 | user_id={current_user_id}")

    rows = (
        db.query(
            Submission.problem,
            func.count(Hint.id).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .filter(
            Submission.user_id == current_user_id,
            Submission.source == "direct",
        )
        .group_by(Submission.problem)
        .order_by(func.max(Hint.created_at).desc())
        .all()
    )

    return DirectProblemListResponse(items=[
        DirectProblemSummary(
            problem=row.problem,
            problem_snippet=row.problem[:80] if row.problem else "",
            hint_count=row.hint_count,
            last_hint_at=row.last_hint_at,
        )
        for row in rows
    ])


@router.get("/history", response_model=HistoryResponse)
def get_history(
    page: int = 1,
    limit: int = 10,
    source: Optional[str] = None,
    problem_id: Optional[str] = None,
    submission_id: Optional[int] = None,
    problem_text: Optional[str] = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"히스토리 조회 | user_id={current_user_id} | page={page} | limit={limit} | source={source} | problem_id={problem_id} | submission_id={submission_id} | problem_text={'(set)' if problem_text else None}")

    offset = (page - 1) * limit
    base_query = db.query(Hint).join(Submission).filter(Submission.user_id == current_user_id)

    if source is not None:
        base_query = base_query.filter(Submission.source == source)
    if problem_id is not None:
        base_query = base_query.filter(Submission.external_problem_id == problem_id)
    if submission_id is not None:
        base_query = base_query.filter(Submission.id == submission_id)
    if problem_text is not None:
        base_query = base_query.filter(Submission.problem == problem_text)

    total = base_query.count()
    hints = (
        base_query
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
