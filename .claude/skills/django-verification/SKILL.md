---
name: django-verification
description: "Verification loop for Django projects: migrations, linting, tests with coverage, security scans, and deployment readiness checks before release or PR."
origin: ECC
---

# Django 검증 루프

PR 오픈 전, 주요 변경 후, 배포 전에 실행하여 Django 애플리케이션의 품질과 보안을 보장합니다.

## 활성화 시점

- Django 프로젝트의 PR 오픈 전
- 주요 모델 변경, 마이그레이션 업데이트, 의존성 업그레이드 후
- 스테이징 또는 프로덕션 배포 전 검증
- 환경 → 린트 → 테스트 → 보안 → 배포 준비 파이프라인 전체 실행
- 마이그레이션 안전성 및 테스트 커버리지 검증

## Phase 1: 환경 확인

```bash
# Python 버전 확인
python --version  # 프로젝트 요구사항과 일치해야 함

# 가상환경 확인
which python
pip list --outdated

# 환경 변수 확인
python -c "import os; import environ; print('DJANGO_SECRET_KEY set' if os.environ.get('DJANGO_SECRET_KEY') else 'MISSING: DJANGO_SECRET_KEY')"
```

환경이 잘못 설정된 경우, 중단하고 수정합니다.

## Phase 2: 코드 품질 및 포맷팅

```bash
# 타입 검사
mypy . --config-file pyproject.toml

# ruff로 린팅
ruff check . --fix

# black으로 포맷팅
black . --check
black .  # 자동 수정

# import 정렬
isort . --check-only
isort .  # 자동 수정

# Django 특화 검사
python manage.py check --deploy
```

흔한 문제:
- public 함수에 타입 힌트 누락
- PEP 8 포맷팅 위반
- 정렬되지 않은 import
- 프로덕션 설정에 남아 있는 디버그 설정

## Phase 3: 마이그레이션

```bash
# 미적용 마이그레이션 확인
python manage.py showmigrations

# 누락된 마이그레이션 생성
python manage.py makemigrations --check

# 마이그레이션 적용 dry-run
python manage.py migrate --plan

# 마이그레이션 적용 (테스트 환경)
python manage.py migrate

# 마이그레이션 충돌 확인
python manage.py makemigrations --merge  # 충돌이 있는 경우에만
```

보고 내용:
- 대기 중인 마이그레이션 수
- 마이그레이션 충돌 여부
- 마이그레이션 없는 모델 변경 여부

## Phase 4: 테스트 + 커버리지

```bash
# pytest로 전체 테스트 실행
pytest --cov=apps --cov-report=html --cov-report=term-missing --reuse-db

# 특정 앱 테스트 실행
pytest apps/users/tests/

# 마커로 실행
pytest -m "not slow"  # 느린 테스트 건너뛰기
pytest -m integration  # 통합 테스트만

# 커버리지 리포트
open htmlcov/index.html
```

보고 내용:
- 전체 테스트: X 통과, Y 실패, Z 건너뜀
- 전체 커버리지: XX%
- 앱별 커버리지 분석

커버리지 목표:

| 컴포넌트 | 목표 |
|---------|------|
| 모델 | 90%+ |
| 시리얼라이저 | 85%+ |
| 뷰 | 80%+ |
| 서비스 | 90%+ |
| 전체 | 80%+ |

## Phase 5: 보안 스캔

```bash
# 의존성 취약점
pip-audit
safety check --full-report

# Django 보안 검사
python manage.py check --deploy

# Bandit 보안 린터
bandit -r . -f json -o bandit-report.json

# 시크릿 스캔 (gitleaks가 설치된 경우)
gitleaks detect --source . --verbose

# 환경 변수 확인
python -c "from django.core.exceptions import ImproperlyConfigured; from django.conf import settings; settings.DEBUG"
```

보고 내용:
- 발견된 취약한 의존성
- 보안 설정 문제
- 하드코딩된 시크릿 탐지
- DEBUG 모드 상태 (프로덕션에서는 False여야 함)

## Phase 6: Django 관리 명령어

```bash
# 모델 문제 확인
python manage.py check

# 정적 파일 수집
python manage.py collectstatic --noinput --clear

# 슈퍼유저 생성 (테스트용으로 필요한 경우)
echo "from apps.users.models import User; User.objects.create_superuser('admin@example.com', 'admin')" | python manage.py shell

# 데이터베이스 무결성
python manage.py check --database default

# 캐시 검증 (Redis 사용 시)
python -c "from django.core.cache import cache; cache.set('test', 'value', 10); print(cache.get('test'))"
```

## Phase 7: 성능 확인

```bash
# Django Debug Toolbar 출력 (N+1 쿼리 확인)
# DEBUG=True인 dev 모드에서 실행하고 페이지 접근
# SQL 패널에서 중복 쿼리 확인

# 쿼리 수 분석
django-admin debugsqlshell  # django-debug-sqlshell 설치된 경우

# 누락된 인덱스 확인
python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT table_name, index_name FROM information_schema.statistics WHERE table_schema = 'public'")
    print(cursor.fetchall())
EOF
```

보고 내용:
- 페이지당 쿼리 수 (일반 페이지는 50개 미만이어야 함)
- 누락된 데이터베이스 인덱스
- 중복 쿼리 탐지

## Phase 8: 정적 자산

```bash
# npm 의존성 확인 (npm 사용 시)
npm audit
npm audit fix

# 정적 파일 빌드 (webpack/vite 사용 시)
npm run build

# 정적 파일 확인
ls -la staticfiles/
python manage.py findstatic css/style.css
```

## Phase 9: 설정 검토

```python
# Python 셸에서 실행하여 설정 확인
python manage.py shell << EOF
from django.conf import settings
import os

# 중요 검사
checks = {
    'DEBUG is False': not settings.DEBUG,
    'SECRET_KEY set': bool(settings.SECRET_KEY and len(settings.SECRET_KEY) > 30),
    'ALLOWED_HOSTS set': len(settings.ALLOWED_HOSTS) > 0,
    'HTTPS enabled': getattr(settings, 'SECURE_SSL_REDIRECT', False),
    'HSTS enabled': getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
    'Database configured': settings.DATABASES['default']['ENGINE'] != 'django.db.backends.sqlite3',
}

for check, result in checks.items():
    status = '✓' if result else '✗'
    print(f"{status} {check}")
EOF
```

## Phase 10: 로깅 설정

```bash
# 로깅 출력 테스트
python manage.py shell << EOF
import logging
logger = logging.getLogger('django')
logger.warning('Test warning message')
logger.error('Test error message')
EOF

# 로그 파일 확인 (설정된 경우)
tail -f /var/log/django/django.log
```

## Phase 11: API 문서 (DRF 사용 시)

```bash
# 스키마 생성
python manage.py generateschema --format openapi-json > schema.json

# 스키마 유효성 검사
# schema.json이 유효한 JSON인지 확인
python -c "import json; json.load(open('schema.json'))"

# Swagger UI 접근 (drf-yasg 사용 시)
# 브라우저에서 http://localhost:8000/swagger/ 방문
```

## Phase 12: diff 검토

```bash
# diff 통계 표시
git diff --stat

# 실제 변경 내용 표시
git diff

# 변경된 파일 표시
git diff --name-only

# 흔한 문제 확인
git diff | grep -i "todo\|fixme\|hack\|xxx"
git diff | grep "print("  # 디버그 구문
git diff | grep "DEBUG = True"  # 디버그 모드
git diff | grep "import pdb"  # 디버거
```

체크리스트:
- 디버그 구문 없음 (print, pdb, breakpoint())
- 중요 코드에 TODO/FIXME 주석 없음
- 하드코딩된 시크릿 또는 자격증명 없음
- 모델 변경 시 데이터베이스 마이그레이션 포함
- 설정 변경 문서화
- 외부 호출에 에러 처리 존재
- 필요한 곳에 트랜잭션 관리 적용

## 출력 템플릿

```
DJANGO VERIFICATION REPORT
==========================

Phase 1: Environment Check
  ✓ Python 3.11.5
  ✓ Virtual environment active
  ✓ All environment variables set

Phase 2: Code Quality
  ✓ mypy: No type errors
  ✗ ruff: 3 issues found (auto-fixed)
  ✓ black: No formatting issues
  ✓ isort: Imports properly sorted
  ✓ manage.py check: No issues

Phase 3: Migrations
  ✓ No unapplied migrations
  ✓ No migration conflicts
  ✓ All models have migrations

Phase 4: Tests + Coverage
  Tests: 247 passed, 0 failed, 5 skipped
  Coverage:
    Overall: 87%
    users: 92%
    products: 89%
    orders: 85%
    payments: 91%

Phase 5: Security Scan
  ✗ pip-audit: 2 vulnerabilities found (fix required)
  ✓ safety check: No issues
  ✓ bandit: No security issues
  ✓ No secrets detected
  ✓ DEBUG = False

Phase 6: Django Commands
  ✓ collectstatic completed
  ✓ Database integrity OK
  ✓ Cache backend reachable

Phase 7: Performance
  ✓ No N+1 queries detected
  ✓ Database indexes configured
  ✓ Query count acceptable

Phase 8: Static Assets
  ✓ npm audit: No vulnerabilities
  ✓ Assets built successfully
  ✓ Static files collected

Phase 9: Configuration
  ✓ DEBUG = False
  ✓ SECRET_KEY configured
  ✓ ALLOWED_HOSTS set
  ✓ HTTPS enabled
  ✓ HSTS enabled
  ✓ Database configured

Phase 10: Logging
  ✓ Logging configured
  ✓ Log files writable

Phase 11: API Documentation
  ✓ Schema generated
  ✓ Swagger UI accessible

Phase 12: Diff Review
  Files changed: 12
  +450, -120 lines
  ✓ No debug statements
  ✓ No hardcoded secrets
  ✓ Migrations included

RECOMMENDATION: ⚠️ Fix pip-audit vulnerabilities before deploying

NEXT STEPS:
1. Update vulnerable dependencies
2. Re-run security scan
3. Deploy to staging for final testing
```

## 배포 전 체크리스트

- [ ] 모든 테스트 통과
- [ ] 커버리지 ≥ 80%
- [ ] 보안 취약점 없음
- [ ] 미적용 마이그레이션 없음
- [ ] 프로덕션 설정에서 DEBUG = False
- [ ] SECRET_KEY 올바르게 설정
- [ ] ALLOWED_HOSTS 올바르게 설정
- [ ] 데이터베이스 백업 활성화
- [ ] 정적 파일 수집 및 서빙
- [ ] 로깅 설정 및 동작
- [ ] 에러 모니터링 (Sentry 등) 설정
- [ ] CDN 설정 (해당되는 경우)
- [ ] Redis/캐시 백엔드 설정
- [ ] Celery 워커 실행 중 (해당되는 경우)
- [ ] HTTPS/SSL 설정
- [ ] 환경 변수 문서화

## 지속적 통합

### GitHub Actions 예시

```yaml
# .github/workflows/django-verification.yml
name: Django Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Cache pip
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install ruff black mypy pytest pytest-django pytest-cov bandit safety pip-audit

      - name: Code quality checks
        run: |
          ruff check .
          black . --check
          isort . --check-only
          mypy .

      - name: Security scan
        run: |
          bandit -r . -f json -o bandit-report.json
          safety check --full-report
          pip-audit

      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          DJANGO_SECRET_KEY: test-secret-key
        run: |
          pytest --cov=apps --cov-report=xml --cov-report=term-missing

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 빠른 참조

| 검사 | 명령어 |
|-----|--------|
| 환경 | `python --version` |
| 타입 검사 | `mypy .` |
| 린팅 | `ruff check .` |
| 포맷팅 | `black . --check` |
| 마이그레이션 | `python manage.py makemigrations --check` |
| 테스트 | `pytest --cov=apps` |
| 보안 | `pip-audit && bandit -r .` |
| Django 검사 | `python manage.py check --deploy` |
| collectstatic | `python manage.py collectstatic --noinput` |
| diff 통계 | `git diff --stat` |

기억하세요: 자동화된 검증은 흔한 문제를 잡아주지만, 수동 코드 리뷰와 스테이징 환경 테스트를 대체하지는 않습니다.
