---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift 테스트

> 이 파일은 [common/testing.md](../common/testing.md)를 Swift 전용 내용으로 확장합니다.

## 프레임워크

새 테스트에는 **Swift Testing** (`import Testing`)을 사용합니다. `@Test`와 `#expect`를 사용합니다:

```swift
@Test("User creation validates email")
func userCreationValidatesEmail() throws {
    #expect(throws: ValidationError.invalidEmail) {
        try User(email: "not-an-email")
    }
}
```

## 테스트 격리

각 테스트는 새 인스턴스를 받습니다 — `init`에서 설정하고 `deinit`에서 해제합니다. 테스트 간 공유 가변 상태 없음.

## 매개변수화된 테스트

```swift
@Test("Validates formats", arguments: ["json", "xml", "csv"])
func validatesFormat(format: String) throws {
    let parser = try Parser(format: format)
    #expect(parser.isValid)
}
```

## 커버리지

```bash
swift test --enable-code-coverage
```

## 참고

스킬: `swift-protocol-di-testing` — Swift Testing을 사용한 protocol 기반 의존성 주입과 mock 패턴을 확인하세요.
