---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Hooks

> 이 파일은 [common/hooks.md](../common/hooks.md)를 TypeScript/JavaScript 전용 내용으로 확장합니다.

## PostToolUse Hooks

`~/.claude/settings.json`에서 설정합니다:

- **Prettier**: 편집 후 JS/TS 파일 자동 포맷
- **TypeScript 체크**: `.ts`/`.tsx` 파일 편집 후 `tsc` 실행
- **console.log 경고**: 편집된 파일에서 `console.log` 발견 시 경고

## Stop Hooks

- **console.log 감사**: 세션 종료 전 수정된 모든 파일에서 `console.log` 확인
