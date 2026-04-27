# 퀴즈 기능 최종 계획

## 목적

LogicUp에 퀴즈 기능을 추가한다.

이번 계획의 기준은 아래와 같다.

- 1차는 프론트엔드 `View`를 먼저 구현한다.
- 현재 실제 DB 구조와 충돌하지 않게 설계한다.
- 초기에는 `short_answer` 중심으로 시작한다.
- 이후 사용자의 누적 데이터를 기반으로 `가장 많이 틀린 유형`을 집계해 퀴즈와 문제를 생성한다.
- 사용자가 특정 유형이나 특정 개념을 요청하면 해당 기준으로도 퀴즈와 문제를 생성할 수 있게 한다.

---

## 현재 전제

현재 실제 DB에는 퀴즈 전용 테이블이 없다.

현재 존재하는 축은 아래 3개다.

- `users`
- `submissions`
- `hints`

즉 지금 단계에서는 프론트가 DB를 직접 전제로 설계하면 안 된다.
프론트는 반드시 `quiz API contract`를 기준으로 움직여야 한다.

초기 진행 방식은 아래 순서로 확정한다.

1. Mock 데이터로 View 구현
2. 백엔드가 `submissions + hints`를 읽어서 퀴즈용 DTO 반환
3. 퀴즈 전용 테이블 도입

---

## 핵심 방향

### 1. 1차는 View만 만든다

이번 단계의 목표는 아래만 만족하면 된다.

- 퀴즈 목록을 볼 수 있다.
- 퀴즈를 시작할 수 있다.
- 문제를 풀 수 있다.
- 제출 후 결과를 볼 수 있다.

퀴즈 생성 로직, 채점 고도화, 오답 집계는 이번 단계의 구현 범위가 아니다.
다만 나중에 확장 가능하도록 문서와 타입은 방향을 잡아둔다.

### 2. 단답식부터 시작한다

초기 문제 타입은 `short_answer`만 구현한다.

이유:

- 현재 제품 흐름과 가장 잘 맞는다.
- 구현 비용이 가장 낮다.
- 기존 문제/힌트 구조와 연결하기 쉽다.

다만 장기적으로는 아래 타입까지 확장 가능하게 설계한다.

- `multiple_choice`
- `true_false`
- `fill_blank`

### 3. 문제 타입과 오답 유형은 분리한다

이건 반드시 분리해야 한다.

- `question_type`: UI 입력 방식
- `mistake_type`: 사용자의 약점/오답 유형

예:

- `question_type = short_answer`
- `mistake_type = boundary_condition_missing`

### 4. 가장 많이 틀린 유형을 집계해 추천한다

이게 장기 기능의 핵심이다.

사용자의 누적 데이터가 쌓이면:

1. 정오답 이력을 저장한다.
2. 오답을 `mistake_type`으로 분류한다.
3. 유형별 오답 횟수를 집계한다.
4. 가장 많이 틀린 유형을 우선순위로 정렬한다.
5. 그 유형을 기준으로 퀴즈 세트와 문제를 생성한다.

즉 기본 추천 진입점은 아래다.

- 시스템 추천: 가장 많이 틀린 유형 기반
- 사용자 요청: 특정 유형 또는 특정 개념 기반

---

## 많이 틀린 유형 집계 기반 생성

이 부분은 이번 문서에서 가장 중요한 확장 방향이다.

### 목표

- 사용자의 누적 오답 데이터를 분석한다.
- `mistake_type`별 빈도를 집계한다.
- 가장 취약한 유형부터 복습용 퀴즈를 자동 생성한다.

### 예시 흐름

1. 사용자가 여러 퀴즈/문제를 푼다.
2. 각 오답은 하나 이상의 `mistake_type`으로 분류된다.
3. 시스템이 사용자별로 유형 빈도를 집계한다.
4. 예를 들어 `off_by_one`이 가장 높으면 그 유형 중심 퀴즈를 만든다.
5. 결과적으로 사용자는 "내가 가장 자주 틀리는 유형"을 집중 복습하게 된다.

### 예시 오답 유형

- `time_complexity_confusion`
- `boundary_condition_missing`
- `data_structure_mismatch`
- `input_parsing_error`
- `off_by_one`

### 생성 우선순위 기준

우선순위는 아래 순서로 잡는다.

1. 가장 많이 틀린 `mistake_type`
2. 최근에도 반복되는 `mistake_type`
3. 사용자가 직접 요청한 `mistake_type`
4. 사용자가 직접 요청한 `concept tag`

---

## 사용자 요청 기반 생성

자동 추천 외에, 사용자가 직접 요청하는 흐름도 지원한다.

예:

- "경계조건 실수 유형 문제 만들어줘"
- "스택 관련 퀴즈 만들어줘"
- "시간복잡도 헷갈리는 유형으로 문제 내줘"

즉 생성 기준은 최소 2개다.

1. `mistake_type` 기준
2. `concept tag` 기준

이 흐름은 나중에 추천 기능과 별개로 동작할 수 있게 설계한다.

---

## 1차 구현 범위

이번 단계에서는 아래만 구현한다.

### 화면 범위

- 퀴즈 목록 화면
- 퀴즈 진행 화면
- 퀴즈 결과 화면

### 문제 타입

- `short_answer`만 구현

### 상태

최소 상태는 아래로 확정한다.

- `list`
- `loading`
- `empty`
- `session`
- `submitting`
- `result`
- `error`

### 데이터 소스

- 우선은 Mock 데이터
- 이후 동일 타입 구조로 API 연동

---

## 프론트엔드 설계 원칙

- 프론트는 퀴즈를 렌더링하는 역할만 맡는다.
- 퀴즈 생성 로직은 프론트에 넣지 않는다.
- 채점 세부 규칙은 백엔드 책임으로 둔다.
- 오답 유형 분류 규칙도 백엔드 책임으로 둔다.
- 프론트는 `question_type`을 보고 입력 UI만 분기한다.

즉 Strategy Pattern은 프론트에서는 `입력 UI 전략`에만 쓴다.

---

## 권장 타입 구조

### 1차 구현용 최소 타입

```ts
type QuestionType = 'short_answer';

type QuizScreenState =
  | 'list'
  | 'loading'
  | 'empty'
  | 'session'
  | 'submitting'
  | 'result'
  | 'error';

interface QuizSetSummary {
  id: number;
  title: string;
  description: string;
  question_count: number;
  created_at: string;
}

interface QuizQuestion {
  id: number;
  question_type: QuestionType;
  content: string;
}

interface QuizAnswerDraft {
  question_id: number;
  user_answer: string;
}

interface QuizQuestionResult {
  question_id: number;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  mistake_types?: string[];
}

interface QuizSubmitResult {
  score: number;
  total: number;
  results: QuizQuestionResult[];
}
```

중요:

- 문제 조회 응답에는 정답을 포함하지 않는다.
- 정답은 제출 결과에서만 내려준다.

### 확장용 타입

```ts
type ExtendedQuestionType =
  | 'short_answer'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank';

interface AnswerSpec {
  type: 'exact' | 'normalized' | 'keyword_set';
  value: string;
  aliases?: string[];
}

interface ExtendedQuizQuestion {
  id: number;
  question_type: ExtendedQuestionType;
  content: string;
  explanation?: string;
  options?: string[];
  answer_spec?: AnswerSpec;
  tags?: string[];
  mistake_types?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  source_submission_id?: number;
  source_hint_id?: number;
}
```

정리:

- 지금은 최소 타입으로 시작한다.
- 나중에 생성형 문제와 오답 기반 추천이 구체화되면 확장 타입을 붙인다.

---

## 화면 구조

```text
QuizSetList
  -> QuizSession
  -> QuizResult
```

보조 흐름:

- 목록 로딩 실패 -> `error`
- 목록 비어 있음 -> `empty`
- 제출 중 -> `submitting`

---

## 파일 구조

```text
frontend/src/
├── components/
│   ├── quiz/
│   │   ├── QuizPage.tsx
│   │   ├── QuizSetList.tsx
│   │   ├── QuizSession.tsx
│   │   ├── QuizResult.tsx
│   │   └── AnswerInput.tsx
├── api/
│   └── quiz.ts
```

기존 수정 파일:

- `frontend/src/components/Header.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

---

## API 계획

### 1. 퀴즈 세트 목록 조회

```http
GET /quiz/sets
Authorization: Bearer <token>
```

Response:

```json
{
  "items": [
    {
      "id": 1,
      "title": "자료구조 기초",
      "description": "스택, 큐, 연결리스트",
      "question_count": 10,
      "created_at": "2026-04-27T00:00:00Z"
    }
  ]
}
```

### 2. 퀴즈 문제 조회

```http
GET /quiz/sets/{set_id}
Authorization: Bearer <token>
```

Response:

```json
{
  "set_id": 1,
  "title": "자료구조 기초",
  "questions": [
    {
      "id": 1,
      "question_type": "short_answer",
      "content": "스택의 push/pop 시간복잡도는?"
    }
  ]
}
```

주의:

- 여기서는 `answer`를 내려주지 않는다.

### 3. 퀴즈 제출

```http
POST /quiz/submit
Authorization: Bearer <token>
```

Body:

```json
{
  "set_id": 1,
  "answers": [
    { "question_id": 1, "user_answer": "O(1)" }
  ]
}
```

Response:

```json
{
  "score": 1,
  "total": 1,
  "results": [
    {
      "question_id": 1,
      "is_correct": true,
      "correct_answer": "O(1)",
      "explanation": "push/pop은 일반적으로 상수 시간이다.",
      "mistake_types": []
    }
  ]
}
```

### 4. 유형 기반 퀴즈/문제 생성

```http
POST /quiz/generate
Authorization: Bearer <token>
```

Body 예시 1: 가장 많이 틀린 유형 기반 추천

```json
{
  "mode": "weakness_based",
  "limit": 5
}
```

Body 예시 2: 특정 오답 유형 요청

```json
{
  "mode": "requested_type",
  "mistake_type": "boundary_condition_missing",
  "limit": 5
}
```

Body 예시 3: 특정 개념 요청

```json
{
  "mode": "requested_concept",
  "tag": "stack",
  "limit": 5
}
```

Response:

```json
{
  "set_id": 101,
  "title": "경계조건 보완 퀴즈",
  "generation_reason": "weakness_based",
  "questions": [
    {
      "id": 1,
      "question_type": "short_answer",
      "content": "배열 인덱스를 순회할 때 마지막 원소 처리에서 자주 발생하는 실수는?"
    }
  ]
}
```

---

## 구현 단계

### Step 1. Mock 기반 View 구현

- `api/quiz.ts`에 Mock 데이터 작성
- 목록 -> 진행 -> 제출 -> 결과 흐름 구현
- 백엔드 없이도 전체 화면이 동작하게 만든다

### Step 2. 최소 상태 만족

- `list`
- `loading`
- `empty`
- `session`
- `submitting`
- `result`
- `error`

### Step 3. App/Header 연결

- `Header.tsx`에 `quiz` 탭 추가
- `App.tsx`에 `viewMode === 'quiz'` 분기 추가

### Step 4. 백엔드 DTO 연동

- Mock 구조와 같은 응답 형태로 API 연결
- 프론트 구조는 최대한 바꾸지 않는다

### Step 5. 오답 유형 저장 구조 추가

- 제출 결과에 `mistake_types`를 연결할 수 있게 준비
- 사용자 이력 기준으로 유형별 분석이 가능하게 한다

### Step 6. 많이 틀린 유형 집계 로직 추가

- 사용자별 `mistake_type` 빈도 집계
- 가장 취약한 유형 우선순위 산출

### Step 7. 생성 로직 추가

- 시스템 추천: 가장 많이 틀린 유형 기반 생성
- 사용자 요청: 특정 유형 기반 생성
- 사용자 요청: 특정 개념 기반 생성

---

## 나중에 필요한 백엔드/DB 확장

### 추천 테이블 개념

1. `quiz_sets`
2. `quiz_questions`
3. `quiz_attempts`
4. `quiz_attempt_answers`
5. `mistake_types`
6. `attempt_mistake_types`

### 역할

- `quiz_sets`: 사용자에게 보여줄 퀴즈 묶음
- `quiz_questions`: 실제 문제
- `quiz_attempts`: 퀴즈 시도 단위
- `quiz_attempt_answers`: 문제별 답안과 정오답
- `mistake_types`: 오답 유형 사전
- `attempt_mistake_types`: 특정 오답과 유형 연결

### 추천 사항

- `mistake_type`은 문자열 자유입력보다 코드값으로 관리한다.
- 오답 집계는 사용자 기준으로 가능해야 한다.
- 나중에는 `concept tag`도 별도 관리하는 것이 좋다.

---

## 최종 구현 순서

최종 순서는 아래로 확정한다.

1. Mock 기반 퀴즈 View 완성
2. API contract 확정
3. 백엔드에서 `submissions + hints` 기반 DTO 반환
4. 퀴즈 전용 테이블 도입
5. 오답 유형 저장 구조 추가
6. 많이 틀린 유형 집계 로직 추가
7. 많이 틀린 유형 기반 추천 생성
8. 사용자 요청 기반 생성 추가

---

## 최종 판단

이 계획의 핵심은 아래다.

- 지금은 `short_answer` View부터 만든다.
- 정답은 문제 조회에서 내려주지 않는다.
- 문제 타입과 오답 유형은 분리한다.
- 나중에는 사용자별 `가장 많이 틀린 유형`을 집계해 퀴즈와 문제를 생성한다.
- 사용자가 직접 유형이나 개념을 요청하는 생성 흐름도 지원한다.

즉 1차는 단순한 퀴즈 화면 구현이지만, 장기적으로는 `사용자 약점 기반 학습 시스템`으로 확장하는 방향이다.
