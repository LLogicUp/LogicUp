---
description: NanoClaw 에이전트 REPL 시작 — claude CLI 기반의 지속적이고 세션 인식 AI 어시스턴트.
---

# Claw 명령

대화 기록을 디스크에 저장하고 선택적으로 ECC 스킬 컨텍스트를 로드하는 대화형 AI 에이전트 세션을 시작합니다.

## 사용법

```bash
node scripts/claw.js
```

또는 npm 경유:

```bash
npm run claw
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CLAW_SESSION` | `default` | 세션 이름 (영숫자 + 하이픈) |
| `CLAW_SKILLS` | *(없음)* | 시스템 컨텍스트로 로드할 쉼표 구분 스킬 이름 목록 |

## REPL 명령

REPL 내부에서 프롬프트에 직접 입력합니다.

```
/clear      현재 세션 기록 초기화
/history    전체 대화 기록 출력
/sessions   저장된 모든 세션 목록
/help       사용 가능한 명령 표시
exit        REPL 종료
```

## 동작 방식

1. `CLAW_SESSION` 환경 변수를 읽어 이름 있는 세션 선택 (기본값: `default`)
2. `~/.claude/claw/{session}.md`에서 대화 기록 로드
3. `CLAW_SKILLS` 환경 변수에서 ECC 스킬 컨텍스트 선택적 로드
4. 블로킹 프롬프트 루프 진입 — 각 사용자 메시지는 전체 기록과 함께 `claude -p`로 전송
5. 재시작 후에도 지속성을 위해 응답을 세션 파일에 추가

## 세션 저장소

세션은 `~/.claude/claw/`에 마크다운 파일로 저장됩니다.

```
~/.claude/claw/default.md
~/.claude/claw/my-project.md
```

각 턴의 형식:

```markdown
### [2025-01-15T10:30:00.000Z] User
이 함수는 무엇을 하나요?
---
### [2025-01-15T10:30:05.000Z] Assistant
이 함수는 ...을 계산합니다.
---
```

## 예시

```bash
# 기본 세션 시작
node scripts/claw.js

# 이름 있는 세션
CLAW_SESSION=my-project node scripts/claw.js

# 스킬 컨텍스트 포함
CLAW_SKILLS=tdd-workflow,security-review node scripts/claw.js
```
