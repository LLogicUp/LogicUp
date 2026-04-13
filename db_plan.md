# LogicUp DB 연동 구현 계획

## Context

LogicUp은 LLM 기반 단계적 힌트 제공 학습 보조 시스템이다. 현재는 힌트가 메모리에만 존재하고 새로고침 시 사라지는 문제가 있다. 사용자가 나중에 자신이 받은 힌트와 제출 코드를 다시 볼 수 있어야 하고, 향후 오류 유형 분석 및 퀴즈 생성(LLM 동적 생성)을 위한 데이터 기반이 필요하다.

로그인 기능은 이번 구현에서 제외하며, DB 구조만 준비해둔다.

---

## DB 스키마 (확정)

```sql
users           -- 테이블만 생성, 실제 사용 안함 (향후 로그인용)
├── id (PK), email, password_hash, created_at

error_types     -- 오류 카테고리 (현재는 NULL 허용, 추후 LLM 파싱으로 채움)
├── id (PK), name

submissions     -- 코드 제출 기록
├── id (PK), user_id (FK, nullable), code, error_type_id (FK, nullable), created_at

hints           -- 힌트 저장 (히스토리 핵심)
├── id (PK), user_id (FK, nullable), submission_id (FK), hint_level, hint_content, created_at
```

> user_id / error_type_id는 지금 nullable로 두고, 로그인 기능 추가 시 채운다.

---

## 기술 선택 이유

| 항목 | 선택 | 이유 |
|------|------|------|
| DB | PostgreSQL | 관계형 데이터 + 복잡한 쿼리 (오류 패턴 분석, 추천), 프로덕션 수준 |
| ORM | SQLAlchemy 2.0 (동기) | 현재 Groq 호출이 동기 방식 — 비동기 혼용 시 문제 발생 방지 |
| 드라이버 | psycopg2-binary | binary 빌드로 컴파일 환경 불필요 |
| 마이그레이션 | Alembic | SQLAlchemy 공식 마이그레이션 툴, autogenerate 지원 |
| 프론트 라우팅 | 탭 분기 (react-router 없음) | 기존 source 상태 구조 재사용, 변경 최소화 |

---

## 구현 단계

### Step 1: DB 준비
- PostgreSQL에 `logicup` DB 생성
- `.env`에 `DATABASE_URL` 추가

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/logicup
```

### Step 2: 백엔드 - DB 연결

**신규 파일: `backend/database.py`**
- `create_engine()`, `SessionLocal`, `get_db()` 의존성 함수
- `pool_pre_ping=True` (장시간 유휴 커넥션 자동 재연결)

**신규 파일: `backend/db_models.py`**
- SQLAlchemy 2.0 스타일 ORM 모델 4개 (User, ErrorType, Submission, Hint)

### Step 3: Alembic 마이그레이션

```bash
cd backend
alembic init alembic
# alembic/env.py 수정: DATABASE_URL 환경변수에서 읽기
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

**수정: `backend/alembic/env.py`**
- `target_metadata = Base.metadata`
- `config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])`

### Step 4: API 수정

**신규 파일: `backend/schemas.py`**
- `HintHistoryItem`, `HistoryResponse` Pydantic 응답 모델
- `model_config = {"from_attributes": True}` (SQLAlchemy ORM → Pydantic 직렬화)

**수정: `backend/router.py`**

1. `/hint` 엔드포인트에 `db: Session = Depends(get_db)` 추가
   - LLM 응답 후 `Submission` 저장 → `db.flush()` → `Hint` 저장 → `db.commit()`
   - `db.flush()` 이유: commit 전에 `submission.id` 확보 (FK에 사용)

2. `GET /history` 엔드포인트 추가
   - `page`, `limit` 쿼리 파라미터로 페이지네이션
   - `Hint` + `Submission` JOIN, `created_at` 내림차순

**수정: `backend/requirements.txt`**
```
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
alembic>=1.13.0
```

### Step 5: 프론트엔드 - 히스토리 탭

**신규 파일: `frontend/src/api/history.ts`**
- `fetchHistory(page, limit)` 함수
- `HintHistoryItem`, `HistoryResponse` 타입 정의

**신규 파일: `frontend/src/components/HistoryPage.tsx`**
- 마운트 시 `fetchHistory()` 호출
- `hint_level`, `code_snippet` (앞 200자), `created_at` 카드 표시
- 이전/다음 페이지네이션 버튼

**수정: `frontend/src/components/Header.tsx`**
- `Source` 타입에 `'history'` 추가
- 탭에 `히스토리` 추가

**수정: `frontend/src/App.tsx`**
- `source === 'history'`일 때 `<HistoryPage />` 렌더링

---

## 변경 파일 요약

```
backend/
├── database.py          [신규]
├── db_models.py         [신규]
├── schemas.py           [신규]
├── alembic.ini          [신규]
├── alembic/env.py       [신규]
├── alembic/versions/0001_initial.py  [신규]
├── router.py            [수정] /hint DB 저장 + GET /history 추가
├── .env                 [수정] DATABASE_URL 추가
└── requirements.txt     [수정] 3개 패키지 추가

frontend/src/
├── api/history.ts       [신규]
├── components/HistoryPage.tsx  [신규]
├── components/Header.tsx       [수정] 'history' 탭
└── App.tsx              [수정] history 분기
```

---

## 검증 방법

1. `alembic upgrade head` 실행 → 4개 테이블 생성 확인
2. 프론트엔드에서 힌트 요청 → PostgreSQL에서 `submissions`, `hints` 레코드 확인
3. `GET /history` 직접 호출 → 저장된 힌트 반환 확인
4. 프론트엔드 `히스토리` 탭 → 카드 목록 렌더링 확인
5. 페이지네이션 버튼 동작 확인
