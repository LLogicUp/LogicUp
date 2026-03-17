---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 코딩 스타일

> 이 파일은 [common/coding-style.md](../common/coding-style.md)를 TypeScript/JavaScript 전용 내용으로 확장합니다.

## 불변성

불변 업데이트에는 spread 연산자를 사용합니다:

```typescript
// 잘못됨: 변경(Mutation)
function updateUser(user, name) {
  user.name = name  // 변경!
  return user
}

// 올바름: 불변성
function updateUser(user, name) {
  return {
    ...user,
    name
  }
}
```

## 에러 처리

async/await와 try-catch를 사용합니다:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

## 입력 유효성 검사

스키마 기반 유효성 검사에 Zod를 사용합니다:

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## Console.log

- 프로덕션 코드에 `console.log` 사용 금지
- 대신 적절한 로깅 라이브러리 사용
- 자동 감지를 위한 hooks 참조
