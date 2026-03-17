---
description: Playwright로 E2E 테스트를 생성하고 실행합니다. 테스트 시나리오 작성, 테스트 실행, 스크린샷/영상/트레이스 캡처, 아티팩트 업로드를 수행합니다.
---

# E2E 명령

이 명령은 **e2e-runner** 에이전트를 호출하여 Playwright를 사용한 E2E 테스트를 생성, 유지, 실행합니다.

## 이 명령이 하는 일

1. **테스트 시나리오 생성** - 사용자 흐름에 대한 Playwright 테스트 작성
2. **E2E 테스트 실행** - 여러 브라우저에서 테스트 실행
3. **아티팩트 캡처** - 실패 시 스크린샷, 영상, 트레이스 저장
4. **결과 업로드** - HTML 리포트 및 JUnit XML 업로드
5. **불안정 테스트 감지** - 간헐적으로 실패하는 테스트 격리

## 언제 사용하나요

다음 상황에서 `/e2e`를 사용합니다.

- 중요한 사용자 흐름 테스트 (로그인, 거래, 결제)
- 다단계 흐름의 E2E 동작 검증
- UI 상호작용 및 탐색 테스트
- 프론트엔드와 백엔드 간의 통합 검증
- 프로덕션 배포 준비

## 동작 방식

e2e-runner 에이전트는 다음을 수행합니다.

1. **사용자 흐름 분석** 및 테스트 시나리오 도출
2. Page Object Model 패턴을 사용한 **Playwright 테스트 생성**
3. 여러 브라우저(Chrome, Firefox, Safari)에서 **테스트 실행**
4. 스크린샷, 영상, 트레이스로 **실패 캡처**
5. 결과 및 아티팩트가 포함된 **리포트 생성**
6. **불안정 테스트 감지** 및 수정 방법 권장

## 사용 예시

```
사용자: /e2e 마켓 검색 및 상세 조회 흐름 테스트

에이전트 (e2e-runner):
# E2E 테스트 생성: 마켓 검색 및 상세 조회 흐름

## 식별된 테스트 시나리오

**사용자 흐름:** 마켓 검색 → 결과 조회 → 마켓 클릭 → 상세 보기

**테스트 커버리지:**
1. 마켓 페이지 이동
2. 시맨틱 검색 수행
3. 검색 결과 검증
4. 첫 번째 결과 클릭
5. 마켓 상세 페이지 로드 검증
6. 차트 렌더링 검증

## 생성된 테스트 코드

```typescript
// tests/e2e/markets/search-and-view.spec.ts
import { test, expect } from '@playwright/test'
import { MarketsPage } from '../../pages/MarketsPage'
import { MarketDetailsPage } from '../../pages/MarketDetailsPage'

test.describe('Market Search and View Flow', () => {
  test('user can search markets and view details', async ({ page }) => {
    // 1. Navigate to markets page
    const marketsPage = new MarketsPage(page)
    await marketsPage.goto()

    // Verify page loaded
    await expect(page).toHaveTitle(/Markets/)
    await expect(page.locator('h1')).toContainText('Markets')

    // 2. Perform semantic search
    await marketsPage.searchMarkets('election')

    // Wait for API response
    await page.waitForResponse(resp =>
      resp.url().includes('/api/markets/search') && resp.status() === 200
    )

    // 3. Verify search results
    const marketCards = marketsPage.marketCards
    await expect(marketCards.first()).toBeVisible()
    const resultCount = await marketCards.count()
    expect(resultCount).toBeGreaterThan(0)

    // Take screenshot of search results
    await page.screenshot({ path: 'artifacts/search-results.png' })

    // 4. Click on first result
    const firstMarketTitle = await marketCards.first().textContent()
    await marketCards.first().click()

    // 5. Verify market details page loads
    await expect(page).toHaveURL(/\/markets\/[a-z0-9-]+/)

    const detailsPage = new MarketDetailsPage(page)
    await expect(detailsPage.marketName).toBeVisible()
    await expect(detailsPage.marketDescription).toBeVisible()

    // 6. Verify chart renders
    await expect(detailsPage.priceChart).toBeVisible()

    // Verify market name matches
    const detailsTitle = await detailsPage.marketName.textContent()
    expect(detailsTitle?.toLowerCase()).toContain(
      firstMarketTitle?.toLowerCase().substring(0, 20) || ''
    )

    // Take screenshot of market details
    await page.screenshot({ path: 'artifacts/market-details.png' })
  })

  test('search with no results shows empty state', async ({ page }) => {
    const marketsPage = new MarketsPage(page)
    await marketsPage.goto()

    // Search for non-existent market
    await marketsPage.searchMarkets('xyznonexistentmarket123456')

    // Verify empty state
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-results"]')).toContainText(
      /no.*results|no.*markets/i
    )

    const marketCount = await marketsPage.marketCards.count()
    expect(marketCount).toBe(0)
  })

  test('can clear search and see all markets again', async ({ page }) => {
    const marketsPage = new MarketsPage(page)
    await marketsPage.goto()

    // Initial market count
    const initialCount = await marketsPage.marketCards.count()

    // Perform search
    await marketsPage.searchMarkets('trump')
    await page.waitForLoadState('networkidle')

    // Verify filtered results
    const filteredCount = await marketsPage.marketCards.count()
    expect(filteredCount).toBeLessThan(initialCount)

    // Clear search
    await marketsPage.searchInput.clear()
    await page.waitForLoadState('networkidle')

    // Verify all markets shown again
    const finalCount = await marketsPage.marketCards.count()
    expect(finalCount).toBe(initialCount)
  })
})
```

## 테스트 실행

```bash
# Run the generated test
npx playwright test tests/e2e/markets/search-and-view.spec.ts

Running 3 tests using 3 workers

  ✓  [chromium] › search-and-view.spec.ts:5:3 › user can search markets and view details (4.2s)
  ✓  [chromium] › search-and-view.spec.ts:52:3 › search with no results shows empty state (1.8s)
  ✓  [chromium] › search-and-view.spec.ts:67:3 › can clear search and see all markets again (2.9s)

  3 passed (9.1s)

Artifacts generated:
- artifacts/search-results.png
- artifacts/market-details.png
- playwright-report/index.html
```

## 테스트 리포트

```
╔══════════════════════════════════════════════════════════════╗
║                    E2E 테스트 결과                           ║
╠══════════════════════════════════════════════════════════════╣
║ 상태:       전체 통과                                        ║
║ 총계:       3개 테스트                                       ║
║ 통과:       3 (100%)                                         ║
║ 실패:       0                                                ║
║ 불안정:     0                                                ║
║ 소요 시간:  9.1초                                            ║
╚══════════════════════════════════════════════════════════════╝

아티팩트:
스크린샷: 2개 파일
영상: 0개 파일 (실패 시에만)
트레이스: 0개 파일 (실패 시에만)
HTML 리포트: playwright-report/index.html

리포트 보기: npx playwright show-report
```

E2E 테스트 스위트가 CI/CD 통합 준비 완료!
```

## 테스트 아티팩트

테스트 실행 시 다음 아티팩트가 캡처됩니다.

**모든 테스트:**
- 타임라인 및 결과가 포함된 HTML 리포트
- CI 통합을 위한 JUnit XML

**실패 시에만:**
- 실패 상태의 스크린샷
- 테스트 영상 녹화
- 디버깅을 위한 트레이스 파일 (단계별 재생)
- 네트워크 로그
- 콘솔 로그

## 아티팩트 조회

```bash
# 브라우저에서 HTML 리포트 보기
npx playwright show-report

# 특정 트레이스 파일 보기
npx playwright show-trace artifacts/trace-abc123.zip

# 스크린샷은 artifacts/ 디렉토리에 저장됨
open artifacts/search-results.png
```

## 불안정 테스트 감지

테스트가 간헐적으로 실패하는 경우:

```
불안정 테스트 감지: tests/e2e/markets/trade.spec.ts

10회 실행 중 7회 통과 (70% 통과율)

주요 실패 원인:
"'[data-testid="confirm-btn"]' 요소 대기 타임아웃"

권장 수정 방법:
1. 명시적 대기 추가: await page.waitForSelector('[data-testid="confirm-btn"]')
2. 타임아웃 증가: { timeout: 10000 }
3. 컴포넌트의 경쟁 조건 확인
4. 애니메이션으로 인해 요소가 숨겨지지 않는지 확인

격리 권장: 수정될 때까지 test.fixme()로 표시
```

## 브라우저 설정

기본적으로 여러 브라우저에서 테스트를 실행합니다.

- Chromium (데스크톱 Chrome)
- Firefox (데스크톱)
- WebKit (데스크톱 Safari)
- Mobile Chrome (선택 사항)

`playwright.config.ts`에서 브라우저를 조정할 수 있습니다.

## CI/CD 통합

CI 파이프라인에 추가:

```yaml
# .github/workflows/e2e.yml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## PMX 전용 핵심 흐름

PMX에서는 다음 E2E 테스트를 우선 적용합니다.

**CRITICAL (항상 통과해야 함):**
1. 사용자 지갑 연결
2. 마켓 목록 조회
3. 마켓 검색 (시맨틱 검색)
4. 마켓 상세 조회
5. 거래 실행 (테스트 자금으로)
6. 마켓 올바른 정산
7. 자금 출금

**IMPORTANT:**
1. 마켓 생성 흐름
2. 사용자 프로필 업데이트
3. 실시간 가격 업데이트
4. 차트 렌더링
5. 마켓 필터 및 정렬
6. 모바일 반응형 레이아웃

## 모범 사례

**해야 할 것:**
- Page Object Model로 유지보수성 확보
- 선택자에 data-testid 속성 사용
- 임의 타임아웃이 아닌 API 응답 대기
- 핵심 사용자 흐름을 E2E로 테스트
- main 머지 전 테스트 실행
- 테스트 실패 시 아티팩트 검토

**하지 말아야 할 것:**
- 취약한 선택자 사용 (CSS 클래스는 변경될 수 있음)
- 구현 세부 사항 테스트
- 프로덕션에서 테스트 실행
- 불안정 테스트 무시
- 실패 시 아티팩트 검토 생략
- 모든 엣지 케이스를 E2E로 테스트 (단위 테스트 활용)

## 중요 사항

**PMX에서 CRITICAL:**
- 실제 금전이 관련된 E2E 테스트는 반드시 테스트넷/스테이징에서만 실행
- 프로덕션에서 거래 테스트 절대 금지
- 금융 테스트에 `test.skip(process.env.NODE_ENV === 'production')` 설정
- 소액 테스트 자금이 있는 테스트 지갑만 사용

## 다른 명령과의 통합

- `/plan`으로 테스트할 핵심 흐름 식별
- `/tdd`로 단위 테스트 (더 빠르고 세분화)
- `/e2e`로 통합 및 사용자 여정 테스트
- `/code-review`로 테스트 품질 검증

## 관련 에이전트

이 명령은 다음 경로의 `e2e-runner` 에이전트를 호출합니다.
`~/.claude/agents/e2e-runner.md`

## 빠른 명령

```bash
# 전체 E2E 테스트 실행
npx playwright test

# 특정 테스트 파일 실행
npx playwright test tests/e2e/markets/search.spec.ts

# 헤드 모드로 실행 (브라우저 화면 표시)
npx playwright test --headed

# 테스트 디버그
npx playwright test --debug

# 테스트 코드 생성
npx playwright codegen http://localhost:3000

# 리포트 보기
npx playwright show-report
```
