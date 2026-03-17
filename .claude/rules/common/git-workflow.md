# Git 워크플로

## 커밋 메시지 형식
```
<타입>: <설명>

<선택적 본문>
```

타입: feat, fix, refactor, docs, test, chore, perf, ci

참고: 귀속 표시는 `~/.claude/settings.json`에서 전역으로 비활성화되어 있습니다.

## Pull Request 워크플로

PR 생성 시:
1. 전체 커밋 히스토리 분석 (최신 커밋만이 아님)
2. `git diff [base-branch]...HEAD`로 모든 변경사항 확인
3. 포괄적인 PR 요약 작성
4. TODO를 포함한 테스트 계획 포함
5. 새 브랜치라면 `-u` 플래그로 푸시

> git 작업 이전의 전체 개발 프로세스(계획 수립, TDD, 코드 리뷰)는
> [development-workflow.md](./development-workflow.md)를 참조하세요.
