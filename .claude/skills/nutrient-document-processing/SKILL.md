---
name: nutrient-document-processing
description: Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. Works with PDFs, DOCX, XLSX, PPTX, HTML, and images.
origin: ECC
---

# Nutrient 문서 처리

[Nutrient DWS Processor API](https://www.nutrient.io/api/)로 문서를 처리합니다. 형식 변환, 텍스트 및 표 추출, 스캔 문서 OCR, PII 제거, 워터마크 추가, 디지털 서명, PDF 양식 작성.

## 설정

**[nutrient.io](https://dashboard.nutrient.io/sign_up/?product=processor)**에서 무료 API 키 발급

```bash
export NUTRIENT_API_KEY="pdf_live_..."
```

모든 요청은 `instructions` JSON 필드를 포함한 multipart POST로 `https://api.nutrient.io/build`에 전송됩니다.

## 작업

### 문서 변환

```bash
# DOCX to PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.docx=@document.docx" \
  -F 'instructions={"parts":[{"file":"document.docx"}]}' \
  -o output.pdf

# PDF to DOCX
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"docx"}}' \
  -o output.docx

# HTML to PDF
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "index.html=@index.html" \
  -F 'instructions={"parts":[{"html":"index.html"}]}' \
  -o output.pdf
```

지원 입력 형식: PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, PPS, PPSX, ODT, RTF, HTML, JPG, PNG, TIFF, HEIC, GIF, WebP, SVG, TGA, EPS.

### 텍스트 및 데이터 추출

```bash
# 일반 텍스트 추출
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"text"}}' \
  -o output.txt

# Excel로 표 추출
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"output":{"type":"xlsx"}}' \
  -o tables.xlsx
```

### 스캔 문서 OCR

```bash
# 검색 가능한 PDF로 OCR (100개 이상 언어 지원)
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "scanned.pdf=@scanned.pdf" \
  -F 'instructions={"parts":[{"file":"scanned.pdf"}],"actions":[{"type":"ocr","language":"english"}]}' \
  -o searchable.pdf
```

언어: ISO 639-2 코드를 통해 100개 이상 언어 지원 (예: `eng`, `deu`, `fra`, `spa`, `jpn`, `kor`, `chi_sim`, `chi_tra`, `ara`, `hin`, `rus`). `english` 또는 `german`과 같은 전체 언어 이름도 사용 가능합니다. 모든 지원 코드는 [OCR 언어 표](https://www.nutrient.io/guides/document-engine/ocr/language-support/)를 참고하세요.

### 민감 정보 제거

```bash
# 패턴 기반 (주민등록번호, 이메일)
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"social-security-number"}},{"type":"redaction","strategy":"preset","strategyOptions":{"preset":"email-address"}}]}' \
  -o redacted.pdf

# 정규식 기반
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"redaction","strategy":"regex","strategyOptions":{"regex":"\\b[A-Z]{2}\\d{6}\\b"}}]}' \
  -o redacted.pdf
```

프리셋: `social-security-number`, `email-address`, `credit-card-number`, `international-phone-number`, `north-american-phone-number`, `date`, `time`, `url`, `ipv4`, `ipv6`, `mac-address`, `us-zip-code`, `vin`.

### 워터마크 추가

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"watermark","text":"CONFIDENTIAL","fontSize":72,"opacity":0.3,"rotation":-45}]}' \
  -o watermarked.pdf
```

### 디지털 서명

```bash
# 자체 서명 CMS 서명
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "document.pdf=@document.pdf" \
  -F 'instructions={"parts":[{"file":"document.pdf"}],"actions":[{"type":"sign","signatureType":"cms"}]}' \
  -o signed.pdf
```

### PDF 양식 작성

```bash
curl -X POST https://api.nutrient.io/build \
  -H "Authorization: Bearer $NUTRIENT_API_KEY" \
  -F "form.pdf=@form.pdf" \
  -F 'instructions={"parts":[{"file":"form.pdf"}],"actions":[{"type":"fillForm","formFields":{"name":"Jane Smith","email":"jane@example.com","date":"2026-02-06"}}]}' \
  -o filled.pdf
```

## MCP 서버 (대안)

curl 대신 네이티브 도구 통합을 위해 MCP 서버 사용:

```json
{
  "mcpServers": {
    "nutrient-dws": {
      "command": "npx",
      "args": ["-y", "@nutrient-sdk/dws-mcp-server"],
      "env": {
        "NUTRIENT_DWS_API_KEY": "YOUR_API_KEY",
        "SANDBOX_PATH": "/path/to/working/directory"
      }
    }
  }
}
```

## 사용 시점

- 형식 간 문서 변환 (PDF, DOCX, XLSX, PPTX, HTML, 이미지)
- PDF에서 텍스트, 표, 또는 키-값 쌍 추출
- 스캔 문서 또는 이미지 OCR
- 문서 공유 전 PII 제거
- 초안 또는 기밀 문서에 워터마크 추가
- 계약서 또는 협약서에 디지털 서명
- PDF 양식 프로그래밍 방식으로 작성

## 링크

- [API 플레이그라운드](https://dashboard.nutrient.io/processor-api/playground/)
- [전체 API 문서](https://www.nutrient.io/guides/dws-processor/)
- [npm MCP 서버](https://www.npmjs.com/package/@nutrient-sdk/dws-mcp-server)
