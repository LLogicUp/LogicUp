---
name: database-migrations
description: PostgreSQL, MySQL 및 주요 ORM(Prisma, Drizzle, Django, TypeORM, golang-migrate)에서의 스키마 변경, 데이터 마이그레이션, 롤백, 무중단 배포를 위한 데이터베이스 마이그레이션 모범 사례.
origin: ECC
---

# 데이터베이스 마이그레이션 패턴

프로덕션 시스템을 위한 안전하고 되돌릴 수 있는 데이터베이스 스키마 변경.

## 활성화 시점

- 데이터베이스 테이블 생성 또는 변경 시
- 컬럼 또는 인덱스 추가/제거 시
- 데이터 마이그레이션 실행 (백필, 변환)
- 무중단 스키마 변경 계획 수립
- 새 프로젝트에 마이그레이션 도구 설정

## 핵심 원칙

1. **모든 변경은 마이그레이션** — 프로덕션 데이터베이스를 직접 수정하지 않음
2. **프로덕션에서 마이그레이션은 순방향만** — 롤백은 새 순방향 마이그레이션으로 처리
3. **스키마 마이그레이션과 데이터 마이그레이션은 분리** — 하나의 마이그레이션에 DDL과 DML을 혼합하지 않음
4. **프로덕션 크기의 데이터에 대해 마이그레이션 테스트** — 100개 행에서 작동하는 마이그레이션이 1000만 행에서는 잠금을 유발할 수 있음
5. **마이그레이션은 배포 후 불변** — 프로덕션에서 실행된 마이그레이션을 절대 수정하지 않음

## 마이그레이션 안전 체크리스트

마이그레이션 적용 전:

- [ ] 마이그레이션에 UP과 DOWN이 모두 있음 (또는 명시적으로 되돌릴 수 없음으로 표시)
- [ ] 대용량 테이블에 전체 테이블 잠금 없음 (동시 작업 사용)
- [ ] 새 컬럼에 기본값이 있거나 nullable (기본값 없이 NOT NULL 추가 금지)
- [ ] 인덱스는 동시에 생성 (기존 테이블의 CREATE TABLE과 함께 인라인하지 않음)
- [ ] 데이터 백필은 스키마 변경과 분리된 마이그레이션
- [ ] 프로덕션 데이터 복사본으로 테스트됨
- [ ] 롤백 계획 문서화

## PostgreSQL 패턴

### 컬럼 안전하게 추가

```sql
-- 좋음: Nullable 컬럼, 잠금 없음
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- 좋음: 기본값이 있는 컬럼 (Postgres 11+는 즉시, 재작성 없음)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 나쁨: 기존 테이블에 기본값 없이 NOT NULL (전체 재작성 필요)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- 이것은 테이블을 잠그고 모든 행을 재작성합니다
```

### 다운타임 없이 인덱스 추가

```sql
-- 나쁨: 대용량 테이블의 쓰기 차단
CREATE INDEX idx_users_email ON users (email);

-- 좋음: 비차단, 동시 쓰기 허용
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- 참고: CONCURRENTLY는 트랜잭션 블록 내에서 실행 불가
-- 대부분의 마이그레이션 도구는 이에 대한 특수 처리 필요
```

### 컬럼 이름 변경 (무중단)

프로덕션에서 직접 이름을 변경하지 않습니다. expand-contract 패턴을 사용합니다:

```sql
-- 1단계: 새 컬럼 추가 (마이그레이션 001)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 2단계: 데이터 백필 (마이그레이션 002, 데이터 마이그레이션)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- 3단계: 두 컬럼 모두 읽기/쓰기하도록 애플리케이션 코드 업데이트
-- 애플리케이션 변경사항 배포

-- 4단계: 이전 컬럼 쓰기 중단, 삭제 (마이그레이션 003)
ALTER TABLE users DROP COLUMN username;
```

### 컬럼 안전하게 제거

```sql
-- 1단계: 컬럼에 대한 모든 애플리케이션 참조 제거
-- 2단계: 컬럼 참조 없이 애플리케이션 배포
-- 3단계: 다음 마이그레이션에서 컬럼 삭제
ALTER TABLE orders DROP COLUMN legacy_status;

-- Django의 경우: SeparateDatabaseAndState를 사용하여 모델에서 제거
-- DROP COLUMN 생성 없이 (그 다음 마이그레이션에서 삭제)
```

### 대용량 데이터 마이그레이션

```sql
-- 나쁨: 하나의 트랜잭션에서 모든 행 업데이트 (테이블 잠금)
UPDATE users SET normalized_email = LOWER(email);

-- 좋음: 진행 상황을 추적하는 배치 업데이트
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Prisma (TypeScript/Node.js)

### 워크플로

```bash
# 스키마 변경으로 마이그레이션 생성
npx prisma migrate dev --name add_user_avatar

# 프로덕션에서 대기 중인 마이그레이션 적용
npx prisma migrate deploy

# 데이터베이스 초기화 (개발 전용)
npx prisma migrate reset

# 스키마 변경 후 클라이언트 생성
npx prisma generate
```

### 스키마 예시

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  orders    Order[]

  @@map("users")
  @@index([email])
}
```

### 커스텀 SQL 마이그레이션

Prisma가 표현할 수 없는 작업의 경우 (동시 인덱스, 데이터 백필):

```bash
# 빈 마이그레이션 생성 후 SQL 직접 수정
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma는 CONCURRENTLY를 생성할 수 없으므로 직접 작성합니다
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle (TypeScript/Node.js)

### 워크플로

```bash
# 스키마 변경으로 마이그레이션 생성
npx drizzle-kit generate

# 마이그레이션 적용
npx drizzle-kit migrate

# 스키마 직접 푸시 (개발 전용, 마이그레이션 파일 없음)
npx drizzle-kit push
```

### 스키마 예시

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Django (Python)

### 워크플로

```bash
# 모델 변경으로 마이그레이션 생성
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate

# 마이그레이션 상태 표시
python manage.py showmigrations

# 커스텀 SQL을 위한 빈 마이그레이션 생성
python manage.py makemigrations --empty app_name -n description
```

### 데이터 마이그레이션

```python
from django.db import migrations

def backfill_display_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for user in batch:
            user.display_name = user.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

def reverse_backfill(apps, schema_editor):
    pass  # 데이터 마이그레이션, 역방향 불필요

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

데이터베이스에서 즉시 삭제하지 않고 Django 모델에서 컬럼 제거:

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # DB는 아직 건드리지 않음
        ),
    ]
```

## golang-migrate (Go)

### 워크플로

```bash
# 마이그레이션 쌍 생성
migrate create -ext sql -dir migrations -seq add_user_avatar

# 대기 중인 모든 마이그레이션 적용
migrate -path migrations -database "$DATABASE_URL" up

# 마지막 마이그레이션 롤백
migrate -path migrations -database "$DATABASE_URL" down 1

# 버전 강제 지정 (더티 상태 수정)
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### 마이그레이션 파일

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## 무중단 마이그레이션 전략

중요한 프로덕션 변경에는 expand-contract 패턴을 따릅니다:

```
Phase 1: EXPAND (확장)
  - 새 컬럼/테이블 추가 (nullable 또는 기본값 포함)
  - 배포: 앱이 이전과 새 것 모두에 쓰기
  - 기존 데이터 백필

Phase 2: MIGRATE (마이그레이션)
  - 배포: 앱이 새 것에서 읽고, 둘 다에 쓰기
  - 데이터 일관성 검증

Phase 3: CONTRACT (수축)
  - 배포: 앱이 새 것만 사용
  - 별도 마이그레이션에서 이전 컬럼/테이블 삭제
```

### 타임라인 예시

```
1일: 마이그레이션으로 new_status 컬럼 추가 (nullable)
1일: 앱 v2 배포 — status와 new_status 모두에 쓰기
2일: 기존 행을 위한 백필 마이그레이션 실행
3일: 앱 v3 배포 — new_status에서만 읽기
7일: 마이그레이션으로 이전 status 컬럼 삭제
```

## 안티패턴

| 안티패턴 | 실패하는 이유 | 더 나은 방법 |
|---------|------------|------------|
| 프로덕션에서 수동 SQL | 감사 추적 없음, 반복 불가 | 항상 마이그레이션 파일 사용 |
| 배포된 마이그레이션 수정 | 환경 간 드리프트 유발 | 대신 새 마이그레이션 생성 |
| 기본값 없이 NOT NULL | 테이블 잠금, 모든 행 재작성 | nullable 추가, 백필, 그 다음 제약 추가 |
| 대용량 테이블에 인라인 인덱스 | 빌드 중 쓰기 차단 | CREATE INDEX CONCURRENTLY |
| 하나의 마이그레이션에 스키마 + 데이터 | 롤백 어려움, 긴 트랜잭션 | 마이그레이션 분리 |
| 코드 제거 전 컬럼 삭제 | 누락된 컬럼으로 애플리케이션 오류 | 코드 먼저 제거, 다음 배포에서 컬럼 삭제 |
