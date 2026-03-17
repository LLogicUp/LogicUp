---
description: 요구사항을 재확인하고, 리스크를 평가하며, 단계별 구현 계획을 작성합니다. 코드를 건드리기 전에 반드시 사용자 확인을 기다립니다.
---

# Plan 명령

이 명령은 **planner** 에이전트를 호출하여 코드 작성 전에 포괄적인 구현 계획을 수립합니다.

## 이 명령이 하는 일

1. **요구사항 재확인** - 무엇을 만들어야 하는지 명확히 함
2. **리스크 파악** - 잠재적 문제와 차단 요인 발굴
3. **단계별 계획 작성** - 구현을 단계로 분해
4. **확인 대기** - 진행 전 사용자 승인을 반드시 받아야 함

## 언제 사용하나

다음 경우 `/plan`을 사용:
- 새 기능 시작 시
- 중요한 아키텍처 변경 시
- 복잡한 리팩토링 작업 시
- 여러 파일/컴포넌트에 영향을 미치는 경우
- 요구사항이 불분명하거나 모호한 경우

## 작동 방식

planner 에이전트가 수행하는 작업:

1. **요청 분석** 후 명확한 용어로 요구사항 재확인
2. **단계별 분해** - 구체적이고 실행 가능한 단계로
3. **컴포넌트 간 의존성 파악**
4. **리스크 및 잠재적 차단 요인 평가**
5. **복잡도 추정** (높음/중간/낮음)
6. **계획 제시** 후 명시적 확인 대기

## 사용 예시

```
User: /plan I need to add real-time notifications when markets resolve

Agent (planner):
# Implementation Plan: Real-Time Market Resolution Notifications

## Requirements Restatement
- Send notifications to users when markets they're watching resolve
- Support multiple notification channels (in-app, email, webhook)
- Ensure notifications are delivered reliably
- Include market outcome and user's position result

## Implementation Phases

### Phase 1: Database Schema
- Add notifications table with columns: id, user_id, market_id, type, status, created_at
- Add user_notification_preferences table for channel preferences
- Create indexes on user_id and market_id for performance

### Phase 2: Notification Service
- Create notification service in lib/notifications.ts
- Implement notification queue using BullMQ/Redis
- Add retry logic for failed deliveries
- Create notification templates

### Phase 3: Integration Points
- Hook into market resolution logic (when status changes to "resolved")
- Query all users with positions in market
- Enqueue notifications for each user

### Phase 4: Frontend Components
- Create NotificationBell component in header
- Add NotificationList modal
- Implement real-time updates via Supabase subscriptions
- Add notification preferences page

## Dependencies
- Redis (for queue)
- Email service (SendGrid/Resend)
- Supabase real-time subscriptions

## Risks
- HIGH: Email deliverability (SPF/DKIM required)
- MEDIUM: Performance with 1000+ users per market
- MEDIUM: Notification spam if markets resolve frequently
- LOW: Real-time subscription overhead

## Estimated Complexity: MEDIUM
- Backend: 4-6 hours
- Frontend: 3-4 hours
- Testing: 2-3 hours
- Total: 9-13 hours

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify)
```

## 중요 사항

**핵심**: planner 에이전트는 "yes" 또는 "proceed" 또는 유사한 긍정적 응답으로 계획을 명시적으로 확인하기 전까지 **어떠한 코드도 작성하지 않습니다**.

변경을 원하는 경우 다음과 같이 응답하세요:
- "modify: [변경 내용]"
- "different approach: [대안]"
- "skip phase 2 and do phase 3 first"

## 다른 명령과의 통합

계획 수립 후:
- 테스트 주도 개발로 구현하려면 `/tdd` 사용
- 빌드 오류 발생 시 `/build-fix` 사용
- 완성된 구현을 리뷰하려면 `/code-review` 사용

## 관련 에이전트

이 명령은 다음 경로의 `planner` 에이전트를 호출합니다:
`~/.claude/agents/planner.md`
