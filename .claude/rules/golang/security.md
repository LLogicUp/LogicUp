---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 보안

> 이 파일은 [common/security.md](../common/security.md)를 Go 전용 내용으로 확장합니다.

## 시크릿 관리

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

## 보안 스캐닝

- 정적 보안 분석에 **gosec** 사용:
  ```bash
  gosec ./...
  ```

## Context와 타임아웃

타임아웃 제어에는 항상 `context.Context`를 사용합니다:

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```
