---
name: search-first
description: 코드 작성 전 리서치 워크플로. 커스텀 코드를 작성하기 전에 기존 도구, 라이브러리, 패턴을 검색합니다. researcher agent를 호출합니다.
origin: ECC
---

# /search-first — 코드 작성 전 리서치하기

"기존 솔루션을 먼저 검색한 후 구현한다"는 워크플로를 체계화합니다.

## 트리거

다음 경우에 이 스킬을 사용합니다:
- 기존 솔루션이 있을 가능성이 높은 새 기능 시작 시
- 의존성 또는 연동 추가 시
- 사용자가 "X 기능 추가"를 요청하고 코드를 작성하려 할 때
- 새로운 유틸리티, 헬퍼, 추상화 생성 전

## 워크플로

```
┌─────────────────────────────────────────────┐
│  1. 필요 분석                                │
│     필요한 기능 정의                          │
│     언어/프레임워크 제약 식별                  │
├─────────────────────────────────────────────┤
│  2. 병렬 검색 (researcher agent)             │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│     │  npm /   │ │  MCP /   │ │  GitHub / │  │
│     │  PyPI    │ │  Skills  │ │  Web      │  │
│     └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────┤
│  3. 평가                                    │
│     후보 점수화 (기능성, 유지보수,             │
│     커뮤니티, 문서, 라이선스, 의존성)          │
├─────────────────────────────────────────────┤
│  4. 결정                                    │
│     ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│     │  그대로  │  │  확장/   │  │  커스텀  │  │
│     │  채택   │  │  래핑    │  │  빌드    │  │
│     └─────────┘  └──────────┘  └─────────┘  │
├─────────────────────────────────────────────┤
│  5. 구현                                    │
│     패키지 설치 / MCP 설정 /                  │
│     최소한의 커스텀 코드 작성                  │
└─────────────────────────────────────────────┘
```

## 의사결정 매트릭스

| 신호 | 액션 |
|--------|--------|
| 정확한 매칭, 잘 유지됨, MIT/Apache | **채택** — 직접 설치 및 사용 |
| 부분 매칭, 좋은 기반 | **확장** — 설치 + 얇은 래퍼 작성 |
| 여러 약한 매칭 | **조합** — 2-3개의 작은 패키지 결합 |
| 적합한 것 없음 | **빌드** — 커스텀 작성, 단 리서치를 바탕으로 |

## 사용 방법

### 빠른 모드 (인라인)

유틸리티 작성 또는 기능 추가 전에 다음을 정신적으로 실행합니다:

0. 이미 저장소에 존재하는가? → 관련 모듈/테스트를 `rg`로 먼저 검색
1. 이것이 일반적인 문제인가? → npm/PyPI 검색
2. 이를 위한 MCP가 있는가? → `~/.claude/settings.json` 확인 및 검색
3. 이를 위한 스킬이 있는가? → `~/.claude/skills/` 확인
4. GitHub 구현/템플릿이 있는가? → 새 코드 작성 전에 잘 유지되는 OSS를 위한 GitHub 코드 검색 실행

### 전체 모드 (agent)

비중요하지 않은 기능의 경우, researcher agent를 실행합니다:

```
Task(subagent_type="general-purpose", prompt="
  Research existing tools for: [설명]
  Language/framework: [언어]
  Constraints: [제약 조건]

  Search: npm/PyPI, MCP servers, Claude Code skills, GitHub
  Return: Structured comparison with recommendation
")
```

## 카테고리별 검색 단축키

### 개발 도구
- 린팅 → `eslint`, `ruff`, `textlint`, `markdownlint`
- 포매팅 → `prettier`, `black`, `gofmt`
- 테스팅 → `jest`, `pytest`, `go test`
- Pre-commit → `husky`, `lint-staged`, `pre-commit`

### AI/LLM 연동
- Claude SDK → 최신 문서를 위한 Context7
- 프롬프트 관리 → MCP 서버 확인
- 문서 처리 → `unstructured`, `pdfplumber`, `mammoth`

### 데이터 및 API
- HTTP 클라이언트 → `httpx` (Python), `ky`/`got` (Node)
- 유효성 검사 → `zod` (TS), `pydantic` (Python)
- 데이터베이스 → 먼저 MCP 서버 확인

### 콘텐츠 및 퍼블리싱
- Markdown 처리 → `remark`, `unified`, `markdown-it`
- 이미지 최적화 → `sharp`, `imagemin`

## 연동 포인트

### planner agent와 함께
planner는 Phase 1 (아키텍처 검토) 전에 researcher를 호출해야 합니다:
- Researcher가 사용 가능한 도구 식별
- Planner가 이를 구현 계획에 통합
- 계획에서 "바퀴 재발명" 방지

### architect agent와 함께
architect는 다음을 위해 researcher와 상담해야 합니다:
- 기술 스택 결정
- 연동 패턴 발굴
- 기존 참조 아키텍처

### iterative-retrieval 스킬과 함께
점진적 발견을 위해 조합합니다:
- 사이클 1: 광범위한 검색 (npm, PyPI, MCP)
- 사이클 2: 상위 후보를 상세히 평가
- 사이클 3: 프로젝트 제약 조건과의 호환성 테스트

## 예시

### 예시 1: "죽은 링크 확인 추가"
```
필요: Markdown 파일에서 깨진 링크 확인
검색: npm "markdown dead link checker"
발견: textlint-rule-no-dead-link (점수: 9/10)
액션: 채택 — npm install textlint-rule-no-dead-link
결과: 커스텀 코드 없음, 검증된 솔루션
```

### 예시 2: "HTTP 클라이언트 래퍼 추가"
```
필요: 재시도 및 타임아웃 처리가 있는 탄력적인 HTTP 클라이언트
검색: npm "http client retry", PyPI "httpx retry"
발견: got (Node) with retry plugin, httpx (Python) with built-in retry
액션: 채택 — 재시도 설정으로 got/httpx 직접 사용
결과: 커스텀 코드 없음, 프로덕션 검증 라이브러리
```

### 예시 3: "설정 파일 린터 추가"
```
필요: 스키마에 대해 프로젝트 설정 파일 검증
검색: npm "config linter schema", "json schema validator cli"
발견: ajv-cli (점수: 8/10)
액션: 채택 + 확장 — ajv-cli 설치, 프로젝트별 스키마 작성
결과: 1개 패키지 + 1개 스키마 파일, 커스텀 검증 로직 없음
```

## 안티패턴

- **코드로 바로 뛰어들기**: 기존에 있는지 확인하지 않고 유틸리티 작성
- **MCP 무시**: MCP 서버가 이미 기능을 제공하는지 확인하지 않음
- **과도한 커스터마이징**: 라이브러리를 너무 많이 래핑하여 이점을 잃음
- **의존성 비대화**: 작은 기능 하나를 위해 거대한 패키지 설치
