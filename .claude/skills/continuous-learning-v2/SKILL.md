---
name: continuous-learning-v2
description: 훅을 통해 세션을 관찰하고, 신뢰도 점수가 있는 원자적 인스팅트를 생성하며, 이를 스킬/커맨드/에이전트로 발전시키는 인스팅트 기반 학습 시스템. v2.1은 프로젝트 간 오염을 방지하는 프로젝트 범위 인스팅트를 추가합니다.
origin: ECC
version: 2.1.0
---

# Continuous Learning v2.1 - 인스팅트 기반 아키텍처

Claude Code 세션을 신뢰도 점수가 있는 작은 학습 행동인 원자적 "인스팅트"를 통해 재사용 가능한 지식으로 전환하는 고급 학습 시스템입니다.

**v2.1**은 **프로젝트 범위 인스팅트**를 추가합니다 — React 패턴은 React 프로젝트에 머물고, Python 규칙은 Python 프로젝트에 머물며, "항상 입력을 검증하라" 같은 범용 패턴만 전역으로 공유됩니다.

## 활성화 시점

- Claude Code 세션에서 자동 학습 설정
- 훅을 통한 인스팅트 기반 행동 추출 구성
- 학습된 행동의 신뢰도 임계값 조정
- 인스팅트 라이브러리 검토, 내보내기, 가져오기
- 인스팅트를 완전한 스킬, 커맨드, 에이전트로 발전
- 프로젝트 범위 대 전역 인스팅트 관리
- 프로젝트에서 전역 범위로 인스팅트 승격

## v2.1의 새로운 기능

| 기능 | v2.0 | v2.1 |
|---------|------|------|
| 저장소 | 전역 (~/.claude/homunculus/) | 프로젝트 범위 (projects/<hash>/) |
| 범위 | 모든 인스팅트가 어디서나 적용 | 프로젝트 범위 + 전역 |
| 감지 | 없음 | git remote URL / 레포 경로 |
| 승격 | 해당 없음 | 2개 이상의 프로젝트에서 발견되면 프로젝트 → 전역 |
| 커맨드 | 4개 (status/evolve/export/import) | 6개 (+promote/projects) |
| 프로젝트 간 | 오염 위험 | 기본적으로 격리 |

## v2의 새로운 기능 (v1 대비)

| 기능 | v1 | v2 |
|---------|----|----|
| 관찰 | Stop hook (세션 종료) | PreToolUse/PostToolUse (100% 신뢰성) |
| 분석 | 메인 컨텍스트 | 백그라운드 에이전트 (Haiku) |
| 세분성 | 전체 스킬 | 원자적 "인스팅트" |
| 신뢰도 | 없음 | 0.3-0.9 가중치 |
| 발전 | 직접 스킬로 | 인스팅트 -> 클러스터 -> 스킬/커맨드/에이전트 |
| 공유 | 없음 | 인스팅트 내보내기/가져오기 |

## 인스팅트 모델

인스팅트는 작은 학습된 행동입니다:

```yaml
---
id: prefer-functional-style
trigger: "새 함수를 작성할 때"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# 함수형 스타일 선호

## 행동
적절한 경우 클래스보다 함수형 패턴을 사용합니다.

## 증거
- 함수형 패턴 선호를 5번 관찰
- 사용자가 2025-01-15에 클래스 기반 접근을 함수형으로 수정
```

**속성:**
- **원자적** -- 하나의 트리거, 하나의 행동
- **신뢰도 가중치** -- 0.3 = 잠정적, 0.9 = 거의 확실
- **도메인 태그** -- code-style, testing, git, debugging, workflow 등
- **증거 기반** -- 생성한 관찰 내용 추적
- **범위 인식** -- `project` (기본값) 또는 `global`

## 작동 방식

```
세션 활동 (git 레포에서)
      |
      | 훅이 프롬프트 + 도구 사용 캡처 (100% 신뢰성)
      | + 프로젝트 컨텍스트 감지 (git remote / 레포 경로)
      v
+---------------------------------------------+
|  projects/<project-hash>/observations.jsonl  |
|   (프롬프트, 도구 호출, 결과, 프로젝트)       |
+---------------------------------------------+
      |
      | 관찰자 에이전트가 읽음 (백그라운드, Haiku)
      v
+---------------------------------------------+
|          패턴 감지                           |
|   * 사용자 수정 -> 인스팅트                  |
|   * 오류 해결 -> 인스팅트                    |
|   * 반복 워크플로 -> 인스팅트                |
|   * 범위 결정: 프로젝트 또는 전역?           |
+---------------------------------------------+
      |
      | 생성/업데이트
      v
+---------------------------------------------+
|  projects/<project-hash>/instincts/personal/ |
|   * prefer-functional.yaml (0.7) [project]   |
|   * use-react-hooks.yaml (0.9) [project]     |
+---------------------------------------------+
|  instincts/personal/  (전역)                 |
|   * always-validate-input.yaml (0.85) [global]|
|   * grep-before-edit.yaml (0.6) [global]     |
+---------------------------------------------+
      |
      | /evolve 클러스터 + /promote
      v
+---------------------------------------------+
|  projects/<hash>/evolved/ (프로젝트 범위)    |
|  evolved/ (전역)                             |
|   * commands/new-feature.md                  |
|   * skills/testing-workflow.md               |
|   * agents/refactor-specialist.md            |
+---------------------------------------------+
```

## 프로젝트 감지

시스템이 현재 프로젝트를 자동으로 감지합니다:

1. **`CLAUDE_PROJECT_DIR` 환경 변수** (최우선)
2. **`git remote get-url origin`** -- 해시로 변환하여 이식 가능한 프로젝트 ID 생성 (다른 기기에서 같은 레포는 동일한 ID를 갖음)
3. **`git rev-parse --show-toplevel`** -- 레포 경로를 사용한 폴백 (기기별)
4. **전역 폴백** -- 프로젝트가 감지되지 않으면 인스팅트가 전역 범위로 이동

각 프로젝트는 12자 해시 ID를 갖습니다 (예: `a1b2c3d4e5f6`). `~/.claude/homunculus/projects.json`의 레지스트리 파일이 ID를 사람이 읽을 수 있는 이름에 매핑합니다.

## 빠른 시작

### 1. 관찰 훅 활성화

`~/.claude/settings.json`에 추가합니다.

**플러그인으로 설치된 경우 (권장):**

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }]
  }
}
```

**`~/.claude/skills`에 수동으로 설치된 경우:**

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }]
  }
}
```

### 2. 디렉토리 구조 초기화

첫 사용 시 시스템이 디렉토리를 자동으로 생성하지만, 수동으로 만들 수도 있습니다:

```bash
# 전역 디렉토리
mkdir -p ~/.claude/homunculus/{instincts/{personal,inherited},evolved/{agents,skills,commands},projects}

# 프로젝트 디렉토리는 훅이 git 레포에서 처음 실행될 때 자동 생성
```

### 3. 인스팅트 커맨드 사용

```bash
/instinct-status     # 학습된 인스팅트 표시 (프로젝트 + 전역)
/evolve              # 관련 인스팅트를 스킬/커맨드로 클러스터링
/instinct-export     # 인스팅트를 파일로 내보내기
/instinct-import     # 다른 사람의 인스팅트 가져오기
/promote             # 프로젝트 인스팅트를 전역 범위로 승격
/projects            # 알려진 모든 프로젝트와 인스팅트 수 나열
```

## 커맨드

| 커맨드 | 설명 |
|---------|-------------|
| `/instinct-status` | 모든 인스팅트 표시 (프로젝트 범위 + 전역) 신뢰도와 함께 |
| `/evolve` | 관련 인스팅트를 스킬/커맨드로 클러스터링, 승격 제안 |
| `/instinct-export` | 인스팅트 내보내기 (범위/도메인별 필터 가능) |
| `/instinct-import <file>` | 범위 제어와 함께 인스팅트 가져오기 |
| `/promote [id]` | 프로젝트 인스팅트를 전역 범위로 승격 |
| `/projects` | 알려진 모든 프로젝트와 인스팅트 수 나열 |

## 구성

`config.json`을 편집하여 백그라운드 관찰자를 제어합니다:

```json
{
  "version": "2.1",
  "observer": {
    "enabled": false,
    "run_interval_minutes": 5,
    "min_observations_to_analyze": 20
  }
}
```

| 키 | 기본값 | 설명 |
|-----|---------|-------------|
| `observer.enabled` | `false` | 백그라운드 관찰자 에이전트 활성화 |
| `observer.run_interval_minutes` | `5` | 관찰자가 관찰을 분석하는 빈도 |
| `observer.min_observations_to_analyze` | `20` | 분석 실행 전 최소 관찰 수 |

기타 동작 (관찰 캡처, 인스팅트 임계값, 프로젝트 범위 지정, 승격 기준)은 `instinct-cli.py`와 `observe.sh`의 코드 기본값을 통해 구성됩니다.

## 파일 구조

```
~/.claude/homunculus/
+-- identity.json           # 프로필, 기술 수준
+-- projects.json           # 레지스트리: 프로젝트 해시 -> 이름/경로/remote
+-- observations.jsonl      # 전역 관찰 (폴백)
+-- instincts/
|   +-- personal/           # 전역 자동 학습 인스팅트
|   +-- inherited/          # 전역 가져온 인스팅트
+-- evolved/
|   +-- agents/             # 전역 생성된 에이전트
|   +-- skills/             # 전역 생성된 스킬
|   +-- commands/           # 전역 생성된 커맨드
+-- projects/
    +-- a1b2c3d4e5f6/       # 프로젝트 해시 (git remote URL에서)
    |   +-- observations.jsonl
    |   +-- observations.archive/
    |   +-- instincts/
    |   |   +-- personal/   # 프로젝트별 자동 학습
    |   |   +-- inherited/  # 프로젝트별 가져오기
    |   +-- evolved/
    |       +-- skills/
    |       +-- commands/
    |       +-- agents/
    +-- f6e5d4c3b2a1/       # 다른 프로젝트
        +-- ...
```

## 범위 결정 가이드

| 패턴 유형 | 범위 | 예시 |
|-------------|-------|---------|
| 언어/프레임워크 규칙 | **project** | "React hooks 사용", "Django REST 패턴 따르기" |
| 파일 구조 선호도 | **project** | "`__tests__`/에 테스트", "src/components/에 컴포넌트" |
| 코드 스타일 | **project** | "함수형 스타일 사용", "dataclass 선호" |
| 오류 처리 전략 | **project** | "오류에 Result 타입 사용" |
| 보안 관행 | **global** | "사용자 입력 검증", "SQL 새니타이징" |
| 일반 모범 사례 | **global** | "테스트 먼저 작성", "항상 오류 처리" |
| 도구 워크플로 선호도 | **global** | "편집 전 Grep", "쓰기 전 읽기" |
| Git 관행 | **global** | "Conventional commits", "작은 집중된 커밋" |

## 인스팅트 승격 (프로젝트 -> 전역)

동일한 인스팅트가 높은 신뢰도로 여러 프로젝트에 나타나면 전역 범위로 승격할 후보가 됩니다.

**자동 승격 기준:**
- 2개 이상의 프로젝트에서 동일한 인스팅트 ID
- 평균 신뢰도 >= 0.8

**승격 방법:**

```bash
# 특정 인스팅트 승격
python3 instinct-cli.py promote prefer-explicit-errors

# 자격을 갖춘 모든 인스팅트 자동 승격
python3 instinct-cli.py promote

# 변경 없이 미리보기
python3 instinct-cli.py promote --dry-run
```

`/evolve` 커맨드도 승격 후보를 제안합니다.

## 신뢰도 점수

신뢰도는 시간이 지남에 따라 발전합니다:

| 점수 | 의미 | 행동 |
|-------|---------|----------|
| 0.3 | 잠정적 | 제안되지만 강제되지 않음 |
| 0.5 | 보통 | 관련 시 적용 |
| 0.7 | 강함 | 적용을 위해 자동 승인 |
| 0.9 | 거의 확실 | 핵심 행동 |

**신뢰도 증가** 시:
- 패턴이 반복적으로 관찰될 때
- 사용자가 제안된 행동을 수정하지 않을 때
- 다른 소스의 유사 인스팅트가 동의할 때

**신뢰도 감소** 시:
- 사용자가 명시적으로 행동을 수정할 때
- 패턴이 장기간 관찰되지 않을 때
- 반박하는 증거가 나타날 때

## 관찰에 스킬 대신 훅을 사용하는 이유

> "v1은 관찰을 위해 스킬에 의존했습니다. 스킬은 확률적 — Claude의 판단에 따라 약 50-80% 확률로 실행됩니다."

훅은 **100% 확실하게** 결정적으로 실행됩니다. 이는 다음을 의미합니다:
- 모든 도구 호출이 관찰됨
- 어떤 패턴도 누락되지 않음
- 학습이 포괄적

## 하위 호환성

v2.1은 v2.0 및 v1과 완전히 호환됩니다:
- `~/.claude/homunculus/instincts/`의 기존 전역 인스팅트는 여전히 전역 인스팅트로 작동
- v1의 기존 `~/.claude/skills/learned/` 스킬은 여전히 작동
- Stop hook은 여전히 실행됨 (하지만 이제 v2에도 피드백)
- 점진적 마이그레이션: 둘 다 병렬로 실행

## 개인 정보 보호

- 관찰은 기기에 **로컬**로 유지됨
- 프로젝트 범위 인스팅트는 프로젝트별로 격리됨
- 내보내기 가능한 것은 원시 관찰이 아닌 **인스팅트** (패턴)만
- 실제 코드나 대화 내용이 공유되지 않음
- 내보내고 승격할 것을 직접 제어

## 관련 자료

- [Skill Creator](https://skill-creator.app) - 레포 히스토리에서 인스팅트 생성
- Homunculus - v2 인스팅트 기반 아키텍처(원자적 관찰, 신뢰도 점수, 인스팅트 발전 파이프라인)에 영감을 준 커뮤니티 프로젝트
- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - 지속적 학습 섹션

---

*인스팅트 기반 학습: 한 번에 하나의 프로젝트씩 Claude에게 당신의 패턴을 가르칩니다.*
