---
name: swiftui-patterns
description: SwiftUI 아키텍처 패턴, @Observable을 활용한 상태 관리, 뷰 컴포지션, 내비게이션, 성능 최적화, 그리고 현대적인 iOS/macOS UI 모범 사례.
---

# SwiftUI 패턴

Apple 플랫폼에서 선언적이고 성능 좋은 사용자 인터페이스를 구축하기 위한 현대적인 SwiftUI 패턴. Observation 프레임워크, 뷰 컴포지션, 타입 안전 내비게이션, 성능 최적화를 다룬다.

## 언제 사용하나

- SwiftUI 뷰 구축 및 상태 관리 (`@State`, `@Observable`, `@Binding`)
- `NavigationStack`으로 내비게이션 흐름 설계
- 뷰 모델 및 데이터 흐름 구조화
- 목록 및 복잡한 레이아웃의 렌더링 성능 최적화
- SwiftUI에서 환경 값 및 의존성 주입 활용

## 상태 관리

### 프로퍼티 래퍼 선택

가장 단순한 래퍼를 선택:

| 래퍼 | 사용 사례 |
|---------|----------|
| `@State` | 뷰 로컬 값 타입 (토글, 폼 필드, 시트 표시) |
| `@Binding` | 부모의 `@State`에 대한 양방향 참조 |
| `@Observable` 클래스 + `@State` | 여러 속성을 가진 소유 모델 |
| `@Observable` 클래스 (래퍼 없음) | 부모에서 전달된 읽기 전용 참조 |
| `@Bindable` | `@Observable` 속성에 대한 양방향 바인딩 |
| `@Environment` | `.environment()`를 통해 주입된 공유 의존성 |

### @Observable ViewModel

`ObservableObject` 대신 `@Observable` 사용 — 속성 수준의 변경을 추적하여 SwiftUI가 변경된 속성을 읽는 뷰만 재렌더링:

```swift
@Observable
final class ItemListViewModel {
    private(set) var items: [Item] = []
    private(set) var isLoading = false
    var searchText = ""

    private let repository: any ItemRepository

    init(repository: any ItemRepository = DefaultItemRepository()) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        items = (try? await repository.fetchAll()) ?? []
    }
}
```

### ViewModel을 사용하는 뷰

```swift
struct ItemListView: View {
    @State private var viewModel: ItemListViewModel

    init(viewModel: ItemListViewModel = ItemListViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
        }
        .searchable(text: $viewModel.searchText)
        .overlay { if viewModel.isLoading { ProgressView() } }
        .task { await viewModel.load() }
    }
}
```

### 환경 주입

`@EnvironmentObject`를 `@Environment`로 교체:

```swift
// 주입
ContentView()
    .environment(authManager)

// 사용
struct ProfileView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        Text(auth.currentUser?.name ?? "게스트")
    }
}
```

## 뷰 컴포지션

### 무효화 범위를 제한하는 서브뷰 추출

뷰를 작고 집중된 구조체로 분리. 상태가 변경될 때 해당 상태를 읽는 서브뷰만 재렌더링됨:

```swift
struct OrderView: View {
    @State private var viewModel = OrderViewModel()

    var body: some View {
        VStack {
            OrderHeader(title: viewModel.title)
            OrderItemList(items: viewModel.items)
            OrderTotal(total: viewModel.total)
        }
    }
}
```

### 재사용 가능한 스타일링을 위한 ViewModifier

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}
```

## 내비게이션

### 타입 안전 NavigationStack

프로그래매틱하고 타입 안전한 라우팅을 위해 `NavigationPath`와 함께 `NavigationStack` 사용:

```swift
@Observable
final class Router {
    var path = NavigationPath()

    func navigate(to destination: Destination) {
        path.append(destination)
    }

    func popToRoot() {
        path = NavigationPath()
    }
}

enum Destination: Hashable {
    case detail(Item.ID)
    case settings
    case profile(User.ID)
}

struct RootView: View {
    @State private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Destination.self) { dest in
                    switch dest {
                    case .detail(let id): ItemDetailView(itemID: id)
                    case .settings: SettingsView()
                    case .profile(let id): ProfileView(userID: id)
                    }
                }
        }
        .environment(router)
    }
}
```

## 성능

### 큰 컬렉션에 지연 컨테이너 사용

`LazyVStack`과 `LazyHStack`은 보이는 뷰만 생성:

```swift
ScrollView {
    LazyVStack(spacing: 8) {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}
```

### 안정적인 식별자

`ForEach`에서 항상 안정적이고 고유한 ID 사용 — 배열 인덱스 사용 금지:

```swift
// Identifiable 준수 또는 명시적 id 사용
ForEach(items, id: \.stableID) { item in
    ItemRow(item: item)
}
```

### body에서 비용이 많이 드는 작업 피하기

- `body` 내에서 절대 I/O, 네트워크 호출, 또는 무거운 연산 수행 금지
- 비동기 작업에 `.task {}` 사용 — 뷰가 사라지면 자동으로 취소됨
- 스크롤 뷰에서 `.sensoryFeedback()`과 `.geometryGroup()` 절약하여 사용
- 목록에서 `.shadow()`, `.blur()`, `.mask()` 최소화 — 오프스크린 렌더링 유발

### Equatable 준수

비용이 많이 드는 body를 가진 뷰는 불필요한 재렌더링을 건너뛰기 위해 `Equatable` 준수:

```swift
struct ExpensiveChartView: View, Equatable {
    let dataPoints: [DataPoint] // DataPoint는 Equatable 준수 필요

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.dataPoints == rhs.dataPoints
    }

    var body: some View {
        // 복잡한 차트 렌더링
    }
}
```

## 미리보기

빠른 반복을 위해 인라인 모킹 데이터와 함께 `#Preview` 매크로 사용:

```swift
#Preview("빈 상태") {
    ItemListView(viewModel: ItemListViewModel(repository: EmptyMockRepository()))
}

#Preview("로드됨") {
    ItemListView(viewModel: ItemListViewModel(repository: PopulatedMockRepository()))
}
```

## 피해야 할 안티패턴

- 새 코드에서 `ObservableObject` / `@Published` / `@StateObject` / `@EnvironmentObject` 사용 — `@Observable`로 마이그레이션
- `body`나 `init`에서 직접 비동기 작업 수행 — `.task {}`나 명시적 로드 메서드 사용
- 데이터를 소유하지 않는 자식 뷰에서 뷰 모델을 `@State`로 생성 — 부모에서 전달
- `AnyView` 타입 지우기 사용 — 조건부 뷰에는 `@ViewBuilder`나 `Group` 선호
- 액터와 데이터를 주고받을 때 `Sendable` 요구사항 무시

## 참고 항목

액터 기반 영속성 패턴은 스킬: `swift-actor-persistence` 참조.
프로토콜 기반 DI 및 Swift Testing 테스트는 스킬: `swift-protocol-di-testing` 참조.
