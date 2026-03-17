---
name: mcp-builder
description: 잘 설계된 도구를 통해 LLM이 외부 서비스와 상호작용할 수 있게 하는 고품질 MCP(Model Context Protocol) 서버를 만들기 위한 가이드입니다. Python(FastMCP) 또는 Node/TypeScript(MCP SDK)로 외부 API나 서비스를 통합하기 위한 MCP 서버를 구축할 때 사용합니다.
license: Complete terms in LICENSE.txt
---

# MCP 서버 개발 가이드

## 개요

잘 설계된 도구를 통해 LLM이 외부 서비스와 상호작용할 수 있게 하는 MCP(Model Context Protocol) 서버를 만듭니다. MCP 서버의 품질은 LLM이 실제 작업을 얼마나 잘 수행할 수 있게 하느냐로 측정됩니다.

---

# 프로세스

## 고수준 워크플로

고품질 MCP 서버를 만드는 것은 네 가지 주요 단계로 구성됩니다:

### 1단계: 심층 연구 및 계획

#### 1.1 현대적 MCP 설계 이해

**API 커버리지 대 워크플로 도구:**
포괄적인 API 엔드포인트 커버리지와 전문화된 워크플로 도구 사이의 균형을 맞춥니다. 워크플로 도구는 특정 작업에 더 편리할 수 있고, 포괄적인 커버리지는 에이전트에게 작업을 구성할 유연성을 줍니다. 성능은 클라이언트에 따라 다릅니다 — 일부 클라이언트는 기본 도구를 결합하는 코드 실행에서 이점을 얻고, 다른 클라이언트는 고수준 워크플로에서 더 잘 동작합니다. 확신이 없으면 포괄적인 API 커버리지를 우선시합니다.

**도구 이름 지정 및 발견 가능성:**
명확하고 설명적인 도구 이름은 에이전트가 올바른 도구를 빠르게 찾는 데 도움이 됩니다. 일관된 접두사(예: `github_create_issue`, `github_list_repos`)와 행동 지향적 이름 지정을 사용합니다.

**컨텍스트 관리:**
에이전트는 간결한 도구 설명과 결과를 필터링/페이지네이션하는 기능에서 이점을 얻습니다. 집중적이고 관련성 있는 데이터를 반환하는 도구를 설계합니다. 일부 클라이언트는 에이전트가 데이터를 효율적으로 필터링하고 처리하는 데 도움이 되는 코드 실행을 지원합니다.

**실행 가능한 에러 메시지:**
에러 메시지는 구체적인 제안과 다음 단계를 통해 에이전트가 해결책으로 나아갈 수 있도록 안내해야 합니다.

#### 1.2 MCP 프로토콜 문서 학습

**MCP 사양 탐색:**

관련 페이지를 찾기 위해 사이트맵으로 시작합니다: `https://modelcontextprotocol.io/sitemap.xml`

그런 다음 마크다운 형식으로 특정 페이지를 `.md` 접미사로 가져옵니다 (예: `https://modelcontextprotocol.io/specification/draft.md`).

검토할 핵심 페이지:
- 사양 개요 및 아키텍처
- 전송 메커니즘 (streamable HTTP, stdio)
- 도구, 리소스, 프롬프트 정의

#### 1.3 프레임워크 문서 학습

**권장 스택:**
- **언어**: TypeScript (고품질 SDK 지원과 MCPB 등 다양한 실행 환경에서의 좋은 호환성. 또한 AI 모델이 TypeScript 코드를 잘 생성하며, 광범위한 사용, 정적 타입, 좋은 린팅 도구에서 이점을 얻음)
- **전송**: 상태 비저장 JSON을 사용하는 원격 서버용 Streamable HTTP (상태 저장 세션 및 스트리밍 응답에 비해 확장 및 유지 관리가 더 간단함). 로컬 서버에는 stdio.

**프레임워크 문서 로드:**

- **MCP 모범 사례**: [📋 모범 사례 보기](./reference/mcp_best_practices.md) - 핵심 가이드라인

**TypeScript (권장)의 경우:**
- **TypeScript SDK**: WebFetch로 `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md` 로드
- [⚡ TypeScript 가이드](./reference/node_mcp_server.md) - TypeScript 패턴 및 예시

**Python의 경우:**
- **Python SDK**: WebFetch로 `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md` 로드
- [🐍 Python 가이드](./reference/python_mcp_server.md) - Python 패턴 및 예시

#### 1.4 구현 계획

**API 이해:**
서비스의 API 문서를 검토하여 핵심 엔드포인트, 인증 요구사항, 데이터 모델을 파악합니다. 필요에 따라 웹 검색과 WebFetch를 사용합니다.

**도구 선택:**
포괄적인 API 커버리지를 우선시합니다. 가장 일반적인 작업부터 시작하여 구현할 엔드포인트를 나열합니다.

---

### 2단계: 구현

#### 2.1 프로젝트 구조 설정

프로젝트 설정에 대한 언어별 가이드를 참조합니다:
- [⚡ TypeScript 가이드](./reference/node_mcp_server.md) - 프로젝트 구조, package.json, tsconfig.json
- [🐍 Python 가이드](./reference/python_mcp_server.md) - 모듈 구성, 의존성

#### 2.2 핵심 인프라 구현

공유 유틸리티 생성:
- 인증이 있는 API 클라이언트
- 에러 처리 헬퍼
- 응답 형식 지정 (JSON/Markdown)
- 페이지네이션 지원

#### 2.3 도구 구현

각 도구에서:

**입력 스키마:**
- TypeScript에는 Zod, Python에는 Pydantic 사용
- 제약 사항과 명확한 설명 포함
- 필드 설명에 예시 추가

**출력 스키마:**
- 가능한 경우 구조화된 데이터를 위해 `outputSchema` 정의
- 도구 응답에 `structuredContent` 사용 (TypeScript SDK 기능)
- 클라이언트가 도구 출력을 이해하고 처리하는 데 도움이 됨

**도구 설명:**
- 기능의 간결한 요약
- 파라미터 설명
- 반환 타입 스키마

**구현:**
- I/O 작업에 async/await
- 실행 가능한 메시지로 적절한 에러 처리
- 해당되는 경우 페이지네이션 지원
- 최신 SDK 사용 시 텍스트 내용과 구조화된 데이터 모두 반환

**주석:**
- `readOnlyHint`: true/false
- `destructiveHint`: true/false
- `idempotentHint`: true/false
- `openWorldHint`: true/false

---

### 3단계: 검토 및 테스트

#### 3.1 코드 품질

다음을 검토합니다:
- 중복 코드 없음 (DRY 원칙)
- 일관된 에러 처리
- 전체 타입 커버리지
- 명확한 도구 설명

#### 3.2 빌드 및 테스트

**TypeScript:**
- 컴파일 확인을 위해 `npm run build` 실행
- MCP Inspector로 테스트: `npx @modelcontextprotocol/inspector`

**Python:**
- 문법 확인: `python -m py_compile your_server.py`
- MCP Inspector로 테스트

자세한 테스트 접근법 및 품질 체크리스트는 언어별 가이드를 참조합니다.

---

### 4단계: 평가 작성

MCP 서버 구현 후, 효과성을 테스트하기 위한 포괄적인 평가를 작성합니다.

**[✅ 평가 가이드](./reference/evaluation.md)를 로드하여 완전한 평가 가이드라인을 확인합니다.**

#### 4.1 평가 목적 이해

LLM이 현실적이고 복잡한 질문에 답하기 위해 MCP 서버를 효과적으로 사용할 수 있는지 테스트하는 평가를 작성합니다.

#### 4.2 10개의 평가 질문 작성

효과적인 평가를 작성하기 위해 평가 가이드에 설명된 프로세스를 따릅니다:

1. **도구 검사**: 사용 가능한 도구를 나열하고 기능을 이해합니다
2. **콘텐츠 탐색**: 사용 가능한 데이터를 탐색하기 위해 READ-ONLY 작업 사용
3. **질문 생성**: 복잡하고 현실적인 10개의 질문 작성
4. **답변 검증**: 직접 각 질문을 풀어서 답변 검증

#### 4.3 평가 요구사항

각 질문이 다음을 충족하는지 확인합니다:
- **독립적**: 다른 질문에 의존하지 않음
- **읽기 전용**: 비파괴적 작업만 필요
- **복잡함**: 여러 도구 호출과 심층 탐색 필요
- **현실적**: 사람들이 실제로 관심을 가질 실제 사용 사례 기반
- **검증 가능**: 문자열 비교로 검증할 수 있는 단일하고 명확한 답변
- **안정적**: 시간이 지나도 답변이 변하지 않음

#### 4.4 출력 형식

다음 구조의 XML 파일을 만듭니다:

```xml
<evaluation>
  <qa_pair>
    <question>동물 코드명을 가진 AI 모델 출시에 대한 논의를 찾으세요. 한 모델은 ASL-X 형식을 사용하는 특정 안전 지정이 필요했습니다. 점박이 야생 고양이의 이름을 가진 모델에 대해 결정되던 X의 숫자는 무엇인가요?</question>
    <answer>3</answer>
  </qa_pair>
<!-- 더 많은 qa_pairs... -->
</evaluation>
```

---

# 참조 파일

## 문서 라이브러리

개발 중 필요에 따라 다음 리소스를 로드합니다:

### 핵심 MCP 문서 (먼저 로드)
- **MCP 프로토콜**: `https://modelcontextprotocol.io/sitemap.xml`의 사이트맵으로 시작한 후 특정 페이지를 `.md` 접미사로 가져옵니다
- [📋 MCP 모범 사례](./reference/mcp_best_practices.md) - 다음을 포함하는 범용 MCP 가이드라인:
  - 서버 및 도구 이름 지정 규칙
  - 응답 형식 가이드라인 (JSON 대 Markdown)
  - 페이지네이션 모범 사례
  - 전송 선택 (streamable HTTP 대 stdio)
  - 보안 및 에러 처리 표준

### SDK 문서 (1/2단계 중 로드)
- **Python SDK**: `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`에서 가져오기
- **TypeScript SDK**: `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`에서 가져오기

### 언어별 구현 가이드 (2단계 중 로드)
- [🐍 Python 구현 가이드](./reference/python_mcp_server.md) - 다음을 포함하는 완전한 Python/FastMCP 가이드:
  - 서버 초기화 패턴
  - Pydantic 모델 예시
  - `@mcp.tool`로 도구 등록
  - 완전한 작동 예시
  - 품질 체크리스트

- [⚡ TypeScript 구현 가이드](./reference/node_mcp_server.md) - 다음을 포함하는 완전한 TypeScript 가이드:
  - 프로젝트 구조
  - Zod 스키마 패턴
  - `server.registerTool`로 도구 등록
  - 완전한 작동 예시
  - 품질 체크리스트

### 평가 가이드 (4단계 중 로드)
- [✅ 평가 가이드](./reference/evaluation.md) - 다음을 포함하는 완전한 평가 작성 가이드:
  - 질문 작성 가이드라인
  - 답변 검증 전략
  - XML 형식 사양
  - 예시 질문 및 답변
  - 제공된 스크립트로 평가 실행
