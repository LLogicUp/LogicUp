---
name: swift-concurrency-6-2
description: Swift 6.2 접근하기 쉬운 동시성 — 기본적으로 단일 스레드, 명시적 백그라운드 오프로딩을 위한 @concurrent, MainActor 타입을 위한 격리된 프로토콜 준수.
---

# Swift 6.2 접근하기 쉬운 동시성

코드가 기본적으로 단일 스레드로 실행되고 동시성을 명시적으로 도입하는 Swift 6.2 동시성 모델 채택 패턴. 성능을 희생하지 않고 일반적인 데이터 경쟁 오류를 제거한다.

## 언제 사용하나

- Swift 5.x 또는 6.0/6.1 프로젝트를 Swift 6.2로 마이그레이션 시
- 데이터 경쟁 안전성 컴파일러 오류 해결 시
- MainActor 기반 앱 아키텍처 설계 시
- CPU 집약적 작업을 백그라운드 스레드로 오프로딩 시
- MainActor 격리 타입에서 프로토콜 준수 구현 시
- Xcode 26에서 접근하기 쉬운 동시성 빌드 설정 활성화 시

## 핵심 문제: 암묵적 백그라운드 오프로딩

Swift 6.1 이전에는, async 함수가 암묵적으로 백그라운드 스레드에서 실행될 수 있어 겉보기에 안전한 코드에서도 데이터 경쟁 오류가 발생했다:

```swift
// Swift 6.1: 오류
@MainActor
final class StickerModel {
    let photoProcessor = PhotoProcessor()

    func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
        guard let data = try await item.loadTransferable(type: Data.self) else { return nil }

        // 오류: 'self.photoProcessor' 전송이 데이터 경쟁 위험을 초래함
        return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
    }
}
```

Swift 6.2에서 수정됨: async 함수는 기본적으로 호출한 액터에 머문다.

```swift
// Swift 6.2: 정상 — async가 MainActor에 머물러 데이터 경쟁 없음
@MainActor
final class StickerModel {
    let photoProcessor = PhotoProcessor()

    func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
        guard let data = try await item.loadTransferable(type: Data.self) else { return nil }
        return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
    }
}
```

## 핵심 패턴 — 격리된 프로토콜 준수

MainActor 타입이 이제 격리되지 않은 프로토콜을 안전하게 준수할 수 있다:

```swift
protocol Exportable {
    func export()
}

// Swift 6.1: 오류 — main actor 격리 코드를 넘어감
// Swift 6.2: 격리된 준수로 정상
extension StickerModel: @MainActor Exportable {
    func export() {
        photoProcessor.exportAsPNG()
    }
}
```

컴파일러는 준수가 main actor에서만 사용되도록 보장한다:

```swift
// 정상 — ImageExporter도 @MainActor
@MainActor
struct ImageExporter {
    var items: [any Exportable]

    mutating func add(_ item: StickerModel) {
        items.append(item)  // 안전: 같은 액터 격리
    }
}

// 오류 — 격리되지 않은 컨텍스트는 MainActor 준수를 사용할 수 없음
nonisolated struct ImageExporter {
    var items: [any Exportable]

    mutating func add(_ item: StickerModel) {
        items.append(item)  // 오류: Main actor 격리 준수를 여기서 사용할 수 없음
    }
}
```

## 핵심 패턴 — 전역 및 정적 변수

전역/정적 상태를 MainActor로 보호:

```swift
// Swift 6.1: 오류 — non-Sendable 타입이 공유 가변 상태를 가질 수 있음
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // 오류
}

// 수정: @MainActor 어노테이션 추가
@MainActor
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // 정상
}
```

### MainActor 기본 추론 모드

Swift 6.2는 기본적으로 MainActor가 추론되는 모드를 도입했다 — 수동 어노테이션 불필요:

```swift
// MainActor 기본 추론 활성화 시:
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // 암묵적 @MainActor
}

final class StickerModel {
    let photoProcessor: PhotoProcessor
    var selection: [PhotosPickerItem]  // 암묵적 @MainActor
}

extension StickerModel: Exportable {  // 암묵적 @MainActor 준수
    func export() {
        photoProcessor.exportAsPNG()
    }
}
```

이 모드는 옵트인 방식이며 앱, 스크립트, 기타 실행 가능한 타겟에 권장된다.

## 핵심 패턴 — 백그라운드 작업을 위한 @concurrent

실제 병렬 처리가 필요할 때는 `@concurrent`로 명시적으로 오프로드:

> **중요:** 이 예제는 접근하기 쉬운 동시성 빌드 설정 — SE-0466 (MainActor 기본 격리)과 SE-0461 (NonisolatedNonsendingByDefault)이 필요하다. 이 설정이 활성화되면 `extractSticker`는 호출자의 액터에 머물러 가변 상태 접근이 안전해진다. **이 설정 없이는 이 코드에 데이터 경쟁이 발생한다** — 컴파일러가 오류를 표시한다.

```swift
nonisolated final class PhotoProcessor {
    private var cachedStickers: [String: Sticker] = [:]

    func extractSticker(data: Data, with id: String) async -> Sticker {
        if let sticker = cachedStickers[id] {
            return sticker
        }

        let sticker = await Self.extractSubject(from: data)
        cachedStickers[id] = sticker
        return sticker
    }

    // 비용이 많이 드는 작업을 동시 스레드 풀로 오프로드
    @concurrent
    static func extractSubject(from data: Data) async -> Sticker { /* ... */ }
}

// 호출자는 await 필요
let processor = PhotoProcessor()
processedPhotos[item.id] = await processor.extractSticker(data: data, with: item.id)
```

`@concurrent` 사용법:
1. 포함하는 타입을 `nonisolated`로 표시
2. 함수에 `@concurrent` 추가
3. 아직 비동기가 아니면 `async` 추가
4. 호출 위치에 `await` 추가

## 핵심 설계 결정

| 결정 | 근거 |
|----------|-----------|
| 기본 단일 스레드 | 자연스러운 코드 대부분이 데이터 경쟁 없음; 동시성은 옵트인 |
| async가 호출 액터에 머뭄 | 데이터 경쟁 오류를 일으키던 암묵적 오프로딩 제거 |
| 격리된 준수 | MainActor 타입이 안전하지 않은 우회 없이 프로토콜 준수 가능 |
| `@concurrent` 명시적 옵트인 | 백그라운드 실행은 의도적 성능 선택, 우연이 아님 |
| MainActor 기본 추론 | 앱 타겟의 불필요한 `@MainActor` 어노테이션 감소 |
| 옵트인 채택 | 비파괴적 마이그레이션 경로 — 기능을 점진적으로 활성화 |

## 마이그레이션 단계

1. **Xcode에서 활성화**: 빌드 설정의 Swift Compiler > Concurrency 섹션
2. **SPM에서 활성화**: 패키지 매니페스트에서 `SwiftSettings` API 사용
3. **마이그레이션 도구 사용**: swift.org/migration을 통한 자동 코드 변경
4. **MainActor 기본값부터 시작**: 앱 타겟에서 추론 모드 활성화
5. **필요한 곳에 `@concurrent` 추가**: 먼저 프로파일링한 후 핫 패스 오프로드
6. **철저히 테스트**: 데이터 경쟁 문제가 컴파일 타임 오류로 변환됨

## 모범 사례

- **MainActor에서 시작** — 단일 스레드 코드를 먼저 작성하고, 나중에 최적화
- **CPU 집약적 작업에만 `@concurrent` 사용** — 이미지 처리, 압축, 복잡한 연산
- **앱 타겟에 MainActor 추론 모드 활성화** — 대부분 단일 스레드인 타겟
- **오프로드 전 프로파일링** — Instruments로 실제 병목 지점 파악
- **전역 변수를 MainActor로 보호** — 전역/정적 가변 상태는 액터 격리 필요
- **`nonisolated` 우회 대신 격리된 준수 사용** 또는 `@Sendable` 래퍼
- **점진적으로 마이그레이션** — 빌드 설정에서 한 번에 하나씩 기능 활성화

## 피해야 할 안티패턴

- 모든 async 함수에 `@concurrent` 적용 (대부분 백그라운드 실행 불필요)
- 격리를 이해하지 않고 컴파일러 오류를 억제하려 `nonisolated` 사용
- 액터가 같은 안전성을 제공하는데 레거시 `DispatchQueue` 패턴 유지
- 동시성 관련 Foundation Models 코드에서 `model.availability` 확인 누락
- 컴파일러와 싸우기 — 데이터 경쟁을 보고하면 코드에 실제 동시성 문제가 있는 것
- 모든 async 코드가 백그라운드에서 실행된다고 가정 (Swift 6.2 기본값: 호출 액터에 머뭄)

## 언제 사용하나

- 모든 새로운 Swift 6.2+ 프로젝트 (접근하기 쉬운 동시성이 권장 기본값)
- Swift 5.x 또는 6.0/6.1 동시성에서 기존 앱 마이그레이션
- Xcode 26 도입 중 데이터 경쟁 안전성 컴파일러 오류 해결
- MainActor 중심 앱 아키텍처 구축 (대부분의 UI 앱)
- 성능 최적화 — 특정 무거운 연산을 백그라운드로 오프로딩
