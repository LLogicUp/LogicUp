---
name: docker-patterns
description: Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
origin: ECC
---

# Docker 패턴

컨테이너화된 개발을 위한 Docker 및 Docker Compose 모범 사례.

## 활성화 시점

- 로컬 개발을 위한 Docker Compose 설정 시
- 멀티 컨테이너 아키텍처 설계 시
- 컨테이너 네트워킹 또는 볼륨 문제 트러블슈팅 시
- 보안 및 크기 관점에서 Dockerfile 검토 시
- 로컬 개발에서 컨테이너화 워크플로로 마이그레이션 시

## 로컬 개발을 위한 Docker Compose

### 표준 웹 앱 스택

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: dev                     # 멀티 스테이지 Dockerfile의 dev 스테이지 사용
    ports:
      - "3000:3000"
    volumes:
      - .:/app                        # 핫 리로드를 위한 바인드 마운트
      - /app/node_modules             # 익명 볼륨 -- 컨테이너 의존성 보존
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  mailpit:                            # 로컬 이메일 테스트
    image: axllent/mailpit
    ports:
      - "8025:8025"                   # Web UI
      - "1025:1025"                   # SMTP

volumes:
  pgdata:
  redisdata:
```

### 개발 vs 프로덕션 Dockerfile

```dockerfile
# Stage: dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage: dev (핫 리로드, 디버그 도구)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage: build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# Stage: production (최소 이미지)
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### 오버라이드 파일

```yaml
# docker-compose.override.yml (자동 로드, 개발 전용 설정)
services:
  app:
    environment:
      - DEBUG=app:*
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"                   # Node.js 디버거

# docker-compose.prod.yml (프로덕션용 명시적 설정)
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

```bash
# 개발 (오버라이드 자동 로드)
docker compose up

# 프로덕션
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 네트워킹

### 서비스 디스커버리

동일한 Compose 네트워크에 있는 서비스는 서비스 이름으로 접근 가능:
```
# "app" 컨테이너에서:
postgres://postgres:postgres@db:5432/app_dev    # "db"가 db 컨테이너로 resolve됨
redis://redis:6379/0                             # "redis"가 redis 컨테이너로 resolve됨
```

### 커스텀 네트워크

```yaml
services:
  frontend:
    networks:
      - frontend-net

  api:
    networks:
      - frontend-net
      - backend-net

  db:
    networks:
      - backend-net              # api에서만 접근 가능, frontend에서는 불가

networks:
  frontend-net:
  backend-net:
```

### 필요한 것만 노출

```yaml
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"   # 호스트에서만 접근 가능, 네트워크에서는 불가
    # 프로덕션에서는 ports 생략 -- Docker 네트워크 내에서만 접근 가능
```

## 볼륨 전략

```yaml
volumes:
  # 네임드 볼륨: 컨테이너 재시작에도 유지, Docker에서 관리
  pgdata:

  # 바인드 마운트: 호스트 디렉토리를 컨테이너에 매핑 (개발용)
  # - ./src:/app/src

  # 익명 볼륨: 바인드 마운트 오버라이드로부터 컨테이너 생성 콘텐츠 보존
  # - /app/node_modules
```

### 일반적인 패턴

```yaml
services:
  app:
    volumes:
      - .:/app                   # 소스 코드 (핫 리로드를 위한 바인드 마운트)
      - /app/node_modules        # 호스트로부터 컨테이너의 node_modules 보호
      - /app/.next               # 빌드 캐시 보호

  db:
    volumes:
      - pgdata:/var/lib/postgresql/data          # 영속 데이터
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql  # 초기화 스크립트
```

## 컨테이너 보안

### Dockerfile 강화

```dockerfile
# 1. 특정 태그 사용 (:latest 절대 사용 금지)
FROM node:22.12-alpine3.20

# 2. 비루트 사용자로 실행
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

# 3. 권한 드롭 (compose에서)
# 4. 가능한 경우 루트 파일시스템 읽기 전용
# 5. 이미지 레이어에 시크릿 없음
```

### Compose 보안

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/.cache
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE          # 1024 미만 포트에 바인딩하는 경우에만
```

### 시크릿 관리

```yaml
# 좋음: 환경 변수 사용 (런타임에 주입)
services:
  app:
    env_file:
      - .env                     # .env를 절대 git에 커밋하지 않을 것
    environment:
      - API_KEY                  # 호스트 환경에서 상속

# 좋음: Docker secrets (Swarm 모드)
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password

# 나쁨: 이미지에 하드코딩
# ENV API_KEY=sk-proj-xxxxx      # 절대 이렇게 하지 말 것
```

## .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.log
.next
.cache
docker-compose*.yml
Dockerfile*
README.md
tests/
```

## 디버깅

### 일반 명령어

```bash
# 로그 확인
docker compose logs -f app           # app 로그 실시간 추적
docker compose logs --tail=50 db     # db의 마지막 50줄

# 실행 중인 컨테이너에서 명령어 실행
docker compose exec app sh           # app에 셸 접속
docker compose exec db psql -U postgres  # postgres 연결

# 검사
docker compose ps                     # 실행 중인 서비스
docker compose top                    # 각 컨테이너의 프로세스
docker stats                          # 리소스 사용량

# 재빌드
docker compose up --build             # 이미지 재빌드
docker compose build --no-cache app   # 강제 전체 재빌드

# 정리
docker compose down                   # 컨테이너 중지 및 제거
docker compose down -v                # 볼륨도 제거 (파괴적 작업)
docker system prune                   # 미사용 이미지/컨테이너 제거
```

### 네트워크 문제 디버깅

```bash
# 컨테이너 내부에서 DNS 확인
docker compose exec app nslookup db

# 연결 확인
docker compose exec app wget -qO- http://api:3000/health

# 네트워크 검사
docker network ls
docker network inspect <project>_default
```

## 안티 패턴

```
# 나쁨: 오케스트레이션 없이 프로덕션에서 docker compose 사용
# 프로덕션 멀티 컨테이너 워크로드에는 Kubernetes, ECS, 또는 Docker Swarm 사용

# 나쁨: 볼륨 없이 컨테이너에 데이터 저장
# 컨테이너는 임시적 -- 볼륨 없이 재시작하면 모든 데이터 소실

# 나쁨: root로 실행
# 항상 비루트 사용자 생성 및 사용

# 나쁨: :latest 태그 사용
# 재현 가능한 빌드를 위해 특정 버전에 고정

# 나쁨: 모든 서비스를 하나의 거대한 컨테이너에 넣기
# 관심사 분리: 컨테이너당 하나의 프로세스

# 나쁨: docker-compose.yml에 시크릿 넣기
# .env 파일 (gitignore 처리) 또는 Docker secrets 사용
```
