---
description: PEP 8 준수, 타입 힌트, 보안, Pythonic 관용구에 대한 포괄적인 Python 코드 리뷰. python-reviewer 에이전트를 호출합니다.
---

# Python 코드 리뷰

이 명령은 포괄적인 Python 전용 코드 리뷰를 위해 **python-reviewer** 에이전트를 호출합니다.

## 이 명령이 하는 일

1. **Python 변경 사항 파악**: `git diff`로 수정된 `.py` 파일 탐색
2. **정적 분석 실행**: `ruff`, `mypy`, `pylint`, `black --check` 실행
3. **보안 스캔**: SQL 인젝션, 명령어 인젝션, 안전하지 않은 역직렬화 확인
4. **타입 안전성 리뷰**: 타입 힌트 및 mypy 오류 분석
5. **Pythonic 코드 검사**: PEP 8 및 Python 모범 사례 준수 확인
6. **보고서 생성**: 심각도별 이슈 분류

## 언제 사용하나

다음 경우 `/python-review` 사용:
- Python 코드 작성 또는 수정 후
- Python 변경 사항 커밋 전
- Python 코드가 포함된 Pull Request 리뷰 시
- 새로운 Python 코드베이스 온보딩 시
- Pythonic 패턴과 관용구 학습 시

## 리뷰 카테고리

### CRITICAL (반드시 수정)
- SQL/명령어 인젝션 취약점
- 안전하지 않은 eval/exec 사용
- Pickle 안전하지 않은 역직렬화
- 하드코딩된 자격 증명
- YAML 안전하지 않은 load
- 오류를 숨기는 bare except 절

### HIGH (수정해야 함)
- 공개 함수에 타입 힌트 누락
- 변경 가능한 기본 인수
- 예외 묵시적 무시
- 리소스에 컨텍스트 매니저 미사용
- 컴프리헨션 대신 C 스타일 루프
- isinstance() 대신 type() 사용
- 락 없는 경쟁 조건

### MEDIUM (고려사항)
- PEP 8 포맷팅 위반
- 공개 함수에 docstring 누락
- logging 대신 print 문 사용
- 비효율적인 문자열 연산
- 이름 없는 상수의 매직 넘버
- 포맷팅에 f-string 미사용
- 불필요한 리스트 생성

## 자동화 검사 목록

```bash
# 타입 검사
mypy .

# 린팅 및 포맷팅
ruff check .
black --check .
isort --check-only .

# 보안 스캔
bandit -r .

# 의존성 감사
pip-audit
safety check

# 테스팅
pytest --cov=app --cov-report=term-missing
```

## 사용 예시

```text
User: /python-review

Agent:
# Python Code Review Report

## Files Reviewed
- app/routes/user.py (modified)
- app/services/auth.py (modified)

## Static Analysis Results
✓ ruff: No issues
✓ mypy: No errors
⚠️ black: 2 files need reformatting
✓ bandit: No security issues

## Issues Found

[CRITICAL] SQL Injection vulnerability
File: app/routes/user.py:42
Issue: User input directly interpolated into SQL query
```python
query = f"SELECT * FROM users WHERE id = {user_id}"  # Bad
```
Fix: Use parameterized query
```python
query = "SELECT * FROM users WHERE id = %s"  # Good
cursor.execute(query, (user_id,))
```

[HIGH] Mutable default argument
File: app/services/auth.py:18
Issue: Mutable default argument causes shared state
```python
def process_items(items=[]):  # Bad
    items.append("new")
    return items
```
Fix: Use None as default
```python
def process_items(items=None):  # Good
    if items is None:
        items = []
    items.append("new")
    return items
```

[MEDIUM] Missing type hints
File: app/services/auth.py:25
Issue: Public function without type annotations
```python
def get_user(user_id):  # Bad
    return db.find(user_id)
```
Fix: Add type hints
```python
def get_user(user_id: str) -> Optional[User]:  # Good
    return db.find(user_id)
```

[MEDIUM] Not using context manager
File: app/routes/user.py:55
Issue: File not closed on exception
```python
f = open("config.json")  # Bad
data = f.read()
f.close()
```
Fix: Use context manager
```python
with open("config.json") as f:  # Good
    data = f.read()
```

## Summary
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 2

Recommendation: ❌ Block merge until CRITICAL issue is fixed

## Formatting Required
Run: `black app/routes/user.py app/services/auth.py`
```

## 승인 기준

| 상태 | 조건 |
|------|------|
| 승인 | CRITICAL 또는 HIGH 이슈 없음 |
| 경고 | MEDIUM 이슈만 있음 (주의하여 머지) |
| 차단 | CRITICAL 또는 HIGH 이슈 발견 |

## 다른 명령과의 통합

- 테스트 통과 확인을 위해 먼저 `/tdd` 사용
- Python 외 관심사에는 `/code-review` 사용
- 커밋 전 `/python-review` 사용
- 정적 분석 도구 실패 시 `/build-fix` 사용

## 프레임워크별 리뷰

### Django 프로젝트
다음 항목 확인:
- N+1 쿼리 이슈 (`select_related` 및 `prefetch_related` 사용 권장)
- 모델 변경에 대한 누락된 마이그레이션
- ORM으로 처리 가능한 경우의 raw SQL 사용
- 다단계 작업에서 `transaction.atomic()` 누락

### FastAPI 프로젝트
다음 항목 확인:
- CORS 잘못된 설정
- 요청 유효성 검사를 위한 Pydantic 모델
- Response 모델 정확성
- 올바른 async/await 사용
- 의존성 주입 패턴

### Flask 프로젝트
다음 항목 확인:
- 컨텍스트 관리 (앱 컨텍스트, 요청 컨텍스트)
- 올바른 에러 처리
- Blueprint 구성
- 설정 관리

## 관련

- 에이전트: `agents/python-reviewer.md`
- 스킬: `skills/python-patterns/`, `skills/python-testing/`

## 일반적인 수정 방법

### 타입 힌트 추가
```python
# Before
def calculate(x, y):
    return x + y

# After
from typing import Union

def calculate(x: Union[int, float], y: Union[int, float]) -> Union[int, float]:
    return x + y
```

### 컨텍스트 매니저 사용
```python
# Before
f = open("file.txt")
data = f.read()
f.close()

# After
with open("file.txt") as f:
    data = f.read()
```

### 리스트 컴프리헨션 사용
```python
# Before
result = []
for item in items:
    if item.active:
        result.append(item.name)

# After
result = [item.name for item in items if item.active]
```

### 변경 가능한 기본값 수정
```python
# Before
def append(value, items=[]):
    items.append(value)
    return items

# After
def append(value, items=None):
    if items is None:
        items = []
    items.append(value)
    return items
```

### f-string 사용 (Python 3.6+)
```python
# Before
name = "Alice"
greeting = "Hello, " + name + "!"
greeting2 = "Hello, {}".format(name)

# After
greeting = f"Hello, {name}!"
```

### 루프 내 문자열 연결 수정
```python
# Before
result = ""
for item in items:
    result += str(item)

# After
result = "".join(str(item) for item in items)
```

## Python 버전 호환성

리뷰어는 최신 Python 버전의 기능을 사용하는 코드에 대해 알려줍니다:

| 기능 | 최소 Python 버전 |
|------|----------------|
| 타입 힌트 | 3.5+ |
| f-string | 3.6+ |
| 바다코끼리 연산자 (`:=`) | 3.8+ |
| 위치 전용 파라미터 | 3.8+ |
| Match 문 | 3.10+ |
| 타입 유니온 (`x | None`) | 3.10+ |

프로젝트의 `pyproject.toml` 또는 `setup.py`에 올바른 최소 Python 버전이 지정되어 있는지 확인하세요.
