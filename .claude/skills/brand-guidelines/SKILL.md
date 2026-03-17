---
name: brand-guidelines
description: Anthropic의 공식 브랜드 색상과 타이포그래피를 Anthropic의 룩앤필이 필요한 모든 아티팩트에 적용합니다. 브랜드 색상이나 스타일 가이드라인, 시각적 형식, 또는 회사 디자인 표준이 적용될 때 사용하세요.
license: Complete terms in LICENSE.txt
---

# Anthropic 브랜드 스타일링

## 개요

Anthropic의 공식 브랜드 아이덴티티 및 스타일 리소스에 접근하려면 이 스킬을 사용하세요.

**키워드**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, Anthropic brand, visual formatting, visual design

## 브랜드 가이드라인

### 색상

**주요 색상:**

- Dark: `#141413` - 기본 텍스트 및 어두운 배경
- Light: `#faf9f5` - 밝은 배경 및 어두운 배경의 텍스트
- Mid Gray: `#b0aea5` - 보조 요소
- Light Gray: `#e8e6dc` - 미묘한 배경

**액센트 색상:**

- Orange: `#d97757` - 주요 액센트
- Blue: `#6a9bcc` - 보조 액센트
- Green: `#788c5d` - 3차 액센트

### 타이포그래피

- **헤딩**: Poppins (Arial 폴백 포함)
- **본문 텍스트**: Lora (Georgia 폴백 포함)
- **참고**: 최상의 결과를 위해 환경에 폰트가 미리 설치되어 있어야 합니다

## 기능

### 스마트 폰트 적용

- 헤딩(24pt 이상)에 Poppins 폰트 적용
- 본문 텍스트에 Lora 폰트 적용
- 커스텀 폰트를 사용할 수 없는 경우 Arial/Georgia로 자동 폴백
- 모든 시스템에서 가독성 유지

### 텍스트 스타일링

- 헤딩 (24pt+): Poppins 폰트
- 본문 텍스트: Lora 폰트
- 배경에 따른 스마트 색상 선택
- 텍스트 계층 구조 및 형식 유지

### 도형 및 액센트 색상

- 텍스트가 아닌 도형에는 액센트 색상 사용
- orange, blue, green 액센트를 순환 사용
- 브랜드를 유지하면서 시각적 흥미 유지

## 기술 세부 사항

### 폰트 관리

- 사용 가능한 경우 시스템에 설치된 Poppins 및 Lora 폰트 사용
- Arial (헤딩) 및 Georgia (본문)로 자동 폴백 제공
- 폰트 설치 불필요 - 기존 시스템 폰트와 함께 작동
- 최상의 결과를 위해 환경에 Poppins 및 Lora 폰트를 미리 설치하는 것을 권장

### 색상 적용

- 정밀한 브랜드 매칭을 위해 RGB 색상 값 사용
- python-pptx의 RGBColor 클래스를 통해 적용
- 다양한 시스템에서 색상 충실도 유지
