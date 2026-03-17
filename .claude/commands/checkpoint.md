# 체크포인트 명령

워크플로우에서 체크포인트를 생성하거나 검증합니다.

## 사용법

`/checkpoint [create|verify|list] [이름]`

## 체크포인트 생성

체크포인트를 생성할 때:

1. `/verify quick` 실행으로 현재 상태가 깨끗한지 확인
2. 체크포인트 이름으로 git stash 또는 commit 생성
3. `.claude/checkpoints.log`에 체크포인트 기록:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

4. 체크포인트 생성 완료 보고

## 체크포인트 검증

체크포인트와 현재 상태를 비교할 때:

1. 로그에서 체크포인트 읽기
2. 현재 상태와 체크포인트 비교:
   - 체크포인트 이후 추가된 파일
   - 체크포인트 이후 수정된 파일
   - 현재 vs 체크포인트 시점의 테스트 통과율
   - 현재 vs 체크포인트 시점의 커버리지

3. 보고:
```
체크포인트 비교: $NAME
============================
변경된 파일: X개
테스트: +Y 통과 / -Z 실패
커버리지: +X% / -Y%
빌드: [통과/실패]
```

## 체크포인트 목록

모든 체크포인트를 다음 정보와 함께 표시합니다.

- 이름
- 타임스탬프
- Git SHA
- 상태 (현재, 이전, 이후)

## 워크플로우

일반적인 체크포인트 흐름:

```
[시작] --> /checkpoint create "feature-start"
   |
[구현] --> /checkpoint create "core-done"
   |
[테스트] --> /checkpoint verify "core-done"
   |
[리팩토링] --> /checkpoint create "refactor-done"
   |
[PR] --> /checkpoint verify "feature-start"
```

## 인수

$ARGUMENTS:
- `create <이름>` - 이름 있는 체크포인트 생성
- `verify <이름>` - 이름 있는 체크포인트와 비교 검증
- `list` - 모든 체크포인트 표시
- `clear` - 오래된 체크포인트 삭제 (최근 5개 유지)
