## 목표
- 배포 전 프론트 API URL 하드코딩, 백엔드 환경변수/CORS 설정, 누락 의존성, 실패 테스트를 수정

## 완료 항목
- ✅ 프론트 API 호출을 `REACT_APP_API_BASE_URL` 기반 공통 `apiUrl()` 헬퍼로 통합
- ✅ 백엔드 CORS 허용 origin을 `CORS_ALLOW_ORIGINS` 환경변수에서 comma-separated 값으로 읽도록 변경
- ✅ `DATABASE_URL`, `JWT_SECRET_KEY`, `GROQ_API_KEY`, `KAKAO_REST_API_KEY`, `KAKAO_REDIRECT_URI` 필수 환경변수 검증 추가
- ✅ `sejong-univ-auth==0.3.4` 의존성 추가
- ✅ Jest의 React Router v7 서브패스 매핑 및 테스트 전역 polyfill 보강
- ✅ `App.test.tsx`, `AuthPanel.test.tsx`를 실제 UI와 라우터 구조에 맞게 수정

## 이슈/메모
- `react-router-dom` v7은 Jest에서 `react-router/dom` 서브패스 매핑이 필요했다.
- App 테스트는 비로그인 첫 화면만 검증하므로 Markdown 렌더링 페이지는 mock 처리했다.
- `python -m compileall backend`는 `backend/venv`까지 순회했지만 오류 없이 완료됐다.

## 다음 단계
- 배포 환경에 `REACT_APP_API_BASE_URL`, `REACT_APP_KAKAO_REST_API_KEY`, `REACT_APP_KAKAO_REDIRECT_URI` 설정
- 배포 백엔드에 `DATABASE_URL`, `JWT_SECRET_KEY`, `GROQ_API_KEY`, `KAKAO_REST_API_KEY`, `KAKAO_REDIRECT_URI`, `CORS_ALLOW_ORIGINS` 설정
