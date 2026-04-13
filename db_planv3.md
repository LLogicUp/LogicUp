# LogicUp DB 연동 계획 v3

## 목표

`v2`에서는 힌트 저장과 조회를 중심으로 설계했다.  
이제 로그인 기능이 추가됐으므로 `v3`의 목표는 단순 저장/조회가 아니라 "사용자별 히스토리"로 기준을 바꾸는 것이다.

이번 버전의 핵심 목표는 아래 4가지다.

1. 힌트/제출 데이터를 `users`와 연결한다.
2. `/hint` 저장 시 로그인 사용자의 `user_id`를 함께 기록한다.
3. `/history`를 전역 이력이 아니라 "내 히스토리" 기준으로 바꾼다.
4. 인증이 추가된 현재 구조에 맞게 마이그레이션과 API 정책을 정리한다.

---

## 현재 구현 상태 요약

현재 레포에는 아래가 이미 들어가 있다.

- `backend/auth_router.py`
  - `/register`
  - `/login`
- `backend/auth.py`
  - JWT 생성
  - `get_current_user()`
- `backend/db_models.py`
  - `User`
  - `Submission`
  - `Hint`
- `backend/router.py`
  - `/hint`
  - `/history`

하지만 구조상 아직 미완성인 부분이 있다.

### 현재 문제점

1. `users` 테이블은 ORM에만 있고, `submissions` / `hints`와 연결되지 않았다.
2. `/history`는 로그인 사용자 기준이 아니라 전체 힌트 목록을 반환한다.
3. `/hint`는 인증 없이도 저장되며, 저장 데이터에 사용자 정보가 없다.
4. `backend/main.py`에서 `Base.metadata.create_all(bind=engine)`를 실행하고 있어서, Alembic 기반 스키마 관리와 역할이 겹친다.
5. 프론트의 히스토리 조회는 토큰을 보내지 않는다.

즉, "로그인은 생겼지만 사용자별 데이터 모델링은 아직 연결되지 않은 상태"다.

---

## v3 방향

### 핵심 원칙

- 힌트 이력은 사용자 자산으로 취급한다.
- 로그인한 사용자의 요청은 반드시 해당 사용자와 연결해 저장한다.
- 히스토리 API는 기본적으로 "내 데이터만" 반환한다.
- 비로그인 상태 정책은 문서에서 명확히 정한다.

이번 버전에서는 정책을 아래처럼 잡는 것이 가장 단순하다.

### 권장 정책

1. `/hint`는 로그인한 사용자만 사용할 수 있게 바꾼다.
2. `/history`도 로그인한 사용자만 조회 가능하게 한다.
3. 저장되는 모든 `Submission`은 `user_id`를 가진다.

이 정책이 가장 단순한 이유는 다음과 같다.

- 익명 데이터와 회원 데이터를 같이 다루는 분기 로직이 줄어든다.
- 히스토리 보안 사고 가능성이 낮아진다.
- 향후 "내가 받은 힌트 보기" 기능과 자연스럽게 이어진다.

만약 비로그인 힌트 사용을 유지하고 싶다면, 그건 별도 정책으로 문서 끝에 대안으로 분리한다.

---

## DB 스키마 v3

### users

이미 존재하는 구조를 유지한다.

```sql
users
- id (PK)
- userid varchar(20) unique not null
- password_hash varchar(255) not null
- created_at timestamp not null default now()
```

### submissions

`user_id`를 추가한다.

```sql
submissions
- id (PK)
- user_id integer not null references users(id) on delete cascade
- source varchar(20) not null
- external_problem_id varchar(100) null
- problem text not null default ''
- expected_input text not null default ''
- expected_output text not null default ''
- code text not null
- error_log text not null default ''
- created_at timestamp not null default now()
```

### hints

현 구조를 유지해도 된다.

```sql
hints
- id (PK)
- submission_id integer not null references submissions(id) on delete cascade
- hint_level integer not null
- explanation text not null default ''
- pseudocode text not null default ''
- created_at timestamp not null default now()
```

### 왜 `hints`에 직접 `user_id`를 넣지 않는가

- `Hint`는 이미 `Submission`에 종속된 데이터다.
- 사용자 정보는 `Submission -> User` 경로로 알 수 있다.
- `hints.user_id`까지 추가하면 중복 데이터가 생기고 정합성 포인트가 늘어난다.

---

## 마이그레이션 계획

현재는 이미 `initial_history` 마이그레이션이 있고, ORM에는 `User`가 있지만 초기 migration에는 `users` 테이블 생성이 없다.  
또 `main.py`에서 `create_all()`이 돌아가고 있어서 운영 기준으로는 상태가 불명확해질 수 있다.

따라서 `v3`에서는 마이그레이션 전략을 먼저 정리해야 한다.

### Step 1. Alembic을 단일 기준으로 삼기

수정 파일:

- `backend/main.py`

변경:

- `Base.metadata.create_all(bind=engine)` 제거

이유:

- 앱 실행 시점 자동 생성과 Alembic migration을 같이 쓰면 환경마다 테이블 상태가 달라질 수 있다.
- 운영 기준 스키마 변경은 migration만 신뢰하는 편이 맞다.

### Step 2. 사용자 연동 migration 추가

신규 migration 예시:

- `add_user_id_to_submissions`

작업 내용:

1. `users` 테이블이 DB에 없으면 생성
2. `submissions.user_id` 컬럼 추가
3. FK 연결
4. 인덱스 추가

주의:

- 기존 `submissions` 데이터가 이미 있다면 `user_id NOT NULL`을 바로 추가할 수 없다.

따라서 마이그레이션은 아래 순서가 안전하다.

1. `user_id nullable=True`로 추가
2. 기존 데이터 백필 또는 정리
3. `nullable=False`로 변경

### 기존 데이터 처리 정책

선택지는 두 가지다.

#### 권장안

- 개발 단계라면 기존 `submissions`, `hints` 데이터를 초기화하고 깔끔하게 다시 migration한다.

이유:

- 현재 기능이 막 들어간 단계라면 데이터 정합성보다 구조 안정화가 더 중요하다.
- 익명 데이터에 임의 사용자 매핑을 만드는 것보다 안전하다.

#### 대안

- 임시 시스템 계정 예: `legacy_user`를 만들고 기존 `submissions`를 모두 이 사용자에 귀속시킨다.

이 대안은 데이터 보존이 꼭 필요할 때만 쓴다.

---

## 백엔드 구현 계획

### Step 1. ORM 모델 수정

수정 파일:

- `backend/db_models.py`

변경 내용:

- `Submission.user_id` 추가
- `Submission.user = relationship("User", back_populates=...)` 추가
- `User.submissions` 관계 추가

예상 구조:

```python
class User(Base):
    __tablename__ = "users"
    ...
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"
    ...
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user = relationship("User", back_populates="submissions")
```

### Step 2. `/hint`를 인증 기반으로 전환

수정 파일:

- `backend/router.py`

변경 내용:

- `current_user_id: int = Depends(get_current_user)` 추가
- `Submission` 생성 시 `user_id=current_user_id` 저장

예시 방향:

```python
@router.post("/hint")
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ...
    submission = Submission(
        user_id=current_user_id,
        ...
    )
```

이렇게 바꾸면 로그인 없는 요청은 자동으로 401이 된다.

### Step 3. `/history`를 내 히스토리로 변경

수정 파일:

- `backend/router.py`

변경 내용:

- `current_user_id: int = Depends(get_current_user)` 추가
- `Submission.user_id == current_user_id` 조건으로 필터링
- `total`도 같은 조건 기준으로 계산

예시 방향:

```python
total = (
    db.query(Hint)
    .join(Submission)
    .filter(Submission.user_id == current_user_id)
    .count()
)
```

### Step 4. 응답 스키마 보강

수정 파일:

- `backend/schemas.py`

권장 추가 필드:

- `userid`는 꼭 필요하지 않다. 내 히스토리 API이기 때문이다.
- 대신 향후 UI에 필요할 수 있는 `has_pseudocode` 정도는 파생값으로 고려 가능하다.

이번 버전에서는 응답 스키마를 크게 늘리기보다 인증 범위와 필터링 정확성을 우선한다.

### Step 5. 인증 예외와 로깅 정리

수정 파일:

- `backend/router.py`
- 필요 시 `backend/auth.py`

정리할 점:

- 401 응답 메시지를 일관되게 유지
- 저장 실패는 `logger.exception(...)`로 남김
- 히스토리 조회도 사용자 기준으로 로그를 남김

예:

- `history 조회 | user_id=3 | page=1 | limit=10`
- `hint 저장 실패 | user_id=3`

---

## 프론트엔드 구현 계획

현재 프론트에는 로그인 화면/토큰 저장 구조가 검색되지 않았다.  
백엔드에 로그인 API는 있지만, `HistoryPage`와 `/hint` 요청은 인증 헤더 없이 호출하고 있다.

따라서 프론트는 최소한 아래까지는 필요하다.

### Step 1. 토큰 저장 방식 결정

권장:

- 1차는 `localStorage`에 access token 저장

이유:

- 구현이 가장 단순하다.
- 현재 구조에서는 서버 사이드 렌더링도 없고 별도 보안 인프라도 없다.

주의:

- 장기적으로는 HttpOnly cookie 방식이 더 낫지만, 이번 범위에서는 과하다.

### Step 2. 인증 API 래퍼 추가

신규 파일 권장:

- `frontend/src/api/auth.ts`

포함 내용:

- `login(userid, password)`
- `register(userid, password)`
- `getAccessToken()`
- `setAccessToken()`
- `clearAccessToken()`

### Step 3. 공통 인증 헤더 적용

수정 파일:

- `frontend/src/api/history.ts`
- `frontend/src/App.tsx` 또는 공통 fetch 유틸

변경 내용:

- `/hint` 호출 시 `Authorization: Bearer <token>` 추가
- `/history` 호출 시 `Authorization: Bearer <token>` 추가

가능하면 fetch 유틸 하나로 묶는 편이 낫다.

예:

```ts
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
}
```

### Step 4. 로그인 상태 UI 추가

신규 컴포넌트 후보:

- `frontend/src/components/AuthPanel.tsx`

최소 기능:

- 회원가입
- 로그인
- 로그아웃
- 현재 로그인 여부 표시

### Step 5. 비로그인 접근 처리

정책:

- 비로그인 상태에서 `history` 진입 시 로그인 유도 메시지 표시
- 비로그인 상태에서 힌트 요청 시 먼저 로그인 필요 메시지 표시

이렇게 하면 백엔드 401과 프론트 UX가 맞는다.

---

## API 정책 정리

### `/register`

- 공개 API
- 중복 `userid` 검사

### `/login`

- 공개 API
- 성공 시 JWT 반환

### `/hint`

- 인증 필요
- 저장과 응답 모두 로그인 사용자 기준

### `/history`

- 인증 필요
- 로그인한 사용자의 데이터만 반환

---

## 테스트 방법

### 1. 회원가입/로그인 테스트

목표:

- 인증 흐름이 정상 동작하는지 확인

절차:

1. `/register` 호출
2. 같은 계정으로 `/login` 호출
3. 응답에서 access token 확인

체크 포인트:

- 중복 회원가입 시 400이 나는지
- 올바른 비밀번호면 토큰이 반환되는지
- 잘못된 비밀번호면 401이 나는지

### 2. 비로그인 `/hint` 차단 테스트

목표:

- 인증 없는 힌트 요청이 막히는지 확인

절차:

1. Authorization 헤더 없이 `/hint` 호출

체크 포인트:

- 401 응답이 오는지
- DB에 `submissions`, `hints`가 생성되지 않는지

### 3. 로그인 `/hint` 저장 테스트

목표:

- 힌트 저장 시 `user_id`가 함께 기록되는지 확인

절차:

1. 사용자 A 로그인
2. 토큰으로 `/hint` 요청
3. DB 조회

체크 포인트:

- `submissions.user_id`가 사용자 A의 id인지
- `hints`가 정상 생성되는지
- `external_problem_id`와 `source`가 기대값과 맞는지

### 4. 사용자별 `/history` 분리 테스트

목표:

- 다른 사용자 데이터가 섞이지 않는지 확인

절차:

1. 사용자 A로 힌트 2건 생성
2. 사용자 B로 힌트 1건 생성
3. 사용자 A 토큰으로 `/history` 조회
4. 사용자 B 토큰으로 `/history` 조회

체크 포인트:

- A는 자신의 2건만 보는지
- B는 자신의 1건만 보는지
- 전체 개수 `total`도 사용자별로 계산되는지

### 5. 토큰 누락/오류 테스트

목표:

- 보호 API의 인증 실패 동작을 확인

절차:

1. 토큰 없이 `/history` 호출
2. 잘못된 토큰으로 `/history` 호출
3. 만료 토큰으로 `/history` 호출

체크 포인트:

- 모두 401 응답인지
- 에러 메시지가 일관적인지

### 6. 롤백 테스트

목표:

- `db.flush()` 이후 예외 발생 시 반쯤 저장되지 않는지 확인

절차:

1. 로그인 사용자로 `/hint` 요청
2. 테스트용 예외를 `flush()` 이후 강제로 발생

체크 포인트:

- `submissions`에 행이 남지 않는지
- `hints`에도 행이 남지 않는지
- `get_db()` rollback으로 세션이 정리되는지

### 7. 프론트 인증 연동 테스트

목표:

- 로그인 후 힌트 요청과 히스토리 조회가 이어지는지 확인

절차:

1. 프론트에서 로그인
2. 힌트 요청
3. 히스토리 화면 이동

체크 포인트:

- 토큰이 저장되는지
- `/hint`와 `/history`에 Authorization 헤더가 붙는지
- 히스토리에 방금 만든 데이터가 보이는지

---

## 구현 우선순위

### 1순위

- `submissions.user_id` 추가
- `/hint` 인증 적용
- `/history` 사용자 필터 적용

### 2순위

- 프론트 토큰 저장
- 로그인 UI
- 공통 인증 fetch 유틸

### 3순위

- 비로그인 UX 정리
- 에러 메시지 정리
- 조회 화면 개선

---

## 비로그인 허용 대안

만약 제품 정책상 비로그인 상태에서도 힌트 사용을 허용해야 한다면 아래 대안을 쓸 수 있다.

### 대안 정책

- `submissions.user_id nullable=True`
- 로그인 사용자는 `user_id` 저장
- 비로그인은 `NULL` 저장
- `/history`는 로그인 사용자만 조회 가능

이 방식의 장단점:

- 장점: 비로그인 사용성 유지
- 단점: 익명 데이터는 사용자 히스토리와 분리되고, 나중에 계정 연결도 복잡해짐

현재 단계에서는 단순성과 보안을 위해 "로그인 필수"가 더 낫다.

---

## 이번 v3에서 바뀐 핵심 이유

### 1. 로그인 기능이 이미 추가됐다

`v2`에서는 로그인 기능이 없다는 전제로 `users`를 보류했지만, 현재는 JWT 기반 로그인 API가 이미 존재한다.  
따라서 `users`를 더 이상 미래 범위로 둘 이유가 없고, 히스토리 설계에 직접 포함해야 한다.

### 2. 현재 히스토리 구현은 보안 경계가 없다

지금 `/history`는 로그인 여부와 상관없이 전체 힌트를 반환한다.  
로그인 기능이 있는 상태에서는 이 구조가 가장 먼저 수정돼야 한다.

### 3. 데이터 모델과 인증 모델을 연결해야 한다

로그인만 있고 저장 데이터에 `user_id`가 없으면, 인증 기능은 있어도 사용자별 서비스가 되지 않는다.  
그래서 `Submission.user_id`를 중심으로 관계를 다시 잡아야 한다.

### 4. migration 전략을 정리할 시점이다

현재 `create_all()`과 Alembic이 함께 존재하는 구조는 오래 유지하기 어렵다.  
사용자 연동까지 들어가는 시점부터는 migration 기준을 하나로 통일하는 편이 맞다.
