---
description: "Claude 스킬과 명령어의 품질 감사 시 사용하세요. 변경된 스킬만 처리하는 빠른 스캔(Quick Scan) 모드와 순차적 서브에이전트 배치 평가를 사용한 전체 재고 조사(Full Stocktake) 모드를 지원합니다."
origin: ECC
---

# skill-stocktake

품질 체크리스트와 AI 전체적 판단을 사용하여 모든 Claude 스킬과 명령어를 감사하는 슬래시 명령어(`/skill-stocktake`)입니다. 최근 변경된 스킬을 위한 빠른 스캔과 전체 검토를 위한 완전한 재고 조사 두 가지 모드를 지원합니다.

## 범위

이 명령어는 **호출된 디렉토리를 기준으로** 다음 경로를 대상으로 합니다:

| 경로 | 설명 |
|------|-------------|
| `~/.claude/skills/` | 전역 스킬 (모든 프로젝트) |
| `{cwd}/.claude/skills/` | 프로젝트 수준 스킬 (디렉토리가 존재하는 경우) |

**1단계 시작 시, 명령어는 발견되고 스캔된 경로를 명시적으로 나열합니다.**

### 특정 프로젝트 대상 지정

프로젝트 수준 스킬을 포함하려면 해당 프로젝트의 루트 디렉토리에서 실행하세요:

```bash
cd ~/path/to/my-project
/skill-stocktake
```

프로젝트에 `.claude/skills/` 디렉토리가 없으면 전역 스킬과 명령어만 평가합니다.

## 모드

| 모드 | 트리거 | 소요 시간 |
|------|---------|---------|
| 빠른 스캔 | `results.json` 존재 시 (기본값) | 5~10분 |
| 전체 재고 조사 | `results.json` 없거나 `/skill-stocktake full` | 20~30분 |

**결과 캐시:** `~/.claude/skills/skill-stocktake/results.json`

## 빠른 스캔 흐름

마지막 실행 이후 변경된 스킬만 재평가합니다 (5~10분).

1. `~/.claude/skills/skill-stocktake/results.json` 읽기
2. 실행: `bash ~/.claude/skills/skill-stocktake/scripts/quick-diff.sh \
         ~/.claude/skills/skill-stocktake/results.json`
   (프로젝트 디렉토리는 `$PWD/.claude/skills`에서 자동 감지됨; 필요한 경우에만 명시적으로 전달)
3. 출력이 `[]`이면: "마지막 실행 이후 변경 없음"을 보고하고 중지
4. 변경된 파일만 동일한 2단계 기준으로 재평가
5. 이전 결과에서 변경되지 않은 스킬 유지
6. 차이점만 출력
7. 실행: `bash ~/.claude/skills/skill-stocktake/scripts/save-results.sh \
         ~/.claude/skills/skill-stocktake/results.json <<< "$EVAL_RESULTS"`

## 전체 재고 조사 흐름

### 1단계 — 인벤토리

실행: `bash ~/.claude/skills/skill-stocktake/scripts/scan.sh`

스크립트는 스킬 파일을 열거하고, 프론트매터를 추출하고, UTC mtime을 수집합니다.
프로젝트 디렉토리는 `$PWD/.claude/skills`에서 자동 감지됨; 필요한 경우에만 명시적으로 전달.
스크립트 출력에서 스캔 요약과 인벤토리 표를 표시:

```
스캔 중:
  ✓ ~/.claude/skills/         (17개 파일)
  ✗ {cwd}/.claude/skills/    (찾을 수 없음 — 전역 스킬만)
```

| 스킬 | 7일 사용 | 30일 사용 | 설명 |
|-------|--------|---------|-------------|

### 2단계 — 품질 평가

전체 인벤토리와 체크리스트로 Task 도구 서브에이전트(**Explore 에이전트, 모델: opus**)를 실행합니다.
서브에이전트는 각 스킬을 읽고, 체크리스트를 적용하고, 스킬별 JSON을 반환합니다:

`{ "verdict": "Keep"|"Improve"|"Update"|"Retire"|"Merge into [X]", "reason": "..." }`

**청크 지침:** 컨텍스트를 관리 가능하게 유지하기 위해 서브에이전트 호출당 ~20개 스킬을 처리합니다. 각 청크 후 중간 결과를 `results.json`에 저장합니다 (`status: "in_progress"`).

모든 스킬 평가 후: `status: "completed"` 설정, 3단계로 진행.

**재개 감지:** 시작 시 `status: "in_progress"`가 발견되면 첫 번째 미평가 스킬부터 재개합니다.

각 스킬은 다음 체크리스트에 따라 평가됩니다:

```
- [ ] 다른 스킬과 콘텐츠 중복 확인
- [ ] MEMORY.md / CLAUDE.md와 중복 확인
- [ ] 기술 참조 신선도 검증 (도구 이름 / CLI 플래그 / API가 있으면 WebSearch 사용)
- [ ] 사용 빈도 고려
```

판정 기준:

| 판정 | 의미 |
|---------|---------|
| Keep | 유용하고 최신 상태 |
| Improve | 유지할 가치가 있지만 특정 개선 필요 |
| Update | 참조된 기술이 오래됨 (WebSearch로 확인) |
| Retire | 낮은 품질, 오래되거나 비용 대비 효과 없음 |
| Merge into [X] | 다른 스킬과 상당한 중복; 병합 대상 명시 |

평가는 **전체적인 AI 판단** — 수치 루브릭 없음. 안내 차원:
- **실행 가능성**: 즉시 행동할 수 있는 코드 예시, 명령어, 또는 단계
- **범위 적합성**: 이름, 트리거, 내용이 일치; 너무 넓거나 좁지 않음
- **고유성**: MEMORY.md / CLAUDE.md / 다른 스킬로 대체 불가능한 가치
- **최신성**: 기술 참조가 현재 환경에서 작동

**이유 품질 요구사항** — `reason` 필드는 독립적이고 결정을 내리는 데 충분해야 합니다:
- "unchanged"만 단독으로 쓰지 말 것 — 항상 핵심 근거 재설명
- **Retire**: (1) 발견된 구체적 결함, (2) 동일한 필요를 충족하는 대안 명시
  - 나쁜 예: `"Superseded"`
  - 좋은 예: `"disable-model-invocation: true가 이미 설정됨; continuous-learning-v2에 의해 대체됨 (동일한 패턴 + 신뢰도 점수 포함). 고유한 내용 없음."`
- **Merge**: 대상 명시 및 통합할 내용 설명
  - 나쁜 예: `"X와 중복"`
  - 좋은 예: `"42줄 얇은 내용; chatlog-to-article의 4단계가 이미 동일한 워크플로우 포함. '기사 각도' 팁을 해당 스킬의 노트로 통합."`
- **Improve**: 필요한 구체적 변경 설명 (섹션, 동작, 해당 시 목표 크기)
  - 나쁜 예: `"너무 길음"`
  - 좋은 예: `"276줄; 'Framework Comparison' 섹션(L80-140)이 ai-era-architecture-principles와 중복; 삭제하면 ~150줄로 감소."`
- **Keep** (빠른 스캔에서 mtime만 변경): 원래 판정 근거 재설명, "unchanged" 쓰지 말 것
  - 나쁜 예: `"Unchanged"`
  - 좋은 예: `"mtime은 업데이트되었지만 내용은 변경 없음. rules/python/에 명시적으로 가져온 고유 Python 참조; 중복 발견 없음."`

### 3단계 — 요약 표

| 스킬 | 7일 사용 | 판정 | 이유 |
|-------|--------|---------|--------|

### 4단계 — 통합

1. **Retire / Merge**: 사용자와 확인하기 전 파일별 상세 근거 제시:
   - 발견된 구체적 문제 (중복, 오래됨, 깨진 참조 등)
   - 동일한 기능을 커버하는 대안 (Retire: 기존 스킬/규칙; Merge: 대상 파일과 통합할 내용)
   - 제거의 영향 (의존 스킬, MEMORY.md 참조, 또는 영향받는 워크플로우)
2. **Improve**: 근거와 함께 구체적 개선 제안:
   - 변경 내용과 이유 (예: "X/Y 섹션이 python-patterns와 중복되므로 430→200줄로 단축")
   - 사용자가 실행 여부 결정
3. **Update**: 확인된 소스와 함께 업데이트된 내용 제시
4. MEMORY.md 줄 수 확인; 100줄 초과 시 압축 제안

## 결과 파일 스키마

`~/.claude/skills/skill-stocktake/results.json`:

**`evaluated_at`**: 실제 UTC 평가 완료 시간으로 설정해야 합니다.
Bash로 가져오기: `date -u +%Y-%m-%dT%H:%M:%SZ`. `T00:00:00Z`와 같은 날짜만 있는 근사치는 사용하지 말 것.

```json
{
  "evaluated_at": "2026-02-21T10:00:00Z",
  "mode": "full",
  "batch_progress": {
    "total": 80,
    "evaluated": 80,
    "status": "completed"
  },
  "skills": {
    "skill-name": {
      "path": "~/.claude/skills/skill-name/SKILL.md",
      "verdict": "Keep",
      "reason": "X 워크플로우에 구체적이고 실행 가능한 고유 가치",
      "mtime": "2026-01-15T08:30:00Z"
    }
  }
}
```

## 참고 사항

- 평가는 블라인드: 출처(ECC, 자체 작성, 자동 추출)에 관계없이 모든 스킬에 동일한 체크리스트 적용
- 보관 / 삭제 작업은 항상 사용자의 명시적 확인 필요
- 스킬 출처에 따른 판정 분기 없음
