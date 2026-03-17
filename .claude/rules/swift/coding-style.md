---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift 코딩 스타일

> 이 파일은 [common/coding-style.md](../common/coding-style.md)를 Swift 전용 내용으로 확장합니다.

## 포맷팅

- 자동 포맷팅에 **SwiftFormat**, 스타일 강제에 **SwiftLint** 사용
- Xcode 16+에 번들된 `swift-format`을 대안으로 사용 가능

## 불변성

- `var`보다 `let`을 선호합니다 — 모든 것을 `let`으로 정의하고, 컴파일러가 요구할 때만 `var`로 변경
- 기본적으로 값 시멘틱을 갖는 `struct` 사용. 동일성이나 참조 시멘틱이 필요한 경우에만 `class` 사용

## 네이밍

[Apple API 설계 가이드라인](https://www.swift.org/documentation/api-design-guidelines/)을 따릅니다:

- 사용 지점에서 명확성 — 불필요한 단어 제거
- 타입이 아닌 역할로 메서드와 프로퍼티 이름 지정
- 전역 상수 대신 `static let` 사용

## 에러 처리

타입드 throws (Swift 6+)와 패턴 매칭 사용:

```swift
func load(id: String) throws(LoadError) -> Item {
    guard let data = try? read(from: path) else {
        throw .fileNotFound(id)
    }
    return try decode(data)
}
```

## 동시성

Swift 6 엄격한 동시성 검사를 활성화합니다. 다음을 선호합니다:

- 격리 경계를 넘는 데이터에는 `Sendable` 값 타입
- 공유 가변 상태에는 Actor
- 비구조적 `Task {}` 대신 구조적 동시성 (`async let`, `TaskGroup`)
