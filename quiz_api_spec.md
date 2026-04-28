# 퀴즈 API 명세서

> 작성일: 2026-04-28  
> 상태: **확정** (Step 4 구현 기준)  
> 대상: 백엔드 + 프론트엔드 공동 참조

---

## 공통 사항

### 인증

모든 엔드포인트는 JWT Bearer 토큰 필수.

```http
Authorization: Bearer <token>
```

토큰 없음/만료/위조 시:

```json
HTTP 401
{ "detail": "유효하지 않은 토큰입니다" }
```

### 에러 응답 형식

```json
HTTP 4xx / 5xx
{ "detail": "에러 메시지" }
```

| 코드 | 상황 |
|------|------|
| 401  | 토큰 없음 / 만료 / 위조 |
| 404  | 리소스 없음 |
| 422  | 요청 바디 형식 오류 |
| 500  | 서버 내부 오류 |

### 날짜 형식

ISO 8601, UTC 기준. **Z 접미사 필수.**

```
"2026-04-28T12:00:00Z"
```

FastAPI 기본 직렬화는 Z를 붙이지 않으므로, 백엔드에서 아래 설정을 반드시 적용한다.

```python
# backend/schemas.py - 모든 Pydantic 응답 모델에 적용
from pydantic import field_serializer
from datetime import datetime, timezone

class QuizSetSummarySchema(BaseModel):
    ...
    created_at: datetime

    @field_serializer("created_at")
    def serialize_dt(self, v: datetime) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.strftime("%Y-%m-%dT%H:%M:%SZ")
```

프론트엔드에서는 `new Date(created_at)` 파싱이 Z 없이는 로컬 시간으로 잘못 해석될 수 있다.

### 배열 필드 null 금지

`categories`, `mistake_types`, `results` 등 배열 타입 필드는 **항상 배열을 반환한다.**  
값이 없어도 `null` 대신 `[]`를 반환한다. 백엔드에서 `or []`로 방어 처리 필요.

```python
"categories": [c.category for c in hint.categories] or []
```

### 구 Mock 함수 제거 (프론트엔드)

`frontend/src/api/quiz.ts`에 남아있는 아래 함수들은 실제 API 연동 시 **삭제**한다.  
컴포넌트에서 호출 중인지 먼저 확인 후 제거.

```
fetchProblemQuiz()     ← 세트 기반으로 통합, 삭제
submitProblemQuiz()    ← 세트 기반으로 통합, 삭제
MOCK_SETS              ← 삭제
MOCK_QUESTIONS         ← 삭제
MOCK_ANSWERS           ← 삭제
DEFAULT_PROBLEM_QUESTIONS  ← 삭제
DEFAULT_PROBLEM_ANSWERS    ← 삭제
gradeAnswers()         ← 채점은 백엔드 담당, 삭제
delay()                ← 삭제
```

### 오류 유형 목록 (11가지)

`constants.py`의 `MISTAKE_CATEGORIES`에 정의. API 전체에서 이 목록 외 값은 사용 불가.

```
배열 인덱스 오류   포인터/참조 오류   무한 루프        자료구조 선택 오류
시간 복잡도 문제   조건문 논리 오류   타입/형변환 오류  재귀 오류
입출력 처리 오류   변수 범위 오류     기타
```

---

## 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/quiz/categories`       | 오류 유형별 누적 횟수 조회 |
| GET    | `/quiz/sets`             | 퀴즈 세트 목록 조회 |
| GET    | `/quiz/sets/{set_id}`    | 퀴즈 문제 목록 조회 |
| POST   | `/quiz/submit`           | 채점 및 결과 반환 |

---

## 1. GET /quiz/categories

```http
GET /quiz/categories
Authorization: Bearer <token>
```

사용자의 오류 유형별 누적 횟수를 내림차순으로 반환.  
해당 유형이 없으면 빈 배열 `[]` 반환 (404 아님).

### Response `200 OK`

```json
[
  { "category": "배열 인덱스 오류", "count": 7 },
  { "category": "조건문 논리 오류", "count": 3 }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `category` | string | 오류 유형 이름 (`MISTAKE_CATEGORIES` 목록 중 하나) |
| `count` | int | 누적 횟수 |

---

## 2. GET /quiz/sets

```http
GET /quiz/sets?category={category}
Authorization: Bearer <token>
```

사용자의 퀴즈 세트 목록. `submission` 1개 = 퀴즈 세트 1개.  
hints가 1개 이상인 submission만 포함. 최근 힌트 생성 시각 내림차순 정렬.

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `category` | string | - | 해당 카테고리의 hint를 가진 세트만 필터. 생략 시 전체 반환. |

### Response `200 OK`

```json
[
  {
    "id": 42,
    "title": "백준 1001번",
    "description": "힌트 3개 · 배열 인덱스 오류, 조건문 논리 오류",
    "question_count": 3,
    "categories": ["배열 인덱스 오류", "조건문 논리 오류"],
    "created_at": "2026-04-25T10:00:00Z"
  },
  {
    "id": 43,
    "title": "직접 입력: 스택을 사용해 괄호가...",
    "description": "힌트 2개 · 자료구조 선택 오류",
    "question_count": 2,
    "categories": ["자료구조 선택 오류"],
    "created_at": "2026-04-26T15:30:00Z"
  }
]
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 세트 ID. `submission_id`를 그대로 사용 |
| `title` | string | `source="baekjoon"` → `"백준 {번호}번"`, 그 외 → `"직접 입력: {문제 앞 30자}"` |
| `description` | string | `"힌트 {N}개 · {카테고리1}, {카테고리2}"` 형식. 카테고리 없으면 `"힌트 {N}개"` |
| `question_count` | int | 해당 submission에 연결된 힌트 수 |
| `categories` | string[] | 세트 내 모든 힌트의 카테고리 (중복 제거, 빈 배열 가능) |
| `created_at` | string | 가장 최근 힌트 생성 시각 |

---

## 3. GET /quiz/sets/{set_id}

```http
GET /quiz/sets/{set_id}
Authorization: Bearer <token>
```

특정 퀴즈 세트의 문제 목록. **정답은 이 응답에 포함하지 않는다.**  
`set_id`는 `submission_id`와 동일하게 해석.

### Path Parameter

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `set_id` | int | 퀴즈 세트 ID |

### Response `200 OK`

```json
{
  "id": 42,
  "title": "백준 1001번",
  "questions": [
    {
      "id": 101,
      "question_type": "short_answer",
      "content": "이 코드에서 오류가 발생하는 위치와 오류 유형을 설명하세요.",
      "categories": ["배열 인덱스 오류"]
    },
    {
      "id": 102,
      "question_type": "short_answer",
      "content": "이 코드에서 필요한 핵심 개념이나 알고리즘을 설명하세요.",
      "categories": []
    }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 세트 ID |
| `title` | string | 세트 제목 (GET /quiz/sets와 동일한 규칙) |
| `questions[].id` | int | 문제 ID. `hint_id`를 그대로 사용 |
| `questions[].question_type` | string | `"short_answer"` 고정 |
| `questions[].content` | string | 문제 내용. 정답 미포함 |
| `questions[].categories` | string[] | 해당 힌트의 오류 카테고리 |

### hint_level → content 변환 규칙

| hint_level | content |
|-----------|---------|
| 1 | "이 코드에서 오류가 발생하는 위치와 오류 유형을 설명하세요." |
| 2 | "이 코드에서 필요한 핵심 개념이나 알고리즘을 설명하세요." |
| 3 | "이 문제의 풀이 흐름을 단계적으로 서술하세요." |

---

## 4. POST /quiz/submit

```http
POST /quiz/submit
Authorization: Bearer <token>
Content-Type: application/json
```

사용자의 답안을 채점하고 결과를 반환한다.  
**정답(`correct_answer`)은 이 응답에서만 내려준다.**

### Request Body

```json
{
  "set_id": 42,
  "answers": [
    { "question_id": 101, "user_answer": "6번째 줄에서 배열 범위 초과" },
    { "question_id": 102, "user_answer": "" }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `set_id` | int | O | 퀴즈 세트 ID |
| `answers` | array | O | 답안 목록. 빈 배열 불가 |
| `answers[].question_id` | int | O | 문제 ID (`hint_id`) |
| `answers[].user_answer` | string | O | 사용자 답안. 빈 문자열 허용 |

### Response `200 OK`

```json
{
  "score": 1,
  "total": 2,
  "results": [
    {
      "question_id": 101,
      "is_correct": true,
      "correct_answer": "6번째 줄 arr[i]에서 i가 배열 범위를 초과합니다.",
      "explanation": "배열 크기 N에 대해 유효한 인덱스는 0~N-1입니다.",
      "mistake_types": ["배열 인덱스 오류"]
    },
    {
      "question_id": 102,
      "is_correct": false,
      "correct_answer": "이분 탐색(Binary Search)을 활용합니다.",
      "explanation": "정렬된 배열에서 O(log n)으로 검색하는 알고리즘입니다.",
      "mistake_types": []
    }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `score` | int | 맞힌 문제 수 |
| `total` | int | 전체 문제 수 |
| `results[].question_id` | int | 문제 ID |
| `results[].is_correct` | bool | 정오답 여부 |
| `results[].correct_answer` | string | `hint.explanation` 전체 텍스트 |
| `results[].explanation` | string | `hint.explanation` 전체 텍스트 (correct_answer와 동일) |
| `results[].mistake_types` | string[] | 해당 힌트의 오류 카테고리 |

### 채점 방식 (키워드 매칭)

1. 빈 답안 → 오답 처리
2. `hint.explanation` 앞 5단어를 소문자 정규화 후 키워드로 사용
3. 사용자 답안에 키워드 2개 이상 포함 시 정답 처리

---

## 백엔드 구현 가이드

### 파일 구조

```
backend/constants.py          ← MISTAKE_CATEGORIES 정의 (신규)
backend/db_models.py          ← HintCategory 모델 추가, Hint.categories 역참조 추가
backend/alembic/versions/     ← hint_categories 마이그레이션 (신규)
backend/prompts.py            ← JSON 형식에 mistake_types 필드 추가
backend/router.py             ← POST /hint에 카테고리 저장 로직 추가
backend/quiz_router.py        ← 4개 엔드포인트 (신규)
backend/main.py               ← app.include_router(quiz_router) 추가
```

### 의존성 (기존 코드 재사용)

```python
from auth import get_current_user        # JWT 인증
from database import get_db              # DB 세션
from db_models import Submission, Hint   # ORM 모델
```

### constants.py (신규)

```python
MISTAKE_CATEGORIES: list[str] = [
    "배열 인덱스 오류",
    "포인터/참조 오류",
    "무한 루프",
    "자료구조 선택 오류",
    "시간 복잡도 문제",
    "조건문 논리 오류",
    "타입/형변환 오류",
    "재귀 오류",
    "입출력 처리 오류",
    "변수 범위 오류",
    "기타",
]
```

### DB 스키마 변경

**신규 테이블**

```sql
CREATE TABLE hint_categories (
    id       SERIAL PRIMARY KEY,
    hint_id  INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL
);
CREATE INDEX ix_hint_categories_hint_id ON hint_categories(hint_id);
```

**SQLAlchemy 모델 (`db_models.py`)**

```python
class HintCategory(Base):
    __tablename__ = "hint_categories"

    id       = Column(Integer, primary_key=True, index=True)
    hint_id  = Column(Integer, ForeignKey("hints.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    hint     = relationship("Hint", back_populates="categories")

# 기존 Hint 클래스에 추가:
categories = relationship("HintCategory", back_populates="hint", cascade="all, delete-orphan")
```

**Alembic 마이그레이션**

`backend/alembic/versions/` 아래 신규 파일. `down_revision = 'add_kakao_id'`

### prompts.py 변경

JSON 응답 형식 규칙 수정:

```
"반드시 다음 JSON 형식으로만 응답하세요: "
'{"explanation": "...", "pseudocode": "...", "mistake_types": ["카테고리"]}'
"mistake_types는 반드시 아래 목록에서만 선택한다 (복수 가능): "
"[배열 인덱스 오류, 포인터/참조 오류, 무한 루프, 자료구조 선택 오류, "
"시간 복잡도 문제, 조건문 논리 오류, 타입/형변환 오류, 재귀 오류, "
"입출력 처리 오류, 변수 범위 오류, 기타] "
"오류가 없으면 빈 배열 []을 반환한다."
```

### router.py 변경 (POST /hint)

```python
from constants import MISTAKE_CATEGORIES
from db_models import HintCategory  # 임포트 추가

# hint 저장(db.commit) 직후:
for cat in parsed.get("mistake_types", []):
    if cat in MISTAKE_CATEGORIES:
        db.add(HintCategory(hint_id=hint.id, category=cat))
db.commit()
```

### 쿼리 예시

**GET /quiz/categories**

```python
rows = (
    db.query(HintCategory.category, func.count().label("count"))
    .join(Hint)
    .join(Submission)
    .filter(Submission.user_id == current_user.id)
    .group_by(HintCategory.category)
    .order_by(func.count().desc())
    .all()
)
return [{"category": r.category, "count": r.count} for r in rows]
```

**GET /quiz/sets**

```python
query = (
    db.query(
        Submission.id,
        Submission.source,
        Submission.external_problem_id,
        Submission.problem,
        func.count(Hint.id).label("question_count"),
        func.max(Hint.created_at).label("created_at"),
    )
    .join(Hint, Hint.submission_id == Submission.id)
    .filter(Submission.user_id == current_user.id)
    .group_by(Submission.id)
    .order_by(func.max(Hint.created_at).desc())
)

# category 필터가 있는 경우:
if category:
    query = (
        query
        .join(HintCategory, HintCategory.hint_id == Hint.id)
        .filter(HintCategory.category == category)
    )

rows = query.all()

# categories는 각 submission의 hint들에서 별도 조회
```

**GET /quiz/sets/{set_id}**

```python
submission = db.query(Submission).filter(
    Submission.id == set_id,
    Submission.user_id == current_user.id
).first()
if not submission:
    raise HTTPException(status_code=404, detail="퀴즈 세트를 찾을 수 없습니다")

hints = (
    db.query(Hint)
    .filter(Hint.submission_id == set_id)
    .order_by(Hint.hint_level)
    .all()
)
```

**hint_level → content 변환**

```python
LEVEL_QUESTION_MAP = {
    1: "이 코드에서 오류가 발생하는 위치와 오류 유형을 설명하세요.",
    2: "이 코드에서 필요한 핵심 개념이나 알고리즘을 설명하세요.",
    3: "이 문제의 풀이 흐름을 단계적으로 서술하세요.",
}

def hint_to_question(hint: Hint) -> dict:
    return {
        "id": hint.id,
        "question_type": "short_answer",
        "content": LEVEL_QUESTION_MAP.get(hint.hint_level, hint.explanation[:100]),
        "categories": [c.category for c in hint.categories],
    }
```

**POST /quiz/submit 채점**

```python
def grade_answer(user_answer: str, hint: Hint) -> bool:
    if not user_answer.strip():
        return False
    normalize = lambda s: s.lower().strip()
    keywords = [normalize(w) for w in hint.explanation.split()[:5]]
    matched = sum(1 for kw in keywords if kw in normalize(user_answer))
    return matched >= 2
```

---

## 프론트엔드 구현 가이드

### 타입 정의 (`frontend/src/api/quiz.ts`)

```ts
export type QuestionType = 'short_answer'
export type QuizScreenState = 'list' | 'loading' | 'empty' | 'session' | 'submitting' | 'result' | 'error'

export interface MistakeCategory {
  category: string
  count: number
}

export interface QuizSetSummary {
  id: number
  title: string
  description: string
  question_count: number
  categories: string[]
  created_at: string
}

export interface QuizSetDetail {
  id: number
  title: string
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: number
  question_type: QuestionType
  content: string
  categories: string[]
}

export interface QuizAnswerDraft {
  question_id: number
  user_answer: string
}

export interface QuizQuestionResult {
  question_id: number
  is_correct: boolean
  correct_answer: string
  explanation: string
  mistake_types: string[]
}

export interface QuizSubmitResult {
  score: number
  total: number
  results: QuizQuestionResult[]
}
```

### API 함수

모든 함수에 `Authorization: Bearer <token>` 헤더 포함. 401 응답 시 logout 처리.

```ts
// GET /quiz/categories
fetchQuizCategories(): Promise<MistakeCategory[]>

// GET /quiz/sets?category={category}
fetchQuizSets(category?: string): Promise<QuizSetSummary[]>

// GET /quiz/sets/{id}
fetchQuizSet(setId: number): Promise<QuizSetDetail>

// POST /quiz/submit
submitQuiz(setId: number, answers: QuizAnswerDraft[]): Promise<QuizSubmitResult>
```

### 컴포넌트 구조

```
QuizPage
├── CategorySummary   — GET /quiz/categories → 카테고리 필터 버튼 (횟수 표시)
├── QuizSetList       — GET /quiz/sets → 세트 카드 목록 (카테고리 배지 포함)
├── QuizSession       — GET /quiz/sets/{id} → 문제 1개씩 표시, 진행 도트 네비게이션
│   └── AnswerInput   — 단답형 텍스트 입력 (Enter = 다음/제출)
└── QuizResult        — POST /quiz/submit → 점수 + 문제별 정오 + 카테고리 태그
```

### 화면 상태 머신

```
loading → list → session → submitting → result
        → empty
(오류 시 어디서든) → error → (retry) → loading
```

**CategorySummary 동작:**  
"전체" 버튼 + 카테고리별 버튼 (횟수 표시). 클릭 시 `fetchQuizSets(category)` 재호출.

### Mock → 실제 API 교체 체크리스트

- [ ] `fetchQuizCategories()` 신규 구현 (GET /quiz/categories)
- [ ] `fetchQuizSets(category?)` → GET /quiz/sets 실제 호출로 교체
- [ ] `fetchQuizSet(setId)` → GET /quiz/sets/{id} 실제 호출로 교체 (응답 필드: `set_id` → `id`)
- [ ] `submitQuiz(setId, answers)` → POST /quiz/submit 실제 호출로 교체
- [ ] `QuizSetSummary`에 `categories: string[]` 추가
- [ ] `QuizQuestion`에 `categories: string[]` 추가
- [ ] `fetchProblemQuiz`, `submitProblemQuiz` 제거 (세트 기반으로 통합)
- [ ] 모든 요청에 `Authorization` 헤더 포함 확인
- [ ] 401 응답 시 logout 처리 확인

---

## 구현 순서

**백엔드 (순서 중요)**

1. `constants.py` — MISTAKE_CATEGORIES 정의
2. `db_models.py` — HintCategory 모델, Hint.categories 역참조
3. alembic 마이그레이션 실행 (`alembic upgrade head`)
4. `prompts.py` — mistake_types JSON 필드 추가
5. `router.py` — POST /hint 카테고리 저장 로직
6. `quiz_router.py` — 4개 엔드포인트 구현
7. `main.py` — quiz_router 등록

**프론트엔드**

8. `api/quiz.ts` — 타입 + API 함수 실제 호출로 교체
9. `CategorySummary.tsx`
10. `QuizSetList.tsx`
11. `AnswerInput.tsx`
12. `QuizSession.tsx`
13. `QuizResult.tsx`
14. `QuizPage.tsx`

---

## 향후 확장 (현재 구현 범위 아님)

- `POST /quiz/generate` — 취약 유형 기반 퀴즈 자동 생성 (Step 7)
- `quiz_attempts`, `quiz_attempt_answers` 테이블 — 풀이 이력 저장
