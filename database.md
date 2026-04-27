# Database Overview

이 문서는 현재 `LogicUp` 프로젝트의 실제 데이터베이스 상태를 기준으로 정리한 문서입니다.

- 기준 시점: 2026-04-27
- 데이터베이스 종류: PostgreSQL
- 연결 방식: `backend/.env`의 `DATABASE_URL` 사용
- ORM/마이그레이션: SQLAlchemy + Alembic

## 설계 개요

현재 DB는 크게 3개 테이블로 구성되어 있습니다.

1. `users`
2. `submissions`
3. `hints`

관계는 다음과 같습니다.

- 한 명의 `user`는 여러 개의 `submission`을 가질 수 있습니다.
- 하나의 `submission`은 여러 개의 `hint`를 가질 수 있습니다.
- 상위 데이터가 삭제되면 하위 데이터도 함께 삭제되도록 `CASCADE`가 설정되어 있습니다.

구조를 간단히 표현하면 다음과 같습니다.

```text
users (1) ---- (N) submissions (1) ---- (N) hints
```

## 테이블 상세

### 1. users

사용자 계정 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL 허용 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | 아니오 | 시퀀스 자동 증가 | 사용자 PK |
| `userid` | `VARCHAR(20)` | 예 | 없음 | 일반 로그인용 아이디 |
| `password_hash` | `VARCHAR(255)` | 예 | 없음 | 비밀번호 해시 |
| `kakao_id` | `VARCHAR(50)` | 예 | 없음 | 카카오 로그인 식별자 |
| `created_at` | `TIMESTAMP` | 예 | `now()` | 생성 시각 |

인덱스:

- `ix_users_userid` (`userid`, unique)
- `ix_users_kakao_id` (`kakao_id`, unique)

설계 의도:

- 일반 로그인과 카카오 로그인을 모두 수용할 수 있게 `userid`, `password_hash`, `kakao_id`가 모두 nullable입니다.
- 하나의 계정은 일반 로그인 기반일 수도 있고, 소셜 로그인 기반일 수도 있습니다.
- `userid`와 `kakao_id`는 각각 중복되면 안 되므로 unique 인덱스로 관리합니다.

현재 데이터 건수:

- `users`: 4건

### 2. submissions

사용자가 제출한 문제, 코드, 입출력 예시, 에러 로그 등을 저장하는 핵심 테이블입니다.

| 컬럼명 | 타입 | NULL 허용 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | 아니오 | 시퀀스 자동 증가 | 제출 PK |
| `source` | `VARCHAR(20)` | 아니오 | 없음 | 제출 출처 |
| `external_problem_id` | `VARCHAR(100)` | 예 | 없음 | 외부 플랫폼 문제 ID |
| `problem` | `TEXT` | 아니오 | `''` | 문제 본문 |
| `expected_input` | `TEXT` | 아니오 | `''` | 입력 예시 |
| `expected_output` | `TEXT` | 아니오 | `''` | 출력 예시 |
| `code` | `TEXT` | 아니오 | 없음 | 사용자가 제출한 코드 |
| `error_log` | `TEXT` | 아니오 | `''` | 에러 로그 |
| `created_at` | `TIMESTAMP` | 아니오 | `now()` | 생성 시각 |
| `user_id` | `INTEGER` | 아니오 | 없음 | `users.id` FK |

외래키:

- `user_id -> users.id`
- 삭제 정책: `ON DELETE CASCADE`

인덱스:

- `ix_submissions_user_id` (`user_id`)
- `ix_submissions_external_problem_id` (`external_problem_id`)
- `ix_submissions_user_id_source` (`user_id`, `source`)

설계 의도:

- 문제 제출 이력의 중심 테이블입니다.
- `source`는 제출이 어디서 왔는지 구분하기 위한 필드입니다.
  예: 백준, 직접 입력 등
- `external_problem_id`는 외부 문제 플랫폼과 연결할 때 사용합니다.
- `problem`, `expected_input`, `expected_output`, `error_log`는 빈 문자열 기본값을 사용해 응답/렌더링 시 null 처리 부담을 줄입니다.
- `user_id` 인덱스는 특정 사용자의 제출 목록 조회 성능을 위한 것입니다.
- `(user_id, source)` 복합 인덱스는 사용자별/출처별 필터 조회를 빠르게 하기 위한 것입니다.
- `external_problem_id` 인덱스는 외부 문제 번호 기반 조회를 빠르게 하기 위한 것입니다.

현재 데이터 건수:

- `submissions`: 2건

### 3. hints

제출에 대해 생성된 힌트 결과를 저장하는 테이블입니다.

| 컬럼명 | 타입 | NULL 허용 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | 아니오 | 시퀀스 자동 증가 | 힌트 PK |
| `submission_id` | `INTEGER` | 아니오 | 없음 | `submissions.id` FK |
| `hint_level` | `INTEGER` | 아니오 | 없음 | 힌트 단계 |
| `explanation` | `TEXT` | 아니오 | `''` | 설명형 힌트 |
| `pseudocode` | `TEXT` | 아니오 | `''` | 의사코드 힌트 |
| `created_at` | `TIMESTAMP` | 아니오 | `now()` | 생성 시각 |

외래키:

- `submission_id -> submissions.id`
- 삭제 정책: `ON DELETE CASCADE`

인덱스:

- 현재 별도 보조 인덱스 없음

설계 의도:

- 하나의 제출에 대해 여러 단계의 힌트를 저장할 수 있습니다.
- `hint_level`을 통해 단계별 힌트 흐름을 표현합니다.
- 상위 제출이 삭제되면 관련 힌트도 함께 삭제됩니다.

현재 데이터 건수:

- `hints`: 2건

## 관계 정리

### users -> submissions

- 관계: 1:N
- 의미: 사용자 1명이 여러 제출 이력을 가질 수 있음
- 삭제 정책: 사용자 삭제 시 해당 사용자의 제출도 함께 삭제

### submissions -> hints

- 관계: 1:N
- 의미: 제출 1건에 대해 여러 힌트가 생성될 수 있음
- 삭제 정책: 제출 삭제 시 관련 힌트도 함께 삭제

## 현재 설계의 특징

- 로그인 계정과 제출 이력, 힌트 이력이 분리되어 있어 책임이 비교적 명확합니다.
- 사용자 기준으로 제출을 추적하고, 제출 기준으로 힌트를 추적하는 전형적인 계층 구조입니다.
- nullable 필드를 일부 허용해 일반 로그인과 소셜 로그인을 함께 지원합니다.
- 조회 성능을 위해 사용자 기준, 사용자+출처 기준, 외부 문제 ID 기준 인덱스를 두고 있습니다.
- 힌트 테이블은 아직 단순하며, 필요 시 `submission_id`, `hint_level` 기준 인덱스를 추가할 여지가 있습니다.

## 코드 기준 매핑

실제 ORM 모델은 다음 파일에 정의되어 있습니다.

- `backend/db_models.py`

관련 마이그레이션 파일은 다음 경로에 있습니다.

- `backend/alembic/versions/`

## 참고

이 문서는 실제 DB 스키마 조회 결과와 현재 백엔드 모델 정의를 기준으로 작성되었습니다.
향후 컬럼 추가, 인덱스 변경, 마이그레이션 추가가 발생하면 함께 갱신해야 합니다.
