## 목표
- 세종대 로그인 JWT에만 OJ 권한을 부여하고, 백엔드와 프론트엔드에서 OJ 접근 제어를 구현했다.

## 완료 항목
- ✅ `get_current_payload()`와 `require_sejong_token()`을 추가해 토큰 없음은 401, 세종대 권한 부족은 403으로 분리
- ✅ 세종대 로그인 성공 JWT에만 `is_sejong_verified: true` 클레임 추가
- ✅ `/oj` 라우터 전체를 세종대 JWT 전용으로 보호
- ✅ `HintRequest.source`에 `direct | url | oj` 검증 추가
- ✅ `/hint`에서 OJ 신규 요청과 기존 OJ submission 후속 요청을 세종대 토큰으로 제한
- ✅ `/history`, `/history/submissions`, `/history/categories`에서 일반 토큰의 OJ 기록 조회 우회 차단
- ✅ 프론트 JWT payload 파싱 유틸과 세종대 인증 상태 복원 구현
- ✅ Header/Home/Editor에서 세종대 미인증 사용자의 OJ 진입점과 직접 접근 차단
- ✅ OJ API Authorization 헤더, 401/403 처리, hint 403 처리 구현
- ✅ 백엔드 7개 테스트, 프론트 API 12개 테스트, 프론트 production build 통과

## 이슈/메모
- 전체 프론트 테스트에는 기존 실패가 남아 있다. `AuthPanel.test.tsx`는 현재 버튼 텍스트와 다른 `세종대 포털`을 기대하고, `App.test.tsx`는 Jest에서 `react-router-dom` 모듈 해석 문제로 실패한다.
- 시스템 Python에는 일부 백엔드 의존성이 없어 테스트에서 프로젝트 가상환경 site-packages를 경로에 추가했다.

## 다음 단계
- AuthPanel 테스트의 기대 텍스트와 App 테스트 환경을 현재 구현에 맞게 정리
- 실제 일반/카카오/세종대 토큰으로 `/oj`, `/hint`, `/history` 수동 API 검증
