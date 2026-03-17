---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Hooks

> 이 파일은 [common/hooks.md](../common/hooks.md)를 Swift 전용 내용으로 확장합니다.

## PostToolUse Hooks

`~/.claude/settings.json`에서 설정합니다:

- **SwiftFormat**: 편집 후 `.swift` 파일 자동 포맷
- **SwiftLint**: `.swift` 파일 편집 후 린트 검사 실행
- **swift build**: 편집 후 수정된 패키지 타입 체크

## 경고

`print()` 문을 표시합니다 — 프로덕션 코드에서는 `os.Logger` 또는 구조적 로깅을 사용하세요.
