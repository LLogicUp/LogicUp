---
description: 관용적 패턴, 동시성 안전성, 에러 처리, 보안에 대한 Go 코드 종합 리뷰. go-reviewer 에이전트를 호출합니다.
---

# Go 코드 리뷰

이 명령은 **go-reviewer** 에이전트를 호출하여 Go 전용 종합 코드 리뷰를 수행합니다.

## 이 명령이 하는 일

1. **Go 변경 사항 식별**: `git diff`로 수정된 `.go` 파일 찾기
2. **정적 분석 실행**: `go vet`, `staticcheck`, `golangci-lint` 실행
3. **보안 스캔**: SQL 인젝션, 명령어 인젝션, 경쟁 조건 확인
4. **동시성 검토**: 고루틴 안전성, 채널 사용, 뮤텍스 패턴 분석
5. **Go 관용 표현 확인**: Go 컨벤션 및 모범 사례 준수 여부 검증
6. **리포트 생성**: 심각도별로 문제 분류

## 언제 사용하나요

다음 상황에서 `/go-review`를 사용합니다.

- Go 코드를 작성하거나 수정한 후
- Go 변경 사항을 커밋하기 전
- Go 코드가 포함된 풀 리퀘스트 검토 시
- 새로운 Go 코드베이스에 입문할 때
- 관용적 Go 패턴을 학습할 때

## 검토 카테고리

### CRITICAL (반드시 수정)
- SQL/명령어 인젝션 취약점
- 동기화 없는 경쟁 조건
- 고루틴 누수
- 하드코딩된 자격 증명
- 안전하지 않은 포인터 사용
- 중요 경로에서 무시된 에러

### HIGH (수정 필요)
- 컨텍스트 없는 에러 래핑 누락
- 에러 반환 대신 패닉 사용
- 컨텍스트 미전파
- 데드락을 유발하는 버퍼 없는 채널
- 인터페이스 미구현 오류
- 뮤텍스 보호 누락

### MEDIUM (고려 사항)
- 비관용적 코드 패턴
- 내보낸 항목에 godoc 주석 누락
- 비효율적인 문자열 연결
- 슬라이스 사전 할당 누락
- 테이블 기반 테스트 미사용

## 자동화 검사 항목

```bash
# 정적 분석
go vet ./...

# 고급 검사 (설치된 경우)
staticcheck ./...
golangci-lint run

# 경쟁 조건 감지
go build -race ./...

# 보안 취약점
govulncheck ./...
```

## 사용 예시

```text
사용자: /go-review

에이전트:
# Go 코드 리뷰 리포트

## 검토된 파일
- internal/handler/user.go (수정됨)
- internal/service/auth.go (수정됨)

## 정적 분석 결과
go vet: 문제 없음
staticcheck: 문제 없음

## 발견된 문제

[CRITICAL] 경쟁 조건
파일: internal/service/auth.go:45
문제: 동기화 없이 공유 맵에 접근
```go
var cache = map[string]*Session{}  // Concurrent access!

func GetSession(id string) *Session {
    return cache[id]  // Race condition
}
```
수정: sync.RWMutex 또는 sync.Map 사용
```go
var (
    cache   = map[string]*Session{}
    cacheMu sync.RWMutex
)

func GetSession(id string) *Session {
    cacheMu.RLock()
    defer cacheMu.RUnlock()
    return cache[id]
}
```

[HIGH] 에러 컨텍스트 누락
파일: internal/handler/user.go:28
문제: 컨텍스트 없이 에러 반환
```go
return err  // No context
```
수정: 컨텍스트로 래핑
```go
return fmt.Errorf("get user %s: %w", userID, err)
```

## 요약
- CRITICAL: 1건
- HIGH: 1건
- MEDIUM: 0건

권고: CRITICAL 문제가 수정될 때까지 머지 차단
```

## 승인 기준

| 상태 | 조건 |
|------|------|
| 승인 | CRITICAL 또는 HIGH 문제 없음 |
| 경고 | MEDIUM 문제만 있음 (주의하여 머지) |
| 차단 | CRITICAL 또는 HIGH 문제 발견 |

## 다른 명령과의 통합

- 먼저 `/go-test`로 테스트 통과 확인
- 빌드 오류 발생 시 `/go-build` 사용
- 커밋 전 `/go-review` 실행
- Go 이외의 사항은 `/code-review` 사용

## 관련 파일

- Agent: `agents/go-reviewer.md`
- Skills: `skills/golang-patterns/`, `skills/golang-testing/`
