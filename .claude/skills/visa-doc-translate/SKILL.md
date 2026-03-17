---
name: visa-doc-translate
description: 비자 신청 서류(이미지)를 영어로 번역하고 원본과 번역본이 포함된 2개 언어 PDF 생성
---

비자 신청을 위한 비자 서류 번역을 돕습니다.

## 지침

사용자가 이미지 파일 경로를 제공하면, 확인 없이 자동으로 다음 단계를 실행합니다:

1. **이미지 변환**: HEIC 파일인 경우 `sips -s format png <input> --out <output>`을 사용하여 PNG로 변환

2. **이미지 회전**:
   - EXIF 방향 데이터 확인
   - EXIF 데이터를 기반으로 이미지 자동 회전
   - EXIF 방향이 6이면 90도 반시계 방향으로 회전
   - 필요에 따라 추가 회전 적용 (문서가 거꾸로 보이면 180도 테스트)

3. **OCR 텍스트 추출**:
   - 여러 OCR 방법을 자동으로 시도:
     - macOS Vision framework (macOS에서 선호)
     - EasyOCR (크로스 플랫폼, tesseract 불필요)
     - Tesseract OCR (사용 가능한 경우)
   - 문서에서 모든 텍스트 정보 추출
   - 문서 유형 식별 (예금 증명서, 재직 증명서, 퇴직 증명서 등)

4. **번역**:
   - 모든 텍스트 내용을 전문적으로 영어로 번역
   - 원본 문서 구조와 형식 유지
   - 비자 신청에 적합한 전문 용어 사용
   - 고유 명사는 원래 언어를 유지하고 괄호 안에 영어 표기
   - 중국어 이름의 경우 병음 형식 사용 (예: WU Zhengye)
   - 모든 숫자, 날짜, 금액을 정확하게 보존

5. **PDF 생성**:
   - PIL 및 reportlab 라이브러리를 사용하는 Python 스크립트 생성
   - 1페이지: A4 페이지에 맞게 회전된 원본 이미지를 중앙에 배치하여 표시
   - 2페이지: 적절한 형식으로 영어 번역 표시:
     - 제목은 중앙 정렬 및 굵게
     - 내용은 적절한 간격으로 왼쪽 정렬
     - 공식 문서에 적합한 전문적인 레이아웃
   - 하단에 다음 메모 추가: "This is a certified English translation of the original document"
   - 스크립트를 실행하여 PDF 생성

6. **출력**: 동일한 디렉토리에 `<원본_파일명>_Translated.pdf` 파일 생성

## 지원 문서

- 예금 증명서 (存款证明)
- 소득 증명서 (收入证明)
- 재직 증명서 (在职证明)
- 퇴직 증명서 (退休证明)
- 부동산 증명서 (房产证明)
- 사업자 등록증 (营业执照)
- 신분증 및 여권
- 기타 공식 문서

## 기술 구현

### OCR 방법 (순서대로 시도)

1. **macOS Vision Framework** (macOS 전용):
   ```python
   import Vision
   from Foundation import NSURL
   ```

2. **EasyOCR** (크로스 플랫폼):
   ```bash
   pip install easyocr
   ```

3. **Tesseract OCR** (사용 가능한 경우):
   ```bash
   brew install tesseract tesseract-lang
   pip install pytesseract
   ```

### 필수 Python 라이브러리

```bash
pip install pillow reportlab
```

macOS Vision framework의 경우:
```bash
pip install pyobjc-framework-Vision pyobjc-framework-Quartz
```

## 중요 가이드라인

- 각 단계에서 사용자 확인을 요청하지 않음
- 최적의 회전 각도를 자동으로 결정
- 하나의 방법이 실패하면 여러 OCR 방법 시도
- 모든 숫자, 날짜, 금액이 정확하게 번역되었는지 확인
- 깔끔하고 전문적인 형식 사용
- 전체 과정을 완료하고 최종 PDF 위치를 보고

## 사용 예시

```bash
/visa-doc-translate RetirementCertificate.PNG
/visa-doc-translate BankStatement.HEIC
/visa-doc-translate EmploymentLetter.jpg
```

## 출력 예시

스킬이 수행하는 작업:
1. 사용 가능한 OCR 방법으로 텍스트 추출
2. 전문적인 영어로 번역
3. 다음 내용이 포함된 `<파일명>_Translated.pdf` 생성:
   - 1페이지: 원본 문서 이미지
   - 2페이지: 전문적인 영어 번역

호주, 미국, 캐나다, 영국 및 번역 서류가 필요한 기타 국가의 비자 신청에 적합합니다.
