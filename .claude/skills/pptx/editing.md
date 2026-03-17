# 프레젠테이션 편집

## 템플릿 기반 워크플로

기존 프레젠테이션을 템플릿으로 사용하는 경우:

1. **기존 슬라이드 분석**:
   ```bash
   python scripts/thumbnail.py template.pptx
   python -m markitdown template.pptx
   ```
   `thumbnails.jpg`를 검토하여 레이아웃을 확인하고, markitdown 출력으로 플레이스홀더 텍스트를 확인합니다.

2. **슬라이드 매핑 계획**: 각 콘텐츠 섹션에 맞는 템플릿 슬라이드를 선택합니다.

   ⚠️ **다양한 레이아웃 사용** — 단조로운 프레젠테이션은 흔한 실패 패턴입니다. 기본 제목 + 불릿 슬라이드에 머물지 말고, 다음을 적극적으로 활용합니다:
   - 다중 컬럼 레이아웃 (2단, 3단)
   - 이미지 + 텍스트 조합
   - 텍스트 오버레이가 있는 전체 화면 이미지
   - 인용구 또는 콜아웃 슬라이드
   - 섹션 구분자
   - 통계/숫자 강조
   - 아이콘 그리드 또는 아이콘 + 텍스트 행

   **피해야 할 것:** 모든 슬라이드에 동일한 텍스트 중심 레이아웃 반복.

   콘텐츠 유형에 맞는 레이아웃 스타일 선택 (예: 핵심 포인트 → 불릿 슬라이드, 팀 정보 → 다중 컬럼, 추천사 → 인용구 슬라이드).

3. **압축 해제**: `python scripts/office/unpack.py template.pptx unpacked/`

4. **프레젠테이션 구성** (서브에이전트가 아닌 직접 수행):
   - 원하지 않는 슬라이드 삭제 (`<p:sldIdLst>`에서 제거)
   - 재사용할 슬라이드 복제 (`add_slide.py`)
   - `<p:sldIdLst>`에서 슬라이드 순서 재정렬
   - **5단계 전에 모든 구조 변경 완료**

5. **콘텐츠 편집**: 각 `slide{N}.xml`의 텍스트 업데이트.
   **가능하다면 여기서 서브에이전트 사용** — 슬라이드는 별도의 XML 파일이므로 서브에이전트가 병렬로 편집 가능합니다.

6. **정리**: `python scripts/clean.py unpacked/`

7. **패킹**: `python scripts/office/pack.py unpacked/ output.pptx --original template.pptx`

---

## 스크립트

| 스크립트 | 목적 |
|--------|---------|
| `unpack.py` | PPTX 압축 해제 및 보기 좋게 출력 |
| `add_slide.py` | 슬라이드 복제 또는 레이아웃에서 생성 |
| `clean.py` | 고아 파일 제거 |
| `pack.py` | 검증과 함께 재패킹 |
| `thumbnail.py` | 슬라이드 시각적 그리드 생성 |

### unpack.py

```bash
python scripts/office/unpack.py input.pptx unpacked/
```

PPTX를 압축 해제하고, XML을 보기 좋게 출력하며, 스마트 따옴표를 이스케이프 처리합니다.

### add_slide.py

```bash
python scripts/add_slide.py unpacked/ slide2.xml      # 슬라이드 복제
python scripts/add_slide.py unpacked/ slideLayout2.xml # 레이아웃에서 생성
```

원하는 위치에 `<p:sldIdLst>`에 추가할 `<p:sldId>`를 출력합니다.

### clean.py

```bash
python scripts/clean.py unpacked/
```

`<p:sldIdLst>`에 없는 슬라이드, 참조되지 않는 미디어, 고아 관계 파일을 제거합니다.

### pack.py

```bash
python scripts/office/pack.py unpacked/ output.pptx --original input.pptx
```

검증하고, 복구하고, XML을 압축하며, 스마트 따옴표를 재인코딩합니다.

### thumbnail.py

```bash
python scripts/thumbnail.py input.pptx [output_prefix] [--cols N]
```

슬라이드 파일명을 레이블로 사용하여 `thumbnails.jpg`를 생성합니다. 기본 3열, 그리드당 최대 12개.

**템플릿 분석 전용으로 사용** (레이아웃 선택 시). 시각적 QA를 위해서는 `soffice` + `pdftoppm`을 사용하여 전체 해상도 개별 슬라이드 이미지를 생성합니다 — SKILL.md 참조.

---

## 슬라이드 작업

슬라이드 순서는 `ppt/presentation.xml` → `<p:sldIdLst>`에 있습니다.

**순서 변경**: `<p:sldId>` 요소 재정렬.

**삭제**: `<p:sldId>` 제거 후 `clean.py` 실행.

**추가**: `add_slide.py` 사용. 슬라이드 파일을 절대로 수동으로 복사하지 않습니다 — 스크립트가 수동 복사 시 누락되는 노트 참조, Content_Types.xml, 관계 ID를 처리합니다.

---

## 콘텐츠 편집

**서브에이전트:** 가능하다면 여기서 사용합니다 (4단계 완료 후). 각 슬라이드는 별도의 XML 파일이므로 서브에이전트가 병렬로 편집 가능합니다. 서브에이전트 프롬프트에 다음을 포함합니다:
- 편집할 슬라이드 파일 경로
- **"모든 변경에 Edit 도구 사용"**
- 아래의 형식 규칙 및 일반적인 함정

각 슬라이드에 대해:
1. 슬라이드의 XML 읽기
2. 모든 플레이스홀더 콘텐츠 파악 — 텍스트, 이미지, 차트, 아이콘, 캡션
3. 각 플레이스홀더를 최종 콘텐츠로 교체

**sed나 Python 스크립트가 아닌 Edit 도구를 사용합니다.** Edit 도구는 무엇을 어디서 교체할지 구체적으로 지정하게 하여 더 높은 신뢰성을 제공합니다.

### 형식 규칙

- **모든 헤더, 소제목, 인라인 레이블을 굵게**: `<a:rPr>`에 `b="1"` 사용. 다음을 포함:
  - 슬라이드 제목
  - 슬라이드 내 섹션 헤더
  - 줄 시작의 인라인 레이블 (예: "Status:", "Description:")
- **유니코드 불릿(•) 사용 금지**: `<a:buChar>` 또는 `<a:buAutoNum>`으로 올바른 목록 형식 사용
- **불릿 일관성**: 레이아웃에서 불릿을 상속하도록 허용. `<a:buChar>` 또는 `<a:buNone>`만 지정.

---

## 일반적인 함정

### 템플릿 적용

소스 콘텐츠의 항목이 템플릿보다 적은 경우:
- **불필요한 요소를 완전히 제거** (이미지, 도형, 텍스트 박스), 텍스트만 지우지 않음
- 텍스트 콘텐츠를 지운 후 고아 시각 요소 확인
- 시각적 QA를 실행하여 수량 불일치 파악

다른 길이의 콘텐츠로 텍스트를 교체하는 경우:
- **짧은 교체**: 일반적으로 안전
- **긴 교체**: 넘치거나 예기치 않게 줄바꿈될 수 있음
- 텍스트 변경 후 시각적 QA로 테스트
- 템플릿의 디자인 제약에 맞게 콘텐츠 자르기 또는 분리 고려

**템플릿 슬롯 ≠ 소스 항목**: 템플릿에 4명의 팀원이 있지만 소스에 3명의 사용자만 있는 경우, 4번째 멤버의 텍스트만 지우는 것이 아니라 전체 그룹 (이미지 + 텍스트 박스)을 삭제합니다.

### 다중 항목 콘텐츠

소스에 여러 항목(번호 매긴 목록, 여러 섹션)이 있는 경우, 각각을 별도의 `<a:p>` 요소로 만듭니다 — **절대 하나의 문자열로 연결하지 않습니다**.

**잘못된 예** — 하나의 단락에 모든 항목:
```xml
<a:p>
  <a:r><a:rPr .../><a:t>Step 1: Do the first thing. Step 2: Do the second thing.</a:t></a:r>
</a:p>
```

**올바른 예** — 굵은 헤더가 있는 별도의 단락:
```xml
<a:p>
  <a:pPr algn="l"><a:lnSpc><a:spcPts val="3919"/></a:lnSpc></a:pPr>
  <a:r><a:rPr lang="en-US" sz="2799" b="1" .../><a:t>Step 1</a:t></a:r>
</a:p>
<a:p>
  <a:pPr algn="l"><a:lnSpc><a:spcPts val="3919"/></a:lnSpc></a:pPr>
  <a:r><a:rPr lang="en-US" sz="2799" .../><a:t>Do the first thing.</a:t></a:r>
</a:p>
<a:p>
  <a:pPr algn="l"><a:lnSpc><a:spcPts val="3919"/></a:lnSpc></a:pPr>
  <a:r><a:rPr lang="en-US" sz="2799" b="1" .../><a:t>Step 2</a:t></a:r>
</a:p>
<!-- 패턴 계속 -->
```

줄 간격을 유지하려면 원본 단락에서 `<a:pPr>`를 복사합니다. 헤더에는 `b="1"` 사용.

### 스마트 따옴표

unpack/pack에 의해 자동으로 처리됩니다. 하지만 Edit 도구는 스마트 따옴표를 ASCII로 변환합니다.

**따옴표가 포함된 새 텍스트를 추가할 때는 XML 엔티티를 사용합니다:**

```xml
<a:t>the &#x201C;Agreement&#x201D;</a:t>
```

| 문자 | 이름 | 유니코드 | XML 엔티티 |
|-----------|------|---------|------------|
| `"` | 왼쪽 큰따옴표 | U+201C | `&#x201C;` |
| `"` | 오른쪽 큰따옴표 | U+201D | `&#x201D;` |
| `'` | 왼쪽 작은따옴표 | U+2018 | `&#x2018;` |
| `'` | 오른쪽 작은따옴표 | U+2019 | `&#x2019;` |

### 기타

- **공백**: 앞뒤 공백이 있는 `<a:t>`에는 `xml:space="preserve"` 사용
- **XML 파싱**: 네임스페이스를 손상시키는 `xml.etree.ElementTree` 대신 `defusedxml.minidom` 사용
