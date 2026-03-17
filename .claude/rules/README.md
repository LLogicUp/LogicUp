# Rules
## 구조

Rules는 **common** 레이어와 **언어별** 디렉토리로 구성됩니다:

```
rules/
├── common/          # 언어에 무관한 원칙 (항상 설치)
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── performance.md
│   ├── patterns.md
│   ├── hooks.md
│   ├── agents.md
│   └── security.md
├── typescript/      # TypeScript/JavaScript 전용
├── python/          # Python 전용
├── golang/          # Go 전용
└── swift/           # Swift 전용
```

- **common/**에는 범용 원칙이 들어 있습니다 — 언어별 코드 예제는 포함하지 않습니다.
- **언어 디렉토리**는 프레임워크별 패턴, 도구, 코드 예제로 common rules를 확장합니다. 각 파일은 대응하는 common 파일을 참조합니다.

## 설치

### 방법 1: 설치 스크립트 (권장)

```bash
# common + 언어별 rule sets 설치
./install.sh typescript
./install.sh python
./install.sh golang
./install.sh swift

# 여러 언어를 한 번에 설치
./install.sh typescript python
```

### 방법 2: 수동 설치

> **중요:** 디렉토리 전체를 복사하세요 — `/*`로 평탄화하지 마세요.
> common과 언어별 디렉토리에는 같은 이름의 파일이 존재합니다.
> 하나의 디렉토리로 합치면 언어별 파일이 common rules를 덮어쓰고,
> 언어별 파일에서 사용하는 `../common/` 상대 경로 참조가 깨집니다.

```bash
# common rules 설치 (모든 프로젝트에 필수)
cp -r rules/common ~/.claude/rules/common

# 프로젝트 기술 스택에 맞는 언어별 rules 설치
cp -r rules/typescript ~/.claude/rules/typescript
cp -r rules/python ~/.claude/rules/python
cp -r rules/golang ~/.claude/rules/golang
cp -r rules/swift ~/.claude/rules/swift

# 주의 ! ! ! 실제 프로젝트 요구사항에 맞게 설정하세요. 여기의 설정은 참고용입니다.
```

## Rules vs Skills

- **Rules**는 광범위하게 적용되는 표준, 컨벤션, 체크리스트를 정의합니다 (예: "테스트 커버리지 80%", "시크릿 하드코딩 금지").
- **Skills** (`skills/` 디렉토리)는 특정 작업에 대한 심층적이고 실행 가능한 참조 자료를 제공합니다 (예: `python-patterns`, `golang-testing`).

언어별 rule 파일은 필요한 경우 관련 skills를 참조합니다. Rules는 *무엇을* 해야 하는지를 알려주고, skills는 *어떻게* 해야 하는지를 알려줍니다.

## 새 언어 추가

새 언어(예: `rust/`) 지원을 추가하려면:

1. `rules/rust/` 디렉토리를 생성합니다
2. common rules를 확장하는 파일을 추가합니다:
   - `coding-style.md` — 포맷팅 도구, 관용구, 에러 처리 패턴
   - `testing.md` — 테스트 프레임워크, 커버리지 도구, 테스트 구성
   - `patterns.md` — 언어별 디자인 패턴
   - `hooks.md` — 포맷터, 린터, 타입 체커를 위한 PostToolUse hooks
   - `security.md` — 시크릿 관리, 보안 스캐닝 도구
3. 각 파일은 다음으로 시작해야 합니다:
   ```
   > This file extends [common/xxx.md](../common/xxx.md) with <Language> specific content.
   ```
4. 관련 skills가 있으면 참조하고, 없으면 `skills/` 아래에 새로 만듭니다.

## Rule 우선순위

언어별 rules와 common rules가 충돌하는 경우, **언어별 rules가 우선합니다** (구체적인 것이 일반적인 것을 재정의). 이는 표준적인 계층형 설정 패턴을 따릅니다 (CSS 명시도나 `.gitignore` 우선순위와 유사).

- `rules/common/`은 모든 프로젝트에 적용되는 범용 기본값을 정의합니다.
- `rules/golang/`, `rules/python/`, `rules/typescript/` 등은 언어 관용구가 다른 경우 해당 기본값을 재정의합니다.

### 예시

`common/coding-style.md`는 불변성을 기본 원칙으로 권장합니다. 언어별 `golang/coding-style.md`는 이를 다음과 같이 재정의할 수 있습니다:

> Go 관용구에서는 struct 변경에 포인터 리시버를 사용합니다 — 일반 원칙은 [common/coding-style.md](../common/coding-style.md)를 참조하되, 여기서는 Go 관용구적 변경이 선호됩니다.

### 재정의 가능한 common rules

`rules/common/`의 rules 중 언어별 파일로 재정의될 수 있는 항목은 다음과 같이 표시됩니다:

> **언어 참고**: 이 패턴이 관용적이지 않은 언어에서는 언어별 rules로 재정의될 수 있습니다.
