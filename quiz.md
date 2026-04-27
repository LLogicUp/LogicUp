# 퀴즈 기능 명세

오류 유형을 카테고리화하여 사용자 약점 기반 퀴즈를 제공하는 기능.

---

## 1. 오류 유형 카테고리

`backend/constants.py` (신규)에 아래 목록을 `MISTAKE_CATEGORIES: list[str]`로 정의한다.

```
배열 인덱스 오류    # IndexError, off-by-one, 범위 초과
포인터/참조 오류    # 미초기화 변수, NULL 역참조
무한 루프          # 종료 조건 누락, 루프 변수 미갱신
자료구조 선택 오류  # 스택/큐 혼용 등
시간 복잡도 문제   # O(n²) 이상 비효율 알고리즘
조건문 논리 오류   # 잘못된 비교 연산자, 경계 조건 누락
타입/형변환 오류   # TypeError, 암묵적 형변환 버그
재귀 오류          # 기저 조건 누락, 스택 오버플로우
입출력 처리 오류   # 입력 파싱 오류, 출력 형식 불일치
변수 범위 오류     # 지역/전역 변수 혼용, 미선언 변수
기타
```

---

## 2. DB 변경

### 신규 테이블 `hint_categories`

```sql
CREATE TABLE hint_categories (
    id       SERIAL PRIMARY KEY,
    hint_id  INTEGER NOT NULL REFERENCES hints(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL
);
CREATE INDEX ix_hint_categories_hint_id ON hint_categories(hint_id);
```

### SQLAlchemy 모델 (`backend/db_models.py`)

`HintCategory` 클래스 추가:

```python
class HintCategory(Base):
    __tablename__ = "hint_categories"

    id       = Column(Integer, primary_key=True, index=True)
    hint_id  = Column(Integer, ForeignKey("hints.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)

    hint = relationship("Hint", back_populates="categories")
```

기존 `Hint` 클래스에 역참조 추가:

```python
categories = relationship("HintCategory", back_populates="hint", cascade="all, delete-orphan")
```

### Alembic 마이그레이션

`backend/alembic/versions/` 아래 신규 파일 생성. `down_revision = 'add_kakao_id'`

---

## 3. 힌트 생성 시 카테고리 자동 태깅

### `backend/prompts.py` 변경

`SYSTEM_PROMPT`의 규칙 8번(JSON 형식) 뒤에 두 규칙을 추가한다.

```
"8. 반드시 다음 JSON 형식으로만 응답하세요: "
'{"explanation": "...", "pseudocode": "...", "mistake_types": ["카테고리"]}'
"9. mistake_types는 반드시 아래 목록에서만 선택한다 (복수 가능): "
"[배열 인덱스 오류, 포인터/참조 오류, 무한 루프, 자료구조 선택 오류, "
"시간 복잡도 문제, 조건문 논리 오류, 타입/형변환 오류, 재귀 오류, "
"입출력 처리 오류, 변수 범위 오류, 기타] "
"오류가 없으면 빈 배열 []을 반환한다. "
"10. 의사코드를 제외한 다른 힌트는 한글로 설명해주세요."
```

기존 9번 규칙(한글)은 10번으로 번호만 바꾼다.

### `backend/router.py` 변경

`POST /hint` 엔드포인트에서 `hint` 저장(db.commit) 직후 카테고리 저장 로직 추가.

```python
from constants import MISTAKE_CATEGORIES
from db_models import HintCategory   # 임포트 추가

# hint 저장 후
for cat in parsed.get("mistake_types", []):
    if cat in MISTAKE_CATEGORIES:
        db.add(HintCategory(hint_id=hint.id, category=cat))
db.commit()
```

---

## 4. 백엔드 API

신규 파일 `backend/quiz_router.py`, `prefix="/quiz"`.  
`backend/main.py`에 `app.include_router(quiz_router)` 추가.  
모든 엔드포인트는 JWT 인증 필요 (`get_current_user` 의존성).

---

### `GET /quiz/categories`

사용자의 오류 유형별 누적 횟수를 내림차순으로 반환.

**응답:**
```json
[
  {"category": "배열 인덱스 오류", "count": 7},
  {"category": "조건문 논리 오류", "count": 3}
]
```

**쿼리 (SQLAlchemy):**
```python
db.query(HintCategory.category, func.count().label("count"))
  .join(Hint).join(Submission)
  .filter(Submission.user_id == current_user.id)
  .group_by(HintCategory.category)
  .order_by(func.count().desc())
  .all()
```

---

### `GET /quiz/sets`

사용자의 퀴즈 세트 목록. `submission` 1개 = 퀴즈 세트 1개.  
`hints`가 1개 이상인 submission만 포함.

**Query Params:** `category` (optional) — 해당 카테고리의 hint를 가진 세트만 필터

**응답:**
```json
[
  {
    "id": 42,
    "title": "백준 1001번",
    "description": "힌트 3개 · 배열 인덱스 오류, 조건문 논리 오류",
    "question_count": 3,
    "categories": ["배열 인덱스 오류", "조건문 논리 오류"],
    "created_at": "2026-04-25T10:00:00"
  }
]
```

**title 생성 규칙:**
- `source == "baekjoon"` → `"백준 {external_problem_id}번"`
- 그 외 → `"직접 입력: {problem 앞 30자}"`

---

### `GET /quiz/sets/{set_id}`

특정 세트의 문제 목록. `set_id = submission_id`.  
정답은 포함하지 않는다 (채점 시에만 반환).

**응답:**
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
    }
  ]
}
```

**hint_level → content 템플릿:**

| hint_level | content |
|---|---|
| 1 | "이 코드에서 오류가 발생하는 위치와 오류 유형을 설명하세요." |
| 2 | "이 코드에서 필요한 핵심 개념이나 알고리즘을 설명하세요." |
| 3 | "이 문제의 풀이 흐름을 단계적으로 서술하세요." |

---

### `POST /quiz/submit`

**요청:**
```json
{
  "set_id": 42,
  "answers": [
    {"question_id": 101, "user_answer": "6번째 줄에서 배열 범위 초과"}
  ]
}
```

**채점 방식 (키워드 매칭):**
- `hint.explanation`의 단어들을 키워드로 사용
- 사용자 답변에 키워드가 일정 비율 이상 포함되면 정답 처리
- 소문자, 공백 정규화 후 비교

**응답:**
```json
{
  "score": 2,
  "total": 3,
  "results": [
    {
      "question_id": 101,
      "is_correct": true,
      "correct_answer": "hint.explanation 전체",
      "explanation": "hint.explanation 전체",
      "mistake_types": ["배열 인덱스 오류"]
    }
  ]
}
```

---

## 5. 프론트엔드

### 기존 파일 삭제

아래 파일들은 이전 구현체로 삭제 후 재작성한다.

```
frontend/src/api/quiz.ts
frontend/src/components/quiz/QuizPage.tsx
frontend/src/components/quiz/QuizSetList.tsx
frontend/src/components/quiz/QuizSession.tsx
frontend/src/components/quiz/QuizResult.tsx
frontend/src/components/quiz/AnswerInput.tsx
```

### 타입 정의 (`frontend/src/api/quiz.ts`)

```ts
type QuestionType = 'short_answer'
type QuizScreenState = 'list' | 'loading' | 'empty' | 'session' | 'submitting' | 'result' | 'error'

interface MistakeCategory { category: string; count: number }
interface QuizSetSummary  { id: number; title: string; description: string; question_count: number; categories: string[]; created_at: string }
interface QuizQuestion    { id: number; question_type: QuestionType; content: string; categories: string[] }
interface QuizSetDetail   { id: number; title: string; questions: QuizQuestion[] }
interface AnswerDraft     { question_id: number; user_answer: string }
interface QuizQuestionResult { question_id: number; is_correct: boolean; correct_answer: string; explanation: string; mistake_types: string[] }
interface QuizSubmitResult   { score: number; total: number; results: QuizQuestionResult[] }
```

### API 함수 (`frontend/src/api/quiz.ts`)

모든 함수는 `authHeaders()` 포함, 401 응답 시 `UnauthorizedError` throw.

```ts
fetchQuizCategories(): Promise<MistakeCategory[]>          // GET /quiz/categories
fetchQuizSets(category?: string): Promise<QuizSetSummary[]> // GET /quiz/sets
fetchQuizSet(setId: number): Promise<QuizSetDetail>         // GET /quiz/sets/{id}
submitQuiz(setId: number, answers: AnswerDraft[]): Promise<QuizSubmitResult> // POST /quiz/submit
```

### 컴포넌트 구조

```
QuizPage
├── CategorySummary       # 카테고리 태그 필터 (GET /quiz/categories)
├── QuizSetList           # 세트 카드 목록 (카테고리 배지 포함)
├── QuizSession           # 문제 1개씩 표시, 진행 도트 네비게이션
│   └── AnswerInput       # 단답형 텍스트 입력 (Enter = 다음/제출)
└── QuizResult            # 점수 + 문제별 정오 + mistake_types 태그
```

**QuizPage 상태 머신:**

```
loading → list → session → submitting → result
              → empty
     (오류 시 어디서든) → error → (retry) → loading
```

**CategorySummary 동작:**
- 전체 버튼 + 카테고리별 버튼 (횟수 표시)
- 클릭 시 `fetchQuizSets(category)` 재호출

---

## 6. 구현 순서

```
[백엔드]
1. backend/constants.py         — MISTAKE_CATEGORIES 정의
2. backend/db_models.py         — HintCategory 모델, Hint.categories 역참조
3. alembic 마이그레이션         — hint_categories 테이블
4. backend/prompts.py           — mistake_types 규칙, JSON 형식 변경
5. backend/router.py            — POST /hint 카테고리 저장 로직
6. backend/quiz_router.py       — 4개 엔드포인트
7. backend/main.py              — quiz_router 등록

[프론트엔드]
8. 기존 퀴즈 파일 삭제
9. frontend/src/api/quiz.ts     — 타입 + API 함수
10. AnswerInput.tsx
11. QuizSetList.tsx
12. CategorySummary.tsx
13. QuizSession.tsx
14. QuizResult.tsx
15. QuizPage.tsx
```
