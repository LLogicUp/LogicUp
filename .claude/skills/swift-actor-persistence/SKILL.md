---
name: swift-actor-persistence
description: Swift 액터를 사용한 스레드 안전 데이터 영속성 — 설계 단계에서 데이터 경쟁을 제거하는 인메모리 캐시와 파일 기반 스토리지.
origin: ECC
---

# Swift 액터를 활용한 스레드 안전 영속성

Swift 액터를 사용하여 스레드 안전한 데이터 영속성 레이어를 구축하는 패턴. 인메모리 캐싱과 파일 기반 스토리지를 결합하고, 액터 모델을 활용하여 컴파일 타임에 데이터 경쟁을 제거한다.

## 언제 사용하나

- Swift 5.5+에서 데이터 영속성 레이어 구축 시
- 공유 가변 상태에 스레드 안전한 접근이 필요할 때
- 수동 동기화(락, DispatchQueue) 제거가 필요할 때
- 로컬 스토리지를 갖춘 오프라인 우선 앱 구축 시

## 핵심 패턴

### 액터 기반 리포지토리

액터 모델은 직렬화된 접근을 보장한다 — 데이터 경쟁 없음, 컴파일러가 강제.

```swift
public actor LocalRepository<T: Codable & Identifiable> where T.ID == String {
    private var cache: [String: T] = [:]
    private let fileURL: URL

    public init(directory: URL = .documentsDirectory, filename: String = "data.json") {
        self.fileURL = directory.appendingPathComponent(filename)
        // init 중 동기 로드 (액터 격리 아직 활성화 안 됨)
        self.cache = Self.loadSynchronously(from: fileURL)
    }

    // MARK: - Public API

    public func save(_ item: T) throws {
        cache[item.id] = item
        try persistToFile()
    }

    public func delete(_ id: String) throws {
        cache[id] = nil
        try persistToFile()
    }

    public func find(by id: String) -> T? {
        cache[id]
    }

    public func loadAll() -> [T] {
        Array(cache.values)
    }

    // MARK: - Private

    private func persistToFile() throws {
        let data = try JSONEncoder().encode(Array(cache.values))
        try data.write(to: fileURL, options: .atomic)
    }

    private static func loadSynchronously(from url: URL) -> [String: T] {
        guard let data = try? Data(contentsOf: url),
              let items = try? JSONDecoder().decode([T].self, from: data) else {
            return [:]
        }
        return Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
    }
}
```

### 사용법

액터 격리로 인해 모든 호출이 자동으로 async가 된다:

```swift
let repository = LocalRepository<Question>()

// 읽기 — 인메모리 캐시에서 O(1) 빠른 조회
let question = await repository.find(by: "q-001")
let allQuestions = await repository.loadAll()

// 쓰기 — 캐시 업데이트와 파일 저장을 원자적으로 수행
try await repository.save(newQuestion)
try await repository.delete("q-001")
```

### @Observable ViewModel과 결합

```swift
@Observable
final class QuestionListViewModel {
    private(set) var questions: [Question] = []
    private let repository: LocalRepository<Question>

    init(repository: LocalRepository<Question> = LocalRepository()) {
        self.repository = repository
    }

    func load() async {
        questions = await repository.loadAll()
    }

    func add(_ question: Question) async throws {
        try await repository.save(question)
        questions = await repository.loadAll()
    }
}
```

## 핵심 설계 결정

| 결정 | 근거 |
|----------|-----------|
| 액터 (클래스 + 락 대신) | 컴파일러가 스레드 안전성 강제, 수동 동기화 불필요 |
| 인메모리 캐시 + 파일 영속성 | 캐시에서 빠른 읽기, 디스크에 내구성 있는 쓰기 |
| 동기 init 로딩 | 비동기 초기화 복잡성 회피 |
| ID 키 딕셔너리 | O(1) 식별자 조회 |
| `Codable & Identifiable` 제네릭 | 모든 모델 타입에 재사용 가능 |
| 원자적 파일 쓰기 (`.atomic`) | 크래시 시 부분 쓰기 방지 |

## 모범 사례

- **`Sendable` 타입 사용** — 액터 경계를 넘는 모든 데이터에 적용
- **액터의 공개 API 최소화** — 도메인 연산만 노출, 영속성 세부사항은 숨김
- **`.atomic` 쓰기 사용** — 앱 크래시 시 데이터 손상 방지
- **`init`에서 동기 로딩** — 로컬 파일에서 비동기 초기화는 복잡성만 가중
- **`@Observable` ViewModel과 결합** — 반응형 UI 업데이트 구현

## 피해야 할 안티패턴

- 새 Swift 동시성 코드에서 액터 대신 `DispatchQueue`나 `NSLock` 사용
- 내부 캐시 딕셔너리를 외부 호출자에게 노출
- 유효성 검사 없이 파일 URL을 설정 가능하게 만들기
- 모든 액터 메서드 호출이 `await` 필요임을 잊는 것 — 호출자는 비동기 컨텍스트를 처리해야 함
- `nonisolated`를 사용하여 액터 격리 우회 (목적을 무력화함)

## 언제 사용하나

- iOS/macOS 앱의 로컬 데이터 저장 (사용자 데이터, 설정, 캐시된 콘텐츠)
- 나중에 서버와 동기화하는 오프라인 우선 아키텍처
- 앱의 여러 부분이 동시에 접근하는 공유 가변 상태
- 레거시 `DispatchQueue` 기반 스레드 안전성을 현대적 Swift 동시성으로 교체
