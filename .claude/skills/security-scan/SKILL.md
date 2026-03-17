---
name: security-scan
description: AgentShield를 사용하여 Claude Code 설정(.claude/ 디렉토리)에서 보안 취약점, 잘못된 구성, 인젝션 위험을 스캔합니다. CLAUDE.md, settings.json, MCP 서버, 훅, 에이전트 정의를 검사합니다.
origin: ECC
---

# 보안 스캔 스킬

[AgentShield](https://github.com/affaan-m/agentshield)를 사용하여 Claude Code 설정의 보안 문제를 감사합니다.

## 활성화 시점

- 새로운 Claude Code 프로젝트 설정 시
- `.claude/settings.json`, `CLAUDE.md`, 또는 MCP 설정 수정 후
- 설정 변경 사항 커밋 전
- 기존 Claude Code 설정이 있는 새 저장소에 온보딩 시
- 정기적인 보안 위생 점검 시

## 스캔 대상

| 파일 | 검사 항목 |
|------|--------|
| `CLAUDE.md` | 하드코딩된 시크릿, 자동 실행 지시, 프롬프트 인젝션 패턴 |
| `settings.json` | 과도하게 허용적인 허용 목록, 거부 목록 누락, 위험한 우회 플래그 |
| `mcp.json` | 위험한 MCP 서버, 하드코딩된 환경 변수 시크릿, npx 공급망 위험 |
| `hooks/` | 보간을 통한 명령 인젝션, 데이터 유출, 자동 오류 억제 |
| `agents/*.md` | 무제한 도구 접근, 프롬프트 인젝션 노출 영역, 누락된 모델 사양 |

## 사전 요구 사항

AgentShield가 설치되어 있어야 합니다. 설치 여부 확인 및 필요 시 설치:

```bash
# 설치 여부 확인
npx ecc-agentshield --version

# 전역 설치 (권장)
npm install -g ecc-agentshield

# 또는 npx로 직접 실행 (설치 불필요)
npx ecc-agentshield scan .
```

## 사용법

### 기본 스캔

현재 프로젝트의 `.claude/` 디렉토리 대상으로 실행:

```bash
# 현재 프로젝트 스캔
npx ecc-agentshield scan

# 특정 경로 스캔
npx ecc-agentshield scan --path /path/to/.claude

# 최소 심각도 필터 적용 스캔
npx ecc-agentshield scan --min-severity medium
```

### 출력 형식

```bash
# 터미널 출력 (기본값) — 등급이 포함된 컬러 보고서
npx ecc-agentshield scan

# JSON — CI/CD 연동용
npx ecc-agentshield scan --format json

# Markdown — 문서화용
npx ecc-agentshield scan --format markdown

# HTML — 독립형 다크 테마 보고서
npx ecc-agentshield scan --format html > security-report.html
```

### 자동 수정

안전한 수정 사항 자동 적용 (자동 수정 가능으로 표시된 항목만):

```bash
npx ecc-agentshield scan --fix
```

수행 작업:
- 하드코딩된 시크릿을 환경 변수 참조로 교체
- 와일드카드 권한을 범위가 지정된 대안으로 조정
- 수동 수정만 필요한 제안 사항은 절대 수정하지 않음

### Opus 4.6 심층 분석

더 깊은 분석을 위한 적대적 3에이전트 파이프라인 실행:

```bash
# ANTHROPIC_API_KEY 필요
export ANTHROPIC_API_KEY=your-key
npx ecc-agentshield scan --opus --stream
```

실행 단계:
1. **공격자 (Red Team)** — 공격 벡터 탐색
2. **방어자 (Blue Team)** — 강화 조치 권장
3. **감사자 (최종 판정)** — 양측 관점 종합

### 안전한 설정 초기화

처음부터 새로운 안전한 `.claude/` 설정을 스캐폴딩:

```bash
npx ecc-agentshield init
```

생성 항목:
- 범위가 지정된 권한과 거부 목록이 있는 `settings.json`
- 보안 모범 사례가 담긴 `CLAUDE.md`
- `mcp.json` 플레이스홀더

### GitHub Action

CI 파이프라인에 추가:

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
```

## 심각도 수준

| 등급 | 점수 | 의미 |
|-------|-------|---------|
| A | 90-100 | 안전한 설정 |
| B | 75-89 | 경미한 문제 |
| C | 60-74 | 주의 필요 |
| D | 40-59 | 중대한 위험 |
| F | 0-39 | 치명적 취약점 |

## 결과 해석

### 치명적 발견 사항 (즉시 수정 필요)
- 설정 파일에 하드코딩된 API 키 또는 토큰
- 허용 목록의 `Bash(*)` (무제한 셸 접근)
- `${file}` 보간을 통한 훅의 명령 인젝션
- 셸을 실행하는 MCP 서버

### 높음 발견 사항 (프로덕션 전 수정 필요)
- CLAUDE.md의 자동 실행 지시 (프롬프트 인젝션 벡터)
- 권한에 거부 목록 누락
- 불필요한 Bash 접근이 있는 에이전트

### 보통 발견 사항 (권장)
- 훅의 자동 오류 억제 (`2>/dev/null`, `|| true`)
- PreToolUse 보안 훅 누락
- MCP 서버 설정의 `npx -y` 자동 설치

### 정보 발견 사항 (인식 필요)
- MCP 서버에 설명 누락
- 올바르게 표시된 금지 지시 사항

## 링크

- **GitHub**: [github.com/affaan-m/agentshield](https://github.com/affaan-m/agentshield)
- **npm**: [npmjs.com/package/ecc-agentshield](https://www.npmjs.com/package/ecc-agentshield)
