---
name: skill-create
description: 로컬 git 기록을 분석하여 코딩 패턴을 추출하고 SKILL.md 파일을 생성합니다. Skill Creator GitHub App의 로컬 버전입니다.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /skill-create - 로컬 스킬 생성

저장소의 git 기록을 분석하여 코딩 패턴을 추출하고, 팀의 관례를 Claude에게 가르치는 SKILL.md 파일을 생성합니다.

## 사용법

```bash
/skill-create                    # 현재 저장소 분석
/skill-create --commits 100      # 최근 100개 커밋 분석
/skill-create --output ./skills  # 커스텀 출력 디렉토리
/skill-create --instincts        # continuous-learning-v2용 인스팅트도 생성
```

## 수행 작업

1. **Git 기록 파싱** - 커밋, 파일 변경, 패턴 분석
2. **패턴 감지** - 반복되는 워크플로와 관례 식별
3. **SKILL.md 생성** - 유효한 Claude Code 스킬 파일 생성
4. **인스팅트 생성 (선택사항)** - continuous-learning-v2 시스템용

## 분석 단계

### 1단계: Git 데이터 수집

```bash
# 파일 변경을 포함한 최근 커밋 가져오기
git log --oneline -n ${COMMITS:-200} --name-only --pretty=format:"%H|%s|%ad" --date=short

# 파일별 커밋 빈도 가져오기
git log --oneline -n 200 --name-only | grep -v "^$" | grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn | head -20

# 커밋 메시지 패턴 가져오기
git log --oneline -n 200 | cut -d' ' -f2- | head -50
```

### 2단계: 패턴 감지

다음 패턴 유형을 찾습니다:

| 패턴 | 감지 방법 |
|------|-----------|
| **커밋 관례** | 커밋 메시지에 대한 정규식 (feat:, fix:, chore:) |
| **파일 공동 변경** | 항상 함께 변경되는 파일 |
| **워크플로 순서** | 반복되는 파일 변경 패턴 |
| **아키텍처** | 폴더 구조 및 명명 관례 |
| **테스트 패턴** | 테스트 파일 위치, 명명, 커버리지 |

### 3단계: SKILL.md 생성

출력 형식:

```markdown
---
name: {repo-name}-patterns
description: {repo-name}에서 추출한 코딩 패턴
version: 1.0.0
source: local-git-analysis
analyzed_commits: {count}
---

# {Repo Name} 패턴

## 커밋 관례
{감지된 커밋 메시지 패턴}

## 코드 아키텍처
{감지된 폴더 구조 및 구성}

## 워크플로
{감지된 반복 파일 변경 패턴}

## 테스트 패턴
{감지된 테스트 관례}
```

### 4단계: 인스팅트 생성 (--instincts 옵션 시)

continuous-learning-v2 통합용:

```yaml
---
id: {repo}-commit-convention
trigger: "커밋 메시지 작성 시"
confidence: 0.8
domain: git
source: local-repo-analysis
---

# Conventional Commits 사용

## 액션
커밋에 다음 접두사 사용: feat:, fix:, chore:, docs:, test:, refactor:

## 근거
- {n}개 커밋 분석
- {percentage}%가 conventional commit 형식 준수
```

## 예시 출력

TypeScript 프로젝트에서 `/skill-create`를 실행하면 다음과 같이 생성될 수 있습니다:

```markdown
---
name: my-app-patterns
description: my-app 저장소의 코딩 패턴
version: 1.0.0
source: local-git-analysis
analyzed_commits: 150
---

# My App 패턴

## 커밋 관례

이 프로젝트는 **conventional commits**을 사용합니다:
- `feat:` - 새 기능
- `fix:` - 버그 수정
- `chore:` - 유지보수 작업
- `docs:` - 문서 업데이트

## 코드 아키텍처

```
src/
├── components/     # React 컴포넌트 (PascalCase.tsx)
├── hooks/          # 커스텀 훅 (use*.ts)
├── utils/          # 유틸리티 함수
├── types/          # TypeScript 타입 정의
└── services/       # API 및 외부 서비스
```

## 워크플로

### 새 컴포넌트 추가
1. `src/components/ComponentName.tsx` 생성
2. `src/components/__tests__/ComponentName.test.tsx`에 테스트 추가
3. `src/components/index.ts`에서 export

### 데이터베이스 마이그레이션
1. `src/db/schema.ts` 수정
2. `pnpm db:generate` 실행
3. `pnpm db:migrate` 실행

## 테스트 패턴

- 테스트 파일: `__tests__/` 디렉토리 또는 `.test.ts` 접미사
- 커버리지 목표: 80% 이상
- 프레임워크: Vitest
```

## GitHub App 통합

고급 기능 (10k+ 커밋, 팀 공유, 자동 PR)은 [Skill Creator GitHub App](https://github.com/apps/skill-creator)을 사용하세요:

- 설치: [github.com/apps/skill-creator](https://github.com/apps/skill-creator)
- 이슈에 `/skill-creator analyze` 댓글 작성
- 생성된 스킬이 포함된 PR 수신

## 관련 명령어

- `/instinct-import` - 생성된 인스팅트 가져오기
- `/instinct-status` - 학습된 인스팅트 확인
- `/evolve` - 인스팅트를 스킬/에이전트로 클러스터링

---

*[Everything Claude Code](https://github.com/affaan-m/everything-claude-code)의 일부*
