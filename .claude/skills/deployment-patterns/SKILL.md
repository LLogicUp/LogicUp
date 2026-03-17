---
name: deployment-patterns
description: 웹 애플리케이션을 위한 배포 워크플로, CI/CD 파이프라인 패턴, Docker 컨테이너화, 헬스 체크, 롤백 전략, 프로덕션 준비 체크리스트.
origin: ECC
---

# 배포 패턴

프로덕션 배포 워크플로와 CI/CD 모범 사례.

## 활성화 시점

- CI/CD 파이프라인 설정 시
- 애플리케이션 Docker화 시
- 배포 전략 계획 수립 (블루-그린, 카나리, 롤링)
- 헬스 체크 및 준비 상태 프로브 구현
- 프로덕션 릴리스 준비
- 환경별 설정 구성

## 배포 전략

### 롤링 배포 (기본값)

인스턴스를 점진적으로 교체 — 롤아웃 중 이전 버전과 새 버전이 동시에 실행됩니다.

```
인스턴스 1: v1 → v2  (첫 번째 업데이트)
인스턴스 2: v1        (v1 계속 실행)
인스턴스 3: v1        (v1 계속 실행)

인스턴스 1: v2
인스턴스 2: v1 → v2  (두 번째 업데이트)
인스턴스 3: v1

인스턴스 1: v2
인스턴스 2: v2
인스턴스 3: v1 → v2  (마지막 업데이트)
```

**장점:** 무중단, 점진적 롤아웃
**단점:** 두 버전이 동시 실행 — 하위 호환 변경이 필요
**사용 시점:** 표준 배포, 하위 호환 변경

### 블루-그린 배포

두 개의 동일한 환경을 실행. 트래픽을 원자적으로 전환합니다.

```
Blue  (v1) ← 트래픽
Green (v2)   유휴, 새 버전 실행

# 검증 후:
Blue  (v1)   유휴 (대기 상태로 전환)
Green (v2) ← 트래픽
```

**장점:** 즉각적인 롤백 (블루로 다시 전환), 깔끔한 컷오버
**단점:** 배포 중 2배의 인프라 필요
**사용 시점:** 핵심 서비스, 문제에 대한 무관용

### 카나리 배포

먼저 소량의 트래픽을 새 버전으로 라우팅합니다.

```
v1: 트래픽의 95%
v2:  트래픽의 5%  (카나리)

# 메트릭이 좋으면:
v1: 트래픽의 50%
v2: 트래픽의 50%

# 최종:
v2: 트래픽의 100%
```

**장점:** 전체 롤아웃 전에 실제 트래픽으로 문제 감지
**단점:** 트래픽 분할 인프라, 모니터링 필요
**사용 시점:** 고트래픽 서비스, 위험한 변경, 기능 플래그

## Docker

### 멀티 스테이지 Dockerfile (Node.js)

```dockerfile
# 1단계: 의존성 설치
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# 2단계: 빌드
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

# 3단계: 프로덕션 이미지
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### 멀티 스테이지 Dockerfile (Go)

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.19 AS runner
RUN apk --no-cache add ca-certificates
RUN adduser -D -u 1001 appuser
USER appuser

COPY --from=builder /server /server

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["/server"]
```

### 멀티 스테이지 Dockerfile (Python/Django)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

RUN useradd -r -u 1001 appuser
USER appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Docker 모범 사례

```
# 좋은 관행
- 특정 버전 태그 사용 (node:22-alpine, node:latest 아님)
- 이미지 크기를 최소화하는 멀티 스테이지 빌드
- 루트가 아닌 사용자로 실행
- 의존성 파일을 먼저 복사 (레이어 캐싱)
- node_modules, .git, 테스트를 제외하는 .dockerignore 사용
- HEALTHCHECK 명령 추가
- docker-compose 또는 k8s에서 리소스 제한 설정

# 나쁜 관행
- root로 실행
- :latest 태그 사용
- 하나의 COPY 레이어에서 전체 저장소 복사
- 프로덕션 이미지에 개발 의존성 설치
- 이미지에 시크릿 저장 (env vars 또는 시크릿 매니저 사용)
```

## CI/CD 파이프라인

### GitHub Actions (표준 파이프라인)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: 프로덕션 배포
        run: |
          # 플랫폼별 배포 명령
          # Railway: railway up
          # Vercel: vercel --prod
          # K8s: kubectl set image deployment/app app=ghcr.io/${{ github.repository }}:${{ github.sha }}
          echo "Deploying ${{ github.sha }}"
```

### 파이프라인 단계

```
PR 오픈 시:
  lint → typecheck → 단위 테스트 → 통합 테스트 → 미리보기 배포

main에 병합 시:
  lint → typecheck → 단위 테스트 → 통합 테스트 → 이미지 빌드 → 스테이징 배포 → 스모크 테스트 → 프로덕션 배포
```

## 헬스 체크

### 헬스 체크 엔드포인트

```typescript
// 간단한 헬스 체크
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 상세 헬스 체크 (내부 모니터링용)
app.get("/health/detailed", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === "ok");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    uptime: process.uptime(),
    checks,
  });
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.query("SELECT 1");
    return { status: "ok", latency_ms: 2 };
  } catch (err) {
    return { status: "error", message: "Database unreachable" };
  }
}
```

### Kubernetes 프로브

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30    # 30 * 5s = 최대 150초 시작 시간
```

## 환경 설정

### Twelve-Factor App 패턴

```bash
# 모든 설정은 환경 변수로 — 코드에 절대 포함하지 않음
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
API_KEY=${API_KEY}           # 시크릿 매니저에 의해 주입
LOG_LEVEL=info
PORT=3000

# 환경별 동작
NODE_ENV=production          # 또는 staging, development
APP_ENV=production           # 명시적인 앱 환경
```

### 설정 유효성 검사

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// 시작 시 유효성 검사 — 설정이 잘못된 경우 빠르게 실패
export const env = envSchema.parse(process.env);
```

## 롤백 전략

### 즉각적인 롤백

```bash
# Docker/Kubernetes: 이전 이미지로 지정
kubectl rollout undo deployment/app

# Vercel: 이전 배포 승격
vercel rollback

# Railway: 이전 커밋 재배포
railway up --commit <previous-sha>

# 데이터베이스: 마이그레이션 롤백 (되돌릴 수 있는 경우)
npx prisma migrate resolve --rolled-back <migration-name>
```

### 롤백 체크리스트

- [ ] 이전 이미지/아티팩트를 사용할 수 있고 태그됨
- [ ] 데이터베이스 마이그레이션이 하위 호환 (파괴적 변경 없음)
- [ ] 기능 플래그가 배포 없이 새 기능을 비활성화할 수 있음
- [ ] 에러율 급증에 대한 모니터링 알림 설정됨
- [ ] 롤백이 프로덕션 릴리스 전 스테이징에서 테스트됨

## 프로덕션 준비 체크리스트

프로덕션 배포 전:

### 애플리케이션
- [ ] 모든 테스트 통과 (단위, 통합, E2E)
- [ ] 코드 또는 설정 파일에 하드코딩된 시크릿 없음
- [ ] 에러 처리가 모든 엣지 케이스를 포함
- [ ] 로깅이 구조화됨 (JSON)이고 PII를 포함하지 않음
- [ ] 헬스 체크 엔드포인트가 의미 있는 상태 반환

### 인프라
- [ ] Docker 이미지가 재현 가능하게 빌드 (고정된 버전)
- [ ] 환경 변수가 문서화되고 시작 시 유효성 검사됨
- [ ] 리소스 제한 설정 (CPU, 메모리)
- [ ] 수평 확장 설정 (최소/최대 인스턴스)
- [ ] 모든 엔드포인트에 SSL/TLS 활성화

### 모니터링
- [ ] 애플리케이션 메트릭 내보내기 (요청률, 지연, 오류)
- [ ] 에러율 > 임계값에 대한 알림 설정
- [ ] 로그 집계 설정 (구조화된 로그, 검색 가능)
- [ ] 헬스 엔드포인트에 업타임 모니터링

### 보안
- [ ] CVE에 대한 의존성 스캔
- [ ] 허용된 출처만을 위한 CORS 설정
- [ ] 공개 엔드포인트에 속도 제한 활성화
- [ ] 인증 및 인가 검증
- [ ] 보안 헤더 설정 (CSP, HSTS, X-Frame-Options)

### 운영
- [ ] 롤백 계획 문서화 및 테스트됨
- [ ] 프로덕션 크기의 데이터에 대해 데이터베이스 마이그레이션 테스트됨
- [ ] 일반적인 장애 시나리오를 위한 런북
- [ ] 온콜 순환 및 에스컬레이션 경로 정의됨
