---
name: instinct-status
description: 신뢰도와 함께 학습된 인스팅트(프로젝트 + 전역)를 표시합니다
command: true
---

# Instinct Status 명령

현재 프로젝트의 학습된 인스팅트와 전역 인스팅트를 도메인별로 그룹화하여 표시합니다.

## 구현

플러그인 루트 경로를 사용하여 instinct CLI를 실행합니다:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

`CLAUDE_PLUGIN_ROOT`가 설정되지 않은 경우 (수동 설치):

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py status
```

## 사용법

```
/instinct-status
```

## 수행 작업

1. 현재 프로젝트 컨텍스트 감지 (git remote/경로 해시)
2. `~/.claude/homunculus/projects/<project-id>/instincts/`에서 프로젝트 인스팅트 읽기
3. `~/.claude/homunculus/instincts/`에서 전역 인스팅트 읽기
4. 우선순위 규칙으로 병합 (ID 충돌 시 프로젝트가 전역 재정의)
5. 신뢰도 바와 관찰 통계로 도메인별 그룹화하여 표시

## 출력 형식

```
============================================================
  INSTINCT STATUS - 총 12개
============================================================

  프로젝트: my-app (a1b2c3d4e5f6)
  프로젝트 인스팅트: 8개
  전역 인스팅트:  4개

## 프로젝트 범위 (my-app)
  ### 워크플로 (3개)
    ███████░░░  70%  grep-before-edit [project]
              트리거: 코드 수정 시

## 전역 (모든 프로젝트에 적용)
  ### 보안 (2개)
    █████████░  85%  validate-user-input [global]
              트리거: 사용자 입력 처리 시
```
