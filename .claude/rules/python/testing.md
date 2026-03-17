---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python 테스트

> 이 파일은 [common/testing.md](../common/testing.md)를 Python 전용 내용으로 확장합니다.

## 프레임워크

테스트 프레임워크로 **pytest**를 사용합니다.

## 커버리지

```bash
pytest --cov=src --cov-report=term-missing
```

## 테스트 구성

테스트 분류에 `pytest.mark`를 사용합니다:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```

## 참고

스킬: `python-testing` — 상세한 pytest 패턴과 fixture를 확인하세요.
