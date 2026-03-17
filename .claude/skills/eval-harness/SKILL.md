---
name: eval-harness
description: 평가 주도 개발(EDD) 원칙을 구현하는 Claude Code 세션을 위한 공식 평가 프레임워크
origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Eval Harness 스킬

평가 주도 개발(EDD) 원칙을 구현하는 Claude Code 세션을 위한 공식 평가 프레임워크.

## 활성화 시점

- AI 지원 워크플로에 평가 주도 개발(EDD) 설정
- Claude Code 작업 완료에 대한 합격/불합격 기준 정의
- pass@k 지표로 에이전트 신뢰성 측정
- 프롬프트 또는 에이전트 변경에 대한 회귀 테스트 스위트 생성
- 모델 버전 간 에이전트 성능 벤치마킹

## 철학

평가 주도 개발은 평가를 "AI 개발의 단위 테스트"로 취급합니다:
- 구현 전에 기대 동작을 정의
- 개발 중 지속적으로 평가 실행
- 각 변경 사항마다 회귀 추적
- 신뢰성 측정을 위해 pass@k 지표 사용

## 평가 유형

### 역량 평가
Claude가 이전에 할 수 없었던 일을 할 수 있는지 테스트:
```markdown
[역량 평가: 기능명]
작업: Claude가 달성해야 할 내용 설명
성공 기준:
  - [ ] 기준 1
  - [ ] 기준 2
  - [ ] 기준 3
기대 출력: 기대 결과 설명
```

### 회귀 평가
변경 사항이 기존 기능을 깨뜨리지 않는지 확인:
```markdown
[회귀 평가: 기능명]
기준점: SHA 또는 체크포인트 이름
테스트:
  - existing-test-1: PASS/FAIL
  - existing-test-2: PASS/FAIL
  - existing-test-3: PASS/FAIL
결과: X/Y 통과 (이전: Y/Y)
```

## 채점자 유형

### 1. 코드 기반 채점자
코드를 사용한 결정론적 검사:
```bash
# 파일에 기대 패턴이 포함되어 있는지 확인
grep -q "export function handleAuth" src/auth.ts && echo "PASS" || echo "FAIL"

# 테스트 통과 여부 확인
npm test -- --testPathPattern="auth" && echo "PASS" || echo "FAIL"

# 빌드 성공 여부 확인
npm run build && echo "PASS" || echo "FAIL"
```

### 2. 모델 기반 채점자
Claude를 사용하여 개방형 출력 평가:
```markdown
[모델 채점자 프롬프트]
다음 코드 변경 사항을 평가하세요:
1. 명시된 문제를 해결하는가?
2. 구조가 잘 잡혀 있는가?
3. 엣지 케이스가 처리되었는가?
4. 오류 처리가 적절한가?

점수: 1-5 (1=불량, 5=우수)
이유: [설명]
```

### 3. 인간 채점자
수동 검토를 위해 플래그 지정:
```markdown
[인간 검토 필요]
변경: 변경된 내용 설명
이유: 인간 검토가 필요한 이유
위험 수준: LOW/MEDIUM/HIGH
```

## 지표

### pass@k
"k번의 시도 중 최소 한 번 성공"
- pass@1: 첫 번째 시도 성공률
- pass@3: 3번의 시도 내 성공
- 일반 목표: pass@3 > 90%

### pass^k
"k번의 모든 시도 성공"
- 더 높은 신뢰성 기준
- pass^3: 3번 연속 성공
- 핵심 경로에 사용

## 평가 워크플로

### 1. 정의 (코딩 전)
```markdown
## 평가 정의: feature-xyz

### 역량 평가
1. 새 사용자 계정 생성 가능
2. 이메일 형식 유효성 검사 가능
3. 비밀번호를 안전하게 해시할 수 있음

### 회귀 평가
1. 기존 로그인 여전히 작동
2. 세션 관리 변경 없음
3. 로그아웃 흐름 유지

### 성공 지표
- 역량 평가에 대해 pass@3 > 90%
- 회귀 평가에 대해 pass^3 = 100%
```

### 2. 구현
정의된 평가를 통과하는 코드 작성.

### 3. 평가
```bash
# 역량 평가 실행
[각 역량 평가 실행, PASS/FAIL 기록]

# 회귀 평가 실행
npm test -- --testPathPattern="existing"

# 보고서 생성
```

### 4. 보고
```markdown
평가 보고서: feature-xyz
========================

역량 평가:
  create-user:     PASS (pass@1)
  validate-email:  PASS (pass@2)
  hash-password:   PASS (pass@1)
  전체:            3/3 통과

회귀 평가:
  login-flow:      PASS
  session-mgmt:    PASS
  logout-flow:     PASS
  전체:            3/3 통과

지표:
  pass@1: 67% (2/3)
  pass@3: 100% (3/3)

상태: 검토 준비 완료
```

## 통합 패턴

### 구현 전
```
/eval define feature-name
```
`.claude/evals/feature-name.md`에 평가 정의 파일 생성

### 구현 중
```
/eval check feature-name
```
현재 평가 실행 및 상태 보고

### 구현 후
```
/eval report feature-name
```
전체 평가 보고서 생성

## 평가 저장

프로젝트에 평가 저장:
```
.claude/
  evals/
    feature-xyz.md      # 평가 정의
    feature-xyz.log     # 평가 실행 기록
    baseline.json       # 회귀 기준선
```

## 모범 사례

1. **코딩 전에 평가 정의** - 성공 기준에 대한 명확한 사고 강제
2. **자주 평가 실행** - 회귀를 조기에 발견
3. **시간 경과에 따른 pass@k 추적** - 신뢰성 트렌드 모니터링
4. **가능한 경우 코드 채점자 사용** - 결정론적 > 확률론적
5. **보안을 위한 인간 검토** - 보안 검사를 절대 완전히 자동화하지 않음
6. **평가를 빠르게 유지** - 느린 평가는 실행되지 않음
7. **코드와 함께 평가 버전 관리** - 평가는 1급 아티팩트

## 예시: 인증 추가

```markdown
## 평가: add-authentication

### 1단계: 정의 (10분)
역량 평가:
- [ ] 사용자가 이메일/비밀번호로 등록 가능
- [ ] 사용자가 유효한 자격증명으로 로그인 가능
- [ ] 잘못된 자격증명이 적절한 오류로 거부됨
- [ ] 세션이 페이지 새로고침 후에도 유지됨
- [ ] 로그아웃 시 세션 삭제

회귀 평가:
- [ ] 공개 라우트 여전히 접근 가능
- [ ] API 응답 변경 없음
- [ ] 데이터베이스 스키마 호환 가능

### 2단계: 구현 (소요 시간 다양)
[코드 작성]

### 3단계: 평가
실행: /eval check add-authentication

### 4단계: 보고
평가 보고서: add-authentication
==============================
역량: 5/5 통과 (pass@3: 100%)
회귀: 3/3 통과 (pass^3: 100%)
상태: 배포 가능
```
