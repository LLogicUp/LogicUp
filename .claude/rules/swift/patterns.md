---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift 패턴

> 이 파일은 [common/patterns.md](../common/patterns.md)를 Swift 전용 내용으로 확장합니다.

## Protocol 지향 설계

작고 집중된 protocol을 정의합니다. 공유 기본값에는 protocol extension을 사용합니다:

```swift
protocol Repository: Sendable {
    associatedtype Item: Identifiable & Sendable
    func find(by id: Item.ID) async throws -> Item?
    func save(_ item: Item) async throws
}
```

## 값 타입

- 데이터 전달 객체와 모델에는 struct 사용
- 연관 값을 가진 enum으로 명확한 상태 모델링:

```swift
enum LoadState<T: Sendable>: Sendable {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}
```

## Actor 패턴

잠금이나 dispatch queue 대신 actor를 사용하여 공유 가변 상태를 관리합니다:

```swift
actor Cache<Key: Hashable & Sendable, Value: Sendable> {
    private var storage: [Key: Value] = [:]

    func get(_ key: Key) -> Value? { storage[key] }
    func set(_ key: Key, value: Value) { storage[key] = value }
}
```

## 의존성 주입

기본 파라미터를 갖는 protocol을 주입합니다 — 프로덕션에서는 기본값, 테스트에서는 mock 주입:

```swift
struct UserService {
    private let repository: any UserRepository

    init(repository: any UserRepository = DefaultUserRepository()) {
        self.repository = repository
    }
}
```

## 참고

스킬: `swift-actor-persistence` — actor 기반 영속성 패턴을 확인하세요.
스킬: `swift-protocol-di-testing` — protocol 기반 DI와 테스트를 확인하세요.
