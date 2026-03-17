---
name: web-artifacts-builder
description: 최신 프론트엔드 웹 기술(React, Tailwind CSS, shadcn/ui)을 사용해 정교한 다중 컴포넌트 claude.ai HTML 아티팩트를 만들기 위한 도구 모음입니다. 상태 관리, 라우팅, 또는 shadcn/ui 컴포넌트가 필요한 복잡한 아티팩트에 사용하세요 — 단순한 단일 파일 HTML/JSX 아티팩트에는 사용하지 마세요.
license: Complete terms in LICENSE.txt
---

# Web Artifacts Builder

강력한 프론트엔드 claude.ai 아티팩트를 만들려면 다음 단계를 따릅니다:
1. `scripts/init-artifact.sh`로 프론트엔드 레포 초기화
2. 생성된 코드를 편집하여 아티팩트 개발
3. `scripts/bundle-artifact.sh`로 모든 코드를 단일 HTML 파일로 번들링
4. 사용자에게 아티팩트 표시
5. (선택 사항) 아티팩트 테스트

**스택**: React 18 + TypeScript + Vite + Parcel (번들링) + Tailwind CSS + shadcn/ui

## 디자인 및 스타일 가이드라인

매우 중요: 흔히 "AI 슬롭"이라고 불리는 것을 피하기 위해, 과도한 중앙 정렬 레이아웃, 보라색 그래디언트, 균일한 둥근 모서리, Inter 폰트 사용을 피합니다.

## 빠른 시작

### 1단계: 프로젝트 초기화

초기화 스크립트를 실행하여 새로운 React 프로젝트를 만듭니다:
```bash
bash scripts/init-artifact.sh <project-name>
cd <project-name>
```

다음과 같이 완전히 구성된 프로젝트가 생성됩니다:
- React + TypeScript (Vite를 통해)
- shadcn/ui 테마 시스템이 있는 Tailwind CSS 3.4.1
- `@/` 경로 별칭 구성
- 40개 이상의 shadcn/ui 컴포넌트 사전 설치
- 모든 Radix UI 의존성 포함
- 번들링을 위한 Parcel 구성 (.parcelrc를 통해)
- Node 18+ 호환성 (Vite 버전 자동 감지 및 고정)

### 2단계: 아티팩트 개발

아티팩트를 구축하려면 생성된 파일을 편집합니다. 안내는 아래 **일반적인 개발 작업**을 참조하세요.

### 3단계: 단일 HTML 파일로 번들링

React 앱을 단일 HTML 아티팩트로 번들링하려면:
```bash
bash scripts/bundle-artifact.sh
```

모든 JavaScript, CSS, 의존성이 인라인된 자체 포함 아티팩트인 `bundle.html`이 생성됩니다. 이 파일은 Claude 대화에서 아티팩트로 직접 공유할 수 있습니다.

**요구사항**: 프로젝트에 루트 디렉토리에 `index.html`이 있어야 합니다.

**스크립트가 하는 일**:
- 번들링 의존성 설치 (parcel, @parcel/config-default, parcel-resolver-tspaths, html-inline)
- 경로 별칭 지원이 있는 `.parcelrc` 구성 생성
- Parcel로 빌드 (소스 맵 없음)
- html-inline을 사용해 모든 에셋을 단일 HTML로 인라인

### 4단계: 사용자와 아티팩트 공유

마지막으로, 사용자가 아티팩트로 볼 수 있도록 대화에서 번들된 HTML 파일을 공유합니다.

### 5단계: 아티팩트 테스트/시각화 (선택 사항)

참고: 이것은 완전히 선택적인 단계입니다. 필요하거나 요청받은 경우에만 수행합니다.

아티팩트를 테스트/시각화하려면, 사용 가능한 도구(다른 스킬 또는 Playwright, Puppeteer 같은 내장 도구 포함)를 사용합니다. 일반적으로 완성된 아티팩트를 볼 수 있는 시간과 요청 사이에 지연을 추가하므로 아티팩트를 미리 테스트하지 않도록 합니다. 요청받거나 문제가 발생한 경우 아티팩트를 제시한 후 나중에 테스트합니다.

## 참조

- **shadcn/ui 컴포넌트**: https://ui.shadcn.com/docs/components
