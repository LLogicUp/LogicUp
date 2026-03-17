# Orchestrate 명령

복잡한 작업을 위한 순차적 에이전트 워크플로우.

## 사용법

`/orchestrate [workflow-type] [task-description]`

## 워크플로우 유형

### feature
전체 기능 구현 워크플로우:
```
planner -> tdd-guide -> code-reviewer -> security-reviewer
```

### bugfix
버그 조사 및 수정 워크플로우:
```
planner -> tdd-guide -> code-reviewer
```

### refactor
안전한 리팩토링 워크플로우:
```
architect -> code-reviewer -> tdd-guide
```

### security
보안 중점 리뷰:
```
security-reviewer -> code-reviewer -> architect
```

## 실행 패턴

워크플로우의 각 에이전트에 대해:

1. **에이전트 호출** - 이전 에이전트의 컨텍스트와 함께 호출
2. **출력 수집** - 구조화된 인계 문서로 수집
3. **다음 에이전트에 전달** - 체인의 다음 에이전트에 전달
4. **결과 집계** - 최종 보고서로 집계

## 인계 문서 형식

에이전트 간 인계 문서 작성:

```markdown
## HANDOFF: [previous-agent] -> [next-agent]

### Context
[수행한 작업 요약]

### Findings
[주요 발견 사항 또는 결정 내용]

### Files Modified
[수정된 파일 목록]

### Open Questions
[다음 에이전트를 위한 미해결 항목]

### Recommendations
[권장 다음 단계]
```

## 예시: Feature 워크플로우

```
/orchestrate feature "Add user authentication"
```

실행 내용:

1. **Planner 에이전트**
   - 요구사항 분석
   - 구현 계획 작성
   - 의존성 파악
   - 출력: `HANDOFF: planner -> tdd-guide`

2. **TDD Guide 에이전트**
   - planner 인계 내용 읽기
   - 테스트 먼저 작성
   - 테스트 통과하도록 구현
   - 출력: `HANDOFF: tdd-guide -> code-reviewer`

3. **Code Reviewer 에이전트**
   - 구현 리뷰
   - 이슈 확인
   - 개선사항 제안
   - 출력: `HANDOFF: code-reviewer -> security-reviewer`

4. **Security Reviewer 에이전트**
   - 보안 감사
   - 취약점 검사
   - 최종 승인
   - 출력: 최종 보고서

## 최종 보고서 형식

```
ORCHESTRATION REPORT
====================
Workflow: feature
Task: Add user authentication
Agents: planner -> tdd-guide -> code-reviewer -> security-reviewer

SUMMARY
-------
[한 문단 요약]

AGENT OUTPUTS
-------------
Planner: [요약]
TDD Guide: [요약]
Code Reviewer: [요약]
Security Reviewer: [요약]

FILES CHANGED
-------------
[수정된 모든 파일 목록]

TEST RESULTS
------------
[테스트 통과/실패 요약]

SECURITY STATUS
---------------
[보안 검토 결과]

RECOMMENDATION
--------------
[SHIP / NEEDS WORK / BLOCKED]
```

## 병렬 실행

독립적인 검사는 에이전트를 병렬로 실행:

```markdown
### 병렬 단계
동시 실행:
- code-reviewer (품질)
- security-reviewer (보안)
- architect (설계)

### 결과 병합
출력을 단일 보고서로 통합
```

## 인수

$ARGUMENTS:
- `feature <description>` - 전체 기능 워크플로우
- `bugfix <description>` - 버그 수정 워크플로우
- `refactor <description>` - 리팩토링 워크플로우
- `security <description>` - 보안 리뷰 워크플로우
- `custom <agents> <description>` - 사용자 정의 에이전트 순서

## 사용자 정의 워크플로우 예시

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## 팁

1. 복잡한 기능에는 **planner부터 시작**
2. 머지 전 **항상 code-reviewer 포함**
3. 인증/결제/PII에는 **security-reviewer 사용**
4. **인계 내용은 간결하게** - 다음 에이전트에 필요한 내용만 집중
5. 필요 시 에이전트 간 **검증 실행**
