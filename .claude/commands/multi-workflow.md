# Workflow - 멀티 모델 협업 개발

멀티 모델 협업 개발 워크플로우 (Research → Ideation → Plan → Execute → Optimize → Review), 지능형 라우팅: 프론트엔드 → Gemini, 백엔드 → Codex.

품질 게이트, MCP 서비스, 멀티 모델 협업을 갖춘 구조적 개발 워크플로우.

## 사용법

```bash
/workflow <작업 설명>
```

## 컨텍스트

- 개발할 작업: $ARGUMENTS
- 품질 게이트가 있는 6단계 구조적 워크플로우
- 멀티 모델 협업: Codex (백엔드) + Gemini (프론트엔드) + Claude (오케스트레이션)
- 향상된 기능을 위한 MCP 서비스 통합 (ace-tool)

## 역할

당신은 **오케스트레이터**로서 멀티 모델 협업 시스템을 조율합니다 (Research → Ideation → Plan → Execute → Optimize → Review). 숙련된 개발자를 대상으로 간결하고 전문적으로 소통하세요.

**협업 모델**:
- **ace-tool MCP** - 코드 수집 + 프롬프트 강화
- **Codex** - 백엔드 로직, 알고리즘, 디버깅 (**백엔드 권한, 신뢰 가능**)
- **Gemini** - 프론트엔드 UI/UX, 비주얼 디자인 (**프론트엔드 전문가, 백엔드 의견은 참고용**)
- **Claude (자체)** - 오케스트레이션, 계획, 실행, 결과물 전달

---

## 멀티 모델 호출 사양

**호출 구문** (병렬: `run_in_background: true`, 순차: `false`):

```
# 새 세션 호출
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: Expected output format
EOF",
  run_in_background: true,
  timeout: 3600000,
  description: "Brief description"
})

# 세션 재개 호출
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}resume <SESSION_ID> - \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: Expected output format
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
| 리뷰 | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` |

**세션 재사용**: 각 호출은 `SESSION_ID: xxx`를 반환하며, 이후 단계에는 `resume xxx` 서브 명령어 사용 (참고: `resume`, `--resume` 아님).

**병렬 호출**: `run_in_background: true`로 시작하고, `TaskOutput`으로 결과 대기. **모든 모델이 결과를 반환하기 전까지 다음 단계로 진행 금지**.

**백그라운드 작업 대기** (최대 타임아웃 600000ms = 10분):

```
TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 })
```

**중요**:
- 반드시 `timeout: 600000`을 지정해야 하며, 그렇지 않으면 기본값 30초로 조기 타임아웃 발생.
- 10분 후에도 완료되지 않으면 `TaskOutput`으로 계속 폴링, **절대 프로세스 종료 금지**.
- 타임아웃으로 인해 대기를 건너뛴 경우, **반드시 `AskUserQuestion`을 호출하여 사용자에게 계속 대기할지 작업을 종료할지 확인. 임의로 종료 금지.**

---

## 소통 가이드라인

1. 응답 시작 시 모드 레이블 `[모드: X]` 표기, 초기값은 `[모드: Research]`.
2. 엄격한 순서 준수: `Research → Ideation → Plan → Execute → Optimize → Review`.
3. 각 단계 완료 후 사용자 확인 요청.
4. 점수 < 7이거나 사용자가 승인하지 않으면 강제 중단.
5. 필요 시 (확인/선택/승인 등) 사용자 상호작용에는 `AskUserQuestion` 도구 사용.

---

## 실행 워크플로우

**작업 설명**: $ARGUMENTS

### 1단계: Research & 분석

`[모드: Research]` - 요구사항 파악 및 컨텍스트 수집:

1. **프롬프트 강화**: `mcp__ace-tool__enhance_prompt` 호출, **이후 모든 Codex/Gemini 호출에서 원본 $ARGUMENTS를 강화된 결과로 교체**
2. **컨텍스트 수집**: `mcp__ace-tool__search_context` 호출
3. **요구사항 완전성 점수** (0-10점):
   - 목표 명확성 (0-3점), 예상 결과 (0-3점), 범위 경계 (0-2점), 제약 조건 (0-2점)
   - ≥7: 계속 진행 | <7: 중단, 명확화 질문

### 2단계: 솔루션 구상

`[모드: Ideation]` - 멀티 모델 병렬 분석:

**병렬 호출** (`run_in_background: true`):
- Codex: analyzer 프롬프트 사용, 기술적 실현 가능성, 솔루션, 리스크 출력
- Gemini: analyzer 프롬프트 사용, UI 실현 가능성, 솔루션, UX 평가 출력

`TaskOutput`으로 결과 대기. **SESSION_ID 저장** (`CODEX_SESSION` 및 `GEMINI_SESSION`).

**위의 `멀티 모델 호출 사양`에 있는 `중요` 지침을 따를 것**

두 분석을 합성하여 솔루션 비교 출력 (최소 2개 옵션), 사용자 선택 대기.

### 3단계: 상세 계획 수립

`[모드: Plan]` - 멀티 모델 협업 계획:

**병렬 호출** (`resume <SESSION_ID>`로 세션 재개):
- Codex: architect 프롬프트 + `resume $CODEX_SESSION` 사용, 백엔드 아키텍처 출력
- Gemini: architect 프롬프트 + `resume $GEMINI_SESSION` 사용, 프론트엔드 아키텍처 출력

`TaskOutput`으로 결과 대기.

**위의 `멀티 모델 호출 사양`에 있는 `중요` 지침을 따를 것**

**Claude 합성**: Codex 백엔드 계획 + Gemini 프론트엔드 계획 채택, 사용자 승인 후 `.claude/plan/task-name.md`에 저장.

### 4단계: 구현

`[모드: Execute]` - 코드 개발:

- 승인된 계획을 엄격히 따름
- 기존 프로젝트 코드 표준 준수
- 주요 마일스톤에서 피드백 요청

### 5단계: 코드 최적화

`[모드: Optimize]` - 멀티 모델 병렬 리뷰:

**병렬 호출**:
- Codex: reviewer 프롬프트 사용, 보안, 성능, 에러 처리 집중
- Gemini: reviewer 프롬프트 사용, 접근성, 디자인 일관성 집중

`TaskOutput`으로 결과 대기. 리뷰 피드백 통합, 사용자 확인 후 최적화 실행.

**위의 `멀티 모델 호출 사양`에 있는 `중요` 지침을 따를 것**

### 6단계: 품질 리뷰

`[모드: Review]` - 최종 평가:

- 계획 대비 완료 여부 확인
- 기능 검증을 위한 테스트 실행
- 이슈 및 개선사항 보고
- 사용자 최종 확인 요청

---

## 핵심 규칙

1. 단계 순서는 건너뛸 수 없음 (사용자가 명시적으로 지시한 경우 제외)
2. 외부 모델은 **파일시스템 쓰기 권한 없음**, 모든 수정은 Claude가 수행
3. 점수 < 7이거나 사용자가 승인하지 않으면 **강제 중단**
