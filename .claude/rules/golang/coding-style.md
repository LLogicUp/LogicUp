---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 코딩 스타일

> 이 파일은 [common/coding-style.md](../common/coding-style.md)를 Go 전용 내용으로 확장합니다.

## 포맷팅

- **gofmt**와 **goimports**는 필수입니다 — 스타일 논쟁 없음

## 설계 원칙

- 인터페이스를 받고, 구조체를 반환합니다
- 인터페이스를 작게 유지합니다 (메서드 1-3개)

## 에러 처리

항상 컨텍스트를 포함하여 에러를 래핑합니다:

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## 참고

스킬: `golang-patterns` — 포괄적인 Go 관용구와 패턴을 확인하세요.
