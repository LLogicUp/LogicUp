---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Hooks

> 이 파일은 [common/hooks.md](../common/hooks.md)를 Go 전용 내용으로 확장합니다.

## PostToolUse Hooks

`~/.claude/settings.json`에서 설정합니다:

- **gofmt/goimports**: 편집 후 `.go` 파일 자동 포맷
- **go vet**: `.go` 파일 편집 후 정적 분석 실행
- **staticcheck**: 수정된 패키지에 대한 확장 정적 검사 실행
