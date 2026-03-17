---
name: webapp-testing
description: Playwright를 사용해 로컬 웹 애플리케이션과 상호작용하고 테스트하기 위한 툴킷입니다. 프론트엔드 기능 검증, UI 동작 디버깅, 브라우저 스크린샷 캡처, 브라우저 로그 확인을 지원합니다.
license: Complete terms in LICENSE.txt
---

# 웹 애플리케이션 테스트

로컬 웹 애플리케이션을 테스트하려면 네이티브 Python Playwright 스크립트를 작성합니다.

**사용 가능한 헬퍼 스크립트**:
- `scripts/with_server.py` - 서버 라이프사이클 관리 (여러 서버 지원)

**항상 먼저 `--help`로 스크립트를 실행하여** 사용법을 확인합니다. 커스텀 솔루션이 절대적으로 필요하다고 판단되기 전까지 소스를 읽지 마세요. 이 스크립트들은 매우 크기 때문에 컨텍스트 창을 오염시킬 수 있습니다. 컨텍스트 창으로 가져오기보다는 블랙박스 스크립트로 직접 호출하기 위해 존재합니다.

## 결정 트리: 접근법 선택

```
사용자 작업 → 정적 HTML인가?
    ├─ 예 → HTML 파일을 직접 읽어 선택자 파악
    │         ├─ 성공 → 선택자를 사용해 Playwright 스크립트 작성
    │         └─ 실패/불완전 → 동적으로 처리 (아래 참조)
    │
    └─ 아니오 (동적 웹앱) → 서버가 이미 실행 중인가?
        ├─ 아니오 → 실행: python scripts/with_server.py --help
        │        그런 다음 헬퍼 + 단순화된 Playwright 스크립트 작성
        │
        └─ 예 → 정찰 후 행동:
            1. 탐색하고 networkidle 대기
            2. 스크린샷 촬영 또는 DOM 검사
            3. 렌더링된 상태에서 선택자 파악
            4. 발견된 선택자로 작업 실행
```

## 예시: with_server.py 사용

서버를 시작하려면 먼저 `--help`를 실행한 다음 헬퍼를 사용합니다:

**단일 서버:**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**여러 서버 (예: 백엔드 + 프론트엔드):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

자동화 스크립트를 만들려면 Playwright 로직만 포함합니다 (서버는 자동으로 관리됨):
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True) # 항상 headless 모드로 chromium 실행
    page = browser.new_page()
    page.goto('http://localhost:5173') # 서버가 이미 실행 중이고 준비됨
    page.wait_for_load_state('networkidle') # 중요: JS 실행 대기
    # ... 자동화 로직
    browser.close()
```

## 정찰 후 행동 패턴

1. **렌더링된 DOM 검사**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **검사 결과에서 선택자 파악**

3. **발견된 선택자로 작업 실행**

## 일반적인 함정

❌ **하지 말 것**: 동적 앱에서 `networkidle` 대기 전에 DOM 검사
✅ **할 것**: 검사 전에 `page.wait_for_load_state('networkidle')` 대기

## 모범 사례

- **번들된 스크립트를 블랙박스로 사용** - 작업을 완수하기 위해 `scripts/`에서 사용 가능한 스크립트 중 도움이 되는 것이 있는지 고려합니다. 이 스크립트들은 복잡한 워크플로를 안정적으로 처리하며 컨텍스트 창을 어지럽히지 않습니다. `--help`로 사용법을 확인한 다음 직접 실행합니다.
- 동기식 스크립트에 `sync_playwright()` 사용
- 완료되면 항상 브라우저 닫기
- 설명적인 선택자 사용: `text=`, `role=`, CSS 선택자, 또는 ID
- 적절한 대기 추가: `page.wait_for_selector()` 또는 `page.wait_for_timeout()`

## 참조 파일

- **examples/** - 일반적인 패턴을 보여주는 예시:
  - `element_discovery.py` - 페이지에서 버튼, 링크, 입력 발견
  - `static_html_automation.py` - 로컬 HTML에 file:// URL 사용
  - `console_logging.py` - 자동화 중 콘솔 로그 캡처
