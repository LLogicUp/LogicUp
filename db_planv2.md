# LogicUp DB 연동 계획 v2

## 목표

현재 LogicUp은 힌트 요청 결과가 메모리에만 남아서 새로고침이나 재접속 시 이력이 사라진다.  
이번 1차 목표는 아래 두 가지다.

1. `/hint` 요청 결과를 DB에 저장한다.
2. 저장된 힌트 이력을 조회하는 `GET /history` API와 프론트 화면을 추가한다.

이번 버전은 실제 사용자 가치가 바로 생기는 범위만 우선 구현한다.  
로그인, 사용자별 데이터 분리, 오류 타입 분류는 2차 작업으로 미룬다.

---

## 현재 코드 기준 전제

- 백엔드는 FastAPI 단일 라우터 구조다.
  - `backend/router.py`
  - `backend/main.py`
- 요청 모델은 현재 `backend/models.py`의 Pydantic 모델을 사용 중이다.
- 프론트는 React Router 없이 `App.tsx` 상태 분기로 화면을 제어한다.
- `Header`의 `source` 상태는 현재 "문제 입력 방식" 의미로 사용되고 있다.

따라서 이번 작업은 기존 구조를 크게 깨지 않고, 필요한 최소 변경만 추가하는 방향으로 진행한다.

---

## 1차 DB 스키마

이번 버전에서는 아래 2개 테이블만 만든다.

```sql
submissions
- id (PK)
- source varchar(20) not null                -- direct | baekjoon | oj
- external_problem_id varchar(100) null      -- source별 외부 문제 식별자
- problem text not null default ''
- expected_input text not null default ''
- expected_output text not null default ''
- code text not null
- error_log text not null default ''
- created_at timestamp not null default now()

hints
- id (PK)
- submission_id integer not null references submissions(id) on delete cascade
- hint_level integer not null
- explanation text not null default ''
- pseudocode text not null default ''
- created_at timestamp not null default now()
```

### 왜 2개만 두는가

- 지금 실제 기능은 "제출 저장"과 "힌트 저장"이면 충분하다.
- `users`, `error_types`를 지금 넣어도 현재 코드에서는 사용하지 않는다.
- nullable FK를 미리 깔아두는 방식은 스키마만 복잡해지고, 쿼리와 테스트 포인트만 늘어난다.

### `external_problem_id`를 두는 이유

- 현재는 사실상 BOJ 문제 번호를 저장하는 용도에 가깝다.
- 하지만 이미 프론트 `source`에는 `oj`가 존재하므로, 향후 다른 온라인 저지 식별자가 들어올 가능성이 있다.
- 그래서 `problem_number` 또는 `boj_problem_number` 대신 `external_problem_id`로 두고, 의미는 `source`와 조합해서 해석하는 편이 확장에 유리하다.

예:

- `source = 'baekjoon'`, `external_problem_id = '2557'`
- `source = 'oj'`, `external_problem_id = 'abc123'`

필요하면 2차에서 `problem_url`을 별도 컬럼으로 추가할 수 있다.

---

## 보류할 스키마

이번 버전에서는 아래를 제외한다.

### users

- 아직 로그인 기능이 없다.
- 현재 힌트 이력은 전역 이력 또는 향후 세션 단위 이력만으로도 시작 가능하다.
- 인증 방식이 정해진 뒤 추가하는 편이 낫다.

### error_types

- 현재 요청에는 구조화된 오류 분류 데이터가 없다.
- 향후 LLM 또는 별도 분석기로 분류하는 정책이 정해진 뒤 추가하는 편이 낫다.

---

## 기술 선택

| 항목 | 선택 | 이유 |
|------|------|------|
| DB | PostgreSQL | 텍스트 저장, 정렬, 향후 분석 쿼리에 안정적 |
| ORM | SQLAlchemy 2.0 | FastAPI와 조합이 일반적이고 Alembic 연동이 편함 |
| 드라이버 | psycopg2-binary | 로컬 개발 환경에서 빠르게 연결 가능 |
| 마이그레이션 | Alembic | 스키마 변경 이력 관리 |

---

## 백엔드 구현 계획

### Step 1. 환경 변수 추가

`backend/.env` 또는 현재 백엔드가 읽는 환경 파일에 아래 값을 추가한다.

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/logicup
```

주의:

- 실제 레포에서 `load_dotenv()`는 `backend/config.py`에 있으므로, 백엔드 실행 위치와 `.env` 위치를 맞춰야 한다.
- 필요하면 루트 `.env` 대신 `backend/.env`로 정리하는 편이 명확하다.

### Step 2. DB 연결 파일 추가

신규 파일:

- `backend/database.py`

포함 내용:

- `engine = create_engine(...)`
- `SessionLocal = sessionmaker(...)`
- `Base = DeclarativeBase`
- `get_db()` dependency
- `pool_pre_ping=True`

권장 구현:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
```

이유:

- `db.flush()` 이후 `Hint` 저장 또는 `db.commit()` 단계에서 예외가 발생할 수 있다.
- 이때 rollback이 없으면 세션 상태가 꼬이거나 flush된 데이터가 비정상 상태로 남을 수 있다.
- 세션 dependency 레벨에서 rollback 정책을 명시하는 편이 안전하다.

### Step 3. ORM 모델 추가

신규 파일:

- `backend/db_models.py`

모델:

- `Submission`
- `Hint`

설계 포인트:

- `Submission` 1:N `Hint`
- `created_at`은 DB default 기준으로 저장
- `source`는 문자열 컬럼으로 저장
- `external_problem_id`는 문자열 컬럼으로 저장

### Step 4. Alembic 설정

신규/추가:

- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/xxxx_initial_history.py`

설정 포인트:

- `target_metadata = Base.metadata`
- `DATABASE_URL`을 환경 변수에서 읽도록 설정

### Step 5. `/hint` 저장 로직 추가

수정 파일:

- `backend/router.py`

변경 내용:

1. `db: Session = Depends(get_db)` 추가
2. 기존 LLM 호출 전후 흐름은 유지
3. 응답 생성 후 다음 순서로 저장

```text
Submission 생성
-> db.add(submission)
-> db.flush()
-> Hint 생성 (submission_id 사용)
-> db.add(hint)
-> db.commit()
```

주의:

- `db.flush()`는 `submission.id`를 commit 전에 얻기 위해 필요하다.
- LLM 호출이 실패하면 저장하지 않는다.
- 1차에서는 DB 저장 실패 시 요청 전체를 실패로 처리하는 편이 단순하다.
- `commit()` 성공 전까지는 요청 성공으로 간주하지 않는다.
- 저장 예외 발생 시 `logger.exception(...)`으로 실패 원인을 남긴다.

### Step 6. `/history` API 추가

수정 파일:

- `backend/router.py`
- 필요 시 `backend/schemas.py` 신규 추가

권장 엔드포인트:

```http
GET /history?page=1&limit=10
```

응답 예시:

```json
{
  "items": [
    {
      "hint_id": 12,
      "submission_id": 5,
      "source": "baekjoon",
      "external_problem_id": "2557",
      "problem": "",
      "hint_level": 2,
      "explanation": "...",
      "pseudocode": "...",
      "code_snippet": "print(input())",
      "created_at": "2026-04-13T12:00:00"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 37
}
```

설계 포인트:

- 정렬은 `hints.created_at DESC`
- `code_snippet`은 `submissions.code` 앞부분 200자만 잘라서 응답
- 페이지네이션 계산을 위해 `total` 포함

---

## 프론트엔드 구현 계획

### 핵심 수정 방향

이번 버전에서는 `source`에 `history`를 추가하지 않는다.

이유:

- 현재 `source`는 direct/baekjoon/OJ 같은 "입력 방식" 상태다.
- 여기에 `history`를 넣으면 화면 전환 상태와 입력 방식 상태가 섞인다.
- 실제로 `App.tsx`에서 `source` 값으로 `/hint` 요청 payload도 바꾼다.

따라서 아래처럼 상태를 분리한다.

```ts
type Source = 'direct' | 'baekjoon' | 'oj';
type ViewMode = 'editor' | 'history';
```

### Step 1. History API 추가

신규 파일:

- `frontend/src/api/history.ts`

포함 내용:

- `fetchHistory(page, limit)` 함수
- `HistoryItem`, `HistoryResponse` 타입

### Step 2. 이력 화면 컴포넌트 추가

신규 파일:

- `frontend/src/components/HistoryPage.tsx`

표시 내용:

- 생성 시각
- `source` / `external_problem_id`
- `hint_level`
- `explanation`
- `pseudocode`
- `code_snippet`
- 이전/다음 페이지 버튼

### Step 3. Header에 화면 전환 추가

수정 파일:

- `frontend/src/components/Header.tsx`

변경 방향:

- 기존 source 탭은 유지
- 별도로 `에디터 / 히스토리` 전환 UI 추가

주의:

- 한 줄 탭으로 섞어 넣기보다 목적별 UI를 분리하는 편이 상태 의미가 명확하다.

### Step 4. App 상태 구조 수정

수정 파일:

- `frontend/src/App.tsx`

변경 내용:

- `viewMode` 상태 추가
- `viewMode === 'history'`이면 `HistoryPage` 렌더
- `viewMode === 'editor'`이면 기존 입력/에디터/힌트 패널 렌더

---

## 파일 변경 요약

### backend

- `database.py` 신규
- `db_models.py` 신규
- `schemas.py` 신규 또는 기존 `models.py` 역할 분리
- `alembic.ini` 신규
- `alembic/env.py` 신규
- `alembic/versions/...` 신규
- `router.py` 수정
- `requirements.txt` 수정

### frontend

- `src/api/history.ts` 신규
- `src/components/HistoryPage.tsx` 신규
- `src/components/Header.tsx` 수정
- `src/App.tsx` 수정

---

## 의존성 추가

`backend/requirements.txt`

```txt
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
alembic>=1.13.0
```

---

## 테스트 방법

### 1. 마이그레이션 테스트

목표:

- 스키마가 계획대로 생성되는지 확인

절차:

1. `alembic upgrade head` 실행
2. PostgreSQL에서 `submissions`, `hints` 테이블 생성 확인
3. 컬럼과 FK 확인

체크 포인트:

- `submissions.external_problem_id`가 존재하는지
- `hints.submission_id` FK가 생성되었는지
- `created_at` 기본값이 들어가는지

### 2. `/hint` 저장 성공 테스트

목표:

- 힌트 응답과 DB 저장이 함께 성공하는지 확인

절차:

1. 백엔드 실행
2. 프론트 또는 API 클라이언트로 `/hint` 요청 전송
3. 요청 성공 후 DB 조회

예시 요청:

```json
{
  "problem_number": 2557,
  "code": "print(input())",
  "error_log": "",
  "hint_level": 1
}
```

체크 포인트:

- `submissions`에 1건 생성되는지
- `hints`에 1건 생성되는지
- `hints.submission_id`가 방금 생성한 `submissions.id`를 참조하는지
- `source`, `external_problem_id`, `code`, `hint_level`이 기대값과 맞는지

구현 메모:

- 현재 요청 모델은 `problem_number`를 받고 있으므로, 저장 시 이를 `external_problem_id=str(problem_number)`로 매핑하면 된다.

### 3. direct 입력 저장 테스트

목표:

- BOJ 번호 없이도 데이터가 정상 저장되는지 확인

절차:

1. direct 입력 방식으로 `/hint` 요청 전송
2. 문제 본문, 입력 예시, 출력 예시를 포함해 호출
3. DB 저장 결과 확인

체크 포인트:

- `external_problem_id`가 `NULL`인지
- `problem`, `expected_input`, `expected_output`이 저장되는지

### 4. `/history` 조회 테스트

목표:

- 최신순 목록과 페이지네이션 응답이 맞는지 확인

절차:

1. 테스트 데이터를 여러 건 생성
2. `GET /history?page=1&limit=10` 호출
3. `GET /history?page=2&limit=10` 호출

체크 포인트:

- 응답에 `items`, `page`, `limit`, `total`이 모두 있는지
- `items`가 `created_at DESC` 순서인지
- `code_snippet`이 잘린 형태로 내려오는지
- 2페이지에서 중복 없이 다음 데이터가 나오는지

### 5. 트랜잭션 롤백 테스트

목표:

- `db.flush()` 이후 예외가 발생해도 데이터가 반쯤 저장되지 않는지 확인

권장 방법:

- 테스트용으로 `Hint` 생성 직전 또는 `commit()` 직전에 의도적으로 예외를 발생시켜 본다.

예시:

```python
db.add(submission)
db.flush()
raise RuntimeError("forced rollback test")
```

체크 포인트:

- 요청이 실패 응답으로 끝나는지
- `submissions`에 flush된 행이 최종적으로 남지 않는지
- 세션이 rollback 후 정상 종료되는지

### 6. 프론트 히스토리 화면 테스트

목표:

- `viewMode` 분리 후 화면 전환과 목록 렌더가 정상 동작하는지 확인

절차:

1. 에디터 화면에서 힌트 몇 건 생성
2. Header에서 히스토리 화면으로 이동
3. 목록, 페이지 이동 버튼, 빈 상태 화면 확인

체크 포인트:

- `source` 상태와 `viewMode` 상태가 충돌하지 않는지
- 히스토리 화면 진입 후 기존 에디터 입력값이 불필요하게 깨지지 않는지
- 데이터가 없을 때 빈 상태 메시지가 나오는지

### 7. 실패 로그 테스트

목표:

- 저장 실패 시 로그가 남는지 확인

절차:

1. DB 연결을 끊거나 테스트 예외를 발생시켜 `/hint` 요청
2. 백엔드 로그 확인

체크 포인트:

- `logger.exception(...)` 로그가 남는지
- 실패 원인 추적이 가능한 메시지인지

---

## 2차 확장 후보

아래는 1차 완료 후 붙이는 편이 낫다.

1. 사용자 인증 및 `users` 테이블 추가
2. 사용자별 히스토리 조회
3. `error_types` 및 자동 분류 로직 추가
4. 검색, 필터, 날짜 범위 조회
5. 힌트 재생성/북마크 같은 사용자 기능

---

## 이번 버전에서 고친 핵심 이유

### 1. 범위를 줄였다

처음 계획은 미래 기능까지 한 번에 스키마에 넣으려는 성격이 강했다.  
하지만 현재 레포에는 로그인도 없고 오류 타입 분류도 없다.  
지금 필요한 기능은 "저장"과 "조회"이므로, 그 범위만 먼저 구현하는 편이 안전하다.

### 2. 현재 프론트 상태 구조와 맞췄다

기존 계획은 `history`를 기존 `source` 탭에 추가하는 방식이었다.  
하지만 현재 코드에서 `source`는 요청 바디 생성에도 직접 쓰이므로, 화면 전환 상태를 넣으면 책임이 섞인다.  
그래서 `viewMode`를 따로 두는 구조로 바꿨다.

### 3. 문제 식별자 설계를 확장 가능하게 바꿨다

기존의 `problem_number`는 지금은 BOJ에 맞지만, 이미 `source='oj'`가 존재하므로 장기적으로는 의미가 좁다.  
`boj_problem_number`로 고정하는 것보다 `external_problem_id`로 두고 `source`와 조합해 해석하는 편이 더 유연하다.

### 4. API 응답 스펙을 구체화했다

기존 계획에는 `GET /history`가 있다는 정도만 있었고, 프론트가 실제로 페이지네이션을 하려면 필요한 `items`, `page`, `limit`, `total`이 명시되지 않았다.  
이번 버전은 바로 구현 가능한 수준으로 응답 구조를 구체화했다.

### 5. 트랜잭션 실패 처리까지 명시했다

기존 계획은 세션 생성과 사용은 적혀 있었지만, `flush()` 이후 예외 처리와 rollback 정책이 문서에 없었다.  
이번 버전은 `get_db()`에 rollback 패턴을 명시해서 반쯤 저장되는 상황을 방지하도록 했다.

### 6. 실제 레포 기준으로 반영했다

현재 백엔드는 `router.py`, `models.py`, `config.py` 중심의 단순 구조이고, 프론트는 React Router 없이 `App.tsx` 상태 분기 방식이다.  
그래서 계획도 그 구조를 유지한 채 최소 침습적으로 변경하도록 정리했다.
