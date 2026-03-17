---
name: tdd-workflow
description: 새 기능 작성, 버그 수정, 또는 코드 리팩터링 시 사용. 단위, 통합, E2E 테스트를 포함해 80% 이상 커버리지를 갖춘 테스트 주도 개발을 강제한다.
origin: ECC
---

# 테스트 주도 개발 워크플로

이 스킬은 모든 코드 개발이 포괄적인 테스트 커버리지와 함께 TDD 원칙을 따르도록 보장한다.

## 언제 사용하나

- 새 기능 또는 기능 추가 작성 시
- 버그 또는 이슈 수정 시
- 기존 코드 리팩터링 시
- API 엔드포인트 추가 시
- 새 컴포넌트 생성 시

## 핵심 원칙

### 1. 코드보다 테스트 먼저
항상 먼저 테스트를 작성하고, 그 후 테스트를 통과시키는 코드를 구현한다.

### 2. 커버리지 요구사항
- 최소 80% 커버리지 (단위 + 통합 + E2E)
- 모든 엣지 케이스 커버
- 오류 시나리오 테스트
- 경계 조건 검증

### 3. 테스트 유형

#### 단위 테스트
- 개별 함수 및 유틸리티
- 컴포넌트 로직
- 순수 함수
- 헬퍼 및 유틸리티

#### 통합 테스트
- API 엔드포인트
- 데이터베이스 작업
- 서비스 상호작용
- 외부 API 호출

#### E2E 테스트 (Playwright)
- 핵심 사용자 흐름
- 전체 워크플로
- 브라우저 자동화
- UI 상호작용

## TDD 워크플로 단계

### 1단계: 사용자 여정 작성
```
[역할]로서, [행동]을 하고 싶다. 왜냐하면 [이유]이기 때문이다.

예시:
사용자로서, 시장을 의미론적으로 검색하고 싶다.
정확한 키워드 없이도 관련 시장을 찾을 수 있도록.
```

### 2단계: 테스트 케이스 생성
각 사용자 여정에 대해 포괄적인 테스트 케이스 작성:

```typescript
describe('Semantic Search', () => {
  it('returns relevant markets for query', async () => {
    // 테스트 구현
  })

  it('handles empty query gracefully', async () => {
    // 엣지 케이스 테스트
  })

  it('falls back to substring search when Redis unavailable', async () => {
    // 폴백 동작 테스트
  })

  it('sorts results by similarity score', async () => {
    // 정렬 로직 테스트
  })
})
```

### 3단계: 테스트 실행 (실패해야 함)
```bash
npm test
# 테스트가 실패해야 함 — 아직 구현하지 않았으므로
```

### 4단계: 코드 구현
테스트를 통과시키는 최소한의 코드 작성:

```typescript
// 테스트에 의해 가이드된 구현
export async function searchMarkets(query: string) {
  // 구현 코드
}
```

### 5단계: 테스트 재실행
```bash
npm test
# 이제 테스트가 통과해야 함
```

### 6단계: 리팩터링
테스트를 통과시키면서 코드 품질 개선:
- 중복 제거
- 네이밍 개선
- 성능 최적화
- 가독성 향상

### 7단계: 커버리지 확인
```bash
npm run test:coverage
# 80% 이상 커버리지 달성 확인
```

## 테스트 패턴

### 단위 테스트 패턴 (Jest/Vitest)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### API 통합 테스트 패턴
```typescript
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/markets', () => {
  it('returns markets successfully', async () => {
    const request = new NextRequest('http://localhost/api/markets')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('validates query parameters', async () => {
    const request = new NextRequest('http://localhost/api/markets?limit=invalid')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('handles database errors gracefully', async () => {
    // 데이터베이스 실패 모킹
    const request = new NextRequest('http://localhost/api/markets')
    // 오류 처리 테스트
  })
})
```

### E2E 테스트 패턴 (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can search and filter markets', async ({ page }) => {
  // 마켓 페이지로 이동
  await page.goto('/')
  await page.click('a[href="/markets"]')

  // 페이지 로드 확인
  await expect(page.locator('h1')).toContainText('Markets')

  // 마켓 검색
  await page.fill('input[placeholder="Search markets"]', 'election')

  // 디바운스와 결과를 위한 대기
  await page.waitForTimeout(600)

  // 검색 결과 표시 확인
  const results = page.locator('[data-testid="market-card"]')
  await expect(results).toHaveCount(5, { timeout: 5000 })

  // 결과가 검색어를 포함하는지 확인
  const firstResult = results.first()
  await expect(firstResult).toContainText('election', { ignoreCase: true })

  // 상태로 필터링
  await page.click('button:has-text("Active")')

  // 필터링된 결과 확인
  await expect(results).toHaveCount(3)
})

test('user can create a new market', async ({ page }) => {
  // 먼저 로그인
  await page.goto('/creator-dashboard')

  // 마켓 생성 폼 작성
  await page.fill('input[name="name"]', 'Test Market')
  await page.fill('textarea[name="description"]', 'Test description')
  await page.fill('input[name="endDate"]', '2025-12-31')

  // 폼 제출
  await page.click('button[type="submit"]')

  // 성공 메시지 확인
  await expect(page.locator('text=Market created successfully')).toBeVisible()

  // 마켓 페이지로 리다이렉트 확인
  await expect(page).toHaveURL(/\/markets\/test-market/)
})
```

## 테스트 파일 구성

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx          # 단위 테스트
│   │   └── Button.stories.tsx       # Storybook
│   └── MarketCard/
│       ├── MarketCard.tsx
│       └── MarketCard.test.tsx
├── app/
│   └── api/
│       └── markets/
│           ├── route.ts
│           └── route.test.ts         # 통합 테스트
└── e2e/
    ├── markets.spec.ts               # E2E 테스트
    ├── trading.spec.ts
    └── auth.spec.ts
```

## 외부 서비스 모킹

### Supabase 모킹
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Test Market' }],
          error: null
        }))
      }))
    }))
  }
}))
```

### Redis 모킹
```typescript
jest.mock('@/lib/redis', () => ({
  searchMarketsByVector: jest.fn(() => Promise.resolve([
    { slug: 'test-market', similarity_score: 0.95 }
  ])),
  checkRedisHealth: jest.fn(() => Promise.resolve({ connected: true }))
}))
```

### OpenAI 모킹
```typescript
jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(
    new Array(1536).fill(0.1) // 모킹된 1536차원 임베딩
  ))
}))
```

## 테스트 커버리지 검증

### 커버리지 보고서 실행
```bash
npm run test:coverage
```

### 커버리지 임계값
```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## 피해야 할 일반적인 테스트 실수

### 잘못된 예: 구현 세부사항 테스트
```typescript
// 내부 상태 테스트하지 않기
expect(component.state.count).toBe(5)
```

### 올바른 예: 사용자 가시 동작 테스트
```typescript
// 사용자가 보는 것을 테스트
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### 잘못된 예: 깨지기 쉬운 셀렉터
```typescript
// 쉽게 깨짐
await page.click('.css-class-xyz')
```

### 올바른 예: 시맨틱 셀렉터
```typescript
// 변경에 강함
await page.click('button:has-text("Submit")')
await page.click('[data-testid="submit-button"]')
```

### 잘못된 예: 테스트 격리 없음
```typescript
// 테스트끼리 의존
test('creates user', () => { /* ... */ })
test('updates same user', () => { /* 이전 테스트에 의존 */ })
```

### 올바른 예: 독립적인 테스트
```typescript
// 각 테스트가 자체 데이터를 설정
test('creates user', () => {
  const user = createTestUser()
  // 테스트 로직
})

test('updates user', () => {
  const user = createTestUser()
  // 업데이트 로직
})
```

## 지속적인 테스트

### 개발 중 감시 모드
```bash
npm test -- --watch
# 파일 변경 시 테스트 자동 실행
```

### 커밋 전 훅
```bash
# 모든 커밋 전 실행
npm test && npm run lint
```

### CI/CD 통합
```yaml
# GitHub Actions
- name: Run Tests
  run: npm test -- --coverage
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## 모범 사례

1. **테스트 먼저 작성** - 항상 TDD
2. **테스트당 하나의 단언** - 단일 동작에 집중
3. **설명적인 테스트 이름** - 무엇을 테스트하는지 설명
4. **Arrange-Act-Assert** - 명확한 테스트 구조
5. **외부 의존성 모킹** - 단위 테스트 격리
6. **엣지 케이스 테스트** - null, undefined, 빈 값, 대형 값
7. **오류 경로 테스트** - 해피 패스만 아님
8. **테스트를 빠르게 유지** - 단위 테스트 각 50ms 미만
9. **테스트 후 정리** - 부작용 없음
10. **커버리지 보고서 검토** - 격차 파악

## 성공 지표

- 80% 이상 코드 커버리지 달성
- 모든 테스트 통과 (그린)
- 건너뛰거나 비활성화된 테스트 없음
- 빠른 테스트 실행 (단위 테스트 30초 미만)
- E2E 테스트가 핵심 사용자 흐름 커버
- 프로덕션 전 테스트가 버그를 잡음

---

**기억**: 테스트는 선택 사항이 아니다. 자신 있는 리팩터링, 빠른 개발, 프로덕션 안정성을 가능하게 하는 안전망이다.
