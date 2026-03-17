---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python 코딩 스타일

> 이 파일은 [common/coding-style.md](../common/coding-style.md)를 Python 전용 내용으로 확장합니다.

## 표준

- **PEP 8** 컨벤션 준수
- 모든 함수 시그니처에 **타입 어노테이션** 사용

## 불변성

불변 데이터 구조를 선호합니다:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## 포맷팅

- 코드 포맷팅에 **black** 사용
- import 정렬에 **isort** 사용
- 린팅에 **ruff** 사용

## 참고

스킬: `python-patterns` — 포괄적인 Python 관용구와 패턴을 확인하세요.
