# Eval 명령

평가 주도 개발 워크플로우를 관리합니다.

## 사용법

`/eval [define|check|report|list] [기능명]`

## 평가 정의

`/eval define 기능명`

새 평가 정의를 생성합니다.

1. 다음 템플릿으로 `.claude/evals/기능명.md` 생성:

```markdown
## EVAL: feature-name
Created: $(date)

### Capability Evals
- [ ] [Description of capability 1]
- [ ] [Description of capability 2]

### Regression Evals
- [ ] [Existing behavior 1 still works]
- [ ] [Existing behavior 2 still works]

### Success Criteria
- pass@3 > 90% for capability evals
- pass^3 = 100% for regression evals
```

2. 사용자에게 구체적인 기준 입력 요청

## 평가 실행

`/eval check 기능명`

기능에 대한 평가를 실행합니다.

1. `.claude/evals/기능명.md`에서 평가 정의 읽기
2. 각 기능 평가에 대해:
   - 기준 검증 시도
   - PASS/FAIL 기록
   - `.claude/evals/기능명.log`에 시도 기록
3. 각 회귀 평가에 대해:
   - 관련 테스트 실행
   - 기준점과 비교
   - PASS/FAIL 기록
4. 현재 상태 보고:

```
EVAL CHECK: feature-name
========================
기능 평가: X/Y 통과
회귀 평가: X/Y 통과
상태: 진행 중 / 준비 완료
```

## 평가 리포트

`/eval report 기능명`

종합 평가 리포트 생성:

```
EVAL REPORT: feature-name
=========================
Generated: $(date)

CAPABILITY EVALS
----------------
[eval-1]: PASS (pass@1)
[eval-2]: PASS (pass@2) - required retry
[eval-3]: FAIL - see notes

REGRESSION EVALS
----------------
[test-1]: PASS
[test-2]: PASS
[test-3]: PASS

METRICS
-------
Capability pass@1: 67%
Capability pass@3: 100%
Regression pass^3: 100%

NOTES
-----
[Any issues, edge cases, or observations]

RECOMMENDATION
--------------
[SHIP / NEEDS WORK / BLOCKED]
```

## 평가 목록

`/eval list`

모든 평가 정의 표시:

```
EVAL DEFINITIONS
================
feature-auth      [3/5 통과] 진행 중
feature-search    [5/5 통과] 준비 완료
feature-export    [0/4 통과] 미시작
```

## 인수

$ARGUMENTS:
- `define <이름>` - 새 평가 정의 생성
- `check <이름>` - 평가 실행 및 확인
- `report <이름>` - 전체 리포트 생성
- `list` - 모든 평가 표시
- `clean` - 오래된 평가 로그 삭제 (최근 10회 유지)
