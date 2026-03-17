---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 보안

> 이 파일은 [common/security.md](../common/security.md)를 TypeScript/JavaScript 전용 내용으로 확장합니다.

## 시크릿 관리

```typescript
// 금지: 하드코딩된 시크릿
const apiKey = "sk-proj-xxxxx"

// 필수: 환경 변수
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

## Agent 지원

- 포괄적인 보안 감사에는 **security-reviewer** 스킬 사용
