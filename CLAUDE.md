# LogicUp

## 실행 전 필수 확인 규칙

모든 작업을 실행하기 전에 반드시 아래 순서를 따른다:

1. **스킬(Skill) 확인** — 요청과 관련된 사용 가능한 스킬이 있는지 먼저 확인한다.

   - `/commit`, `/simplify`, `/loop`, `/claude-api` 등 등록된 스킬 목록을 점검한다.
   - 해당 스킬이 있으면 직접 명령을 구성하지 않고 `Skill` 도구로 호출한다.
2. **에이전트(Agent) 확인** — 작업이 복잡하거나 다단계 탐색이 필요한 경우 전문 에이전트를 활용한다.

   - `Explore`: 코드베이스 탐색, 파일 검색
   - `Plan`: 구현 계획 수립 및 아키텍처 설계
   - `general-purpose`: 복잡한 리서치 및 멀티스텝 작업
   - `claude-code-guide`: Claude Code / API 관련 질문
   - 에이전트가 적합하면 직접 처리하지 않고 `Agent` 도구로 위임한다.
3. **커맨드(Command/Tool) 확인** — 스킬·에이전트로 처리할 수 없는 경우에만 직접 도구를 사용한다.

   - `Glob` / `Grep` → 파일·코드 검색 (Bash의 find/grep 사용 금지)
   - `Read` / `Edit` / `Write` → 파일 읽기·수정·생성 (cat/sed/awk 사용 금지)
   - `Bash` → 위 전용 도구로 대체 불가능한 시스템 명령에만 사용

> 스킬 → 에이전트 → 커맨드 순으로 확인하고, 가장 앞 단계에서 처리 가능하면 그것을 우선 사용한다.

LLM 기반 단계적 힌트 제공 알고리즘을 적용한 프로그래밍 학습 보조 시스템.
학생이 코드를 제출하면 정답을 직접 주지 않고 단계적으로 힌트를 제공한다.

## 프로젝트 구조

```
LogicUp/
├── backend/                  # FastAPI + Python
│   ├── main.py               # API 서버 진입점, CORS 설정, 라우터 등록
│   ├── router.py             # /health, /hint, /history 엔드포인트
│   ├── auth_router.py        # /register, /login, /auth/kakao 엔드포인트
│   ├── auth.py               # JWT 토큰, 비밀번호 해싱, get_current_user 의존성
│   ├── models.py             # Pydantic 요청 모델 (HintRequest 등)
│   ├── db_models.py          # SQLAlchemy ORM 모델 (User, Submission, Hint)
│   ├── database.py           # DB 엔진, 세션, get_db 의존성
│   ├── schemas.py            # Pydantic 응답 모델 (HistoryResponse, ProblemListResponse 등)
│   ├── config.py             # Groq 클라이언트, 로깅 설정
│   ├── prompts.py            # LLM 프롬프트 템플릿
│   ├── boj.py                # 백준 문제 크롤링
│   ├── alembic/              # Alembic 마이그레이션 설정 및 이력
│   ├── requirements.txt       # Python 의존성
│   └── logs/                 # 애플리케이션 로그 디렉토리
├── frontend/                 # React 19 + TypeScript
│   ├── src/
│   │   ├── App.tsx           # 메인 컴포넌트 (탭 라우팅)
│   │   ├── App.css           # 스타일
│   │   ├── components/
│   │   │   ├── Header.tsx        # 탭 네비게이션
│   │   │   ├── AuthPanel.tsx     # 회원가입/로그인 폼
│   │   │   ├── ProblemInput.tsx  # 문제 입력 폼
│   │   │   ├── CodeEditor.tsx    # 코드 에디터
│   │   │   ├── HintPanel.tsx     # 힌트 표시 패널
│   │   │   └── HistoryPage.tsx   # 힌트 이력 조회 페이지
│   │   └── api/
│   │       ├── auth.ts       # 회원가입, 로그인 API 클라이언트
│   │       └── history.ts    # 힌트 이력 API 클라이언트
│   ├── package.json
│   ├── tsconfig.json
│   └── build/                # 빌드 결과 디렉토리
└── logs/                     # 프로젝트 전체 로그
```

## 실행 방법

### Backend

```bash
cd backend

# 최초 1회
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# DB 마이그레이션 (최초 1회)
alembic upgrade head

# 서버 실행 (port 8000)
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install       # 최초 1회
npm start         # 개발 서버 (port 3000)
```

## 기술 스택

| 영역               | 기술                                   |
| ------------------ | -------------------------------------- |
| Frontend           | React 19, TypeScript, Create React App |
| Backend            | FastAPI, Uvicorn, Pydantic             |
| Database           | PostgreSQL, SQLAlchemy 2.0, Alembic    |
| AI                 | Groq API (openai/gpt-oss-120b)         |
| 인증               | JWT (python-jose), bcrypt (passlib)    |
| 보조 AI 라이브러리 | Anthropic SDK, Google Generative AI    |

## API 엔드포인트

### 인증 (auth_router.py)

```
POST /register                - 회원가입
POST /login                   - 로그인 (JWT 발급)
POST /auth/kakao              - 카카오 로그인
```

### 힌트 및 제출 (router.py)

```
GET  /health                  - 서버 상태 확인
POST /hint                    - 힌트 요청 (DB 저장, JWT 필수)
GET  /history/submissions     - 모든 제출 조회 (페이지네이션, JWT 필수)
GET  /history/problems        - 백준 문제별 조회 (페이지네이션, JWT 필수)
GET  /history/direct-problems - 직접 입력 문제별 조회 (페이지네이션, JWT 필수)
GET  /history                 - 힌트 이력 조회 (페이지네이션, JWT 필수)
```

### HintRequest 모델

```python
class HintRequest(BaseModel):
    problem: str = ""              # 문제 설명 (직접 입력 시)
    problem_number: int = 0        # BOJ 문제 번호
    code: str                      # 사용자 코드
    expected_input: str = ""       # 예시 입력
    expected_output: str = ""      # 예시 출력
    error_log: str = ""            # 에러 메시지
    hint_level: int = 1            # 1: 오류 위치 / 2: 관련 개념 / 3: 의사코드
```

### DB 스키마

데이터베이스 스키마 세부 사항은 `backend/database.py`와 `backend/alembic/versions/`를 참조하세요.

주요 테이블:

- `users` - 사용자 계정 및 인증 정보
- `submissions` - 코드 제출 기록 (문제 소스: 직접 입력 or 백준)
- `hints` - 생성된 힌트 (레벨별, 타임스탐프 포함)

## 현재 개발 상태6드: 힌트 생성 API, 로그인/회원가입, DB 저장, 이력 조회 구현 완료

- 프론트엔드: 힌트 요청 및 표시, 이력 조회 페이지 구현 완료
- DB: PostgreSQL + Alembic 마이그레이션 설정 완료

## 애매하거나 필요한 정보가 있다면 사용자에게 질문
