# Plan - 멀티 모델 협업 계획 수립

멀티 모델 협업 계획 수립 - 컨텍스트 수집 + 이중 모델 분석 → 단계별 구현 계획 생성.

$ARGUMENTS

---

## 핵심 프로토콜

- **언어 프로토콜**: 도구/모델 호출 시 영어 사용, 사용자 응답은 사용자 언어로
- **병렬 실행 필수**: Codex/Gemini 호출은 반드시 `run_in_background: true` 사용 (단일 모델 호출 포함, 메인 스레드 차단 방지)
- **코드 주권**: 외부 모델은 **파일시스템 쓰기 권한 없음**, 모든 수정은 Claude가 수행
- **손실 방지 메커니즘**: 현재 단계 출력이 검증되기 전까지 다음 단계로 진행 금지
- **계획 전용**: 이 명령은 컨텍스트 읽기 및 `.claude/plan/*` 계획 파일 쓰기만 허용, **프로덕션 코드 절대 수정 금지**

---

## 멀티 모델 호출 사양

**호출 구문** (병렬: `run_in_background: true` 사용):

```
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement>
Context: <retrieved project context>
</TASK>
OUTPUT: Step-by-step implementation plan with pseudo-code. DO NOT modify any files.
EOF",
  run_in_background: true,
  timeout: 3600000,
  description: "Brief description"
})
```

**모델 파라미터 참고**:
- `{{GEMINI_MODEL_FLAG}}`: `--backend gemini` 사용 시 `--gemini-model gemini-3-pro-preview`로 교체 (뒤 공백 주의); codex는 빈 문자열 사용

**역할 프롬프트**:

| 단계 | Codex | Gemini |
|------|-------|--------|
| 분석 | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| 계획 | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` |

**세션 재사용**: 각 호출은 `SESSION_ID: xxx`를 반환 (주로 wrapper가 출력), 이후 `/ccg:execute` 사용을 위해 **반드시 저장**해야 함.

**백그라운드 작업 대기** (최대 타임아웃 600000ms = 10분):

```
TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 })
```

**중요**:
- 반드시 `timeout: 600000`을 지정해야 하며, 그렇지 않으면 기본값 30초로 조기 타임아웃 발생
- 10분 후에도 완료되지 않으면 `TaskOutput`으로 계속 폴링, **절대 프로세스 종료 금지**
- 타임아웃으로 인해 대기를 건너뛴 경우, **반드시 `AskUserQuestion`을 호출하여 사용자에게 계속 대기할지 작업을 종료할지 확인**

---

## 실행 워크플로우

**계획 작업**: $ARGUMENTS

### 1단계: 전체 컨텍스트 수집

`[모드: Research]`

#### 1.1 프롬프트 강화 (반드시 먼저 실행)

**`mcp__ace-tool__enhance_prompt` 도구를 반드시 호출**:

```
mcp__ace-tool__enhance_prompt({
  prompt: "$ARGUMENTS",
  conversation_history: "<최근 5-10개 대화 턴>",
  project_root_path: "$PWD"
})
```

강화된 프롬프트를 받을 때까지 대기, 이후 모든 단계에서 **원본 $ARGUMENTS를 강화된 결과로 교체**.

#### 1.2 컨텍스트 수집

**`mcp__ace-tool__search_context` 도구 호출**:

```
mcp__ace-tool__search_context({
  query: "<강화된 요구사항 기반 시맨틱 쿼리>",
  project_root_path: "$PWD"
})
```

- 자연어(Where/What/How)로 시맨틱 쿼리 구성
- **절대 가정에 기반한 답변 금지**
- MCP 사용 불가 시: Glob + Grep으로 파일 탐색 및 핵심 심볼 위치 파악으로 대체

#### 1.3 완전성 검증

- 관련 클래스, 함수, 변수의 **완전한 정의와 시그니처** 확보 필수
- 컨텍스트가 부족하면 **재귀적 수집** 실행
- 출력 우선순위: 진입 파일 + 줄 번호 + 핵심 심볼명; 모호성 해소에 필요한 경우에만 최소한의 코드 스니펫 추가

#### 1.4 요구사항 정렬

- 요구사항에 아직 모호함이 있으면 사용자에게 **반드시** 안내 질문 출력
- 요구사항 경계가 명확해질 때까지 (누락 없음, 중복 없음)

### 2단계: 멀티 모델 협업 분석

`[모드: Analysis]`

#### 2.1 입력 배분

**병렬 호출** Codex와 Gemini (`run_in_background: true`):

두 모델에 **원본 요구사항** (사전 의견 없이) 배분:

1. **Codex 백엔드 분석**:
   - ROLE_FILE: `~/.claude/.ccg/prompts/codex/analyzer.md`
   - 집중: 기술적 실현 가능성, 아키텍처 영향, 성능 고려사항, 잠재적 리스크
   - OUTPUT: 다관점 솔루션 + 장단점 분석

2. **Gemini 프론트엔드 분석**:
   - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/analyzer.md`
   - 집중: UI/UX 영향, 사용자 경험, 비주얼 디자인
   - OUTPUT: 다관점 솔루션 + 장단점 분석

`TaskOutput`으로 두 모델의 완전한 결과 대기. **SESSION_ID 저장** (`CODEX_SESSION` 및 `GEMINI_SESSION`).

#### 2.2 교차 검증

관점 통합 및 반복 최적화:

1. **합의점 파악** (강한 신호)
2. **의견 차이 파악** (검토 필요)
3. **상호 보완**: 백엔드 로직은 Codex 따름, 프론트엔드 디자인은 Gemini 따름
4. **논리적 추론**: 솔루션의 논리적 공백 제거

#### 2.3 (선택사항이나 권장) 이중 모델 계획 초안

Claude 합성 계획의 누락 리스크를 줄이기 위해 두 모델이 병렬로 "계획 초안"을 출력할 수 있음 (파일 수정은 **여전히 금지**):

1. **Codex 계획 초안** (백엔드 권한):
   - ROLE_FILE: `~/.claude/.ccg/prompts/codex/architect.md`
   - OUTPUT: 단계별 계획 + 의사코드 (집중: 데이터 흐름/엣지 케이스/에러 처리/테스트 전략)

2. **Gemini 계획 초안** (프론트엔드 권한):
   - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/architect.md`
   - OUTPUT: 단계별 계획 + 의사코드 (집중: 정보 구조/인터랙션/접근성/비주얼 일관성)

`TaskOutput`으로 두 모델의 완전한 결과 대기, 제안 사항의 주요 차이점 기록.

#### 2.4 구현 계획 생성 (Claude 최종본)

두 분석을 합성하여 **단계별 구현 계획** 생성:

```markdown
## 구현 계획: <작업명>

### 작업 유형
- [ ] 프론트엔드 (→ Gemini)
- [ ] 백엔드 (→ Codex)
- [ ] 풀스택 (→ 병렬)

### 기술 솔루션
<Codex + Gemini 분석에서 합성한 최적 솔루션>

### 구현 단계
1. <1단계> - 예상 산출물
2. <2단계> - 예상 산출물
...

### 주요 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| path/to/file.ts:L10-L50 | 수정 | 설명 |

### 리스크 및 대응
| 리스크 | 대응 방안 |
|--------|----------|

### SESSION_ID (/ccg:execute 사용을 위해)
- CODEX_SESSION: <session_id>
- GEMINI_SESSION: <session_id>
```

### 2단계 완료: 계획 전달 (실행 아님)

**`/ccg:plan` 역할은 여기서 종료, 반드시 다음 작업 실행**:

1. 사용자에게 완전한 구현 계획 제시 (의사코드 포함)
2. `.claude/plan/<feature-name>.md`에 계획 저장 (요구사항에서 기능명 추출, 예: `user-auth`, `payment-module`)
3. **굵은 텍스트**로 안내 메시지 출력 (반드시 실제 저장된 파일 경로 사용):

   ---
   **계획이 생성되어 `.claude/plan/actual-feature-name.md`에 저장되었습니다.**

   **위 계획을 검토해 주세요. 다음 중 하나를 선택할 수 있습니다:**
   - **계획 수정**: 수정할 내용을 알려주시면 계획을 업데이트하겠습니다
   - **계획 실행**: 새 세션에서 아래 명령어를 복사하여 실행하세요

   ```
   /ccg:execute .claude/plan/actual-feature-name.md
   ```
   ---

   **참고**: 위의 `actual-feature-name.md`는 반드시 실제 저장된 파일명으로 교체해야 합니다!

4. **즉시 현재 응답 종료** (여기서 멈춤. 추가 도구 호출 없음.)

**절대 금지**:
- 사용자에게 "Y/N" 확인 후 자동 실행 (실행은 `/ccg:execute`의 역할)
- 프로덕션 코드에 대한 어떠한 쓰기 작업
- `/ccg:execute` 자동 호출 또는 어떠한 구현 작업
- 사용자가 명시적으로 수정을 요청하지 않은 상태에서 모델 호출 계속 트리거

---

## 계획 저장

계획 수립 완료 후 계획을 저장:

- **최초 계획**: `.claude/plan/<feature-name>.md`
- **반복 버전**: `.claude/plan/<feature-name>-v2.md`, `.claude/plan/<feature-name>-v3.md`...

계획 파일 쓰기는 사용자에게 계획을 제시하기 전에 완료되어야 함.

---

## 계획 수정 흐름

사용자가 계획 수정을 요청하는 경우:

1. 사용자 피드백에 따라 계획 내용 조정
2. `.claude/plan/<feature-name>.md` 파일 업데이트
3. 수정된 계획 재제시
4. 사용자에게 검토 또는 재실행 안내

---

## 다음 단계

사용자 승인 후 **수동으로** 실행:

```bash
/ccg:execute .claude/plan/<feature-name>.md
```

---

## 핵심 규칙

1. **계획만, 구현 없음** - 이 명령은 어떠한 코드 변경도 실행하지 않음
2. **Y/N 확인 없음** - 계획만 제시하고 사용자가 다음 단계 결정
3. **신뢰 규칙** - 백엔드는 Codex 따름, 프론트엔드는 Gemini 따름
4. 외부 모델은 **파일시스템 쓰기 권한 없음**
5. **SESSION_ID 인계** - 계획 말미에 반드시 `CODEX_SESSION` / `GEMINI_SESSION` 포함 (이후 `/ccg:execute resume <SESSION_ID>` 사용을 위해)
