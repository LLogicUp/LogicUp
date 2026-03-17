---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> 이 파일은 [common/hooks.md](../common/hooks.md)를 Python 전용 내용으로 확장합니다.

## PostToolUse Hooks

`~/.claude/settings.json`에서 설정합니다:

- **black/ruff**: 편집 후 `.py` 파일 자동 포맷
- **mypy/pyright**: `.py` 파일 편집 후 타입 체크 실행

## 경고

- 편집된 파일에서 `print()` 문 사용 시 경고 (대신 `logging` 모듈 사용)
