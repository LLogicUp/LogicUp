---
name: python-patterns
description: Python 관용 표현, PEP 8 표준, 타입 힌트, 그리고 견고하고 효율적이며 유지보수 가능한 Python 애플리케이션 구축을 위한 모범 사례.
origin: ECC
---

# Python 개발 패턴

견고하고 효율적이며 유지보수 가능한 애플리케이션 구축을 위한 Python 관용 패턴과 모범 사례.

## 활성화 시점

- 새로운 Python 코드 작성 시
- Python 코드 리뷰 시
- 기존 Python 코드 리팩토링 시
- Python 패키지/모듈 설계 시

## 핵심 원칙

### 1. 가독성이 중요하다

Python은 가독성을 우선시합니다. 코드는 명확하고 이해하기 쉬워야 합니다.

```python
# 좋음: 명확하고 읽기 쉬움
def get_active_users(users: list[User]) -> list[User]:
    """제공된 목록에서 활성 사용자만 반환합니다."""
    return [user for user in users if user.is_active]


# 나쁨: 영리하지만 혼란스러움
def get_active_users(u):
    return [x for x in u if x.a]
```

### 2. 명시적인 것이 암묵적인 것보다 낫다

마법 같은 코드를 피하고, 코드가 무엇을 하는지 명확히 하세요.

```python
# 좋음: 명시적 설정
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 나쁨: 숨겨진 부작용
import some_module
some_module.setup()  # 이게 뭘 하는 건가요?
```

### 3. EAFP - 허락보다 용서를 구하는 것이 쉽다

Python은 조건 확인보다 예외 처리를 선호합니다.

```python
# 좋음: EAFP 스타일
def get_value(dictionary: dict, key: str) -> Any:
    try:
        return dictionary[key]
    except KeyError:
        return default_value

# 나쁨: LBYL (도약하기 전에 살펴보기) 스타일
def get_value(dictionary: dict, key: str) -> Any:
    if key in dictionary:
        return dictionary[key]
    else:
        return default_value
```

## 타입 힌트

### 기본 타입 어노테이션

```python
from typing import Optional, List, Dict, Any

def process_user(
    user_id: str,
    data: Dict[str, Any],
    active: bool = True
) -> Optional[User]:
    """사용자를 처리하고 업데이트된 User 또는 None을 반환합니다."""
    if not active:
        return None
    return User(user_id, data)
```

### 최신 타입 힌트 (Python 3.9+)

```python
# Python 3.9+ - 내장 타입 사용
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# Python 3.8 이하 - typing 모듈 사용
from typing import List, Dict

def process_items(items: List[str]) -> Dict[str, int]:
    return {item: len(item) for item in items}
```

### 타입 별칭과 TypeVar

```python
from typing import TypeVar, Union

# 복잡한 타입을 위한 타입 별칭
JSON = Union[dict[str, Any], list[Any], str, int, float, bool, None]

def parse_json(data: str) -> JSON:
    return json.loads(data)

# 제네릭 타입
T = TypeVar('T')

def first(items: list[T]) -> T | None:
    """첫 번째 항목을 반환하거나 목록이 비어있으면 None을 반환합니다."""
    return items[0] if items else None
```

### Protocol 기반 덕 타이핑

```python
from typing import Protocol

class Renderable(Protocol):
    def render(self) -> str:
        """객체를 문자열로 렌더링합니다."""

def render_all(items: list[Renderable]) -> str:
    """Renderable 프로토콜을 구현하는 모든 항목을 렌더링합니다."""
    return "\n".join(item.render() for item in items)
```

## 에러 처리 패턴

### 특정 예외 처리

```python
# 좋음: 특정 예외 잡기
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except FileNotFoundError as e:
        raise ConfigError(f"Config file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in config: {path}") from e

# 나쁨: 맨 except
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except:
        return None  # 조용한 실패!
```

### 예외 체이닝

```python
def process_data(data: str) -> Result:
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as e:
        # 트레이스백을 보존하기 위해 예외 체이닝
        raise ValueError(f"Failed to parse data: {data}") from e
```

### 커스텀 예외 계층구조

```python
class AppError(Exception):
    """모든 애플리케이션 에러의 기반 예외."""
    pass

class ValidationError(AppError):
    """입력 유효성 검사 실패 시 발생합니다."""
    pass

class NotFoundError(AppError):
    """요청한 리소스를 찾을 수 없을 때 발생합니다."""
    pass

# 사용법
def get_user(user_id: str) -> User:
    user = db.find_user(user_id)
    if not user:
        raise NotFoundError(f"User not found: {user_id}")
    return user
```

## 컨텍스트 매니저

### 리소스 관리

```python
# 좋음: 컨텍스트 매니저 사용
def process_file(path: str) -> str:
    with open(path, 'r') as f:
        return f.read()

# 나쁨: 수동 리소스 관리
def process_file(path: str) -> str:
    f = open(path, 'r')
    try:
        return f.read()
    finally:
        f.close()
```

### 커스텀 컨텍스트 매니저

```python
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    """코드 블록의 실행 시간을 측정하는 컨텍스트 매니저."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name} took {elapsed:.4f} seconds")

# 사용법
with timer("data processing"):
    process_large_dataset()
```

### 컨텍스트 매니저 클래스

```python
class DatabaseTransaction:
    def __init__(self, connection):
        self.connection = connection

    def __enter__(self):
        self.connection.begin_transaction()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.connection.commit()
        else:
            self.connection.rollback()
        return False  # 예외 억제 안 함

# 사용법
with DatabaseTransaction(conn):
    user = conn.create_user(user_data)
    conn.create_profile(user.id, profile_data)
```

## 컴프리헨션과 제너레이터

### 리스트 컴프리헨션

```python
# 좋음: 간단한 변환을 위한 리스트 컴프리헨션
names = [user.name for user in users if user.is_active]

# 나쁨: 수동 루프
names = []
for user in users:
    if user.is_active:
        names.append(user.name)

# 복잡한 컴프리헨션은 펼쳐야 합니다
# 나쁨: 너무 복잡함
result = [x * 2 for x in items if x > 0 if x % 2 == 0]

# 좋음: 제너레이터 함수 사용
def filter_and_transform(items: Iterable[int]) -> list[int]:
    result = []
    for x in items:
        if x > 0 and x % 2 == 0:
            result.append(x * 2)
    return result
```

### 제너레이터 표현식

```python
# 좋음: 지연 평가를 위한 제너레이터
total = sum(x * x for x in range(1_000_000))

# 나쁨: 큰 중간 리스트 생성
total = sum([x * x for x in range(1_000_000)])
```

### 제너레이터 함수

```python
def read_large_file(path: str) -> Iterator[str]:
    """대용량 파일을 한 줄씩 읽습니다."""
    with open(path) as f:
        for line in f:
            yield line.strip()

# 사용법
for line in read_large_file("huge.txt"):
    process(line)
```

## 데이터 클래스와 Named Tuple

### 데이터 클래스

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    """자동 __init__, __repr__, __eq__를 가진 사용자 엔티티."""
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

# 사용법
user = User(
    id="123",
    name="Alice",
    email="alice@example.com"
)
```

### 유효성 검사가 있는 데이터 클래스

```python
@dataclass
class User:
    email: str
    age: int

    def __post_init__(self):
        # 이메일 형식 검사
        if "@" not in self.email:
            raise ValueError(f"Invalid email: {self.email}")
        # 나이 범위 검사
        if self.age < 0 or self.age > 150:
            raise ValueError(f"Invalid age: {self.age}")
```

### Named Tuple

```python
from typing import NamedTuple

class Point(NamedTuple):
    """불변의 2D 포인트."""
    x: float
    y: float

    def distance(self, other: 'Point') -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

# 사용법
p1 = Point(0, 0)
p2 = Point(3, 4)
print(p1.distance(p2))  # 5.0
```

## 데코레이터

### 함수 데코레이터

```python
import functools
import time

def timer(func: Callable) -> Callable:
    """함수 실행 시간을 측정하는 데코레이터."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)

# slow_function() 출력: slow_function took 1.0012s
```

### 파라미터가 있는 데코레이터

```python
def repeat(times: int):
    """함수를 여러 번 반복 실행하는 데코레이터."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(times=3)
def greet(name: str) -> str:
    return f"Hello, {name}!"

# greet("Alice") 반환: ["Hello, Alice!", "Hello, Alice!", "Hello, Alice!"]
```

### 클래스 기반 데코레이터

```python
class CountCalls:
    """함수가 몇 번 호출됐는지 카운트하는 데코레이터."""
    def __init__(self, func: Callable):
        functools.update_wrapper(self, func)
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.func.__name__} has been called {self.count} times")
        return self.func(*args, **kwargs)

@CountCalls
def process():
    pass

# process() 호출 시마다 호출 횟수를 출력함
```

## 동시성 패턴

### I/O 바운드 작업을 위한 스레딩

```python
import concurrent.futures
import threading

def fetch_url(url: str) -> str:
    """URL을 가져옵니다 (I/O 바운드 작업)."""
    import urllib.request
    with urllib.request.urlopen(url) as response:
        return response.read().decode()

def fetch_all_urls(urls: list[str]) -> dict[str, str]:
    """스레드를 사용하여 여러 URL을 동시에 가져옵니다."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(fetch_url, url): url for url in urls}
        results = {}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                results[url] = future.result()
            except Exception as e:
                results[url] = f"Error: {e}"
    return results
```

### CPU 바운드 작업을 위한 멀티프로세싱

```python
def process_data(data: list[int]) -> int:
    """CPU 집약적 계산."""
    return sum(x ** 2 for x in data)

def process_all(datasets: list[list[int]]) -> list[int]:
    """여러 프로세스를 사용하여 여러 데이터셋을 처리합니다."""
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(executor.map(process_data, datasets))
    return results
```

### 동시 I/O를 위한 Async/Await

```python
import asyncio

async def fetch_async(url: str) -> str:
    """URL을 비동기로 가져옵니다."""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def fetch_all(urls: list[str]) -> dict[str, str]:
    """여러 URL을 동시에 가져옵니다."""
    tasks = [fetch_async(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return dict(zip(urls, results))
```

## 패키지 구성

### 표준 프로젝트 레이아웃

```
myproject/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       ├── models/
│       │   ├── __init__.py
│       │   └── user.py
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_api.py
│   └── test_models.py
├── pyproject.toml
├── README.md
└── .gitignore
```

### 임포트 규칙

```python
# 좋음: 임포트 순서 - 표준 라이브러리, 서드파티, 로컬
import os
import sys
from pathlib import Path

import requests
from fastapi import FastAPI

from mypackage.models import User
from mypackage.utils import format_name

# 좋음: 자동 임포트 정렬을 위해 isort 사용
# pip install isort
```

### 패키지 내보내기를 위한 __init__.py

```python
# mypackage/__init__.py
"""mypackage - 샘플 Python 패키지."""

__version__ = "1.0.0"

# 패키지 레벨에서 주요 클래스/함수 내보내기
from mypackage.models import User, Post
from mypackage.utils import format_name

__all__ = ["User", "Post", "format_name"]
```

## 메모리와 성능

### 메모리 효율성을 위한 __slots__ 사용

```python
# 나쁨: 일반 클래스는 __dict__ 사용 (더 많은 메모리)
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# 좋음: __slots__은 메모리 사용량을 줄임
class Point:
    __slots__ = ['x', 'y']

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
```

### 대용량 데이터를 위한 제너레이터

```python
# 나쁨: 전체 리스트를 메모리에 반환
def read_lines(path: str) -> list[str]:
    with open(path) as f:
        return [line.strip() for line in f]

# 좋음: 한 번에 한 줄씩 yield
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.strip()
```

### 루프에서 문자열 연결 피하기

```python
# 나쁨: 문자열 불변성으로 인해 O(n²)
result = ""
for item in items:
    result += str(item)

# 좋음: join을 사용하여 O(n)
result = "".join(str(item) for item in items)

# 좋음: StringIO를 사용하여 구성
from io import StringIO

buffer = StringIO()
for item in items:
    buffer.write(str(item))
result = buffer.getvalue()
```

## Python 도구 연동

### 필수 명령어

```bash
# 코드 포매팅
black .
isort .

# 린팅
ruff check .
pylint mypackage/

# 타입 검사
mypy .

# 테스팅
pytest --cov=mypackage --cov-report=html

# 보안 스캐닝
bandit -r .

# 의존성 관리
pip-audit
safety check
```

### pyproject.toml 설정

```toml
[project]
name = "mypackage"
version = "1.0.0"
requires-python = ">=3.9"
dependencies = [
    "requests>=2.31.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.5.0",
]

[tool.black]
line-length = 88
target-version = ['py39']

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=mypackage --cov-report=term-missing"
```

## 빠른 참조: Python 관용 표현

| 관용 표현 | 설명 |
|-------|-------------|
| EAFP | 허락보다 용서를 구하는 것이 쉽다 |
| 컨텍스트 매니저 | 리소스 관리를 위해 `with` 사용 |
| 리스트 컴프리헨션 | 간단한 변환에 사용 |
| 제너레이터 | 지연 평가 및 대용량 데이터셋에 사용 |
| 타입 힌트 | 함수 시그니처 어노테이션 |
| 데이터 클래스 | 자동 생성 메서드가 있는 데이터 컨테이너에 사용 |
| `__slots__` | 메모리 최적화에 사용 |
| f-strings | 문자열 포매팅에 사용 (Python 3.6+) |
| `pathlib.Path` | 경로 작업에 사용 (Python 3.4+) |
| `enumerate` | 루프에서 인덱스-요소 쌍에 사용 |

## 피해야 할 안티패턴

```python
# 나쁨: 가변 기본 인수
def append_to(item, items=[]):
    items.append(item)
    return items

# 좋음: None을 사용하고 새 리스트 생성
def append_to(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

# 나쁨: type()으로 타입 확인
if type(obj) == list:
    process(obj)

# 좋음: isinstance 사용
if isinstance(obj, list):
    process(obj)

# 나쁨: ==으로 None 비교
if value == None:
    process()

# 좋음: is 사용
if value is None:
    process()

# 나쁨: from module import *
from os.path import *

# 좋음: 명시적 임포트
from os.path import join, exists

# 나쁨: 맨 except
try:
    risky_operation()
except:
    pass

# 좋음: 특정 예외
try:
    risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
```

**기억하세요**: Python 코드는 읽기 쉽고, 명시적이어야 하며, 최소 놀라움의 원칙을 따라야 합니다. 의심스러울 때는 영리함보다 명확함을 우선시하세요.
