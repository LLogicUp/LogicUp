---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 테스트

> 이 파일은 [common/testing.md](../common/testing.md)를 Go 전용 내용으로 확장합니다.

## 프레임워크

표준 `go test`를 **테이블 주도 테스트**와 함께 사용합니다.

## 레이스 감지

항상 `-race` 플래그를 붙여 실행합니다:

```bash
go test -race ./...
```

## 커버리지

```bash
go test -cover ./...
```

## 참고

스킬: `golang-testing` — 상세한 Go 테스트 패턴과 헬퍼를 확인하세요.
