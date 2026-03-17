---
name: golang-patterns
description: Go 언어의 관용적 패턴, 모범 사례, 견고하고 효율적이며 유지보수 가능한 Go 애플리케이션 구축을 위한 컨벤션.
origin: ECC
---

# Go 개발 패턴

견고하고 효율적이며 유지보수 가능한 애플리케이션을 만들기 위한 Go 관용적 패턴과 모범 사례.

## 활성화 시점

- 새 Go 코드 작성 시
- Go 코드 리뷰 시
- 기존 Go 코드 리팩토링 시
- Go 패키지/모듈 설계 시

## 핵심 원칙

### 1. 단순성과 명확성

Go는 영리함보다 단순함을 선호합니다. 코드는 명백하고 읽기 쉬워야 합니다.

```go
// 좋음: 명확하고 직접적
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// 나쁨: 지나치게 영리함
func GetUser(id string) (*User, error) {
    return func() (*User, error) {
        if u, e := db.FindUser(id); e == nil {
            return u, nil
        } else {
            return nil, e
        }
    }()
}
```

### 2. 제로 값을 유용하게 만들기

초기화 없이 즉시 사용 가능하도록 타입의 제로 값을 설계합니다.

```go
// 좋음: 제로 값이 유용함
type Counter struct {
    mu    sync.Mutex
    count int // 제로 값은 0, 바로 사용 가능
}

func (c *Counter) Inc() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// 좋음: bytes.Buffer는 제로 값으로 동작
var buf bytes.Buffer
buf.WriteString("hello")

// 나쁨: 초기화 필요
type BadCounter struct {
    counts map[string]int // nil 맵은 패닉 발생
}
```

### 3. 인터페이스를 받고 구조체를 반환

함수는 인터페이스 파라미터를 받고 구체적인 타입을 반환해야 합니다.

```go
// 좋음: 인터페이스를 받고 구체 타입을 반환
func ProcessData(r io.Reader) (*Result, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    return &Result{Data: data}, nil
}

// 나쁨: 인터페이스 반환 (구현 세부 사항을 불필요하게 숨김)
func ProcessData(r io.Reader) (io.Reader, error) {
    // ...
}
```

## 에러 처리 패턴

### 컨텍스트와 함께 에러 래핑

```go
// 좋음: 컨텍스트와 함께 에러 래핑
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }

    return &cfg, nil
}
```

### 커스텀 에러 타입

```go
// 도메인 특화 에러 정의
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// 일반적인 케이스를 위한 센티넬 에러
var (
    ErrNotFound     = errors.New("resource not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
```

### errors.Is와 errors.As를 이용한 에러 확인

```go
func HandleError(err error) {
    // 특정 에러 확인
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No records found")
        return
    }

    // 에러 타입 확인
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("Validation error on field %s: %s",
            validationErr.Field, validationErr.Message)
        return
    }

    // 알 수 없는 에러
    log.Printf("Unexpected error: %v", err)
}
```

### 에러를 절대 무시하지 않기

```go
// 나쁨: 빈 식별자로 에러 무시
result, _ := doSomething()

// 좋음: 처리하거나 무시해도 안전한 이유를 명시적으로 문서화
result, err := doSomething()
if err != nil {
    return err
}

// 허용 가능: 에러가 진짜 중요하지 않을 때 (드문 경우)
_ = writer.Close() // 최선의 정리 작업, 에러는 다른 곳에서 로깅됨
```

## 동시성 패턴

### 워커 풀

```go
func WorkerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }

    wg.Wait()
    close(results)
}
```

### 취소 및 타임아웃을 위한 Context

```go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### 우아한 종료

```go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit
    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited")
}
```

### 고루틴 조율을 위한 errgroup

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // 루프 변수 캡처
        g.Go(func() error {
            data, err := FetchWithTimeout(ctx, url)
            if err != nil {
                return err
            }
            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### 고루틴 누수 방지

```go
// 나쁨: context 취소 시 고루틴 누수
func leakyFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data // 수신자가 없으면 영원히 블록
    }()
    return ch
}

// 좋음: 취소를 올바르게 처리
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1) // 버퍼 채널
    go func() {
        data, err := fetch(url)
        if err != nil {
            return
        }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

## 인터페이스 설계

### 작고 집중된 인터페이스

```go
// 좋음: 단일 메서드 인터페이스
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// 필요에 따라 인터페이스 조합
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

### 사용하는 곳에서 인터페이스 정의

```go
// 제공자 패키지가 아닌 소비자 패키지에서
package service

// UserStore는 이 서비스가 필요한 것을 정의
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct {
    store UserStore
}

// 구체적인 구현은 다른 패키지에 있을 수 있음
// 이 인터페이스를 알 필요가 없음
```

### 타입 어설션을 통한 선택적 동작

```go
type Flusher interface {
    Flush() error
}

func WriteAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }

    // 지원하는 경우 Flush
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## 패키지 구조

### 표준 프로젝트 레이아웃

```text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # 진입점
├── internal/
│   ├── handler/              # HTTP 핸들러
│   ├── service/              # 비즈니스 로직
│   ├── repository/           # 데이터 접근
│   └── config/               # 설정
├── pkg/
│   └── client/               # 공개 API 클라이언트
├── api/
│   └── v1/                   # API 정의 (proto, OpenAPI)
├── testdata/                 # 테스트 픽스처
├── go.mod
├── go.sum
└── Makefile
```

### 패키지 명명

```go
// 좋음: 짧고, 소문자, 밑줄 없음
package http
package json
package user

// 나쁨: 장황하거나, 혼합 대소문자이거나, 중복
package httpHandler
package json_parser
package userService // 'Service' 접미사 중복
```

### 패키지 수준 상태 피하기

```go
// 나쁨: 전역 가변 상태
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

// 좋음: 의존성 주입
type Server struct {
    db *sql.DB
}

func NewServer(db *sql.DB) *Server {
    return &Server{db: db}
}
```

## 구조체 설계

### 함수형 옵션 패턴

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *log.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *log.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        timeout: 30 * time.Second, // 기본값
        logger:  log.Default(),    // 기본값
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// 사용법
server := NewServer(":8080",
    WithTimeout(60*time.Second),
    WithLogger(customLogger),
)
```

### 구성을 위한 임베딩

```go
type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

type Server struct {
    *Logger // 임베딩 - Server가 Log 메서드를 가짐
    addr    string
}

func NewServer(addr string) *Server {
    return &Server{
        Logger: &Logger{prefix: "SERVER"},
        addr:   addr,
    }
}

// 사용법
s := NewServer(":8080")
s.Log("Starting...") // 임베딩된 Logger.Log 호출
```

## 메모리와 성능

### 크기를 알 때 슬라이스 사전 할당

```go
// 나쁨: 슬라이스가 여러 번 늘어남
func processItems(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}

// 좋음: 단일 할당
func processItems(items []Item) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}
```

### 빈번한 할당에 sync.Pool 사용

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    buf.Write(data)
    // 처리...
    return buf.Bytes()
}
```

### 루프에서 문자열 연결 피하기

```go
// 나쁨: 많은 문자열 할당 생성
func join(parts []string) string {
    var result string
    for _, p := range parts {
        result += p + ","
    }
    return result
}

// 좋음: strings.Builder로 단일 할당
func join(parts []string) string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// 최선: 표준 라이브러리 사용
func join(parts []string) string {
    return strings.Join(parts, ",")
}
```

## Go 툴링 통합

### 필수 명령어

```bash
# 빌드 및 실행
go build ./...
go run ./cmd/myapp

# 테스트
go test ./...
go test -race ./...
go test -cover ./...

# 정적 분석
go vet ./...
staticcheck ./...
golangci-lint run

# 모듈 관리
go mod tidy
go mod verify

# 포맷팅
gofmt -w .
goimports -w .
```

### 권장 린터 설정 (.golangci.yml)

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true

issues:
  exclude-use-default: false
```

## 빠른 참조: Go 관용구

| 관용구 | 설명 |
|-------|-------------|
| 인터페이스를 받고 구조체를 반환 | 함수는 인터페이스 파라미터를 받고 구체 타입을 반환 |
| 에러는 값이다 | 에러를 예외가 아닌 일급 값으로 처리 |
| 메모리 공유로 통신하지 말기 | 고루틴 간 조율에 채널 사용 |
| 제로 값을 유용하게 | 타입은 명시적 초기화 없이 동작해야 함 |
| 약간의 복사가 약간의 의존성보다 낫다 | 불필요한 외부 의존성 피하기 |
| 영리함보다 명확함이 낫다 | 영리함보다 가독성 우선 |
| gofmt는 아무도 좋아하지 않지만 모두의 친구 | 항상 gofmt/goimports로 포맷팅 |
| 이른 반환 | 에러를 먼저 처리하고, 정상 경로는 들여쓰기 없이 유지 |

## 피해야 할 안티패턴

```go
// 나쁨: 긴 함수에서 naked return
func process() (result int, err error) {
    // ... 50줄 ...
    return // 무엇이 반환되나?
}

// 나쁨: 흐름 제어에 panic 사용
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil {
        panic(err) // 하지 말 것
    }
    return user
}

// 나쁨: 구조체에 context 전달
type Request struct {
    ctx context.Context // Context는 첫 번째 파라미터여야 함
    ID  string
}

// 좋음: Context를 첫 번째 파라미터로
func ProcessRequest(ctx context.Context, id string) error {
    // ...
}

// 나쁨: 값 리시버와 포인터 리시버 혼용
type Counter struct{ n int }
func (c Counter) Value() int { return c.n }    // 값 리시버
func (c *Counter) Increment() { c.n++ }        // 포인터 리시버
// 하나의 스타일을 선택하고 일관되게 유지
```

**기억하세요**: Go 코드는 최선의 의미에서 지루해야 합니다 - 예측 가능하고 일관되며 이해하기 쉬워야 합니다. 의심스러울 때는 단순하게 유지하세요.
