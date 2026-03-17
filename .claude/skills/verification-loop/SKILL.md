---
name: verification-loop
description: "Claude Code 세션을 위한 포괄적인 검증 시스템."
origin: ECC
---

# Verification Loop 스킬

Claude Code 세션을 위한 포괄적인 검증 시스템.

## 사용 시점

다음 경우에 이 스킬을 호출합니다:
- 기능 또는 중요한 코드 변경 완료 후
- PR 생성 전
- 품질 게이트를 통과하는지 확인하고 싶을 때
- 리팩토링 후

## 검증 단계

### Phase 1: 빌드 검증
```bash
# 프로젝트 빌드 확인
npm run build 2>&1 | tail -20
# 또는
pnpm build 2>&1 | tail -20
```

빌드가 실패하면 계속 진행하기 전에 STOP하고 수정합니다.

### Phase 2: 타입 체크
```bash
# TypeScript 프로젝트
npx tsc --noEmit 2>&1 | head -30

# Python 프로젝트
pyright . 2>&1 | head -30
```

모든 타입 에러를 보고합니다. 계속하기 전에 중요한 것들을 수정합니다.

### Phase 3: 린트 체크
```bash
# JavaScript/TypeScript
npm run lint 2>&1 | head -30

# Python
ruff check . 2>&1 | head -30
```

### Phase 4: 테스트 스위트
```bash
# 커버리지 포함 테스트 실행
npm run test -- --coverage 2>&1 | tail -50

# 커버리지 임계값 확인
# 목표: 최소 80%
```

보고 내용:
- 전체 테스트: X개
- 통과: X개
- 실패: X개
- 커버리지: X%

### Phase 5: 보안 스캔
```bash
# 시크릿 확인
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10

# console.log 확인
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: 차이점 검토
```bash
# 변경된 내용 표시
git diff --stat
git diff HEAD~1 --name-only
```

변경된 각 파일을 다음 사항으로 검토합니다:
- 의도하지 않은 변경
- 누락된 에러 처리
- 잠재적인 엣지 케이스

## 출력 형식

모든 단계 실행 후 검증 보고서를 생성합니다:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

수정해야 할 이슈:
1. ...
2. ...
```

## 연속 모드

장시간 세션에서는 15분마다 또는 주요 변경 후에 검증을 실행합니다:

```markdown
정신적 체크포인트 설정:
- 각 함수 완료 후
- 컴포넌트 완성 후
- 다음 작업으로 이동하기 전

실행: /verify
```

## Hooks와의 연동

이 스킬은 PostToolUse hooks를 보완하지만 더 깊은 검증을 제공합니다.
Hooks는 문제를 즉시 잡고, 이 스킬은 포괄적인 검토를 제공합니다.
