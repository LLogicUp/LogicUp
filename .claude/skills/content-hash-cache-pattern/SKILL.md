---
name: content-hash-cache-pattern
description: SHA-256 콘텐츠 해시를 사용하여 비용이 큰 파일 처리 결과를 캐시 — 경로 독립적, 자동 무효화, 서비스 레이어 분리 방식.
origin: ECC
---

# 콘텐츠 해시 파일 캐시 패턴

SHA-256 콘텐츠 해시를 캐시 키로 사용하여 비용이 큰 파일 처리 결과(PDF 파싱, 텍스트 추출, 이미지 분석)를 캐시합니다. 경로 기반 캐싱과 달리, 이 방식은 파일 이동/이름 변경 후에도 유효하며 내용 변경 시 자동으로 무효화됩니다.

## 활성화 시점

- 파일 처리 파이프라인 구축 시 (PDF, 이미지, 텍스트 추출)
- 처리 비용이 높고 같은 파일이 반복적으로 처리될 때
- `--cache/--no-cache` CLI 옵션이 필요할 때
- 기존 순수 함수에 함수 수정 없이 캐싱을 추가하려 할 때

## 핵심 패턴

### 1. 콘텐츠 해시 기반 캐시 키

경로가 아닌 파일 내용을 캐시 키로 사용합니다:

```python
import hashlib
from pathlib import Path

_HASH_CHUNK_SIZE = 65536  # 대용량 파일을 위한 64KB 청크

def compute_file_hash(path: Path) -> str:
    """파일 내용의 SHA-256 (대용량 파일을 위한 청크 처리)."""
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(_HASH_CHUNK_SIZE)
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()
```

**콘텐츠 해시를 사용하는 이유?** 파일 이름 변경/이동 = 캐시 히트. 내용 변경 = 자동 무효화. 인덱스 파일 불필요.

### 2. 캐시 항목을 위한 Frozen Dataclass

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CacheEntry:
    file_hash: str
    source_path: str
    document: ExtractedDocument  # 캐시된 결과
```

### 3. 파일 기반 캐시 스토리지

각 캐시 항목은 `{hash}.json`으로 저장 — 해시로 O(1) 조회, 인덱스 파일 불필요.

```python
import json
from typing import Any

def write_cache(cache_dir: Path, entry: CacheEntry) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{entry.file_hash}.json"
    data = serialize_entry(entry)
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

def read_cache(cache_dir: Path, file_hash: str) -> CacheEntry | None:
    cache_file = cache_dir / f"{file_hash}.json"
    if not cache_file.is_file():
        return None
    try:
        raw = cache_file.read_text(encoding="utf-8")
        data = json.loads(raw)
        return deserialize_entry(data)
    except (json.JSONDecodeError, ValueError, KeyError):
        return None  # 손상을 캐시 미스로 처리
```

### 4. 서비스 레이어 래퍼 (단일 책임 원칙)

처리 함수를 순수하게 유지합니다. 캐싱은 별도의 서비스 레이어로 추가합니다.

```python
def extract_with_cache(
    file_path: Path,
    *,
    cache_enabled: bool = True,
    cache_dir: Path = Path(".cache"),
) -> ExtractedDocument:
    """서비스 레이어: 캐시 확인 -> 추출 -> 캐시 쓰기."""
    if not cache_enabled:
        return extract_text(file_path)  # 순수 함수, 캐시 관련 지식 없음

    file_hash = compute_file_hash(file_path)

    # 캐시 확인
    cached = read_cache(cache_dir, file_hash)
    if cached is not None:
        logger.info("Cache hit: %s (hash=%s)", file_path.name, file_hash[:12])
        return cached.document

    # 캐시 미스 -> 추출 -> 저장
    logger.info("Cache miss: %s (hash=%s)", file_path.name, file_hash[:12])
    doc = extract_text(file_path)
    entry = CacheEntry(file_hash=file_hash, source_path=str(file_path), document=doc)
    write_cache(cache_dir, entry)
    return doc
```

## 핵심 설계 결정

| 결정 | 근거 |
|------|------|
| SHA-256 콘텐츠 해시 | 경로 독립적, 내용 변경 시 자동 무효화 |
| `{hash}.json` 파일 네이밍 | O(1) 조회, 인덱스 파일 불필요 |
| 서비스 레이어 래퍼 | 단일 책임 원칙: 추출은 순수하게, 캐시는 별도 관심사 |
| 수동 JSON 직렬화 | Frozen dataclass 직렬화에 대한 완전한 제어 |
| 손상 시 `None` 반환 | 점진적 성능 저하, 다음 실행 시 재처리 |
| `cache_dir.mkdir(parents=True)` | 첫 번째 쓰기 시 지연 디렉토리 생성 |

## 모범 사례

- **경로가 아닌 내용을 해시화** — 경로는 변하지만 내용 정체성은 그렇지 않음
- **대용량 파일 해싱 시 청크 처리** — 전체 파일을 메모리에 로드하지 않음
- **처리 함수를 순수하게 유지** — 캐싱에 대해 아무것도 알 필요 없음
- **디버깅을 위해 캐시 히트/미스를 잘린 해시와 함께 로깅**
- **손상을 우아하게 처리** — 유효하지 않은 캐시 항목을 미스로 처리, 절대 충돌하지 않음

## 피해야 할 안티패턴

```python
# 나쁨: 경로 기반 캐싱 (파일 이동/이름 변경 시 깨짐)
cache = {"/path/to/file.pdf": result}

# 나쁨: 처리 함수 내부에 캐시 로직 추가 (단일 책임 원칙 위반)
def extract_text(path, *, cache_enabled=False, cache_dir=None):
    if cache_enabled:  # 이제 이 함수는 두 가지 책임을 가짐
        ...

# 나쁨: 중첩된 frozen dataclass에 dataclasses.asdict() 사용
# (복잡한 중첩 타입에서 문제가 발생할 수 있음)
data = dataclasses.asdict(entry)  # 대신 수동 직렬화 사용
```

## 사용해야 할 때

- 파일 처리 파이프라인 (PDF 파싱, OCR, 텍스트 추출, 이미지 분석)
- `--cache/--no-cache` 옵션이 도움이 되는 CLI 도구
- 실행 간 동일한 파일이 나타나는 배치 처리
- 기존 순수 함수에 함수 수정 없이 캐싱 추가 시

## 사용하지 말아야 할 때

- 항상 최신 데이터가 필요한 경우 (실시간 피드)
- 캐시 항목이 매우 클 경우 (스트리밍 고려)
- 파일 내용 외의 파라미터에 따라 결과가 달라지는 경우 (예: 다른 추출 설정)
