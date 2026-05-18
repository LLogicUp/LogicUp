import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException


oj_router = APIRouter(prefix="/oj", tags=["oj"])

OJ_ROOT = Path(__file__).resolve().parent.parent / "oj"
SUBJECT_LABELS = {
    "c_program": "C 프로그래밍",
    "advanced_c": "고급 C",
    "data_structure": "자료구조",
    "algo": "알고리즘",
}


def chapter_number(path: Path) -> int | None:
    match = re.search(r"chapter(\d+)|(\d+)장", path.stem, re.IGNORECASE)
    if not match:
        return None
    value = match.group(1) or match.group(2)
    return int(value)


@oj_router.get("")
def list_oj_index():
    if not OJ_ROOT.exists():
        return {"subjects": []}

    subjects = []
    for subject_dir in sorted((p for p in OJ_ROOT.iterdir() if p.is_dir()), key=lambda p: p.name):
        chapters = []
        for chapter_file in sorted(subject_dir.glob("*.json"), key=lambda p: chapter_number(p) or 0):
            fallback_chapter = chapter_number(chapter_file)
            if fallback_chapter is None:
                continue

            try:
                data = json.loads(chapter_file.read_text(encoding="utf-8-sig"))
            except (OSError, json.JSONDecodeError):
                continue

            chapter = data.get("chapter", fallback_chapter)
            problems = []
            for problem in data.get("problems", []):
                number = problem.get("number")
                if number is None:
                    continue
                problems.append({
                    "number": number,
                    "title": problem.get("title", ""),
                })

            chapters.append({
                "chapter": chapter,
                "file": chapter_file.name,
                "problems": problems,
            })

        subjects.append({
            "key": subject_dir.name,
            "label": SUBJECT_LABELS.get(subject_dir.name, subject_dir.name),
            "chapters": chapters,
        })

    return {"subjects": subjects}


@oj_router.get("/{subject}/{chapter}/{problem_number}")
def get_oj_problem(subject: str, chapter: int, problem_number: int):
    subject_dir = OJ_ROOT / subject
    if not subject_dir.is_dir() or subject_dir.resolve().parent != OJ_ROOT.resolve():
        raise HTTPException(status_code=404, detail="OJ 과목을 찾을 수 없습니다.")

    chapter_file = subject_dir / f"chapter{chapter}.json"
    if not chapter_file.exists():
        chapter_file = subject_dir / f"{chapter}장.json"
    if not chapter_file.exists():
        raise HTTPException(status_code=404, detail="OJ 장 파일을 찾을 수 없습니다.")

    try:
        data = json.loads(chapter_file.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        raise HTTPException(status_code=500, detail="OJ 장 파일을 읽을 수 없습니다.")

    for problem in data.get("problems", []):
        if problem.get("number") == problem_number:
            return {
                "subject": subject,
                "subject_label": SUBJECT_LABELS.get(subject, subject),
                "chapter": data.get("chapter", chapter),
                "problem": problem,
            }

    raise HTTPException(status_code=404, detail="OJ 문제를 찾을 수 없습니다.")
