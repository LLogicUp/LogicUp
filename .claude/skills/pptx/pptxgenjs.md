# PptxGenJS 튜토리얼

## 설정 및 기본 구조

```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';  // 또는 'LAYOUT_16x10', 'LAYOUT_4x3', 'LAYOUT_WIDE'
pres.author = 'Your Name';
pres.title = 'Presentation Title';

let slide = pres.addSlide();
slide.addText("Hello World!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });

pres.writeFile({ fileName: "Presentation.pptx" });
```

## 레이아웃 크기

슬라이드 크기 (좌표 단위: 인치):
- `LAYOUT_16x9`: 10" × 5.625" (기본값)
- `LAYOUT_16x10`: 10" × 6.25"
- `LAYOUT_4x3`: 10" × 7.5"
- `LAYOUT_WIDE`: 13.3" × 7.5"

---

## 텍스트 및 포맷팅

```javascript
// 기본 텍스트
slide.addText("Simple Text", {
  x: 1, y: 1, w: 8, h: 2, fontSize: 24, fontFace: "Arial",
  color: "363636", bold: true, align: "center", valign: "middle"
});

// 글자 간격 (무시되는 letterSpacing 대신 charSpacing 사용)
slide.addText("SPACED TEXT", { x: 1, y: 1, w: 8, h: 1, charSpacing: 6 });

// 서식 있는 텍스트 배열
slide.addText([
  { text: "Bold ", options: { bold: true } },
  { text: "Italic ", options: { italic: true } }
], { x: 1, y: 3, w: 8, h: 1 });

// 다중 줄 텍스트 (breakLine: true 필요)
slide.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2", options: { breakLine: true } },
  { text: "Line 3" }  // 마지막 항목은 breakLine 불필요
], { x: 0.5, y: 0.5, w: 8, h: 2 });

// 텍스트 박스 여백 (내부 패딩)
slide.addText("Title", {
  x: 0.5, y: 0.3, w: 9, h: 0.6,
  margin: 0  // 도형이나 아이콘과 같은 x 위치에 텍스트를 정렬할 때 0 사용
});
```

**팁:** 텍스트 박스에는 기본적으로 내부 여백이 있습니다. 도형, 선, 아이콘과 같은 x 위치에 텍스트를 정확히 정렬해야 할 때는 `margin: 0`을 설정합니다.

---

## 목록 및 불릿

```javascript
// 올바른 예: 여러 불릿
slide.addText([
  { text: "First item", options: { bullet: true, breakLine: true } },
  { text: "Second item", options: { bullet: true, breakLine: true } },
  { text: "Third item", options: { bullet: true } }
], { x: 0.5, y: 0.5, w: 8, h: 3 });

// 잘못된 예: 절대 유니코드 불릿 사용 금지
slide.addText("• First item", { ... });  // 이중 불릿 생성

// 하위 항목 및 번호 목록
{ text: "Sub-item", options: { bullet: true, indentLevel: 1 } }
{ text: "First", options: { bullet: { type: "number" }, breakLine: true } }
```

---

## 도형

```javascript
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 0.8, w: 1.5, h: 3.0,
  fill: { color: "FF0000" }, line: { color: "000000", width: 2 }
});

slide.addShape(pres.shapes.OVAL, { x: 4, y: 1, w: 2, h: 2, fill: { color: "0000FF" } });

slide.addShape(pres.shapes.LINE, {
  x: 1, y: 3, w: 5, h: 0, line: { color: "FF0000", width: 3, dashType: "dash" }
});

// 투명도 포함
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "0088CC", transparency: 50 }
});

// 모서리가 둥근 직사각형 (rectRadius는 RECTANGLE이 아닌 ROUNDED_RECTANGLE에서만 작동)
// ⚠️ 직사각형 강조 오버레이와 함께 사용하지 않을 것 — 둥근 모서리를 덮지 못함. 대신 RECTANGLE 사용.
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" }, rectRadius: 0.1
});

// 그림자 포함
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" },
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 }
});
```

그림자 옵션:

| 속성 | 타입 | 범위 | 비고 |
|----------|------|-------|-------|
| `type` | string | `"outer"`, `"inner"` | |
| `color` | string | 6자리 hex (예: `"000000"`) | `#` 접두어 없음, 8자리 hex 사용 금지 — 일반적인 함정 참조 |
| `blur` | number | 0-100 pt | |
| `offset` | number | 0-200 pt | **반드시 양수** — 음수 값은 파일 손상 |
| `angle` | number | 0-359도 | 그림자가 떨어지는 방향 (135 = 우하단, 270 = 위쪽) |
| `opacity` | number | 0.0-1.0 | 투명도에는 이것을 사용, 절대 색상 문자열에 인코딩 금지 |

위쪽으로 그림자를 투영하려면 (예: 푸터 바에서), 양수 offset과 함께 `angle: 270`을 사용합니다 — 음수 offset을 사용하지 마세요.

**참고**: 그라디언트 채우기는 기본적으로 지원되지 않습니다. 대신 그라디언트 이미지를 배경으로 사용합니다.

---

## 이미지

### 이미지 소스

```javascript
// 파일 경로에서
slide.addImage({ path: "images/chart.png", x: 1, y: 1, w: 5, h: 3 });

// URL에서
slide.addImage({ path: "https://example.com/image.jpg", x: 1, y: 1, w: 5, h: 3 });

// base64에서 (빠름, 파일 I/O 없음)
slide.addImage({ data: "image/png;base64,iVBORw0KGgo...", x: 1, y: 1, w: 5, h: 3 });
```

### 이미지 옵션

```javascript
slide.addImage({
  path: "image.png",
  x: 1, y: 1, w: 5, h: 3,
  rotate: 45,              // 0-359도
  rounding: true,          // 원형 자르기
  transparency: 50,        // 0-100
  flipH: true,             // 수평 뒤집기
  flipV: false,            // 수직 뒤집기
  altText: "Description",  // 접근성
  hyperlink: { url: "https://example.com" }
});
```

### 이미지 크기 조절 모드

```javascript
// Contain - 내부에 맞게, 비율 유지
{ sizing: { type: 'contain', w: 4, h: 3 } }

// Cover - 영역 채우기, 비율 유지 (잘릴 수 있음)
{ sizing: { type: 'cover', w: 4, h: 3 } }

// Crop - 특정 부분 자르기
{ sizing: { type: 'crop', x: 0.5, y: 0.5, w: 2, h: 2 } }
```

### 크기 계산 (가로세로 비율 유지)

```javascript
const origWidth = 1978, origHeight = 923, maxHeight = 3.0;
const calcWidth = maxHeight * (origWidth / origHeight);
const centerX = (10 - calcWidth) / 2;

slide.addImage({ path: "image.png", x: centerX, y: 1.2, w: calcWidth, h: maxHeight });
```

### 지원 형식

- **표준**: PNG, JPG, GIF (애니메이션 GIF는 Microsoft 365에서 작동)
- **SVG**: 최신 PowerPoint/Microsoft 365에서 작동

---

## 아이콘

react-icons를 사용하여 SVG 아이콘을 생성한 후, 범용 호환성을 위해 PNG로 래스터화합니다.

### 설정

```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaCheckCircle, FaChartLine } = require("react-icons/fa");

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}
```

### 슬라이드에 아이콘 추가

```javascript
const iconData = await iconToBase64Png(FaCheckCircle, "#4472C4", 256);

slide.addImage({
  data: iconData,
  x: 1, y: 1, w: 0.5, h: 0.5  // 인치 단위 크기
});
```

**참고**: 선명한 아이콘을 위해 크기 256 이상을 사용합니다. size 파라미터는 슬라이드에서 표시 크기(인치 단위의 `w`와 `h`로 설정)가 아닌 래스터화 해상도를 제어합니다.

### 아이콘 라이브러리

설치: `npm install -g react-icons react react-dom sharp`

react-icons의 인기 아이콘 세트:
- `react-icons/fa` - Font Awesome
- `react-icons/md` - Material Design
- `react-icons/hi` - Heroicons
- `react-icons/bi` - Bootstrap Icons

---

## 슬라이드 배경

```javascript
// 단색
slide.background = { color: "F1F1F1" };

// 투명도 포함 색상
slide.background = { color: "FF3399", transparency: 50 };

// URL에서 이미지
slide.background = { path: "https://example.com/bg.jpg" };

// base64에서 이미지
slide.background = { data: "image/png;base64,iVBORw0KGgo..." };
```

---

## 표

```javascript
slide.addTable([
  ["Header 1", "Header 2"],
  ["Cell 1", "Cell 2"]
], {
  x: 1, y: 1, w: 8, h: 2,
  border: { pt: 1, color: "999999" }, fill: { color: "F1F1F1" }
});

// 셀 병합이 있는 고급 표
let tableData = [
  [{ text: "Header", options: { fill: { color: "6699CC" }, color: "FFFFFF", bold: true } }, "Cell"],
  [{ text: "Merged", options: { colspan: 2 } }]
];
slide.addTable(tableData, { x: 1, y: 3.5, w: 8, colW: [4, 4] });
```

---

## 차트

```javascript
// 막대 차트
slide.addChart(pres.charts.BAR, [{
  name: "Sales", labels: ["Q1", "Q2", "Q3", "Q4"], values: [4500, 5500, 6200, 7100]
}], {
  x: 0.5, y: 0.6, w: 6, h: 3, barDir: 'col',
  showTitle: true, title: 'Quarterly Sales'
});

// 선 차트
slide.addChart(pres.charts.LINE, [{
  name: "Temp", labels: ["Jan", "Feb", "Mar"], values: [32, 35, 42]
}], { x: 0.5, y: 4, w: 6, h: 3, lineSize: 3, lineSmooth: true });

// 파이 차트
slide.addChart(pres.charts.PIE, [{
  name: "Share", labels: ["A", "B", "Other"], values: [35, 45, 20]
}], { x: 7, y: 1, w: 5, h: 4, showPercent: true });
```

### 더 나은 차트 디자인

기본 차트는 구식으로 보입니다. 현대적이고 깔끔한 모양을 위해 다음 옵션을 적용합니다:

```javascript
slide.addChart(pres.charts.BAR, chartData, {
  x: 0.5, y: 1, w: 9, h: 4, barDir: "col",

  // 커스텀 색상 (프레젠테이션 팔레트에 맞게)
  chartColors: ["0D9488", "14B8A6", "5EEAD4"],

  // 깔끔한 배경
  chartArea: { fill: { color: "FFFFFF" }, roundedCorners: true },

  // 흐릿한 축 레이블
  catAxisLabelColor: "64748B",
  valAxisLabelColor: "64748B",

  // 미묘한 그리드 (값 축만)
  valGridLine: { color: "E2E8F0", size: 0.5 },
  catGridLine: { style: "none" },

  // 막대에 데이터 레이블
  showValue: true,
  dataLabelPosition: "outEnd",
  dataLabelColor: "1E293B",

  // 단일 시리즈는 범례 숨기기
  showLegend: false,
});
```

**주요 스타일링 옵션:**
- `chartColors: [...]` - 시리즈/세그먼트의 hex 색상
- `chartArea: { fill, border, roundedCorners }` - 차트 배경
- `catGridLine/valGridLine: { color, style, size }` - 격자선 (`style: "none"`으로 숨기기)
- `lineSmooth: true` - 곡선 (선 차트)
- `legendPos: "r"` - 범례 위치: "b", "t", "l", "r", "tr"

---

## 슬라이드 마스터

```javascript
pres.defineSlideMaster({
  title: 'TITLE_SLIDE', background: { color: '283A5E' },
  objects: [{
    placeholder: { options: { name: 'title', type: 'title', x: 1, y: 2, w: 8, h: 2 } }
  }]
});

let titleSlide = pres.addSlide({ masterName: "TITLE_SLIDE" });
titleSlide.addText("My Title", { placeholder: "title" });
```

---

## 일반적인 함정

⚠️ 이 문제들은 파일 손상, 시각적 버그, 또는 깨진 출력을 유발합니다. 반드시 피해야 합니다.

1. **hex 색상에 절대 "#" 사용 금지** - 파일 손상 유발
   ```javascript
   color: "FF0000"      // 올바른 예
   color: "#FF0000"     // 잘못된 예
   ```

2. **hex 색상 문자열에 불투명도 인코딩 금지** - 8자리 색상 (예: `"00000020"`)은 파일 손상. 대신 `opacity` 속성 사용.
   ```javascript
   shadow: { type: "outer", blur: 6, offset: 2, color: "00000020" }          // 파일 손상
   shadow: { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.12 }  // 올바른 예
   ```

3. **`bullet: true` 사용** - "•" 같은 유니코드 기호 절대 사용 금지 (이중 불릿 생성)

4. **배열 항목 사이에 `breakLine: true` 사용** 또는 텍스트 실행 연결

5. **불릿과 함께 `lineSpacing` 지양** - 과도한 간격 유발; 대신 `paraSpaceAfter` 사용

6. **각 프레젠테이션마다 새 인스턴스 필요** - `pptxgen()` 객체 재사용 금지

7. **옵션 객체를 여러 호출에 재사용 금지** - PptxGenJS는 객체를 인플레이스로 변환 (예: 그림자 값을 EMU로 변환). 하나의 객체를 여러 호출에 공유하면 두 번째 도형이 손상됩니다.
   ```javascript
   const shadow = { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 };
   slide.addShape(pres.shapes.RECTANGLE, { shadow, ... });  // 두 번째 호출은 이미 변환된 값을 받음
   slide.addShape(pres.shapes.RECTANGLE, { shadow, ... });

   const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 });
   slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });  // 매번 새 객체
   slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });
   ```

8. **강조 테두리와 함께 `ROUNDED_RECTANGLE` 사용 금지** - 직사각형 오버레이 바가 둥근 모서리를 덮지 못합니다. 대신 `RECTANGLE` 사용.
   ```javascript
   // 잘못된 예: 강조 바가 둥근 모서리를 덮지 못함
   slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1, y: 1, w: 3, h: 1.5, fill: { color: "FFFFFF" } });
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 0.08, h: 1.5, fill: { color: "0891B2" } });

   // 올바른 예: 깔끔한 정렬을 위해 RECTANGLE 사용
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 3, h: 1.5, fill: { color: "FFFFFF" } });
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 0.08, h: 1.5, fill: { color: "0891B2" } });
   ```

---

## 빠른 참조

- **도형**: RECTANGLE, OVAL, LINE, ROUNDED_RECTANGLE
- **차트**: BAR, LINE, PIE, DOUGHNUT, SCATTER, BUBBLE, RADAR
- **레이아웃**: LAYOUT_16x9 (10"×5.625"), LAYOUT_16x10, LAYOUT_4x3, LAYOUT_WIDE
- **정렬**: "left", "center", "right"
- **차트 데이터 레이블**: "outEnd", "inEnd", "center"
