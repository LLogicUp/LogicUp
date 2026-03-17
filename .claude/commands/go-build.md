---
description: Go 빌드 오류, go vet 경고, 린터 문제를 단계적으로 수정합니다. 최소한의 정밀한 수정을 위해 go-build-resolver 에이전트를 호출합니다.
---

# Go 빌드 및 수정

이 명령은 **go-build-resolver** 에이전트를 호출하여 Go 빌드 오류를 최소한의 변경으로 단계적으로 수정합니다.

## 이 명령이 하는 일

1. **진단 실행**: `go build`, `go vet`, `staticcheck` 실행
2. **오류 파싱**: 파일별로 그룹화하고 심각도 순으로 정렬
3. **단계적 수정**: 오류 하나씩 처리
4. **각 수정 검증**: 변경 후 빌드 재실행
5. **결과 요약**: 수정된 사항과 남은 사항 보고

## 언제 사용하나요

다음 상황에서 `/go-build`를 사용합니다.

- `go build ./...`가 오류로 실패할 때
- `go vet ./...`이 문제를 보고할 때
- `golangci-lint run`이 경고를 표시할 때
- 모듈 의존성이 깨졌을 때
- 변경 사항을 가져온 후 빌드가 실패할 때

## 실행되는 진단 명령

```bash
# 기본 빌드 확인
go build ./...

# 정적 분석
go vet ./...

# 확장 린팅 (설치된 경우)
staticcheck ./...
golangci-lint run

# 모듈 문제
go mod verify
go mod tidy -v
```

## 예시 세션

```text
사용자: /go-build

에이전트:
# Go 빌드 해결

## 초기 진단

```bash
$ go build ./...
internal/service/user.go:25:15: undefined: UserRepository
internal/handler/api.go:42:9: cannot use x (type string) as type int
internal/handler/api.go:58:2: missing return at end of function
```

발견된 오류: 3개

## 수정 1: 정의되지 않은 식별자

파일: internal/service/user.go:25
오류: undefined: UserRepository
원인: import 누락

```go
// Added import
import "project/internal/repository"

// Changed
var repo UserRepository
// To
var repo repository.UserRepository
```

```bash
$ go build ./...
# 2 errors remaining
```

## 수정 2: 타입 불일치

파일: internal/handler/api.go:42
오류: cannot use x (type string) as type int

```go
// Changed
count := params.Get("count")
// To
countStr := params.Get("count")
count, _ := strconv.Atoi(countStr)
```

```bash
$ go build ./...
# 1 error remaining
```

## 수정 3: return 누락

파일: internal/handler/api.go:58
오류: missing return at end of function

```go
func GetUser(id string) (*User, error) {
    if id == "" {
        return nil, ErrInvalidID
    }
    user := findUser(id)
    // Added missing return
    return user, nil
}
```

```bash
$ go build ./...
# Build successful!
```

## 최종 검증

```bash
$ go vet ./...
# No issues

$ go test ./...
ok      project/internal/service   0.015s
ok      project/internal/handler   0.023s
```

## 요약

| 지표 | 수 |
|------|------|
| 수정된 빌드 오류 | 3 |
| 수정된 vet 경고 | 0 |
| 수정된 파일 | 2 |
| 남은 문제 | 0 |

빌드 상태: 성공
```

## 자주 발생하는 오류와 수정

| 오류 | 일반적인 수정 |
|------|---------------|
| `undefined: X` | import 추가 또는 오타 수정 |
| `cannot use X as Y` | 타입 변환 또는 할당 수정 |
| `missing return` | return 구문 추가 |
| `X does not implement Y` | 누락된 메서드 추가 |
| `import cycle` | 패키지 구조 재편 |
| `declared but not used` | 변수 제거 또는 사용 |
| `cannot find package` | `go get` 또는 `go mod tidy` |

## 수정 전략

1. **빌드 오류 먼저** - 코드가 컴파일되어야 함
2. **vet 경고 두 번째** - 의심스러운 구문 수정
3. **린트 경고 세 번째** - 스타일 및 모범 사례
4. **한 번에 하나씩 수정** - 각 변경 후 검증
5. **최소한의 변경** - 리팩토링이 아닌 수정에 집중

## 중단 조건

다음 상황에서 에이전트는 중단하고 보고합니다.

- 3번 시도 후에도 동일한 오류 지속
- 수정으로 더 많은 오류 발생
- 아키텍처 변경이 필요한 경우
- 외부 의존성 누락

## 관련 명령

- `/go-test` - 빌드 성공 후 테스트 실행
- `/go-review` - 코드 품질 검토
- `/verify` - 전체 검증 루프

## 관련 파일

- Agent: `agents/go-build-resolver.md`
- Skill: `skills/golang-patterns/`
