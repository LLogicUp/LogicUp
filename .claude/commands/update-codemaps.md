# Update Codemaps

코드베이스 구조를 분석하고 토큰 효율적인 아키텍처 문서를 생성합니다.

## 1단계: 프로젝트 구조 스캔

1. 프로젝트 유형 식별 (모노레포, 단일 앱, 라이브러리, 마이크로서비스)
2. 모든 소스 디렉토리 찾기 (src/, lib/, app/, packages/)
3. 진입점 매핑 (main.ts, index.ts, app.py, main.go 등)

## 2단계: Codemap 생성

`docs/CODEMAPS/` (또는 `.reports/codemaps/`)에 codemap 생성 또는 업데이트:

| 파일 | 내용 |
|------|------|
| `architecture.md` | 고수준 시스템 다이어그램, 서비스 경계, 데이터 흐름 |
| `backend.md` | API 라우트, 미들웨어 체인, 서비스 → 리포지토리 매핑 |
| `frontend.md` | 페이지 트리, 컴포넌트 계층, 상태 관리 흐름 |
| `data.md` | 데이터베이스 테이블, 관계, 마이그레이션 이력 |
| `dependencies.md` | 외부 서비스, 서드파티 통합, 공유 라이브러리 |

### Codemap 형식

각 codemap은 AI 컨텍스트 소비에 최적화된 토큰 효율적 형식이어야 합니다:

```markdown
# 백엔드 아키텍처

## 라우트
POST /api/users → UserController.create → UserService.create → UserRepo.insert
GET  /api/users/:id → UserController.get → UserService.findById → UserRepo.findById

## 핵심 파일
src/services/user.ts (비즈니스 로직, 120줄)
src/repos/user.ts (데이터베이스 접근, 80줄)

## 의존성
- PostgreSQL (주요 데이터 저장소)
- Redis (세션 캐시, 속도 제한)
- Stripe (결제 처리)
```

## 3단계: 변경 감지

1. 이전 codemap이 있으면 변경 비율 계산
2. 변경이 30% 초과 시 diff를 표시하고 덮어쓰기 전 사용자 승인 요청
3. 변경이 30% 이하이면 직접 업데이트

## 4단계: 메타데이터 추가

각 codemap에 신선도 헤더 추가:

```markdown
<!-- 생성일: 2026-02-11 | 스캔된 파일: 142개 | 토큰 추정: ~800 -->
```

## 5단계: 분석 보고서 저장

`.reports/codemap-diff.txt`에 요약 작성:
- 마지막 스캔 이후 추가/제거/수정된 파일
- 감지된 새 의존성
- 아키텍처 변경 (새 라우트, 새 서비스 등)
- 90일 이상 업데이트되지 않은 문서에 대한 오래됨 경고

## 팁

- **구현 세부사항**이 아닌 **고수준 구조**에 집중하세요
- 전체 코드 블록보다 **파일 경로와 함수 시그니처** 선호
- 효율적인 컨텍스트 로딩을 위해 각 codemap을 **1000 토큰 미만**으로 유지
- 장황한 설명 대신 데이터 흐름에 ASCII 다이어그램 사용
- 주요 기능 추가 또는 리팩토링 세션 후 실행하세요
