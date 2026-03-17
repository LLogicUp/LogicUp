---
name: docx
description: "사용자가 Word 문서(.docx 파일)를 생성, 읽기, 편집, 또는 조작하고 싶을 때마다 이 스킬을 사용합니다. 트리거 조건: 'Word 문서', '.docx', 또는 목차, 제목, 페이지 번호, 레터헤드 같은 서식이 있는 전문적인 문서 생성 요청. 또한 .docx 파일에서 콘텐츠를 추출하거나 재구성, 문서에서 이미지 삽입/교체, Word 파일에서 찾기/바꾸기, 변경 내용 추적 또는 주석 작업, 또는 콘텐츠를 완성도 높은 Word 문서로 변환할 때 사용합니다. 사용자가 'report', 'memo', 'letter', 'template' 또는 유사한 결과물을 Word 또는 .docx 파일로 요청하면 이 스킬을 사용합니다. PDF, 스프레드시트, Google Docs, 또는 문서 생성과 관련 없는 일반 코딩 작업에는 사용하지 않습니다."
license: Proprietary. LICENSE.txt has complete terms
---

# DOCX 생성, 편집, 분석

## 개요

.docx 파일은 XML 파일을 포함하는 ZIP 아카이브입니다.

## 빠른 참조

| 작업 | 접근법 |
|------|----------|
| 콘텐츠 읽기/분석 | `pandoc` 또는 raw XML 확인을 위한 언팩 |
| 새 문서 생성 | `docx-js` 사용 - 아래 새 문서 생성 참조 |
| 기존 문서 편집 | 언팩 → XML 편집 → 리팩 - 아래 기존 문서 편집 참조 |

### .doc를 .docx로 변환

레거시 `.doc` 파일은 편집 전에 변환해야 합니다:

```bash
python scripts/office/soffice.py --headless --convert-to docx document.doc
```

### 콘텐츠 읽기

```bash
# 변경 내용 추적과 함께 텍스트 추출
pandoc --track-changes=all document.docx -o output.md

# Raw XML 접근
python scripts/office/unpack.py document.docx unpacked/
```

### 이미지로 변환

```bash
python scripts/office/soffice.py --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```

### 변경 내용 추적 수락

모든 변경 내용이 수락된 깔끔한 문서를 생성하려면 (LibreOffice 필요):

```bash
python scripts/accept_changes.py input.docx output.docx
```

---

## 새 문서 생성

JavaScript로 .docx 파일을 생성한 후 검증합니다. 설치: `npm install -g docx`

### 설정
```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat, ExternalHyperlink,
        InternalHyperlink, Bookmark, FootnoteReferenceRun, PositionalTab,
        PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
        TabStopType, TabStopPosition, Column, SectionType,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

const doc = new Document({ sections: [{ children: [/* content */] }] });
Packer.toBuffer(doc).then(buffer => fs.writeFileSync("doc.docx", buffer));
```

### 검증
파일 생성 후 검증합니다. 검증 실패 시 언팩하고 XML을 수정한 다음 리팩합니다.
```bash
python scripts/office/validate.py doc.docx
```

### 페이지 크기

```javascript
// 중요: docx-js의 기본값은 US Letter가 아닌 A4입니다
// 일관된 결과를 위해 항상 페이지 크기를 명시적으로 설정하세요
sections: [{
  properties: {
    page: {
      size: {
        width: 12240,   // DXA 단위로 8.5인치
        height: 15840   // DXA 단위로 11인치
      },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1인치 여백
    }
  },
  children: [/* content */]
}]
```

**일반적인 페이지 크기 (DXA 단위, 1440 DXA = 1인치):**

| 용지 | 너비 | 높이 | 콘텐츠 너비 (1인치 여백) |
|-------|-------|--------|---------------------------|
| US Letter | 12,240 | 15,840 | 9,360 |
| A4 (기본값) | 11,906 | 16,838 | 9,026 |

**가로 방향:** docx-js는 내부적으로 너비/높이를 교환하므로 세로 크기를 전달하고 교환은 라이브러리에 맡기세요:
```javascript
size: {
  width: 12240,   // 짧은 변을 너비로 전달
  height: 15840,  // 긴 변을 높이로 전달
  orientation: PageOrientation.LANDSCAPE  // docx-js가 XML에서 교환 처리
},
// 콘텐츠 너비 = 15840 - 왼쪽 여백 - 오른쪽 여백 (긴 변 사용)
```

### 스타일 (내장 제목 재정의)

기본 폰트로 Arial을 사용합니다 (범용 지원). 가독성을 위해 제목은 검정색으로 유지합니다.

```javascript
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } }, // 12pt 기본값
    paragraphStyles: [
      // 중요: 내장 스타일을 재정의하려면 정확한 ID 사용
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } }, // TOC에 outlineLevel 필요
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Title")] }),
    ]
  }]
});
```

### 목록 (유니코드 글머리 기호 절대 사용 금지)

```javascript
// ❌ 잘못된 방법 - 글머리 기호 문자를 수동으로 삽입하지 마세요
new Paragraph({ children: [new TextRun("• Item")] })  // 잘못됨
new Paragraph({ children: [new TextRun("\u2022 Item")] })  // 잘못됨

// ✅ 올바른 방법 - LevelFormat.BULLET과 함께 numbering config 사용
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bullet item")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Numbered item")] }),
    ]
  }]
});

// ⚠️ 각 reference는 독립적인 번호 매기기 생성
// 동일한 reference = 계속 (1,2,3 그 다음 4,5,6)
// 다른 reference = 재시작 (1,2,3 그 다음 1,2,3)
```

### 표

**중요: 표에는 이중 너비 설정 필요** - 표의 `columnWidths`와 각 셀의 `width` 모두 설정해야 합니다. 둘 다 없으면 일부 플랫폼에서 표가 올바르게 렌더링되지 않습니다.

```javascript
// 중요: 일관된 렌더링을 위해 항상 표 너비 설정
// 중요: 검은 배경을 방지하려면 ShadingType.CLEAR (SOLID 아님) 사용
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

new Table({
  width: { size: 9360, type: WidthType.DXA }, // 항상 DXA 사용 (백분율은 Google Docs에서 깨짐)
  columnWidths: [4680, 4680], // 표 너비의 합과 일치해야 함 (DXA: 1440 = 1인치)
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 4680, type: WidthType.DXA }, // 각 셀에도 설정
          shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, // SOLID 아닌 CLEAR
          margins: { top: 80, bottom: 80, left: 120, right: 120 }, // 셀 패딩 (내부, 너비에 추가되지 않음)
          children: [new Paragraph({ children: [new TextRun("Cell")] })]
        })
      ]
    })
  ]
})
```

**표 너비 계산:**

항상 `WidthType.DXA` 사용 — `WidthType.PERCENTAGE`는 Google Docs에서 깨집니다.

```javascript
// 표 너비 = columnWidths의 합 = 콘텐츠 너비
// 1인치 여백의 US Letter: 12240 - 2880 = 9360 DXA
width: { size: 9360, type: WidthType.DXA },
columnWidths: [7000, 2360]  // 표 너비의 합과 일치해야 함
```

**너비 규칙:**
- **항상 `WidthType.DXA` 사용** — `WidthType.PERCENTAGE` 절대 사용 금지 (Google Docs와 호환 안 됨)
- 표 너비는 `columnWidths`의 합과 일치해야 함
- 셀 `width`는 해당 `columnWidth`와 일치해야 함
- 셀 `margins`는 내부 패딩 — 콘텐츠 영역을 줄이며 셀 너비에 추가되지 않음
- 전체 너비 표: 콘텐츠 너비 사용 (페이지 너비에서 왼쪽 및 오른쪽 여백 제거)

### 이미지

```javascript
// 중요: type 파라미터 필수
new Paragraph({
  children: [new ImageRun({
    type: "png", // 필수: png, jpg, jpeg, gif, bmp, svg
    data: fs.readFileSync("image.png"),
    transformation: { width: 200, height: 150 },
    altText: { title: "Title", description: "Desc", name: "Name" } // 세 가지 모두 필수
  })]
})
```

### 페이지 나누기

```javascript
// 중요: PageBreak는 Paragraph 안에 있어야 함
new Paragraph({ children: [new PageBreak()] })

// 또는 pageBreakBefore 사용
new Paragraph({ pageBreakBefore: true, children: [new TextRun("New page")] })
```

### 하이퍼링크

```javascript
// 외부 링크
new Paragraph({
  children: [new ExternalHyperlink({
    children: [new TextRun({ text: "Click here", style: "Hyperlink" })],
    link: "https://example.com",
  })]
})

// 내부 링크 (북마크 + 참조)
// 1. 대상에 북마크 생성
new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
  new Bookmark({ id: "chapter1", children: [new TextRun("Chapter 1")] }),
]})
// 2. 링크 생성
new Paragraph({ children: [new InternalHyperlink({
  children: [new TextRun({ text: "See Chapter 1", style: "Hyperlink" })],
  anchor: "chapter1",
})]})
```

### 각주

```javascript
const doc = new Document({
  footnotes: {
    1: { children: [new Paragraph("Source: Annual Report 2024")] },
    2: { children: [new Paragraph("See appendix for methodology")] },
  },
  sections: [{
    children: [new Paragraph({
      children: [
        new TextRun("Revenue grew 15%"),
        new FootnoteReferenceRun(1),
        new TextRun(" using adjusted metrics"),
        new FootnoteReferenceRun(2),
      ],
    })]
  }]
});
```

### 탭 정지

```javascript
// 같은 줄에서 텍스트 오른쪽 정렬 (예: 제목 반대편에 날짜)
new Paragraph({
  children: [
    new TextRun("Company Name"),
    new TextRun("\tJanuary 2025"),
  ],
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
})

// 점 리더 (예: TOC 스타일)
new Paragraph({
  children: [
    new TextRun("Introduction"),
    new TextRun({ children: [
      new PositionalTab({
        alignment: PositionalTabAlignment.RIGHT,
        relativeTo: PositionalTabRelativeTo.MARGIN,
        leader: PositionalTabLeader.DOT,
      }),
      "3",
    ]}),
  ],
})
```

### 다단 레이아웃

```javascript
// 동일 너비 단
sections: [{
  properties: {
    column: {
      count: 2,          // 단 수
      space: 720,        // 단 사이 간격 (DXA, 720 = 0.5인치)
      equalWidth: true,
      separate: true,    // 단 사이 세로선
    },
  },
  children: [/* 콘텐츠가 단 전체에 자연스럽게 흐름 */]
}]

// 사용자 정의 너비 단 (equalWidth는 false여야 함)
sections: [{
  properties: {
    column: {
      equalWidth: false,
      children: [
        new Column({ width: 5400, space: 720 }),
        new Column({ width: 3240 }),
      ],
    },
  },
  children: [/* content */]
}]
```

`type: SectionType.NEXT_COLUMN`으로 새 섹션을 사용하여 강제로 단 나누기를 합니다.

### 목차

```javascript
// 중요: 제목에 HeadingLevel만 사용 — 사용자 정의 스타일 없음
new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" })
```

### 머리글/바닥글

```javascript
sections: [{
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } // 1440 = 1인치
  },
  headers: {
    default: new Header({ children: [new Paragraph({ children: [new TextRun("Header")] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({
      children: [new TextRun("Page "), new TextRun({ children: [PageNumber.CURRENT] })]
    })] })
  },
  children: [/* content */]
}]
```

### docx-js 핵심 규칙

- **페이지 크기를 명시적으로 설정** - docx-js의 기본값은 A4. 미국 문서에는 US Letter (12240 x 15840 DXA) 사용
- **가로 방향: 세로 크기를 전달** - docx-js는 내부적으로 너비/높이를 교환. 짧은 변을 `width`로, 긴 변을 `height`로 전달하고 `orientation: PageOrientation.LANDSCAPE` 설정
- **`\n` 절대 사용 금지** - 별도의 Paragraph 요소 사용
- **유니코드 글머리 기호 절대 사용 금지** - numbering config와 함께 `LevelFormat.BULLET` 사용
- **PageBreak는 Paragraph 안에 있어야 함** - 독립적으로 사용하면 잘못된 XML 생성
- **ImageRun에 `type` 필수** - 항상 png/jpg/etc 명시
- **항상 DXA로 표 `width` 설정** - `WidthType.PERCENTAGE` 절대 사용 금지 (Google Docs에서 깨짐)
- **표에는 이중 너비 필요** - `columnWidths` 배열과 셀 `width` 모두 일치해야 함
- **표 너비 = columnWidths의 합** - DXA의 경우 정확하게 합산되어야 함
- **항상 셀 여백 추가** - 읽기 쉬운 패딩을 위해 `margins: { top: 80, bottom: 80, left: 120, right: 120 }` 사용
- **`ShadingType.CLEAR` 사용** - 표 음영에 SOLID 절대 사용 금지
- **표를 구분선/규칙으로 사용 금지** - 셀은 최소 높이를 가지며 빈 상자로 렌더링됨 (머리글/바닥글 포함). 대신 Paragraph에 `border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } }` 사용. 두 열 바닥글에는 표 대신 탭 정지 사용 (탭 정지 섹션 참조)
- **TOC는 HeadingLevel만 필요** - 제목 단락에 사용자 정의 스타일 없음
- **내장 스타일 재정의** - 정확한 ID 사용: "Heading1", "Heading2" 등
- **`outlineLevel` 포함** - TOC에 필수 (H1은 0, H2는 1 등)

---

## 기존 문서 편집

**3단계를 순서대로 따릅니다.**

### 1단계: 언팩
```bash
python scripts/office/unpack.py document.docx unpacked/
```
XML을 추출하고, 보기 좋게 출력하고, 인접한 run을 병합하고, 스마트 따옴표를 XML 엔티티(`&#x201C;` 등)로 변환하여 편집 중에 살아남을 수 있도록 합니다. `--merge-runs false`를 사용하면 run 병합을 건너뜁니다.

### 2단계: XML 편집

`unpacked/word/`의 파일을 편집합니다. 패턴은 아래 XML 참조를 참조하세요.

**변경 내용 추적 및 주석에는 "Claude"를 작성자로 사용합니다.** 사용자가 명시적으로 다른 이름을 요청하지 않는 한.

**직접 문자열 교체에는 Edit 도구를 사용합니다. Python 스크립트를 작성하지 마세요.** 스크립트는 불필요한 복잡성을 추가합니다. Edit 도구는 무엇이 교체되는지 정확히 보여줍니다.

**중요: 새 콘텐츠에는 스마트 따옴표를 사용합니다.** 아포스트로피나 따옴표가 있는 텍스트를 추가할 때 XML 엔티티를 사용하여 스마트 따옴표를 생성합니다:
```xml
<!-- 전문적인 타이포그래피를 위해 이 엔티티 사용 -->
<w:t>Here&#x2019;s a quote: &#x201C;Hello&#x201D;</w:t>
```
| 엔티티 | 문자 |
|--------|-----------|
| `&#x2018;` | ' (왼쪽 단일) |
| `&#x2019;` | ' (오른쪽 단일 / 아포스트로피) |
| `&#x201C;` | " (왼쪽 이중) |
| `&#x201D;` | " (오른쪽 이중) |

**주석 추가:** 여러 XML 파일에 걸친 상용구를 처리하려면 `comment.py` 사용 (텍스트는 사전 이스케이프된 XML이어야 함):
```bash
python scripts/comment.py unpacked/ 0 "Comment text with &amp; and &#x2019;"
python scripts/comment.py unpacked/ 1 "Reply text" --parent 0  # 댓글 0에 답글
python scripts/comment.py unpacked/ 0 "Text" --author "Custom Author"  # 사용자 정의 작성자 이름
```
그런 다음 document.xml에 마커를 추가합니다 (XML 참조의 주석 섹션 참조).

### 3단계: 리팩
```bash
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```
자동 수정으로 검증하고, XML을 압축하고, DOCX를 생성합니다. `--validate false`를 사용하면 건너뜁니다.

**자동 수정이 처리하는 것:**
- `durableId` >= 0x7FFFFFFF (유효한 ID 재생성)
- 공백이 있는 `<w:t>`에 `xml:space="preserve"` 누락

**자동 수정이 처리하지 않는 것:**
- 잘못된 XML, 잘못된 요소 중첩, 누락된 관계, 스키마 위반

### 일반적인 함정

- **전체 `<w:r>` 요소 교체**: 변경 내용 추적을 추가할 때 `<w:del>...<w:ins>...`를 형제 요소로 전체 `<w:r>...</w:r>` 블록을 교체합니다. 변경 내용 추적 태그를 run 내부에 삽입하지 마세요.
- **`<w:rPr>` 서식 보존**: 볼드, 폰트 크기 등을 유지하기 위해 원본 run의 `<w:rPr>` 블록을 변경 내용 추적 run에 복사합니다.

---

## XML 참조

### 스키마 준수

- **`<w:pPr>`의 요소 순서**: `<w:pStyle>`, `<w:numPr>`, `<w:spacing>`, `<w:ind>`, `<w:jc>`, `<w:rPr>` 마지막
- **공백**: 앞뒤 공백이 있는 `<w:t>`에 `xml:space="preserve"` 추가
- **RSID**: 8자리 16진수여야 함 (예: `00AB1234`)

### 변경 내용 추적

**삽입:**
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>삽입된 텍스트</w:t></w:r>
</w:ins>
```

**삭제:**
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>삭제된 텍스트</w:delText></w:r>
</w:del>
```

**`<w:del>` 내부**: `<w:t>` 대신 `<w:delText>`, `<w:instrText>` 대신 `<w:delInstrText>` 사용.

**최소한의 편집** - 변경되는 것만 표시:
```xml
<!-- "30 days"를 "60 days"로 변경 -->
<w:r><w:t>The term is </w:t></w:r>
<w:del w:id="1" w:author="Claude" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Claude" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> days.</w:t></w:r>
```

**전체 단락/목록 항목 삭제** - 단락의 모든 콘텐츠를 제거할 때, 다음 단락과 병합되도록 단락 마크도 삭제로 표시합니다. `<w:pPr><w:rPr>` 내부에 `<w:del/>` 추가:
```xml
<w:p>
  <w:pPr>
    <w:numPr>...</w:numPr>  <!-- 있는 경우 목록 번호 매기기 -->
    <w:rPr>
      <w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
    <w:r><w:delText>삭제되는 전체 단락 콘텐츠...</w:delText></w:r>
  </w:del>
</w:p>
```
`<w:pPr><w:rPr>`에 `<w:del/>`이 없으면 변경 내용을 수락해도 빈 단락/목록 항목이 남습니다.

**다른 작성자의 삽입 거부** - 삽입 내부에 삭제를 중첩:
```xml
<w:ins w:author="Jane" w:id="5">
  <w:del w:author="Claude" w:id="10">
    <w:r><w:delText>their inserted text</w:delText></w:r>
  </w:del>
</w:ins>
```

**다른 작성자의 삭제 복원** - 삭제 후 삽입 추가 (삭제는 수정하지 않음):
```xml
<w:del w:author="Jane" w:id="5">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
<w:ins w:author="Claude" w:id="10">
  <w:r><w:t>deleted text</w:t></w:r>
</w:ins>
```

### 주석

`comment.py`를 실행한 후 (2단계 참조), document.xml에 마커를 추가합니다. 답글의 경우 `--parent` 플래그를 사용하고 상위 마커 내부에 중첩합니다.

**중요: `<w:commentRangeStart>`와 `<w:commentRangeEnd>`는 `<w:r>`의 형제 요소이며, `<w:r>` 내부에 있어서는 절대 안 됩니다.**

```xml
<!-- 주석 마커는 w:p의 직접 자식, w:r 내부에 있어서는 안 됨 -->
<w:commentRangeStart w:id="0"/>
<w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted</w:delText></w:r>
</w:del>
<w:r><w:t> more text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>

<!-- 내부에 답글 1이 중첩된 댓글 0 -->
<w:commentRangeStart w:id="0"/>
  <w:commentRangeStart w:id="1"/>
  <w:r><w:t>text</w:t></w:r>
  <w:commentRangeEnd w:id="1"/>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="1"/></w:r>
```

### 이미지

1. `word/media/`에 이미지 파일 추가
2. `word/_rels/document.xml.rels`에 관계 추가:
```xml
<Relationship Id="rId5" Type=".../image" Target="media/image1.png"/>
```
3. `[Content_Types].xml`에 콘텐츠 유형 추가:
```xml
<Default Extension="png" ContentType="image/png"/>
```
4. document.xml에서 참조:
```xml
<w:drawing>
  <wp:inline>
    <wp:extent cx="914400" cy="914400"/>  <!-- EMU: 914400 = 1인치 -->
    <a:graphic>
      <a:graphicData uri=".../picture">
        <pic:pic>
          <pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

---

## 의존성

- **pandoc**: 텍스트 추출
- **docx**: `npm install -g docx` (새 문서)
- **LibreOffice**: PDF 변환 (`scripts/office/soffice.py`로 샌드박스 환경에 자동 구성)
- **Poppler**: 이미지를 위한 `pdftoppm`
