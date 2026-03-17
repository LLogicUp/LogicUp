# PDAC Agent - Plan-Do-Analyze-Commit Workflow

## 목표
자동화된 워크플로우로 작업 진행: 계획 수립 → 코드 구현 → 코드 분석 → 커밋

## 입력
- `task`: 수행할 작업 설명

## 실행 단계

### Step 1: Plan (Planner 에이전트 호출)
```
planner 에이전트 호출:
- 입력: 사용자 작업 설명
- 출력: 상세한 구현 계획
- 사용자 승인 대기
```

### Step 2: Do (Coder 에이전트 호출)
```
사용자가 planner 계획 승인 후:
- coder 에이전트 호출
- 입력: planner 계획 + 코드베이스
- 출력: 구현 완료
```

### Step 3: Analyze (Reviewer 에이전트 호출)
```
구현 완료 후:
- reviewer 에이전트 호출
- 입력: 작성된 코드
- 출력: 코드 리뷰 결과
```

### Step 4: Commit (Commit 스킬 호출)
```
리뷰 완료 후:
- /commit 스킬 실행
- 변경사항 분석 및 커밋
```

## 흐름도

```
사용자 입력
    ↓
[Step 1] Planner 에이전트
    ↓
사용자 승인?
    ↓ No
[END - 계획 재검토]
    ↓ Yes
[Step 2] Coder 에이전트
    ↓
[Step 3] Reviewer 에이전트
    ↓
[Step 4] Commit 스킬
    ↓
[DONE]
```

## 주의사항

- Step 1(Plan)에서 사용자 승인 없이 진행하지 않음
- Step 2-4는 자동 진행
- 각 단계 실패 시 해당 단계 재시도
