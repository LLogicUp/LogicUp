---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python 패턴

> 이 파일은 [common/patterns.md](../common/patterns.md)를 Python 전용 내용으로 확장합니다.

## Protocol (덕 타이핑)

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...
```

## DTO로서의 Dataclass

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## Context Manager와 Generator

- 리소스 관리에는 context manager (`with` 문) 사용
- 지연 평가와 메모리 효율적인 반복에는 generator 사용

## 참고

스킬: `python-patterns` — 데코레이터, 동시성, 패키지 구성을 포함한 포괄적인 패턴을 확인하세요.
