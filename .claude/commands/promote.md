---
name: promote
description: 프로젝트 범위의 instinct를 전역 범위로 승격합니다
command: true
---

# Promote 명령

continuous-learning-v2에서 instinct를 프로젝트 범위에서 전역 범위로 승격합니다.

## 구현

플러그인 루트 경로를 사용하여 instinct CLI 실행:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" promote [instinct-id] [--force] [--dry-run]
```

`CLAUDE_PLUGIN_ROOT`가 설정되지 않은 경우 (수동 설치):

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py promote [instinct-id] [--force] [--dry-run]
```

## 사용법

```bash
/promote                      # 승격 후보 자동 감지
/promote --dry-run            # 자동 승격 후보 미리보기
/promote --force              # 확인 없이 자격 갖춘 후보 모두 승격
/promote grep-before-edit     # 현재 프로젝트에서 특정 instinct 하나 승격
```

## 수행할 작업

1. 현재 프로젝트 감지
2. `instinct-id`가 제공된 경우, 해당 instinct만 승격 (현재 프로젝트에 있는 경우)
3. 그렇지 않으면 다음 조건을 만족하는 교차 프로젝트 후보 탐색:
   - 최소 2개의 프로젝트에 등장
   - 신뢰도 임계값 충족
4. 승격된 instinct를 `~/.claude/homunculus/instincts/personal/`에 `scope: global`로 저장
