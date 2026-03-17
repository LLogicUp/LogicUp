---
description: Go TDD 워크플로우를 강제합니다. 테이블 기반 테스트를 먼저 작성하고 구현합니다. go test -cover로 80% 이상의 커버리지를 검증합니다.
---

# Go TDD 명령

이 명령은 Go 코드에 대한 관용적 Go 테스트 패턴을 사용하여 테스트 주도 개발 방법론을 강제합니다.

## 이 명령이 하는 일

1. **타입/인터페이스 정의**: 먼저 함수 시그니처 스캐폴드 작성
2. **테이블 기반 테스트 작성**: 포괄적인 테스트 케이스 생성 (RED)
3. **테스트 실행**: 올바른 이유로 테스트가 실패하는지 확인
4. **코드 구현**: 통과하기 위한 최소한의 코드 작성 (GREEN)
5. **리팩토링**: 테스트를 통과하는 상태에서 개선
6. **커버리지 확인**: 80% 이상의 커버리지 확보

## 언제 사용하나요

다음 상황에서 `/go-test`를 사용합니다.

- 새로운 Go 함수를 구현할 때
- 기존 코드에 테스트 커버리지를 추가할 때
- 버그를 수정할 때 (먼저 실패 테스트 작성)
- 핵심 비즈니스 로직을 구축할 때
- Go에서 TDD 워크플로우를 학습할 때

## TDD 사이클

```
RED     → 실패하는 테이블 기반 테스트 작성
GREEN   → 통과하기 위한 최소한의 코드 구현
REFACTOR → 코드 개선, 테스트는 계속 통과
REPEAT  → 다음 테스트 케이스
```

## 예시 세션

````
사용자: /go-test 이메일 주소를 검증하는 함수가 필요합니다

에이전트:
# TDD 세션: 이메일 유효성 검사기

## 1단계: 인터페이스 정의

```go
// validator/email.go
package validator

// ValidateEmail checks if the given string is a valid email address.
// Returns nil if valid, error describing the issue otherwise.
func ValidateEmail(email string) error {
    panic("not implemented")
}
```

## 2단계: 테이블 기반 테스트 작성 (RED)

```go
// validator/email_test.go
package validator

import (
    "testing"
)

func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        // Valid emails
        {"simple email", "user@example.com", false},
        {"with subdomain", "user@mail.example.com", false},
        {"with plus", "user+tag@example.com", false},
        {"with dots", "first.last@example.com", false},

        // Invalid emails
        {"empty string", "", true},
        {"no at sign", "userexample.com", true},
        {"no domain", "user@", true},
        {"no local part", "@example.com", true},
        {"double at", "user@@example.com", true},
        {"spaces", "user @example.com", true},
        {"no tld", "user@example", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if tt.wantErr && err == nil {
                t.Errorf("ValidateEmail(%q) = nil; want error", tt.email)
            }
            if !tt.wantErr && err != nil {
                t.Errorf("ValidateEmail(%q) = %v; want nil", tt.email, err)
            }
        })
    }
}
```

## 3단계: 테스트 실행 - FAIL 확인

```bash
$ go test ./validator/...

--- FAIL: TestValidateEmail (0.00s)
    --- FAIL: TestValidateEmail/simple_email (0.00s)
        panic: not implemented

FAIL
```

테스트가 예상대로 실패합니다 (패닉).

## 4단계: 최소 코드 구현 (GREEN)

```go
// validator/email.go
package validator

import (
    "errors"
    "regexp"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

var (
    ErrEmailEmpty   = errors.New("email cannot be empty")
    ErrEmailInvalid = errors.New("email format is invalid")
)

func ValidateEmail(email string) error {
    if email == "" {
        return ErrEmailEmpty
    }
    if !emailRegex.MatchString(email) {
        return ErrEmailInvalid
    }
    return nil
}
```

## 5단계: 테스트 실행 - PASS 확인

```bash
$ go test ./validator/...

PASS
ok      project/validator    0.003s
```

모든 테스트 통과!

## 6단계: 커버리지 확인

```bash
$ go test -cover ./validator/...

PASS
coverage: 100.0% of statements
ok      project/validator    0.003s
```

커버리지: 100%

## TDD 완료!
````

## 테스트 패턴

### 테이블 기반 테스트
```go
tests := []struct {
    name     string
    input    InputType
    want     OutputType
    wantErr  bool
}{
    {"case 1", input1, want1, false},
    {"case 2", input2, want2, true},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got, err := Function(tt.input)
        // assertions
    })
}
```

### 병렬 테스트
```go
for _, tt := range tests {
    tt := tt // Capture
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // test body
    })
}
```

### 테스트 헬퍼
```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    db := createDB()
    t.Cleanup(func() { db.Close() })
    return db
}
```

## 커버리지 명령

```bash
# 기본 커버리지
go test -cover ./...

# 커버리지 프로파일
go test -coverprofile=coverage.out ./...

# 브라우저에서 보기
go tool cover -html=coverage.out

# 함수별 커버리지
go tool cover -func=coverage.out

# 경쟁 조건 감지 포함
go test -race -cover ./...
```

## 커버리지 목표

| 코드 유형 | 목표 |
|----------|------|
| 핵심 비즈니스 로직 | 100% |
| 공개 API | 90% 이상 |
| 일반 코드 | 80% 이상 |
| 자동 생성 코드 | 제외 |

## TDD 모범 사례

**해야 할 것:**
- 구현보다 먼저 테스트 작성
- 변경 후마다 테스트 실행
- 포괄적인 커버리지를 위해 테이블 기반 테스트 사용
- 구현 세부 사항이 아닌 동작 테스트
- 엣지 케이스 포함 (빈 값, nil, 최대값)

**하지 말아야 할 것:**
- 테스트보다 구현을 먼저 작성
- RED 단계 건너뜀
- private 함수를 직접 테스트
- 테스트에서 `time.Sleep` 사용
- 불안정한 테스트 무시

## 관련 명령

- `/go-build` - 빌드 오류 수정
- `/go-review` - 구현 후 코드 검토
- `/verify` - 전체 검증 루프 실행

## 관련 파일

- Skill: `skills/golang-testing/`
- Skill: `skills/tdd-workflow/`
