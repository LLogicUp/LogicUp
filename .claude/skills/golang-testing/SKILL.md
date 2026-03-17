---
name: golang-testing
description: 테이블 주도 테스트, 서브테스트, 벤치마크, 퍼징, 테스트 커버리지를 포함한 Go 테스트 패턴. Go 관용적 방식으로 TDD 방법론을 따릅니다.
origin: ECC
---

# Go 테스트 패턴

TDD 방법론을 따르는 신뢰할 수 있고 유지보수 가능한 테스트 작성을 위한 포괄적인 Go 테스트 패턴.

## 활성화 시점

- 새 Go 함수나 메서드 작성 시
- 기존 코드에 테스트 커버리지 추가 시
- 성능에 중요한 코드의 벤치마크 생성 시
- 입력 유효성 검사를 위한 퍼즈 테스트 구현 시
- Go 프로젝트에서 TDD 워크플로우를 따를 때

## Go를 위한 TDD 워크플로우

### RED-GREEN-REFACTOR 사이클

```
RED     → 먼저 실패하는 테스트 작성
GREEN   → 테스트를 통과하는 최소한의 코드 작성
REFACTOR → 테스트를 통과한 상태로 코드 개선
REPEAT  → 다음 요구사항으로 계속
```

### Go에서의 단계별 TDD

```go
// 1단계: 인터페이스/시그니처 정의
// calculator.go
package calculator

func Add(a, b int) int {
    panic("not implemented") // 플레이스홀더
}

// 2단계: 실패하는 테스트 작성 (RED)
// calculator_test.go
package calculator

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d; want %d", got, want)
    }
}

// 3단계: 테스트 실행 - 실패 확인
// $ go test
// --- FAIL: TestAdd (0.00s)
// panic: not implemented

// 4단계: 최소한의 코드 구현 (GREEN)
func Add(a, b int) int {
    return a + b
}

// 5단계: 테스트 실행 - 통과 확인
// $ go test
// PASS

// 6단계: 필요시 리팩토링, 테스트가 여전히 통과하는지 확인
```

## 테이블 주도 테스트

Go 테스트의 표준 패턴. 최소한의 코드로 포괄적인 커버리지를 가능하게 합니다.

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"양수", 2, 3, 5},
        {"음수", -1, -2, -3},
        {"제로 값", 0, 0, 0},
        {"혼합 부호", -1, 1, 0},
        {"큰 수", 1000000, 2000000, 3000000},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

### 에러 케이스가 있는 테이블 주도 테스트

```go
func TestParseConfig(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Config
        wantErr bool
    }{
        {
            name:  "유효한 설정",
            input: `{"host": "localhost", "port": 8080}`,
            want:  &Config{Host: "localhost", Port: 8080},
        },
        {
            name:    "유효하지 않은 JSON",
            input:   `{invalid}`,
            wantErr: true,
        },
        {
            name:    "빈 입력",
            input:   "",
            wantErr: true,
        },
        {
            name:  "최소 설정",
            input: `{}`,
            want:  &Config{}, // 제로 값 설정
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig(tt.input)

            if tt.wantErr {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }

            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }

            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %+v; want %+v", got, tt.want)
            }
        })
    }
}
```

## 서브테스트와 서브벤치마크

### 관련 테스트 구성

```go
func TestUser(t *testing.T) {
    // 모든 서브테스트가 공유하는 설정
    db := setupTestDB(t)

    t.Run("Create", func(t *testing.T) {
        user := &User{Name: "Alice"}
        err := db.CreateUser(user)
        if err != nil {
            t.Fatalf("CreateUser failed: %v", err)
        }
        if user.ID == "" {
            t.Error("expected user ID to be set")
        }
    })

    t.Run("Get", func(t *testing.T) {
        user, err := db.GetUser("alice-id")
        if err != nil {
            t.Fatalf("GetUser failed: %v", err)
        }
        if user.Name != "Alice" {
            t.Errorf("got name %q; want %q", user.Name, "Alice")
        }
    })

    t.Run("Update", func(t *testing.T) {
        // ...
    })

    t.Run("Delete", func(t *testing.T) {
        // ...
    })
}
```

### 병렬 서브테스트

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name  string
        input string
    }{
        {"case1", "input1"},
        {"case2", "input2"},
        {"case3", "input3"},
    }

    for _, tt := range tests {
        tt := tt // 범위 변수 캡처
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 서브테스트를 병렬로 실행
            result := Process(tt.input)
            // 어설션...
            _ = result
        })
    }
}
```

## 테스트 헬퍼

### 헬퍼 함수

```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper() // 헬퍼 함수로 표시

    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }

    // 테스트 완료 시 정리
    t.Cleanup(func() {
        db.Close()
    })

    // 마이그레이션 실행
    if _, err := db.Exec(schema); err != nil {
        t.Fatalf("failed to create schema: %v", err)
    }

    return db
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v; want %v", got, want)
    }
}
```

### 임시 파일과 디렉토리

```go
func TestFileProcessing(t *testing.T) {
    // 임시 디렉토리 생성 - 자동으로 정리됨
    tmpDir := t.TempDir()

    // 테스트 파일 생성
    testFile := filepath.Join(tmpDir, "test.txt")
    err := os.WriteFile(testFile, []byte("test content"), 0644)
    if err != nil {
        t.Fatalf("failed to create test file: %v", err)
    }

    // 테스트 실행
    result, err := ProcessFile(testFile)
    if err != nil {
        t.Fatalf("ProcessFile failed: %v", err)
    }

    // 어설션...
    _ = result
}
```

## 골든 파일

`testdata/`에 저장된 예상 출력 파일과 비교하는 테스트.

```go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    tests := []struct {
        name  string
        input Template
    }{
        {"simple", Template{Name: "test"}},
        {"complex", Template{Name: "test", Items: []string{"a", "b"}}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Render(tt.input)

            golden := filepath.Join("testdata", tt.name+".golden")

            if *update {
                // 골든 파일 업데이트: go test -update
                err := os.WriteFile(golden, got, 0644)
                if err != nil {
                    t.Fatalf("failed to update golden file: %v", err)
                }
            }

            want, err := os.ReadFile(golden)
            if err != nil {
                t.Fatalf("failed to read golden file: %v", err)
            }

            if !bytes.Equal(got, want) {
                t.Errorf("output mismatch:\ngot:\n%s\nwant:\n%s", got, want)
            }
        })
    }
}
```

## 인터페이스를 이용한 목킹

### 인터페이스 기반 목킹

```go
// 의존성을 위한 인터페이스 정의
type UserRepository interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

// 실제 구현
type PostgresUserRepository struct {
    db *sql.DB
}

func (r *PostgresUserRepository) GetUser(id string) (*User, error) {
    // 실제 데이터베이스 쿼리
}

// 테스트를 위한 목 구현
type MockUserRepository struct {
    GetUserFunc  func(id string) (*User, error)
    SaveUserFunc func(user *User) error
}

func (m *MockUserRepository) GetUser(id string) (*User, error) {
    return m.GetUserFunc(id)
}

func (m *MockUserRepository) SaveUser(user *User) error {
    return m.SaveUserFunc(user)
}

// 목을 사용한 테스트
func TestUserService(t *testing.T) {
    mock := &MockUserRepository{
        GetUserFunc: func(id string) (*User, error) {
            if id == "123" {
                return &User{ID: "123", Name: "Alice"}, nil
            }
            return nil, ErrNotFound
        },
    }

    service := NewUserService(mock)

    user, err := service.GetUserProfile("123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got name %q; want %q", user.Name, "Alice")
    }
}
```

## 벤치마크

### 기본 벤치마크

```go
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    b.ResetTimer() // 설정 시간 제외

    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// 실행: go test -bench=BenchmarkProcess -benchmem
// 출력: BenchmarkProcess-8   10000   105234 ns/op   4096 B/op   10 allocs/op
```

### 다양한 크기의 벤치마크

```go
func BenchmarkSort(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            data := generateRandomSlice(size)
            b.ResetTimer()

            for i := 0; i < b.N; i++ {
                // 이미 정렬된 데이터를 정렬하지 않도록 복사본 생성
                tmp := make([]int, len(data))
                copy(tmp, data)
                sort.Ints(tmp)
            }
        })
    }
}
```

### 메모리 할당 벤치마크

```go
func BenchmarkStringConcat(b *testing.B) {
    parts := []string{"hello", "world", "foo", "bar", "baz"}

    b.Run("plus", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var s string
            for _, p := range parts {
                s += p
            }
            _ = s
        }
    })

    b.Run("builder", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for _, p := range parts {
                sb.WriteString(p)
            }
            _ = sb.String()
        }
    })

    b.Run("join", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = strings.Join(parts, "")
        }
    })
}
```

## 퍼징 (Go 1.18+)

### 기본 퍼즈 테스트

```go
func FuzzParseJSON(f *testing.F) {
    // 시드 코퍼스 추가
    f.Add(`{"name": "test"}`)
    f.Add(`{"count": 123}`)
    f.Add(`[]`)
    f.Add(`""`)

    f.Fuzz(func(t *testing.T, input string) {
        var result map[string]interface{}
        err := json.Unmarshal([]byte(input), &result)

        if err != nil {
            // 랜덤 입력에 대한 유효하지 않은 JSON은 예상된 결과
            return
        }

        // 파싱이 성공하면 다시 인코딩도 동작해야 함
        _, err = json.Marshal(result)
        if err != nil {
            t.Errorf("Marshal failed after successful Unmarshal: %v", err)
        }
    })
}

// 실행: go test -fuzz=FuzzParseJSON -fuzztime=30s
```

### 여러 입력이 있는 퍼즈 테스트

```go
func FuzzCompare(f *testing.F) {
    f.Add("hello", "world")
    f.Add("", "")
    f.Add("abc", "abc")

    f.Fuzz(func(t *testing.T, a, b string) {
        result := Compare(a, b)

        // 속성: Compare(a, a)는 항상 0을 반환해야 함
        if a == b && result != 0 {
            t.Errorf("Compare(%q, %q) = %d; want 0", a, b, result)
        }

        // 속성: Compare(a, b)와 Compare(b, a)는 반대 부호를 가져야 함
        reverse := Compare(b, a)
        if (result > 0 && reverse >= 0) || (result < 0 && reverse <= 0) {
            if result != 0 || reverse != 0 {
                t.Errorf("Compare(%q, %q) = %d, Compare(%q, %q) = %d; inconsistent",
                    a, b, result, b, a, reverse)
            }
        }
    })
}
```

## 테스트 커버리지

### 커버리지 실행

```bash
# 기본 커버리지
go test -cover ./...

# 커버리지 프로파일 생성
go test -coverprofile=coverage.out ./...

# 브라우저에서 커버리지 보기
go tool cover -html=coverage.out

# 함수별 커버리지 보기
go tool cover -func=coverage.out

# 레이스 감지와 함께 커버리지
go test -race -coverprofile=coverage.out ./...
```

### 커버리지 목표

| 코드 유형 | 목표 |
|-----------|--------|
| 중요한 비즈니스 로직 | 100% |
| 공개 API | 90%+ |
| 일반 코드 | 80%+ |
| 생성된 코드 | 제외 |

### 생성된 코드를 커버리지에서 제외

```go
//go:generate mockgen -source=interface.go -destination=mock_interface.go

// 커버리지 프로파일에서, 빌드 태그로 제외:
// go test -cover -tags=!generate ./...
```

## HTTP 핸들러 테스트

```go
func TestHealthHandler(t *testing.T) {
    // 요청 생성
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    w := httptest.NewRecorder()

    // 핸들러 호출
    HealthHandler(w, req)

    // 응답 확인
    resp := w.Result()
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("got status %d; want %d", resp.StatusCode, http.StatusOK)
    }

    body, _ := io.ReadAll(resp.Body)
    if string(body) != "OK" {
        t.Errorf("got body %q; want %q", body, "OK")
    }
}

func TestAPIHandler(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        path       string
        body       string
        wantStatus int
        wantBody   string
    }{
        {
            name:       "사용자 조회",
            method:     http.MethodGet,
            path:       "/users/123",
            wantStatus: http.StatusOK,
            wantBody:   `{"id":"123","name":"Alice"}`,
        },
        {
            name:       "찾을 수 없음",
            method:     http.MethodGet,
            path:       "/users/999",
            wantStatus: http.StatusNotFound,
        },
        {
            name:       "사용자 생성",
            method:     http.MethodPost,
            path:       "/users",
            body:       `{"name":"Bob"}`,
            wantStatus: http.StatusCreated,
        },
    }

    handler := NewAPIHandler()

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var body io.Reader
            if tt.body != "" {
                body = strings.NewReader(tt.body)
            }

            req := httptest.NewRequest(tt.method, tt.path, body)
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()

            handler.ServeHTTP(w, req)

            if w.Code != tt.wantStatus {
                t.Errorf("got status %d; want %d", w.Code, tt.wantStatus)
            }

            if tt.wantBody != "" && w.Body.String() != tt.wantBody {
                t.Errorf("got body %q; want %q", w.Body.String(), tt.wantBody)
            }
        })
    }
}
```

## 테스트 명령어

```bash
# 모든 테스트 실행
go test ./...

# 상세 출력으로 테스트 실행
go test -v ./...

# 특정 테스트 실행
go test -run TestAdd ./...

# 패턴에 맞는 테스트 실행
go test -run "TestUser/Create" ./...

# 레이스 감지기로 테스트 실행
go test -race ./...

# 커버리지로 테스트 실행
go test -cover -coverprofile=coverage.out ./...

# 짧은 테스트만 실행
go test -short ./...

# 타임아웃으로 테스트 실행
go test -timeout 30s ./...

# 벤치마크 실행
go test -bench=. -benchmem ./...

# 퍼징 실행
go test -fuzz=FuzzParse -fuzztime=30s ./...

# 테스트 반복 실행 (불안정한 테스트 감지용)
go test -count=10 ./...
```

## 모범 사례

**해야 할 것:**
- 테스트를 먼저 작성 (TDD)
- 포괄적인 커버리지를 위해 테이블 주도 테스트 사용
- 구현이 아닌 동작을 테스트
- 헬퍼 함수에 `t.Helper()` 사용
- 독립적인 테스트에 `t.Parallel()` 사용
- `t.Cleanup()`으로 리소스 정리
- 시나리오를 설명하는 의미 있는 테스트 이름 사용

**하지 말아야 할 것:**
- private 함수를 직접 테스트 (공개 API를 통해 테스트)
- 테스트에서 `time.Sleep()` 사용 (채널이나 조건 사용)
- 불안정한 테스트 무시 (수정하거나 제거)
- 모든 것을 목으로 처리 (가능하면 통합 테스트 선호)
- 에러 경로 테스트 생략

## CI/CD 통합

```yaml
# GitHub Actions 예시
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: '1.22'

    - name: Run tests
      run: go test -race -coverprofile=coverage.out ./...

    - name: Check coverage
      run: |
        go tool cover -func=coverage.out | grep total | awk '{print $3}' | \
        awk -F'%' '{if ($1 < 80) exit 1}'
```

**기억하세요**: 테스트는 문서입니다. 코드가 어떻게 사용되어야 하는지 보여줍니다. 명확하게 작성하고 최신 상태로 유지하세요.
