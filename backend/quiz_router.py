import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from config import groq_client, logger, LLM_MODEL
from database import get_db
from db_models import Submission, HintCategory, QuizSet, QuizQuestion
from auth import get_current_user

quiz_router = APIRouter(prefix="/quiz")


# ── POST /quiz/generate ───────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    count: int = Field(default=3, ge=1, le=10)
    categories: list[str] = []


@quiz_router.post("/generate")
def generate_quiz(
    request: GenerateRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"퀴즈 생성 요청 | user_id={current_user_id} | count={request.count} | categories={request.categories}")

    if request.categories:
        top_categories = request.categories
    else:
        rows = (
            db.query(HintCategory.category, func.count(HintCategory.id).label("cnt"))
            .join(Submission, HintCategory.submission_id == Submission.id)
            .filter(Submission.user_id == current_user_id)
            .group_by(HintCategory.category)
            .order_by(func.count(HintCategory.id).desc())
            .limit(3)
            .all()
        )
        if not rows:
            raise HTTPException(status_code=404, detail="힌트 기록이 없어 퀴즈를 생성할 수 없습니다")
        top_categories = [row.category for row in rows]
    categories_str = ", ".join(top_categories)
    logger.info(f"퀴즈 대상 카테고리 | user_id={current_user_id} | categories={top_categories}")

    # 2. LLM으로 퀴즈 생성
    prompt = (
        f"C언어 프로그래밍 퀴즈를 {request.count}개 생성하세요.\n"
        f"다음 카테고리를 중심으로 출제하세요: {categories_str}\n\n"
        f"문제 유형을 섞어서 출제하세요: short_answer(주관식)와 multiple_choice(4지선다)를 적절히 혼합하세요.\n"
        "반드시 다음 JSON 형식으로만 응답하세요:\n"
        '{"questions": ['
        '{"question_type": "short_answer", "content": "문제 내용", "choices": null, "correct_answer": "기준 답안", "explanation": "해설", "categories": ["카테고리1"]},'
        '{"question_type": "multiple_choice", "content": "문제 내용", "choices": ["보기1", "보기2", "보기3", "보기4"], "correct_answer": "보기1", "explanation": "해설", "categories": ["카테고리1"]}'
        "]}"
    )

    try:
        res = groq_client.chat.completions.create(
            model=LLM_MODEL,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        raw = json.loads(res.choices[0].message.content)
        questions_data = raw.get("questions", [])
    except Exception:
        logger.exception(f"퀴즈 생성 LLM 오류 | user_id={current_user_id}")
        raise HTTPException(status_code=500, detail="퀴즈 생성에 실패했습니다")

    # 3. DB 저장
    quiz_set = QuizSet(
        user_id=current_user_id,
        title=f"{categories_str} 퀴즈",
    )
    db.add(quiz_set)
    db.flush()

    for q in questions_data:
        choices = q.get("choices")
        question = QuizQuestion(
            set_id=quiz_set.id,
            question_type=q.get("question_type", "short_answer"),
            content=q.get("content", ""),
            choices=json.dumps(choices, ensure_ascii=False) if choices else None,
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            categories=json.dumps(q.get("categories", []), ensure_ascii=False),
        )
        db.add(question)

    db.commit()
    db.refresh(quiz_set)
    logger.info(f"퀴즈 생성 완료 | user_id={current_user_id} | set_id={quiz_set.id}")

    # 4. 바로 반환
    return {
        "id": quiz_set.id,
        "title": quiz_set.title,
        "questions": [
            {
                "id": q.id,
                "question_type": q.question_type,
                "content": q.content,
                "choices": json.loads(q.choices) if q.choices else None,
                "categories": json.loads(q.categories) if q.categories else [],
            }
            for q in quiz_set.questions
        ],
    }


# ── GET /quiz/categories ──────────────────────────────────────────────────────

@quiz_router.get("/categories")
def get_categories(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"카테고리 조회 | user_id={current_user_id}")
    rows = (
        db.query(HintCategory.category, func.count(HintCategory.id).label("count"))
        .join(Submission, HintCategory.submission_id == Submission.id)
        .filter(Submission.user_id == current_user_id)
        .group_by(HintCategory.category)
        .order_by(func.count(HintCategory.id).desc())
        .all()
    )
    return [{"category": row.category, "count": row.count} for row in rows]


# ── GET /quiz/sets ────────────────────────────────────────────────────────────

@quiz_router.get("/sets")
def get_quiz_sets(
    category: Optional[str] = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"퀴즈 세트 목록 조회 | user_id={current_user_id} | category={category}")
    sets = (
        db.query(QuizSet)
        .filter(QuizSet.user_id == current_user_id)
        .order_by(QuizSet.created_at.desc())
        .all()
    )

    result = []
    for s in sets:
        cats = []
        for q in s.questions:
            try:
                cats.extend(json.loads(q.categories))
            except json.JSONDecodeError:
                logger.warning(f"카테고리 JSON 파싱 실패 | question_id={q.id}")
        cats = list(dict.fromkeys(cats))

        if category and category not in cats:
            continue

        result.append({
            "id": s.id,
            "title": s.title,
            "description": f"문제 {len(s.questions)}개 · {', '.join(cats[:3])}",
            "question_count": len(s.questions),
            "categories": cats,
        })

    return result


# ── GET /quiz/sets/{set_id} ───────────────────────────────────────────────────

@quiz_router.get("/sets/{set_id}")
def get_quiz_set(
    set_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"퀴즈 세트 상세 조회 | user_id={current_user_id} | set_id={set_id}")
    s = db.query(QuizSet).filter(QuizSet.id == set_id, QuizSet.user_id == current_user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="퀴즈 세트를 찾을 수 없습니다")

    return {
        "id": s.id,
        "title": s.title,
        "questions": [
            {
                "id": q.id,
                "question_type": q.question_type,
                "content": q.content,
                "choices": json.loads(q.choices) if q.choices else None,
                "categories": json.loads(q.categories) if q.categories else [],
            }
            for q in s.questions
        ],
    }


# ── POST /quiz/submit ─────────────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: int
    user_answer: str


class SubmitRequest(BaseModel):
    set_id: int
    answers: list[AnswerItem]


@quiz_router.post("/submit")
def submit_quiz(
    request: SubmitRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"퀴즈 제출 | user_id={current_user_id} | set_id={request.set_id}")
    s = db.query(QuizSet).filter(QuizSet.id == request.set_id, QuizSet.user_id == current_user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="퀴즈 세트를 찾을 수 없습니다")

    question_map = {q.id: q for q in s.questions}
    results = []
    score = 0

    for answer in request.answers:
        q = question_map.get(answer.question_id)
        if not q:
            continue

        if q.question_type == "multiple_choice":
            is_correct = answer.user_answer.strip() == q.correct_answer.strip()
        else:
            prompt = (
                f"다음은 프로그래밍 퀴즈 채점입니다.\n"
                f"문제: {q.content}\n"
                f"기준 답안: {q.correct_answer}\n"
                f"학생 답안: {answer.user_answer}\n\n"
                "학생 답안이 기준 답안과 같은 의미이면 정답으로 판단하세요. "
                "반드시 다음 JSON 형식으로만 응답하세요: "
                '{"is_correct": true}'
            )
            try:
                res = groq_client.chat.completions.create(
                    model=LLM_MODEL,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": prompt}],
                )
                is_correct = json.loads(res.choices[0].message.content).get("is_correct", False)
            except Exception:
                logger.exception(f"채점 LLM 오류 | question_id={q.id}")
                is_correct = False

        if is_correct:
            score += 1

        results.append({
            "question_id": q.id,
            "is_correct": is_correct,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "mistake_types": json.loads(q.categories) if q.categories else [],
        })

    logger.info(f"퀴즈 채점 완료 | user_id={current_user_id} | score={score}/{len(results)}")
    return {"score": score, "total": len(results), "results": results}
