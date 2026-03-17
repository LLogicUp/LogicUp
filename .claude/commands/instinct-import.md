---
name: instinct-import
description: 파일 또는 URL에서 인스팅트를 프로젝트/전역 범위로 가져옵니다
command: true
---

# Instinct Import 명령

## 구현

플러그인 루트 경로를 사용하여 instinct CLI를 실행합니다:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" import <file-or-url> [--dry-run] [--force] [--min-confidence 0.7] [--scope project|global]
```

`CLAUDE_PLUGIN_ROOT`가 설정되지 않은 경우 (수동 설치):

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py import <file-or-url>
```

로컬 파일 경로 또는 HTTP(S) URL에서 인스팅트를 가져옵니다.

## 사용법

```
/instinct-import team-instincts.yaml
/instinct-import https://github.com/org/repo/instincts.yaml
/instinct-import team-instincts.yaml --dry-run
/instinct-import team-instincts.yaml --scope global --force
```

## 수행 작업

1. 인스팅트 파일 가져오기 (로컬 경로 또는 URL)
2. 형식 파싱 및 유효성 검사
3. 기존 인스팅트와 중복 확인
4. 새 인스팅트 병합 또는 추가
5. 상속된 인스팅트 디렉토리에 저장:
   - 프로젝트 범위: `~/.claude/homunculus/projects/<project-id>/instincts/inherited/`
   - 전역 범위: `~/.claude/homunculus/instincts/inherited/`

## 가져오기 프로세스

```
📥 인스팅트 가져오는 중: team-instincts.yaml
================================================

가져올 인스팅트 12개 발견.

충돌 분석 중...

## 새 인스팅트 (8개)
추가될 항목:
  ✓ use-zod-validation (신뢰도: 0.7)
  ✓ prefer-named-exports (신뢰도: 0.65)
  ✓ test-async-functions (신뢰도: 0.8)
  ...

## 중복 인스팅트 (3개)
유사한 인스팅트 이미 존재:
  ⚠️ prefer-functional-style
     로컬: 신뢰도 0.8, 관찰 12회
     가져오기: 신뢰도 0.7
     → 로컬 유지 (더 높은 신뢰도)

  ⚠️ test-first-workflow
     로컬: 신뢰도 0.75
     가져오기: 신뢰도 0.9
     → 가져오기로 업데이트 (더 높은 신뢰도)

새 인스팅트 8개 추가, 1개 업데이트하시겠습니까?
```

## 병합 동작

기존 ID를 가진 인스팅트를 가져올 때:
- 더 높은 신뢰도의 가져오기 항목은 업데이트 후보가 됨
- 동일하거나 낮은 신뢰도의 가져오기 항목은 건너뜀
- `--force` 사용 시 제외하고 사용자 확인 필요

## 출처 추적

가져온 인스팅트는 다음으로 표시됩니다:
```yaml
source: inherited
scope: project
imported_from: "team-instincts.yaml"
project_id: "a1b2c3d4e5f6"
project_name: "my-project"
```

## 플래그

- `--dry-run`: 실제 가져오기 없이 미리보기
- `--force`: 확인 프롬프트 건너뛰기
- `--min-confidence <n>`: 임계값 이상의 인스팅트만 가져오기
- `--scope <project|global>`: 대상 범위 선택 (기본값: `project`)

## 출력

가져오기 완료 후:
```
✅ 가져오기 완료!

추가됨: 8개 인스팅트
업데이트됨: 1개 인스팅트
건너뜀: 3개 인스팅트 (동일하거나 더 높은 신뢰도 이미 존재)

새 인스팅트 저장 위치: ~/.claude/homunculus/instincts/inherited/

/instinct-status 실행으로 모든 인스팅트를 확인하세요.
```
