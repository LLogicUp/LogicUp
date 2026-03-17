**중요: 반드시 아래 단계를 순서대로 완료해야 합니다. 코드 작성 단계로 바로 넘어가지 마세요.**

PDF 폼을 채워야 하는 경우, 먼저 해당 PDF에 채울 수 있는 폼 필드가 있는지 확인합니다. 이 파일의 디렉토리에서 다음 스크립트를 실행합니다:
`python scripts/check_fillable_fields <file.pdf>`, 결과에 따라 "채울 수 있는 필드" 또는 "채울 수 없는 필드" 섹션으로 이동하여 해당 지침을 따릅니다.

# 채울 수 있는 필드
PDF에 채울 수 있는 폼 필드가 있는 경우:
- 이 파일의 디렉토리에서 다음 스크립트를 실행합니다: `python scripts/extract_form_field_info.py <input.pdf> <field_info.json>`. 이 스크립트는 다음 형식의 필드 목록이 담긴 JSON 파일을 생성합니다:
```
[
  {
    "field_id": (필드의 고유 ID),
    "page": (페이지 번호, 1부터 시작),
    "rect": ([left, bottom, right, top] PDF 좌표의 바운딩 박스, y=0은 페이지 하단),
    "type": ("text", "checkbox", "radio_group", 또는 "choice"),
  },
  // 체크박스에는 "checked_value"와 "unchecked_value" 속성이 있음:
  {
    "field_id": (필드의 고유 ID),
    "page": (페이지 번호, 1부터 시작),
    "type": "checkbox",
    "checked_value": (체크박스를 체크하려면 이 값으로 필드 설정),
    "unchecked_value": (체크박스를 해제하려면 이 값으로 필드 설정),
  },
  // 라디오 그룹에는 가능한 선택지 목록인 "radio_options"가 있음:
  {
    "field_id": (필드의 고유 ID),
    "page": (페이지 번호, 1부터 시작),
    "type": "radio_group",
    "radio_options": [
      {
        "value": (이 라디오 옵션을 선택하려면 필드를 이 값으로 설정),
        "rect": (이 옵션의 라디오 버튼 바운딩 박스)
      },
      // 다른 라디오 옵션들
    ]
  },
  // 다중 선택 필드에는 가능한 선택지 목록인 "choice_options"가 있음:
  {
    "field_id": (필드의 고유 ID),
    "page": (페이지 번호, 1부터 시작),
    "type": "choice",
    "choice_options": [
      {
        "value": (이 옵션을 선택하려면 필드를 이 값으로 설정),
        "text": (옵션의 표시 텍스트)
      },
      // 다른 선택 옵션들
    ],
  }
]
```
- 이 스크립트를 사용하여 PDF를 PNG로 변환합니다 (각 페이지당 하나의 이미지, 이 파일의 디렉토리에서 실행):
`python scripts/convert_pdf_to_images.py <file.pdf> <output_directory>`
그런 다음 이미지를 분석하여 각 폼 필드의 목적을 파악합니다 (바운딩 박스 PDF 좌표를 이미지 좌표로 변환해야 함).
- 각 필드에 입력할 값이 담긴 `field_values.json` 파일을 다음 형식으로 생성합니다:
```
[
  {
    "field_id": "last_name", // `extract_form_field_info.py`의 field_id와 일치해야 함
    "description": "사용자의 성",
    "page": 1, // field_info.json의 "page" 값과 일치해야 함
    "value": "Simpson"
  },
  {
    "field_id": "Checkbox12",
    "description": "사용자가 18세 이상인 경우 체크할 체크박스",
    "page": 1,
    "value": "/On" // 체크박스인 경우 체크하려면 "checked_value" 값 사용. 라디오 버튼 그룹인 경우 "radio_options"의 "value" 값 중 하나 사용.
  },
  // 추가 필드들
]
```
- 채워진 PDF를 생성하려면 이 파일의 디렉토리에서 `fill_fillable_fields.py` 스크립트를 실행합니다:
`python scripts/fill_fillable_fields.py <input pdf> <field_values.json> <output pdf>`
이 스크립트는 제공한 필드 ID와 값이 유효한지 검증합니다. 에러 메시지가 출력되면 해당 필드를 수정하고 다시 시도합니다.

# 채울 수 없는 필드
PDF에 채울 수 있는 폼 필드가 없는 경우, 텍스트 어노테이션을 추가합니다. 먼저 PDF 구조에서 좌표를 추출해보고 (더 정확), 필요한 경우 시각적 추정으로 폴백합니다.

## 1단계: 먼저 구조 추출 시도

다음 스크립트를 실행하여 텍스트 레이블, 선, 체크박스를 정확한 PDF 좌표와 함께 추출합니다:
`python scripts/extract_form_structure.py <input.pdf> form_structure.json`

이 스크립트는 다음을 포함하는 JSON 파일을 생성합니다:
- **labels**: 정확한 좌표가 있는 모든 텍스트 요소 (PDF 포인트 단위의 x0, top, x1, bottom)
- **lines**: 행 경계를 정의하는 수평선
- **checkboxes**: 체크박스인 작은 정사각형 직사각형 (중심 좌표 포함)
- **row_boundaries**: 수평선에서 계산된 행의 상단/하단 위치

**결과 확인**: `form_structure.json`에 의미 있는 레이블(폼 필드에 해당하는 텍스트 요소)이 있으면 **방법 A: 구조 기반 좌표**를 사용합니다. PDF가 스캔되거나 이미지 기반이어서 레이블이 거의 없거나 없는 경우 **방법 B: 시각적 추정**을 사용합니다.

---

## 방법 A: 구조 기반 좌표 (권장)

`extract_form_structure.py`가 PDF에서 텍스트 레이블을 찾은 경우 사용합니다.

### A.1: 구조 분석

form_structure.json을 읽고 다음을 파악합니다:

1. **레이블 그룹**: 단일 레이블을 형성하는 인접한 텍스트 요소 (예: "Last" + "Name")
2. **행 구조**: 비슷한 `top` 값을 가진 레이블은 같은 행에 있음
3. **필드 열**: 입력 영역은 레이블 끝 이후에 시작 (x0 = label.x1 + gap)
4. **체크박스**: 구조에서 직접 체크박스 좌표 사용

**좌표 시스템**: PDF 좌표에서 y=0은 페이지 상단, y는 아래로 증가합니다.

### A.2: 누락된 요소 확인

구조 추출이 모든 폼 요소를 감지하지 못할 수 있습니다. 일반적인 경우:
- **원형 체크박스**: 정사각형 직사각형만 체크박스로 감지됨
- **복잡한 그래픽**: 장식적 요소나 비표준 폼 컨트롤
- **흐리거나 밝은 색상 요소**: 추출되지 않을 수 있음

form_structure.json에 없는 폼 필드가 PDF 이미지에 보이면, 해당 특정 필드에는 **시각적 분석**을 사용해야 합니다 (아래 "혼합 방법" 참조).

### A.3: PDF 좌표로 fields.json 생성

각 필드에 대해 추출된 구조에서 입력 좌표를 계산합니다:

**텍스트 필드:**
- entry x0 = label x1 + 5 (레이블 이후 작은 간격)
- entry x1 = 다음 레이블의 x0, 또는 행 경계
- entry top = 레이블 top과 동일
- entry bottom = 아래의 행 경계선, 또는 label bottom + row_height

**체크박스:**
- form_structure.json에서 직접 체크박스 직사각형 좌표 사용
- entry_bounding_box = [checkbox.x0, checkbox.top, checkbox.x1, checkbox.bottom]

`pdf_width`와 `pdf_height`를 사용하여 fields.json 생성 (PDF 좌표임을 나타냄):
```json
{
  "pages": [
    {"page_number": 1, "pdf_width": 612, "pdf_height": 792}
  ],
  "form_fields": [
    {
      "page_number": 1,
      "description": "성 입력 필드",
      "field_label": "Last Name",
      "label_bounding_box": [43, 63, 87, 73],
      "entry_bounding_box": [92, 63, 260, 79],
      "entry_text": {"text": "Smith", "font_size": 10}
    },
    {
      "page_number": 1,
      "description": "미국 시민 여부 체크박스",
      "field_label": "Yes",
      "label_bounding_box": [260, 200, 280, 210],
      "entry_bounding_box": [285, 197, 292, 205],
      "entry_text": {"text": "X"}
    }
  ]
}
```

**중요**: `pdf_width`/`pdf_height`를 사용하고 form_structure.json에서 직접 좌표를 가져옵니다.

### A.4: 바운딩 박스 검증

채우기 전에 바운딩 박스에 오류가 없는지 확인합니다:
`python scripts/check_bounding_boxes.py fields.json`

이 스크립트는 교차하는 바운딩 박스와 폰트 크기에 비해 너무 작은 입력 박스를 확인합니다. 보고된 오류를 수정한 후 채우기를 진행합니다.

---

## 방법 B: 시각적 추정 (폴백)

PDF가 스캔되거나 이미지 기반이어서 구조 추출이 사용 가능한 텍스트 레이블을 찾지 못한 경우 사용합니다 (예: 모든 텍스트가 "(cid:X)" 패턴으로 표시되는 경우).

### B.1: PDF를 이미지로 변환

`python scripts/convert_pdf_to_images.py <input.pdf> <images_dir/>`

### B.2: 초기 필드 식별

각 페이지 이미지를 검사하여 폼 섹션과 필드 위치의 **대략적인 추정치**를 파악합니다:
- 폼 필드 레이블과 대략적인 위치
- 입력 영역 (텍스트 입력을 위한 선, 박스, 또는 빈 공간)
- 체크박스와 대략적인 위치

각 필드에 대해 대략적인 픽셀 좌표를 기록합니다 (아직 정확하지 않아도 됨).

### B.3: 확대 정밀화 (정확도를 위해 필수)

각 필드에 대해 추정된 위치 주변 영역을 잘라내어 정확한 좌표를 파악합니다.

**ImageMagick을 사용하여 확대 자르기:**
```bash
magick <page_image> -crop <width>x<height>+<x>+<y> +repage <crop_output.png>
```

여기서:
- `<x>, <y>` = 자르기 영역의 좌상단 모서리 (대략적인 추정치에서 패딩을 뺀 값 사용)
- `<width>, <height>` = 자르기 영역의 크기 (필드 영역에 각 측면 ~50px 패딩 추가)

**예시:** "Name" 필드가 (100, 150) 근처에 있는 경우:
```bash
magick images_dir/page_1.png -crop 300x80+50+120 +repage crops/name_field.png
```

(참고: `magick` 명령을 사용할 수 없는 경우 동일한 인수로 `convert` 시도).

**자른 이미지를 검사하여** 정확한 좌표를 파악합니다:
1. 입력 영역이 정확히 시작되는 픽셀 파악 (레이블 이후)
2. 입력 영역이 끝나는 곳 파악 (다음 필드 또는 가장자리 이전)
3. 입력 선/박스의 상단과 하단 파악

**자르기 좌표를 전체 이미지 좌표로 변환:**
- full_x = crop_x + crop_offset_x
- full_y = crop_y + crop_offset_y

예시: 자르기가 (50, 120)에서 시작하고 자르기 내에서 입력 박스가 (52, 18)에서 시작하는 경우:
- entry_x0 = 52 + 50 = 102
- entry_top = 18 + 120 = 138

가능한 경우 인접한 필드를 하나의 자르기로 그룹화하여 **각 필드에 대해 반복합니다**.

### B.4: 정밀화된 좌표로 fields.json 생성

`image_width`와 `image_height`를 사용하여 fields.json 생성 (이미지 좌표임을 나타냄):
```json
{
  "pages": [
    {"page_number": 1, "image_width": 1700, "image_height": 2200}
  ],
  "form_fields": [
    {
      "page_number": 1,
      "description": "성 입력 필드",
      "field_label": "Last Name",
      "label_bounding_box": [120, 175, 242, 198],
      "entry_bounding_box": [255, 175, 720, 218],
      "entry_text": {"text": "Smith", "font_size": 10}
    }
  ]
}
```

**중요**: `image_width`/`image_height`와 확대 분석에서 얻은 정밀화된 픽셀 좌표를 사용합니다.

### B.5: 바운딩 박스 검증

채우기 전에 바운딩 박스에 오류가 없는지 확인합니다:
`python scripts/check_bounding_boxes.py fields.json`

이 스크립트는 교차하는 바운딩 박스와 폰트 크기에 비해 너무 작은 입력 박스를 확인합니다. 보고된 오류를 수정한 후 채우기를 진행합니다.

---

## 혼합 방법: 구조 + 시각적

구조 추출이 대부분의 필드에서 작동하지만 일부 요소(예: 원형 체크박스, 비표준 폼 컨트롤)를 놓치는 경우 사용합니다.

1. form_structure.json에서 감지된 필드에는 **방법 A** 사용
2. 누락된 필드의 시각적 분석을 위해 **PDF를 이미지로 변환**
3. 누락된 필드에는 (방법 B의) **확대 정밀화** 사용
4. **좌표 통합**: 구조 추출의 필드에는 `pdf_width`/`pdf_height` 사용. 시각적으로 추정된 필드의 경우 이미지 좌표를 PDF 좌표로 변환:
   - pdf_x = image_x * (pdf_width / image_width)
   - pdf_y = image_y * (pdf_height / image_height)
5. fields.json에서 **단일 좌표 시스템 사용** - `pdf_width`/`pdf_height`로 모두 PDF 좌표로 변환

---

## 2단계: 채우기 전 검증

**채우기 전 항상 바운딩 박스를 검증합니다:**
`python scripts/check_bounding_boxes.py fields.json`

이 스크립트는 다음을 확인합니다:
- 교차하는 바운딩 박스 (텍스트 겹침 발생)
- 지정된 폰트 크기에 비해 너무 작은 입력 박스

진행하기 전에 fields.json에서 보고된 오류를 수정합니다.

## 3단계: 폼 채우기

채우기 스크립트가 좌표 시스템을 자동 감지하고 변환을 처리합니다:
`python scripts/fill_pdf_form_with_annotations.py <input.pdf> fields.json <output.pdf>`

## 4단계: 출력 검증

채워진 PDF를 이미지로 변환하여 텍스트 배치를 확인합니다:
`python scripts/convert_pdf_to_images.py <output.pdf> <verify_images/>`

텍스트 위치가 맞지 않는 경우:
- **방법 A**: `pdf_width`/`pdf_height`와 함께 form_structure.json의 PDF 좌표를 사용하고 있는지 확인
- **방법 B**: 이미지 크기가 일치하고 좌표가 정확한 픽셀인지 확인
- **혼합**: 시각적으로 추정된 필드의 좌표 변환이 올바른지 확인
