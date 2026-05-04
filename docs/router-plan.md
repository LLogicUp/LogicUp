# react-router-dom 도입 계획

## 목표

현재 `viewMode` state 기반 SPA를 URL 라우팅 방식으로 전환한다.
각 화면이 고유한 URL을 가지게 되어 브라우저 뒤로/앞으로, 북마크, 공유가 가능해진다.

## 현재 구조

- `App.tsx`의 `viewMode: 'home' | 'editor' | 'history' | 'quiz'` state로 화면 전환
- `Header.tsx`의 탭 클릭 → `onViewModeChange(mode)` 콜백 호출
- URL은 항상 `localhost:3000` 고정

## 목표 URL 구조

| 화면 | URL | ViewMode |
|------|-----|----------|
| 홈 | `/` | `home` |
| 에디터 (직접 입력) | `/editor/direct` | `editor` + `source: direct` |
| 에디터 (백준) | `/editor/baekjoon` | `editor` + `source: baekjoon` |
| 에디터 (OJ) | `/editor/oj` | `editor` + `source: oj` |
| 히스토리 | `/history` | `history` |
| 퀴즈 | `/quiz` | `quiz` |
| 로그인 (미인증) | `/login` | (별도 처리) |

## 작업 단계

### Step 1 — 패키지 설치

```bash
cd frontend
npm install react-router-dom
```

### Step 2 — BrowserRouter 추가 (`index.tsx`)

`<App />`을 `<BrowserRouter>`로 감싼다.

```tsx
// index.tsx
import { BrowserRouter } from 'react-router-dom';

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### Step 3 — App.tsx 라우팅 전환

- `viewMode` state 제거
- `useNavigate`로 화면 전환, `useLocation`/`<Routes>`로 현재 화면 판단
- 카카오 콜백 처리: `?code=` 파라미터 수신 후 `/`로 `navigate` 리다이렉트
- 미인증 시 `/login`으로 리다이렉트 (또는 기존 AuthPanel 유지)

```tsx
// App.tsx (개요)
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// viewMode 제거, navigate 사용
const navigate = useNavigate();

// 라우트 구성
<Routes>
  <Route path="/" element={<HomePage ... />} />
  <Route path="/editor/:source" element={<EditorView ... />} />
  <Route path="/history" element={<HistoryPage ... />} />
  <Route path="/quiz" element={<QuizPage ... />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### Step 4 — Header.tsx 탭 전환

- `onViewModeChange` / `onSourceChange` 콜백 제거
- `useNavigate` + `useLocation`으로 active 탭 판단 및 이동

```tsx
// Header.tsx (개요)
import { useNavigate, useLocation } from 'react-router-dom';

const navigate = useNavigate();
const { pathname } = useLocation();

// 탭 클릭 시
navigate('/history');   // 예시
navigate('/editor/baekjoon');

// active 판단
pathname === '/history'
pathname.startsWith('/editor/')
```

### Step 5 — EditorView 컴포넌트 분리 (선택)

현재 `App.tsx` 안에 인라인으로 있는 에디터 UI를 `src/pages/EditorPage.tsx`로 분리하면
라우트 컴포넌트로 넣기 깔끔해진다.

### Step 6 — 검증

- 각 URL 직접 입력 시 올바른 화면 렌더링 확인
- 브라우저 뒤로/앞으로 동작 확인
- 새로고침 시 현재 페이지 유지 확인 (CRA는 dev server에서 자동 처리)
- 미인증 상태에서 보호 경로 접근 시 리다이렉트 확인
- 카카오 로그인 콜백 정상 처리 확인

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `frontend/package.json` | react-router-dom 추가 |
| `frontend/src/index.tsx` | BrowserRouter 래핑 |
| `frontend/src/App.tsx` | viewMode → Routes/useNavigate 전환 |
| `frontend/src/components/Header.tsx` | 콜백 → useNavigate/useLocation 전환 |
| `frontend/src/pages/EditorPage.tsx` | (신규) 에디터 UI 분리 |

## 주의사항

- `Header`에 전달하던 `viewMode`, `onViewModeChange`, `source`, `onSourceChange` props는
  라우팅 전환 후 제거 가능 → Header Props 타입도 단순해짐
- `AuthPanel`은 별도 `/login` 라우트로 분리하거나 기존처럼 조건부 렌더링 유지 중 선택
- 백엔드 배포 시 모든 경로를 `index.html`로 fallback하는 설정 필요 (Nginx 등)
