---
name: plankton-code-quality
description: "Plankton을 활용한 파일 편집 시 자동 포맷팅, 린팅, Claude 기반 수정 기능을 제공하는 작성 시점 코드 품질 관리 시스템."
origin: community
---

# Plankton 코드 품질 스킬

Plankton(@alxfazio 제작)의 Claude Code 연동 참고 문서입니다. Plankton은 PostToolUse 훅을 통해 파일 편집 시마다 포맷터와 린터를 실행하고, 에이전트가 잡지 못한 위반 사항을 Claude 서브프로세스를 생성해 수정하는 작성 시점 코드 품질 관리 시스템입니다.

## 사용 시점

- 파일 편집 시마다 자동 포맷팅 및 린팅을 원할 때 (커밋 시점이 아닌 작성 시점)
- 에이전트가 코드를 수정하는 대신 린터 설정을 변경하는 것을 방어해야 할 때
- 수정에 단계별 모델 라우팅이 필요할 때 (간단한 스타일은 Haiku, 로직은 Sonnet, 타입은 Opus)
- 여러 언어를 사용할 때 (Python, TypeScript, Shell, YAML, JSON, TOML, Markdown, Dockerfile)

## 동작 방식

### 3단계 아키텍처

Claude Code가 파일을 편집하거나 작성할 때마다 Plankton의 `multi_linter.sh` PostToolUse 훅이 실행됩니다.

```
1단계: 자동 포맷 (자동 처리)
├─ 포맷터 실행 (ruff format, biome, shfmt, taplo, markdownlint)
├─ 문제의 40-50%를 자동으로 수정
└─ 메인 에이전트에 출력 없음

2단계: 위반 수집 (JSON)
├─ 린터 실행 및 수정 불가 위반 수집
├─ 구조화된 JSON 반환: {line, column, code, message, linter}
└─ 메인 에이전트에 출력 없음

3단계: 위임 및 검증
├─ 위반 JSON과 함께 claude -p 서브프로세스 생성
├─ 위반 복잡도에 따라 모델 계층 라우팅:
│   ├─ Haiku: 포맷팅, 임포트, 스타일 (E/W/F 코드) — 120초 타임아웃
│   ├─ Sonnet: 복잡도, 리팩토링 (C901, PLR 코드) — 300초 타임아웃
│   └─ Opus: 타입 시스템, 심층 추론 (unresolved-attribute) — 600초 타임아웃
├─ 1+2단계를 재실행하여 수정 검증
└─ 이상 없으면 Exit 0, 위반 남으면 Exit 2 (메인 에이전트에 보고)
```

### 메인 에이전트가 보는 내용

| 상황 | 에이전트가 보는 내용 | 훅 종료 코드 |
|----------|-----------|-----------|
| 위반 없음 | 없음 | 0 |
| 서브프로세스가 모두 수정 | 없음 | 0 |
| 서브프로세스 처리 후에도 위반 남음 | `[hook] N개 위반 사항 남음` | 2 |
| 권고사항 (중복, 구식 도구) | `[hook:advisory] ...` | 0 |

메인 에이전트에는 서브프로세스가 수정하지 못한 문제만 전달됩니다. 대부분의 품질 문제는 투명하게 해결됩니다.

### 설정 보호 (규칙 우회 방어)

LLM은 코드를 수정하는 대신 `.ruff.toml`이나 `biome.json`의 규칙을 비활성화하려 합니다. Plankton은 세 가지 계층으로 이를 차단합니다.

1. **PreToolUse 훅** — `protect_linter_configs.sh`가 모든 린터 설정 편집을 사전 차단
2. **Stop 훅** — `stop_config_guardian.sh`가 세션 종료 시 `git diff`로 설정 변경 감지
3. **보호 파일 목록** — `.ruff.toml`, `biome.json`, `.shellcheckrc`, `.yamllint`, `.hadolint.yaml` 등

### 패키지 매니저 강제

Bash에 대한 PreToolUse 훅이 구식 패키지 매니저를 차단합니다.
- `pip`, `pip3`, `poetry`, `pipenv` → 차단 (`uv` 사용)
- `npm`, `yarn`, `pnpm` → 차단 (`bun` 사용)
- 허용 예외: `npm audit`, `npm view`, `npm publish`

## 설치

### 빠른 시작

```bash
# 프로젝트 또는 공유 위치에 Plankton 클론
# 참고: Plankton은 @alxfazio 제작
git clone https://github.com/alexfazio/plankton.git
cd plankton

# 핵심 의존성 설치
brew install jaq ruff uv

# Python 린터 설치
uv sync --all-extras

# Claude Code 시작 — 훅 자동 활성화
claude
```

별도 설치 명령이나 플러그인 설정이 필요 없습니다. `.claude/settings.json`의 훅은 Plankton 디렉토리에서 Claude Code를 실행하면 자동으로 적용됩니다.

### 프로젝트별 연동

자신의 프로젝트에 Plankton 훅을 적용하려면:

1. `.claude/hooks/` 디렉토리를 프로젝트에 복사
2. `.claude/settings.json` 훅 설정 복사
3. 린터 설정 파일 복사 (`.ruff.toml`, `biome.json` 등)
4. 사용 언어에 맞는 린터 설치

### 언어별 의존성

| 언어 | 필수 | 선택 |
|----------|----------|----------|
| Python | `ruff`, `uv` | `ty` (타입), `vulture` (데드 코드), `bandit` (보안) |
| TypeScript/JS | `biome` | `oxlint`, `semgrep`, `knip` (데드 익스포트) |
| Shell | `shellcheck`, `shfmt` | — |
| YAML | `yamllint` | — |
| Markdown | `markdownlint-cli2` | — |
| Dockerfile | `hadolint` (>= 2.12.0) | — |
| TOML | `taplo` | — |
| JSON | `jaq` | — |

## ECC와 함께 사용하기

### 상호 보완적, 중복 없음

| 관심사 | ECC | Plankton |
|---------|-----|----------|
| 코드 품질 관리 | PostToolUse 훅 (Prettier, tsc) | PostToolUse 훅 (20개 이상 린터 + 서브프로세스 수정) |
| 보안 스캔 | AgentShield, security-reviewer 에이전트 | Bandit (Python), Semgrep (TypeScript) |
| 설정 보호 | — | PreToolUse 차단 + Stop 훅 감지 |
| 패키지 매니저 | 감지 + 설정 | 강제 (구식 PM 차단) |
| CI 연동 | — | git 사전 커밋 훅 |
| 모델 라우팅 | 수동 (`/model opus`) | 자동 (위반 복잡도 → 계층) |

### 권장 조합

1. ECC를 플러그인으로 설치 (에이전트, 스킬, 명령어, 규칙)
2. 작성 시점 품질 관리를 위해 Plankton 훅 추가
3. 보안 감사를 위해 AgentShield 사용
4. PR 전 최종 게이트로 ECC의 검증 루프 활용

### 훅 충돌 방지

ECC와 Plankton 훅을 함께 실행하는 경우:
- ECC의 Prettier 훅과 Plankton의 biome 포맷터가 JS/TS 파일에서 충돌할 수 있음
- 해결: Plankton 사용 시 ECC의 Prettier PostToolUse 훅 비활성화 (Plankton의 biome이 더 포괄적)
- 서로 다른 파일 유형에서는 공존 가능 (ECC는 Plankton이 처리하지 않는 파일 담당)

## 설정 참고

Plankton의 `.claude/hooks/config.json`으로 모든 동작을 제어합니다.

```json
{
  "languages": {
    "python": true,
    "shell": true,
    "yaml": true,
    "json": true,
    "toml": true,
    "dockerfile": true,
    "markdown": true,
    "typescript": {
      "enabled": true,
      "js_runtime": "auto",
      "biome_nursery": "warn",
      "semgrep": true
    }
  },
  "phases": {
    "auto_format": true,
    "subprocess_delegation": true
  },
  "subprocess": {
    "tiers": {
      "haiku":  { "timeout": 120, "max_turns": 10 },
      "sonnet": { "timeout": 300, "max_turns": 10 },
      "opus":   { "timeout": 600, "max_turns": 15 }
    },
    "volume_threshold": 5
  }
}
```

**주요 설정:**
- 사용하지 않는 언어는 비활성화하여 훅 속도 향상
- `volume_threshold` — 이 값을 초과하는 위반 수가 있으면 더 높은 모델 계층으로 자동 에스컬레이션
- `subprocess_delegation: false` — 3단계를 완전히 건너뛰고 위반만 보고

## 환경 변수 재정의

| 변수 | 용도 |
|----------|---------|
| `HOOK_SKIP_SUBPROCESS=1` | 3단계 건너뛰고 위반 직접 보고 |
| `HOOK_SUBPROCESS_TIMEOUT=N` | 계층 타임아웃 재정의 |
| `HOOK_DEBUG_MODEL=1` | 모델 선택 결정 로깅 |
| `HOOK_SKIP_PM=1` | 패키지 매니저 강제 우회 |

## 참고 자료

- Plankton (@alxfazio 제작)
- Plankton REFERENCE.md — 전체 아키텍처 문서 (@alxfazio 제작)
- Plankton SETUP.md — 상세 설치 가이드 (@alxfazio 제작)
