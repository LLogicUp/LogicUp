---
name: iterative-retrieval
description: Pattern for progressively refining context retrieval to solve the subagent context problem
origin: ECC
---

# 반복적 컨텍스트 검색 패턴

서브에이전트가 작업을 시작하기 전에 어떤 컨텍스트가 필요한지 모르는 멀티 에이전트 워크플로의 "컨텍스트 문제"를 해결합니다.

## 활성화 시점

- 코드베이스 컨텍스트가 필요하지만 미리 예측할 수 없는 서브에이전트를 생성할 때
- 컨텍스트가 점진적으로 구체화되는 멀티 에이전트 워크플로 구축 시
- 에이전트 태스크에서 "컨텍스트 너무 큼" 또는 "컨텍스트 누락" 오류가 발생할 때
- 코드 탐색을 위한 RAG 유사 검색 파이프라인 설계 시
- 에이전트 오케스트레이션에서 토큰 사용량 최적화 시

## 문제

서브에이전트는 제한된 컨텍스트로 생성됩니다. 다음을 알 수 없습니다:
- 관련 코드가 어떤 파일에 있는지
- 코드베이스에 어떤 패턴이 존재하는지
- 프로젝트가 어떤 용어를 사용하는지

표준 접근법의 한계:
- **모두 전송**: 컨텍스트 한계 초과
- **아무것도 전송 안 함**: 에이전트에게 중요한 정보 부족
- **필요한 것 추측**: 자주 틀림

## 해결책: 반복적 검색

컨텍스트를 점진적으로 구체화하는 4단계 루프:

```
┌─────────────────────────────────────────────┐
│                                             │
│   ┌──────────┐      ┌──────────┐            │
│   │ DISPATCH │─────▶│ EVALUATE │            │
│   └──────────┘      └──────────┘            │
│        ▲                  │                 │
│        │                  ▼                 │
│   ┌──────────┐      ┌──────────┐            │
│   │   LOOP   │◀─────│  REFINE  │            │
│   └──────────┘      └──────────┘            │
│                                             │
│        최대 3 사이클 후 진행                  │
└─────────────────────────────────────────────┘
```

### Phase 1: DISPATCH

후보 파일을 수집하기 위한 초기 광범위 쿼리:

```javascript
// 상위 수준 의도로 시작
const initialQuery = {
  patterns: ['src/**/*.ts', 'lib/**/*.ts'],
  keywords: ['authentication', 'user', 'session'],
  excludes: ['*.test.ts', '*.spec.ts']
};

// 검색 에이전트에 디스패치
const candidates = await retrieveFiles(initialQuery);
```

### Phase 2: EVALUATE

검색된 콘텐츠의 관련성 평가:

```javascript
function evaluateRelevance(files, task) {
  return files.map(file => ({
    path: file.path,
    relevance: scoreRelevance(file.content, task),
    reason: explainRelevance(file.content, task),
    missingContext: identifyGaps(file.content, task)
  }));
}
```

점수 기준:
- **높음 (0.8-1.0)**: 대상 기능을 직접 구현
- **중간 (0.5-0.7)**: 관련 패턴 또는 타입 포함
- **낮음 (0.2-0.4)**: 간접적으로 관련
- **없음 (0-0.2)**: 관련 없음, 제외

### Phase 3: REFINE

평가를 기반으로 검색 기준 업데이트:

```javascript
function refineQuery(evaluation, previousQuery) {
  return {
    // 높은 관련성 파일에서 발견된 새로운 패턴 추가
    patterns: [...previousQuery.patterns, ...extractPatterns(evaluation)],

    // 코드베이스에서 발견된 용어 추가
    keywords: [...previousQuery.keywords, ...extractKeywords(evaluation)],

    // 확실히 관련 없는 경로 제외
    excludes: [...previousQuery.excludes, ...evaluation
      .filter(e => e.relevance < 0.2)
      .map(e => e.path)
    ],

    // 특정 갭 타겟팅
    focusAreas: evaluation
      .flatMap(e => e.missingContext)
      .filter(unique)
  };
}
```

### Phase 4: LOOP

구체화된 기준으로 반복 (최대 3 사이클):

```javascript
async function iterativeRetrieve(task, maxCycles = 3) {
  let query = createInitialQuery(task);
  let bestContext = [];

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const candidates = await retrieveFiles(query);
    const evaluation = evaluateRelevance(candidates, task);

    // 충분한 컨텍스트가 있는지 확인
    const highRelevance = evaluation.filter(e => e.relevance >= 0.7);
    if (highRelevance.length >= 3 && !hasCriticalGaps(evaluation)) {
      return highRelevance;
    }

    // 구체화하고 계속
    query = refineQuery(evaluation, query);
    bestContext = mergeContext(bestContext, highRelevance);
  }

  return bestContext;
}
```

## 실제 예시

### 예시 1: 버그 수정 컨텍스트

```
Task: "Fix the authentication token expiry bug"

Cycle 1:
  DISPATCH: Search for "token", "auth", "expiry" in src/**
  EVALUATE: Found auth.ts (0.9), tokens.ts (0.8), user.ts (0.3)
  REFINE: Add "refresh", "jwt" keywords; exclude user.ts

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found session-manager.ts (0.95), jwt-utils.ts (0.85)
  REFINE: Sufficient context (2 high-relevance files)

Result: auth.ts, tokens.ts, session-manager.ts, jwt-utils.ts
```

### 예시 2: 기능 구현

```
Task: "Add rate limiting to API endpoints"

Cycle 1:
  DISPATCH: Search "rate", "limit", "api" in routes/**
  EVALUATE: No matches - codebase uses "throttle" terminology
  REFINE: Add "throttle", "middleware" keywords

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found throttle.ts (0.9), middleware/index.ts (0.7)
  REFINE: Need router patterns

Cycle 3:
  DISPATCH: Search "router", "express" patterns
  EVALUATE: Found router-setup.ts (0.8)
  REFINE: Sufficient context

Result: throttle.ts, middleware/index.ts, router-setup.ts
```

## 에이전트와의 통합

에이전트 프롬프트에서 사용:

```markdown
이 태스크의 컨텍스트를 검색할 때:
1. 광범위한 키워드 검색으로 시작
2. 각 파일의 관련성 평가 (0-1 척도)
3. 아직 부족한 컨텍스트 파악
4. 검색 기준을 구체화하고 반복 (최대 3 사이클)
5. 관련성 >= 0.7인 파일 반환
```

## 모범 사례

1. **넓게 시작하고 점진적으로 좁히기** - 초기 쿼리를 과도하게 구체화하지 않기
2. **코드베이스 용어 학습** - 첫 번째 사이클에서 종종 명명 규칙 발견
3. **부족한 것 추적** - 명시적 갭 식별이 구체화를 이끔
4. **"충분히 좋은" 시점에 중단** - 높은 관련성 파일 3개가 평범한 파일 10개보다 나음
5. **확실히 제외** - 관련성이 낮은 파일은 관련성이 높아지지 않음

## 관련 자료

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - 서브에이전트 오케스트레이션 섹션
- `continuous-learning` 스킬 - 시간이 지남에 따라 개선되는 패턴
- `~/.claude/agents/`의 에이전트 정의
