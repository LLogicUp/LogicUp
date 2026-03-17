---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python 보안

> 이 파일은 [common/security.md](../common/security.md)를 Python 전용 내용으로 확장합니다.

## 시크릿 관리

```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # 없으면 KeyError 발생
```

## 보안 스캐닝

- 정적 보안 분석에 **bandit** 사용:
  ```bash
  bandit -r src/
  ```

## 참고

스킬: `django-security` — Django 전용 보안 가이드라인을 확인하세요 (해당하는 경우).
