# 퀴즈 API 명세서

> 작성일: 2026-04-27  
> 대상: 프론트엔드 + 백엔드 공동 참조용  
> 현재 구현 단계: **Step 4** (submissions + hints 기반 DTO 반환)

---

## 공통 사항

### 인증

모든 퀴즈 API는 JWT Bearer 토큰 필수다.

```http
Authorization: Bearer <token>
```

토큰이 없거나 만료된 경우 공통 응답:

```json
HTTP 401
{ "detail": "유효하지 않은 토큰입니다" }
```

### 에러 응답 형식

기존 API와 동일하게 FastAPI 기본 형식을 따른다.

```json
HTTP 4xx / 5xx
{ "detail": "에러 메시지" }
```

| 코드 | 상황 |
|------|------|
| 401  | 토큰 없음 / 만료 / 위조 |
| 404  | 퀴즈 세트 없음, 문제 없음 |
| 422  | 요청 바디 형식 오류 |
| 500  | 서버 내부 오류 |

### 날짜 형식

모든 날짜는 ISO 8601, UTC 기준이다.

```
"2026-04-27T12:00:00Z"
```

---

## 엔드포인트 목록

| 메서드 | 경로 | 설명 | 구현 단계 |
|--------|------|------|-----------|
| GET    | `/quiz/sets`             | 퀴즈 세트 목록 조회 | Step 4 |
| GET    | `/quiz/sets/{set_id}`    | 퀴즈 문제 조회      | Step 4 |
| POST   | `/quiz/submit`           | 퀴즈 제출 및 채점   | Step 4 |
| POST   | `/quiz/generate`         | 유형 기반 퀴즈 생성 | Step 7 (미구현) |

---

## 1. 퀴즈 세트 목록 조회

```http
GET /quiz/sets
Authorization: Bearer <token>
```

### 설명

사용자가 풀 수 있는 퀴즈 세트 목록을 반환한다.

**Step 4 데이터 소스**: `submissions` + `hints` 테이블에서 문제별로 그룹핑해 세트를 생성한다.

- `source = "baekjoon"` → 백준 문제 번호 기준 그룹핑
- `source = "direct"` → 문제 텍스트 기준 그룹핑
- 각 그룹이 하나의 퀴즈 세트가 된다
- 힌트가 1개 이상인 제출만 포함한다

### Response `200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "title": "BOJ 1000 - A+B",
      "description": "백준 1000번 문제 관련 퀴즈",
      "question_count": 3,
      "source": "baekjoon",
      "created_at": "2026-04-27T00:00:00Z"
    },
    {
      "id": 2,
      "title": "직접 입력 문제",
      "description": "스택을 사용해 괄호가 올바른지 확인하라",
      "question_count": 2,
      "source": "direct",
      "created_at": "2026-04-26T15:30:00Z"
    }
  ]
}
```

### 응답 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | int | 세트 식별자. Step 4에서는 `submission_id`를 그대로 사용한다 |
| `title` | string | 백준이면 "BOJ {번호} - {제목}", 직접 입력이면 문제 앞 40자 |
| `description` | string | 문제 원문 앞 80자 |
| `question_count` | int | 포함된 문제 수 (= 해당 제출의 힌트 수) |
| `source` | string | `"baekjoon"` 또는 `"direct"` |
| `created_at` | string | 가장 최근 힌트 생성 시각 |

---

## 2. 퀴즈 문제 조회

```http
GET /quiz/sets/{set_id}
Authorization: Bearer <token>
```

### 설명

특정 퀴즈 세트의 문제 목록을 반환한다.  
**정답은 이 응답에 포함하지 않는다.**

**Step 4 데이터 소스**: `set_id`를 `submission_id`로 해석한다.  
해당 submission에 연결된 힌트들을 문제로 변환한다.

힌트 → 문제 변환 규칙:

- `hint_level 1` → "이 코드에서 오류가 있는 부분은 어디인가요?"
- `hint_level 2` → "이 문제를 풀기 위해 필요한 핵심 개념은 무엇인가요?"
- `hint_level 3` → "이 문제의 풀이 흐름을 단계적으로 설명하면?"
- `explanation` 텍스트를 `content`에 그대로 활용해도 된다 (백엔드 재량)

### Path Parameter

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `set_id` | int | 퀴즈 세트 ID (`submission_id`와 동일) |

### Response `200 OK`

```json
{
  "set_id": 1,
  "title": "BOJ 1000 - A+B",
  "questions": [
    {
      "id": 1,
      "question_type": "short_answer",
      "content": "이 코드에서 정수 오버플로우가 발생할 수 있는 이유는?"
    },
    {
      "id": 2,
      "question_type": "short_answer",
      "content": "입력을 받을 때 사용해야 하는 Python 함수는?"
    }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

### 응답 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `set_id` | int | 세트 ID |
| `title` | string | 세트 제목 |
| `questions[].id` | int | 문제 ID (`hint_id`를 그대로 사용한다) |
| `questions[].question_type` | string | `"short_answer"` 고정 (Step 4 기준) |
| `questions[].content` | string | 문제 내용. **정답 미포함** |

---

## 3. 퀴즈 제출

```http
POST /quiz/submit
Authorization: Bearer <token>
Content-Type: application/json
```

### 설명

사용자의 답안을 제출하고 채점 결과를 반환한다.  
정답과 해설은 이 응답에서만 내려준다.

**Step 4 채점 방식**:

- `question_id`(`hint_id`)로 힌트를 조회한다
- 힌트의 `explanation`에서 핵심 키워드 포함 여부로 채점한다
- 완전 정답 판별이 어려우면 **키워드 기반 부분 채점** 또는 **항상 정답으로 처리**도 허용한다
- 채점 기준은 백엔드 팀이 결정한다. 단, `is_correct`와 `correct_answer`는 반드시 내려줘야 한다.

### Request Body

```json
{
  "set_id": 1,
  "answers": [
    { "question_id": 1, "user_answer": "int 범위 초과" },
    { "question_id": 2, "user_answer": "input()" }
  ]
}
```

### Request 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `set_id` | int | O | 퀴즈 세트 ID |
| `answers` | array | O | 답안 목록 |
| `answers[].question_id` | int | O | 문제 ID (`hint_id`) |
| `answers[].user_answer` | string | O | 사용자 답안. 빈 문자열 허용 |

### Response `200 OK`

```json
{
  "score": 1,
  "total": 2,
  "results": [
    {
      "question_id": 1,
      "is_correct": true,
      "correct_answer": "int 자료형의 범위를 초과해 오버플로우가 발생할 수 있습니다",
      "explanation": "Python의 int는 임의 정밀도이지만 C/Java는 32비트 정수 범위를 가집니다.",
      "mistake_types": []
    },
    {
      "question_id": 2,
      "is_correct": false,
      "correct_answer": "input() 또는 sys.stdin.readline()",
      "explanation": "input()은 문자열로 반환하므로 int()로 변환이 필요합니다.",
      "mistake_types": []
    }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

### Response 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `score` | int | 맞힌 문제 수 |
| `total` | int | 전체 문제 수 |
| `results[].question_id` | int | 문제 ID |
| `results[].is_correct` | bool | 정오답 여부 |
| `results[].correct_answer` | string | 정답 텍스트 |
| `results[].explanation` | string | 해설. 힌트 `explanation` 그대로 사용 가능 |
| `results[].mistake_types` | array | 오답 유형 목록. Step 4에서는 빈 배열 `[]` 반환 |

---

## Step 4 구현 가이드 (백엔드)

### 라우터 파일 위치

```
backend/quiz_router.py   ← 새로 생성
backend/main.py          ← app.include_router(quiz_router) 추가
```

### 의존성

기존 코드 재사용:

```python
from auth import get_current_user      # JWT 인증
from database import get_db            # DB 세션
from db_models import Submission, Hint # ORM 모델
```

### GET /quiz/sets 쿼리 예시

```python
from sqlalchemy import func

rows = (
    db.query(
        Submission.id,
        Submission.source,
        Submission.external_problem_id,
        Submission.problem,
        func.count(Hint.id).label("question_count"),
        func.max(Hint.created_at).label("created_at"),
    )
    .join(Hint, Hint.submission_id == Submission.id)
    .filter(Submission.user_id == current_user_id)
    .group_by(Submission.id)
    .order_by(func.max(Hint.created_at).desc())
    .all()
)
```

### GET /quiz/sets/{set_id} 쿼리 예시

```python
submission = (
    db.query(Submission)
    .filter(Submission.id == set_id, Submission.user_id == current_user_id)
    .first()
)
if not submission:
    raise HTTPException(status_code=404, detail="퀴즈 세트를 찾을 수 없습니다")

hints = (
    db.query(Hint)
    .filter(Hint.submission_id == set_id)
    .order_by(Hint.hint_level)
    .all()
)
```

### 힌트 레벨 → 문제 content 변환 예시

```python
LEVEL_QUESTION_TEMPLATE = {
    1: "이 코드에서 오류가 있는 부분은 어디이며, 왜 오류가 발생하나요?",
    2: "이 문제를 해결하기 위해 필요한 핵심 개념은 무엇인가요?",
    3: "이 문제의 올바른 풀이 흐름을 단계적으로 설명하면?",
}

def hint_to_question(hint: Hint) -> dict:
    content = LEVEL_QUESTION_TEMPLATE.get(hint.hint_level, hint.explanation[:100])
    return {
        "id": hint.id,
        "question_type": "short_answer",
        "content": content,
    }
```

### POST /quiz/submit 채점 예시

Step 4에서는 단순 키워드 포함 여부로 채점한다.

```python
def grade_answer(user_answer: str, hint: Hint) -> bool:
    # 답안이 비어있으면 오답
    if not user_answer.strip():
        return False
    # explanation 핵심 단어 3개 이상 포함 시 정답 처리 (재량)
    keywords = hint.explanation.split()[:5]
    matched = sum(1 for kw in keywords if kw.lower() in user_answer.lower())
    return matched >= 2
```

> 채점 로직은 백엔드 팀이 자유롭게 결정한다. 위 예시는 참고용이다.

---

## 프론트엔드 연동 체크리스트

Step 4 백엔드 완료 후 `frontend/src/api/quiz.ts`에서 아래를 교체한다.

- [ ] `fetchQuizSets()` → `GET /quiz/sets` 실제 호출로 교체
- [ ] `fetchQuizSet(setId)` → `GET /quiz/sets/{set_id}` 실제 호출로 교체
- [ ] `submitQuiz(setId, answers)` → `POST /quiz/submit` 실제 호출로 교체
- [ ] 각 요청에 `authHeaders()` 포함 확인
- [ ] 401 응답 시 `handleLogout()` 호출 처리

교체 후 응답 형식이 Mock과 동일하면 컴포넌트 수정 없이 바로 동작한다.

---

## 미결 사항 (Step 4 시작 전 결정 필요)

| 항목 | 상태 | 결정 내용 |
|------|------|-----------|
| 채점 기준 | **미결** | 키워드 기반 / LLM 채점 / 항상 정답 중 선택 |
| 세트 제목 생성 규칙 | **미결** | 백준은 문제 번호 표시, 직접 입력은 앞 N자 |
| 한 제출에 힌트 없는 경우 | **미결** | 목록에서 제외하거나 "힌트 없음" 세트로 표시 |

---

## 향후 확장 (Step 5~7, 현재 구현 범위 아님)

### DB 추가 테이블

```sql
quiz_sets            -- 퀴즈 묶음
quiz_questions       -- 실제 문제
quiz_attempts        -- 퀴즈 시도 단위
quiz_attempt_answers -- 문제별 답안 + 정오답
mistake_types        -- 오답 유형 사전
attempt_mistake_types -- 오답 ↔ 유형 연결
```

### POST /quiz/generate (Step 7)

가장 많이 틀린 유형 기반 퀴즈 자동 생성 API.  
상세 명세는 Step 6 (오답 집계) 완료 후 별도 작성한다.
