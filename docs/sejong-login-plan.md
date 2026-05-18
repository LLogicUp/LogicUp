# 세종대 포털 로그인 프론트엔드 구현 계획

## 개요
백엔드의 `/auth/sejong` 엔드포인트를 활용하여 세종대 포털 로그인 기능을 프론트엔드에 추가합니다.
- 현재: 카카오 로그인만 구현
- 목표: 카카오 + 세종대 포털 로그인을 50:50 버튼으로 병렬 지원

## 현재 상태

### 백엔드 ✅ 완료
- `POST /auth/sejong` 엔드포인트 구현됨
  - 요청: `student_id` (학번), `password` (포털 비밀번호)
  - 응답: `access_token` (JWT)
  - 기능: 세종대 포털 인증 → DB 자동 회원가입 → 토큰 발급

### 프론트엔드 ⏳ 구현 필요
- `api/auth.ts`: `sejongLogin` 함수 없음
- `AuthPanel.tsx`: 세종대 로그인 UI 없음
- `App.css`: 소셜 버튼 2열 레이아웃 없음

## 구현 범위

### 1. `frontend/src/api/auth.ts`
**추가 함수:**
```typescript
export async function sejongLogin(studentId: string, password: string): Promise<void>
```
- `POST /auth/sejong`로 요청 전송
- 응답에서 `access_token` 추출
- localStorage에 토큰 저장
- 에러 시 extractErrorMessage로 파싱

### 2. `frontend/src/components/AuthPanel.tsx`
**수정 사항:**
- `Mode` 타입: `'login' | 'register'` → `'login' | 'register' | 'sejong'` 추가
- `handleSejongModeOpen()`: 세종대 모드로 전환
- `handleSejongLogin()`: 학번/비밀번호로 로그인
- `handleBackToSocial()`: 소셜 버튼 화면으로 복귀
- 렌더링 로직:
  - `mode === 'sejong'`: 학번/포털비밀번호 폼 + 뒤로가기 버튼
  - `mode === 'login' | 'register'`: 기존 폼 + 소셜 버튼 2열

### 3. `frontend/src/App.css`
**새 스타일:**
- `.social-login-row`: flex 레이아웃, 두 버튼 50%
- `.sejong-login-btn`: 세종대 파란색(`#003c8b`), 흰색 텍스트
- `.sejong-form-header`: 뒤로가기 + 제목 row
- `.sejong-input` (선택): 세종대 폼 입력창 스타일

## UI/UX 플로우

### 1. 초기 화면 (로그인/회원가입 탭)
```
┌─────────────────────────────────┐
│  [로그인 탭] [회원가입 탭]      │
│  [아이디 입력            ]      │
│  [비밀번호 입력          ]      │
│  [     로그인            ]      │
│  ────── 또는 ───────           │
│  [카카오로 로그인] [세종대 포털]│
└─────────────────────────────────┘
```

### 2. 세종대 버튼 클릭 후
```
┌─────────────────────────────────┐
│  ← 뒤로   세종대 포털 로그인   │
│  [학번 입력                  ] │
│  [포털 비밀번호              ] │
│  [        로그인             ] │
└─────────────────────────────────┘
```

### 3. 뒤로가기 클릭
- 다시 소셜 버튼 화면으로 복귀

## 에러 처리
- **인증 실패**: "세종대 포털 인증에 실패했습니다" (401)
- **포털 연결 오류**: "세종대 포털 서버에 연결할 수 없습니다" (502)
- **기타 오류**: 에러 메시지 표시

## 테스트 항목
- [ ] 카카오/세종대 버튼이 50%씩 나란히 배치되는지 확인
- [ ] 세종대 버튼 클릭 시 폼으로 전환
- [ ] 뒤로가기 버튼이 소셜 버튼 화면으로 복귀
- [ ] 학번/비밀번호 입력 후 로그인 버튼 클릭
- [ ] Network 탭에서 `/auth/sejong` API 호출 확인
- [ ] 로그인 성공 시 토큰 저장 확인
- [ ] 에러 메시지 정상 표시 확인
- [ ] localStorage에 토큰이 저장되었는지 확인 (DevTools)

## 참고 사항
- 카카오 로그인: OAuth 리다이렉트 방식
- 세종대 로그인: 직접 입력 → API 호출 방식
- 두 방식 모두 최종적으로 JWT 토큰 발급 (동일한 토큰 저장/사용)

## 구현 순서
1. `api/auth.ts`에 `sejongLogin` 함수 추가
2. `AuthPanel.tsx`에 세종대 모드 및 로직 추가
3. `App.css`에 레이아웃 스타일 추가
4. 테스트 및 검증
