import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from models import HintRequest
from programmers import fetch_problem_from_url
from config import groq_client, logger
from prompts import SYSTEM_PROMPT, build_prompt
from database import get_db
from db_models import Submission, Hint, HintCategory
from schemas import HintResponse, HistoryItem, HistoryResponse, ProblemSummary, ProblemListResponse, SubmissionSummary, SubmissionListResponse, DirectProblemSummary, DirectProblemListResponse, CategoryStat, CategoryStatsResponse
from auth import get_current_user

router = APIRouter()


@router.get("/health")
def health_check():
    logger.info("헬스체크 요청")
    return {"status": "서버 정상 작동 중"}


@router.post("/hint", response_model=HintResponse)
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"힌트 요청 수신 | user_id={current_user_id} | level={request.hint_level} | submission_id={request.submission_id} | problem_url={request.problem_url} | code_length={len(request.code)}")

    if request.submission_id is not None:
        submission = db.query(Submission).filter(Submission.id == request.submission_id).first()
        if submission is None:
            raise HTTPException(status_code=404, detail="submission not found")
        if submission.user_id != current_user_id:
            raise HTTPException(status_code=403, detail="forbidden")
        if len(submission.hints) >= 3:
            raise HTTPException(status_code=400, detail="hint limit exceeded")
        existing_levels = {h.hint_level for h in submission.hints}
        if request.hint_level in existing_levels:
            raise HTTPException(status_code=409, detail="hint level already exists")

        problem = submission.problem
        expected_input = submission.expected_input
        expected_output = submission.expected_output
        is_new_submission = False
    else:
        if request.problem_url:
            fetched = fetch_problem_from_url(request.problem_url)
            source = "url"
            external_problem_id = request.problem_url
            if not fetched:
                raise HTTPException(status_code=502, detail="문제를 불러오지 못했습니다")
            title = fetched.get("title", "")
            problem = fetched.get("problem", "")
            expected_input = fetched.get("expected_input", "")
            expected_output = fetched.get("expected_output", "")
        else:
            problem = request.problem
            expected_input = request.expected_input
            expected_output = request.expected_output
            source = "direct"
            external_problem_id = None
            title = ""
            logger.info("직접 입력 문제 사용")

        if not problem:
            logger.warning("문제 내용이 비어있음")

        submission = Submission(
            user_id=current_user_id,
            source=source,
            external_problem_id=external_problem_id,
            problem=problem,
            expected_input=expected_input,
            expected_output=expected_output,
            code=request.code,
            error_log=request.error_log,
            title=title,
            language=request.language,
        )
        db.add(submission)
        db.flush()
        is_new_submission = True

    prompt = build_prompt(problem, expected_input, expected_output, request.code, request.error_log, request.hint_level, request.language)

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
    error_categories = result.get("error_categories", [])
    logger.info(f"에러 카테고리 분류 | user_id={current_user_id} | categories={error_categories}")

    if is_new_submission and submission.source == "direct":
        llm_title = result.get("title", "")
        if llm_title:
            submission.title = llm_title

    if is_new_submission:
        for cat in error_categories:
            db.add(HintCategory(submission_id=submission.id, category=cat, language=request.language))

    hint = Hint(
        submission_id=submission.id,
        hint_level=request.hint_level,
        explanation=explanation,
        pseudocode=pseudocode,
    )
    db.add(hint)

    try:
        db.commit()
        db.refresh(hint)
    except Exception:
        logger.exception(f"힌트 저장 실패 | user_id={current_user_id}")
        raise

    logger.info(f"힌트 응답 완료 | user_id={current_user_id} | level={request.hint_level} | submission_id={submission.id} | hint_id={hint.id}")

    return HintResponse(
        submission_id=submission.id,
        hint_id=hint.id,
        hint_level=hint.hint_level,
        explanation=explanation,
        pseudocode=pseudocode,
        error_categories=error_categories,
    )


class SubmissionPatch(BaseModel):
    external_problem_id: str


@router.patch("/submissions/{submission_id}")
def patch_submission(
    submission_id: int,
    body: SubmissionPatch,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="submission not found")
    if submission.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="forbidden")

    submission.external_problem_id = body.external_problem_id
    db.commit()

    logger.info(f"submission 수정 | user_id={current_user_id} | submission_id={submission_id} | external_problem_id={body.external_problem_id}")
    return {"submission_id": submission_id, "external_problem_id": body.external_problem_id}


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
    logger.info(f"크롤링 문제 목록 조회 | user_id={current_user_id}")

    rows = (
        db.query(
            Submission.external_problem_id,
            func.max(Submission.title).label("title"),
            func.count(distinct(Hint.id)).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
            func.array_agg(HintCategory.category).label("raw_categories"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .outerjoin(HintCategory, HintCategory.submission_id == Submission.id)
        .filter(
            Submission.user_id == current_user_id,
            Submission.source == "url",
            Submission.external_problem_id.isnot(None),
        )
        .group_by(Submission.external_problem_id)
        .order_by(func.max(Hint.created_at).desc())
        .all()
    )

    return ProblemListResponse(items=[
        ProblemSummary(
            external_problem_id=row.external_problem_id,
            title=row.title or "",
            hint_count=row.hint_count,
            last_hint_at=row.last_hint_at,
            categories=list({c for c in (row.raw_categories or []) if c is not None}),
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
            func.max(Submission.title).label("title"),
            func.count(distinct(Hint.id)).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
            func.array_agg(HintCategory.category).label("raw_categories"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .outerjoin(HintCategory, HintCategory.submission_id == Submission.id)
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
            title=row.title or "",
            hint_count=row.hint_count,
            last_hint_at=row.last_hint_at,
            categories=list({c for c in (row.raw_categories or []) if c is not None}),
        )
        for row in rows
    ])


@router.get("/history/categories", response_model=CategoryStatsResponse)
def get_category_stats(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"카테고리 통계 조회 | user_id={current_user_id}")
    rows = (
        db.query(HintCategory.category, func.count().label("count"))
        .join(Submission, Submission.id == HintCategory.submission_id)
        .filter(Submission.user_id == current_user_id)
        .group_by(HintCategory.category)
        .order_by(func.count().desc())
        .all()
    )
    return CategoryStatsResponse(items=[
        CategoryStat(category=row.category, count=row.count)
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
