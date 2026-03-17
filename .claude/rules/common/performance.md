# 성능 최적화

## 모델 선택 전략

**Haiku 4.5** (Sonnet 대비 90% 성능, 3배 비용 절감):
- 자주 호출되는 경량 agents
- 페어 프로그래밍 및 코드 생성
- 멀티 에이전트 시스템의 worker agents

**Sonnet 4.6** (최고의 코딩 모델):
- 주요 개발 작업
- 멀티 에이전트 워크플로 오케스트레이션
- 복잡한 코딩 작업

**Opus 4.5** (가장 깊은 추론):
- 복잡한 아키텍처 결정
- 최대 추론 요구 작업
- 리서치 및 분석 작업

## Context Window 관리

다음 작업에서는 context window의 마지막 20%를 피합니다:
- 대규모 리팩토링
- 여러 파일에 걸친 기능 구현
- 복잡한 상호작용 디버깅

Context 민감도가 낮은 작업:
- 단일 파일 편집
- 독립적인 유틸리티 생성
- 문서 업데이트
- 간단한 버그 수정

## Extended Thinking + Plan Mode

Extended thinking은 기본적으로 활성화되어 있으며, 내부 추론을 위해 최대 31,999 토큰을 예약합니다.

Extended thinking 제어 방법:
- **토글**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: `~/.claude/settings.json`에서 `alwaysThinkingEnabled` 설정
- **예산 제한**: `export MAX_THINKING_TOKENS=10000`
- **Verbose 모드**: Ctrl+O로 thinking 출력 확인

깊은 추론이 필요한 복잡한 작업:
1. Extended thinking이 활성화되어 있는지 확인 (기본적으로 켜짐)
2. 구조적 접근을 위해 **Plan Mode** 활성화
3. 철저한 분석을 위해 여러 차례 비판 단계 사용
4. 다양한 관점을 위해 역할을 나눈 서브 agents 사용

## 빌드 문제 해결

빌드 실패 시:
1. **build-error-resolver** agent 사용
2. 에러 메시지 분석
3. 단계적으로 수정
4. 각 수정 후 검증
