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
├── backend/          # FastAPI + Python
│   ├── main.py       # API 서버 (health, hint 엔드포인트)
│   ├── .env          # 환경변수 (GROQ_API_KEY)
│   └── requirements.txt
└── frontend/         # React + TypeScript
    └── src/
        ├── App.tsx   # 메인 컴포넌트
        └── index.tsx
```

## 실행 방법

### Backend
```bash
cd backend
# 최초 1회
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

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

| 영역 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Create React App |
| Backend | FastAPI, Uvicorn, Pydantic |
| AI | Groq API (llama-3.3-70b-versatile) |
| 보조 AI 라이브러리 | Anthropic SDK, Google Generative AI |

## API 엔드포인트

```
GET  /health   - 서버 상태 확인
POST /hint     - 힌트 요청
```

### HintRequest 모델
```python
class HintRequest(BaseModel):
    code: str              # 사용자 코드
    error_log: str = ""    # 에러 메시지 (선택)
    hint_level: int = 1    # 1: 에러 위치 / 2: 개념 설명 / 3: 의사코드
```

## 환경변수

`backend/.env`에 설정:
```
GROQ_API_KEY="..."
```

## 브랜치 구조

- `main` - 메인 브랜치
- `front-start` - 프론트엔드 개발
- `back-start` - 백엔드 개발

## 현재 개발 상태

- 백엔드: 힌트 생성 API 구현 완료, 로그 기록 기능 있음
- 프론트엔드: 기본 레이아웃 구성, 힌트 요청 버튼 미연결 상태

## 테스트

```bash
# Frontend
cd frontend && npm test
```

백엔드 테스트 미구현 상태.
