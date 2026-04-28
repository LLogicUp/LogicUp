# 퀴즈 API 명세서

> 작성일: 2026-04-28
> 상태: 초안
> 목적: 프론트엔드/백엔드 간 API 계약 정의

---

## 공통 규칙

### 인증

모든 엔드포인트는 JWT Bearer 토큰이 필요하다.

```http
Authorization: Bearer <token>
```

인증 실패 시:

```json
HTTP 401
{ "detail": "유효하지 않은 토큰입니다" }
```

### 에러 응답

에러 응답은 아래 형식을 따른다.

```json
{ "detail": "에러 메시지" }
```

주요 상태 코드는 다음을 사용한다.

| 코드 | 의미           |
| ---- | -------------- |
| 401  | 인증 실패      |
| 404  | 리소스 없음    |
| 422  | 요청 형식 오류 |
| 500  | 서버 내부 오류 |

### 데이터 규칙

- 날짜/시간은 ISO 8601 UTC 문자열을 사용한다.
- 배열 필드는 `null` 대신 항상 배열을 반환한다.
- 카테고리 값은 사전에 정의된 목록만 사용한다.




---

## 엔드포인트

| 메서드 | 경로                    | 설명                      |
| ------ | ----------------------- | ------------------------- |
| GET    | `/quiz/categories`    | 카테고리별 누적 횟수 조회 |
| GET    | `/quiz/sets`          | 퀴즈 세트 목록 조회       |
| GET    | `/quiz/sets/{set_id}` | 퀴즈 세트 상세 조회       |
| POST   | `/quiz/submit`        | 답안 제출 및 채점         |

---

## 1. GET /quiz/categories

사용자의 카테고리별 누적 횟수를 반환한다.

### Response `200 OK`

```json
[
  { "category": "배열 인덱스 오류", "count": 7 },
  { "category": "조건문 논리 오류", "count": 3 }
]
```

| 필드         | 타입   | 설명          |
| ------------ | ------ | ------------- |
| `category` | string | 카테고리 이름 |
| `count`    | int    | 누적 횟수     |

비어 있으면 `[]`를 반환한다.

---

## 2. GET /quiz/sets

사용자의 퀴즈 세트 목록을 반환한다.

### Query Parameters

| 파라미터     | 타입   | 필수 | 설명                    |
| ------------ | ------ | ---- | ----------------------- |
| `category` | string | -    | 특정 카테고리 기준 필터 |

### Response `200 OK`

[
  {
    "id": 42,
    "title": "백준 1001번",
    "description": "힌트 3개 · 배열 인덱스 오류, 조건문 논리 오류",
    "question_count": 3,
    "categories": ["배열 인덱스 오류", "조건문 논리 오류"]
  }
]

| 필드               | 타입     | 설명                        |
| ------------------ | -------- | --------------------------- |
| `id`             | int      | 세트 ID                     |
| `title`          | string   | 세트 제목                   |
| `description`    | string   | 세트 요약 설명              |
| `question_count` | int      | 문제 수                     |
| `categories`     | string[] | 세트에 포함된 카테고리 목록 |
|                    |          |                             |

---

## 3. GET /quiz/sets/

특정 퀴즈 세트의 문제 목록을 반환한다. 정답은 포함하지 않는다.

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
    }
  ]
}
```

| 필드                          | 타입     | 설명          |
| ----------------------------- | -------- | ------------- |
| `id`                        | int      | 세트 ID       |
| `title`                     | string   | 세트 제목     |
| `questions`                 | array    | 문제 목록     |
| `questions[].id`            | int      | 문제 ID       |
| `questions[].question_type` | string   | 문제 유형     |
| `questions[].content`       | string   | 문제 내용     |
| `questions[].categories`    | string[] | 관련 카테고리 |

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

---

## 4. POST /quiz/submit

답안을 제출하고 채점 결과를 반환한다.

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

| 필드                      | 타입   | 필수 | 설명        |
| ------------------------- | ------ | ---- | ----------- |
| `set_id`                | int    | O    | 세트 ID     |
| `answers`               | array  | O    | 답안 목록   |
| `answers[].question_id` | int    | O    | 문제 ID     |
| `answers[].user_answer` | string | O    | 사용자 답안 |

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
    }
  ]
}
```

| 필드                         | 타입     | 설명                |
| ---------------------------- | -------- | ------------------- |
| `score`                    | int      | 맞힌 문제 수        |
| `total`                    | int      | 전체 문제 수        |
| `results`                  | array    | 문제별 채점 결과    |
| `results[].question_id`    | int      | 문제 ID             |
| `results[].is_correct`     | bool     | 정오답 여부         |
| `results[].correct_answer` | string   | 정답 또는 기준 답안 |
| `results[].explanation`    | string   | 해설                |
| `results[].mistake_types`  | string[] | 관련 카테고리       |

### Response `404 Not Found`

```json
{ "detail": "퀴즈 세트를 찾을 수 없습니다" }
```

---

## 비고

- 내부 DB 구조, ORM 모델, 마이그레이션 방식은 이 문서에서 규정하지 않는다.
- 채점 방식, 세트 생성 방식, 제목 생성 규칙 등 세부 구현은 각 구현체에서 결정한다.
- 프론트엔드는 이 문서의 요청/응답 형식만 신뢰하고 사용한다.
