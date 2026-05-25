# 세종대 로그인 JWT 기반 OJ 접근 제어 구현 계획 명세서

## 1. 목적

세종대 전용 로그인이 완료된 상태에서, OJ 모드를 세종대 로그인으로 인증한 사용자만 볼 수 있고 사용할 수 있도록 제한한다.

이번 구현은 DB 스키마를 수정하지 않는다. `users` 테이블에 별도 인증 상태 컬럼을 추가하지 않고, 세종대 로그인 성공 시 발급하는 JWT에 `is_sejong_verified: true` 클레임을 넣어 OJ 접근 권한을 판단한다.

핵심은 다음과 같다.

- 프론트엔드의 OJ 메뉴 숨김은 UX 보조 기능이다.
- 실제 사용 가능 여부는 백엔드에서 JWT 클레임으로 차단한다.
- `/oj` API와 `/hint`의 OJ 요청을 모두 막아야 한다.
- DB 기준 “세종대 인증 계정”이 아니라, JWT 기준 “세종대 로그인으로 인증된 세션”만 허용한다.

## 2. 최종 정책

## 2.1 권한 기준

OJ 접근 권한은 JWT payload의 `is_sejong_verified` 값으로 판단한다.

```json
{
  "user_id": 1,
  "nickname": "홍길동",
  "is_sejong_verified": true
}
```

### 허용 조건

```text
JWT가 유효하고 is_sejong_verified === true
```

### 거부 조건

```text
JWT가 없거나 유효하지 않음
JWT는 유효하지만 is_sejong_verified가 true가 아님
```

## 2.2 사용자 상태별 동작

| 상태 | JWT 상태 | OJ 메뉴 | `/editor/oj` | `/oj` API | `/hint` OJ 요청 |
| --- | --- | --- | --- | --- | --- |
| 비로그인 | 토큰 없음 | 숨김 | 로그인 필요 | 401 | 401 |
| 일반 로그인 | `is_sejong_verified` 없음 또는 false | 숨김 | 세종대 로그인 필요 | 403 | 403 |
| 카카오 로그인 | `is_sejong_verified` 없음 또는 false | 숨김 | 세종대 로그인 필요 | 403 | 403 |
| 세종대 로그인 | `is_sejong_verified: true` | 표시 | 허용 | 200 | 200 |

## 2.3 중요한 정책 결정

이 방식에서는 “계정이 세종대 인증되었는가”가 아니라 “현재 토큰이 세종대 로그인으로 발급되었는가”를 본다.

예를 들어 같은 학번의 기존 일반 계정이 세종대 로그인을 성공하면, 그 세종대 로그인 응답으로 받은 JWT에는 `is_sejong_verified: true`가 들어가므로 OJ를 사용할 수 있다.

반대로 같은 사용자가 나중에 일반 아이디/비밀번호 로그인으로 다시 로그인하면, 일반 로그인 토큰에는 `is_sejong_verified`가 없거나 false이므로 OJ를 사용할 수 없다.

이 동작은 DB 변경 없이 구현하기 위한 의도된 정책이다.

## 3. 현재 코드 기준 확인 사항

현재 코드 기준으로 확인한 구조는 다음과 같다.

| 영역 | 현재 상태 | 구현 반영 |
| --- | --- | --- |
| JWT 생성 | `backend/auth.py`의 `create_token(data)`가 data를 그대로 payload에 포함 | 세종대 로그인에서만 `is_sejong_verified: true`를 넘기면 됨 |
| JWT 검증 | `backend/auth.py`의 `get_current_user()`가 `user_id`만 반환 | OJ 권한 검사를 위해 JWT payload 전체를 읽는 별도 의존성 필요 |
| 일반 로그인 | `backend/auth_router.py`의 `/login`에서 `create_token({"user_id": ..., "nickname": ...})` 호출 | 일반 로그인 토큰에는 세종대 클레임을 넣지 않음 |
| 카카오 로그인 | `/auth/kakao`에서 일반 토큰 발급 | 카카오 토큰에는 세종대 클레임을 넣지 않음 |
| 세종대 로그인 | `/auth/sejong` 구현 완료 | 이 토큰에만 `is_sejong_verified: true` 추가 |
| OJ API | `backend/oj_router.py`의 `/oj`, `/oj/{subject}/{chapter}/{problem_number}`가 공개 상태 | `require_sejong_token` 의존성 추가 |
| Hint API | `backend/router.py`의 `/hint`는 로그인 필수 | `source == "oj"`일 때 JWT 세종대 클레임 검사 추가 |
| Hint 요청 모델 | `backend/models.py`의 `HintRequest`에는 `source` 없음 | `source` 필드 추가 |
| 프론트 Hint 타입 | `frontend/src/api/hint.ts`에는 `source?: 'direct' \| 'url' \| 'oj'` 이미 있음 | `EditorPage.tsx`에서 실제 payload에 `source` 추가 |
| OJ API 클라이언트 | `frontend/src/api/oj.ts`가 인증 헤더 없이 호출 | `authHeaders()` 추가 |
| Header | `frontend/src/components/Header.tsx`의 OJ 탭 항상 표시 | JWT payload 기준 조건부 표시 |
| Home | `frontend/src/pages/HomePage.tsx`의 OJ shortcut 항상 표시 | JWT payload 기준 조건부 표시 |
| App 라우팅 | `/editor/:source`가 항상 `EditorPage` 렌더링 | `/editor/oj` 접근 시 JWT payload 기준 차단 |

## 4. DB 구현 계획

## 4.1 DB 변경 없음

이번 구현에서는 DB를 수정하지 않는다.

다음 작업은 하지 않는다.

- `users.is_sejong_verified` 컬럼 추가 안 함
- `users.sejong_student_id` 컬럼 추가 안 함
- `users.sejong_verified_at` 컬럼 추가 안 함
- Alembic migration 추가 안 함
- 기존 사용자 데이터 마이그레이션 안 함

## 4.2 이 방식의 장점

- DB 스키마 변경 없이 빠르게 구현 가능
- 기존 회원가입/카카오/세종대 로그인 데이터에 영향 없음
- Alembic migration 실패 위험 없음
- “세종대 로그인으로 들어온 현재 세션만 OJ 허용”이라는 정책이 명확함

## 4.3 이 방식의 한계

이 방식은 영속 인증 상태를 저장하지 않는다.

따라서 다음 특성이 있다.

- 세종대 로그인 토큰으로 접속 중일 때만 OJ 사용 가능
- 일반 로그인으로 다시 로그인하면 같은 사용자라도 OJ 사용 불가
- 세종대 인증 이력을 관리자 페이지에서 조회할 수 없음
- 특정 사용자의 세종대 인증 상태를 DB에서 철회/관리할 수 없음
- JWT 만료 전까지는 발급 당시 권한이 유지됨

현재 요구사항이 “세종대 인증한 학생들에게만 OJ 모드를 보이거나 사용하게 하기”이고, DB 수정 없이 구현하려는 목적이라면 이 한계는 수용 가능하다.

## 5. 백엔드 구현 계획

## 5.1 JWT payload 읽기 의존성 추가

대상 파일:

- `backend/auth.py`

현재 `get_current_user()`는 JWT에서 `user_id`만 꺼내 반환한다.

```python
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    ...
    return user_id
```

OJ 권한 검사를 위해 JWT payload 전체를 반환하는 의존성을 추가한다.

예시:

```python
def get_current_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            logger.warning("토큰 검증 실패 | user_id 없음")
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
        return payload
    except JWTError:
        logger.warning("토큰 검증 실패 | 만료 또는 위조된 토큰")
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
```

기존 `get_current_user()`는 유지한다. 기존 라우터들이 `user_id` 반환을 기대하고 있기 때문이다.

기존 함수를 payload 기반으로 재사용해도 된다.

```python
def get_current_user(payload: dict = Depends(get_current_payload)):
    return payload["user_id"]
```

이렇게 바꾸면 JWT decode 로직 중복을 줄일 수 있다.

## 5.2 세종대 토큰 요구 의존성 추가

대상 파일:

- `backend/auth.py`

`is_sejong_verified` 클레임을 검사하는 의존성을 추가한다.

예시:

```python
def require_sejong_token(
    payload: dict = Depends(get_current_payload),
) -> dict:
    if payload.get("is_sejong_verified") is not True:
        raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
    return payload
```

반환값은 payload로 둔다. 라우터에서 user_id가 필요하면 `payload["user_id"]`를 사용할 수 있다.

### 상태 코드 기준

- 토큰 없음, 만료, 위조: `401`
- 유효한 토큰이지만 세종대 로그인 토큰이 아님: `403`

## 5.3 세종대 로그인 JWT에 클레임 추가

대상 파일:

- `backend/auth_router.py`

현재 세종대 로그인 성공 시 다음처럼 토큰을 발급한다.

```python
token = create_token({"user_id": user.id, "nickname": user.nickname})
```

이를 다음처럼 변경한다.

```python
token = create_token({
    "user_id": user.id,
    "nickname": user.nickname,
    "is_sejong_verified": True,
})
```

중요:

- `/login` 일반 로그인 토큰에는 넣지 않는다.
- `/auth/kakao` 카카오 로그인 토큰에는 넣지 않는다.
- 세종대 로그인 성공 시에만 넣는다.

일반 로그인과 카카오 로그인에서는 명시적으로 false를 넣어도 된다.

```python
token = create_token({
    "user_id": user.id,
    "nickname": user.nickname,
    "is_sejong_verified": False,
})
```

다만 기존 토큰 호환성을 생각하면, 백엔드는 `payload.get("is_sejong_verified") is True`만 허용하면 되므로 false를 굳이 넣지 않아도 된다.

## 5.4 OJ API 보호

대상 파일:

- `backend/oj_router.py`

현재 공개 상태인 엔드포인트:

- `GET /oj`
- `GET /oj/{subject}/{chapter}/{problem_number}`

두 엔드포인트에 `Depends(require_sejong_token)`을 추가한다.

### 엔드포인트별 적용 예시

```python
from fastapi import APIRouter, Depends, HTTPException
from auth import require_sejong_token


@oj_router.get("")
def list_oj_index(
    payload: dict = Depends(require_sejong_token),
):
    ...


@oj_router.get("/{subject}/{chapter}/{problem_number}")
def get_oj_problem(
    subject: str,
    chapter: int,
    problem_number: int,
    payload: dict = Depends(require_sejong_token),
):
    ...
```

### 라우터 전체 적용 예시

OJ 라우터 전체가 세종대 로그인 전용이면 라우터 선언부에 걸 수 있다.

```python
oj_router = APIRouter(
    prefix="/oj",
    tags=["oj"],
    dependencies=[Depends(require_sejong_token)],
)
```

현재 OJ API는 모두 보호 대상이므로 라우터 전체 적용이 더 단순하다.

## 5.5 `/hint`에서 OJ 요청 차단

대상 파일:

- `backend/models.py`
- `backend/router.py`

현재 `/hint`는 이미 로그인 필수다.

```python
current_user_id: int = Depends(get_current_user)
```

하지만 OJ 문제는 프론트에서 `/oj`로 가져온 뒤 `/hint`에는 일반 문제처럼 보낼 수 있다. 따라서 `source == "oj"`일 때도 세종대 JWT 검사를 해야 한다.

## 5.5.1 HintRequest에 source 추가

대상 파일:

- `backend/models.py`

현재:

```python
class HintRequest(BaseModel):
    submission_id: int | None = None
    problem: str = ""
    problem_url: str = ""
    language: str = "c"
    code: str = Field(..., max_length=100_000)
    expected_output: str = ""
    expected_input: str = ""
    error_log: str = ""
    hint_level: int = 1
```

변경:

```python
from typing import Literal


class HintRequest(BaseModel):
    submission_id: int | None = None
    source: Literal["direct", "url", "oj"] = "direct"
    problem: str = ""
    problem_url: str = ""
    language: str = "c"
    code: str = Field(..., max_length=100_000)
    expected_output: str = ""
    expected_input: str = ""
    error_log: str = ""
    hint_level: int = 1
```

기본값을 `"direct"`로 둬서 기존 클라이언트 요청이 깨지지 않게 한다.

## 5.5.2 `/hint`에서 payload 검사

대상 파일:

- `backend/router.py`

현재 `/hint`는 `get_current_user`만 사용한다.

```python
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
```

OJ source 검사를 위해 payload도 함께 받는다.

권장 구조:

```python
from auth import get_current_payload


@router.post("/hint", response_model=HintResponse)
def get_hint(
    request: HintRequest,
    payload: dict = Depends(get_current_payload),
    db: Session = Depends(get_db),
):
    current_user_id = payload["user_id"]

    if request.source == "oj" and payload.get("is_sejong_verified") is not True:
        raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")

    ...
```

이 방식으로 바꾸면 `/hint`에서 JWT decode를 한 번만 수행한다.

대안으로 `current_user_id: int = Depends(get_current_user)`를 유지하고, `payload: dict = Depends(get_current_payload)`를 추가할 수도 있다. 하지만 같은 요청에서 JWT decode가 중복될 수 있으므로 payload 하나로 처리하는 편이 낫다.

## 5.5.3 Submission source 저장

현재 신규 submission 생성 시 source는 다음처럼 결정된다.

```python
if request.problem_url:
    source = "url"
else:
    source = "direct"
```

OJ 요청이 들어오면 `Submission.source`에 `"oj"`가 저장되도록 변경한다.

권장 로직:

```python
if request.source == "oj":
    source = "oj"
    external_problem_id = None
    title = ""
    problem = request.problem
    expected_input = request.expected_input
    expected_output = request.expected_output
elif request.problem_url:
    source = "url"
    external_problem_id = request.problem_url
    ...
else:
    source = "direct"
    external_problem_id = None
    title = ""
    problem = request.problem
    expected_input = request.expected_input
    expected_output = request.expected_output
```

또는 `request.source`를 우선 기준으로 삼아도 된다.

```python
if request.source == "url" or request.problem_url:
    ...
elif request.source == "oj":
    ...
else:
    ...
```

중요한 점은 OJ 요청이 history에서 direct로 섞이지 않도록 `submission.source = "oj"`를 저장하는 것이다.

## 5.6 백엔드 테스트 계획

## 5.6.1 세종대 로그인 토큰

| 케이스 | 기대 결과 |
| --- | --- |
| 일반 로그인 | JWT에 `is_sejong_verified` 없음 또는 false |
| 카카오 로그인 | JWT에 `is_sejong_verified` 없음 또는 false |
| 세종대 로그인 성공 | JWT에 `is_sejong_verified: true` |
| 세종대 로그인 실패 | 토큰 발급 없음 |

## 5.6.2 OJ API

| 케이스 | 요청 | 기대 결과 |
| --- | --- | --- |
| 토큰 없음 | `GET /oj` | 401 |
| 일반 로그인 토큰 | `GET /oj` | 403 |
| 카카오 로그인 토큰 | `GET /oj` | 403 |
| 세종대 로그인 토큰 | `GET /oj` | 200 |
| 토큰 없음 | `GET /oj/{subject}/{chapter}/{problem_number}` | 401 |
| 일반 로그인 토큰 | `GET /oj/{subject}/{chapter}/{problem_number}` | 403 |
| 세종대 로그인 토큰 | `GET /oj/{subject}/{chapter}/{problem_number}` | 200 |

## 5.6.3 Hint API

| 케이스 | 요청 | 기대 결과 |
| --- | --- | --- |
| 일반 로그인 + `source="direct"` | `POST /hint` | 기존처럼 허용 |
| 일반 로그인 + `source="url"` | `POST /hint` | 기존처럼 허용 |
| 일반 로그인 + `source="oj"` | `POST /hint` | 403 |
| 카카오 로그인 + `source="oj"` | `POST /hint` | 403 |
| 세종대 로그인 + `source="oj"` | `POST /hint` | 200 |
| 토큰 없음 + `source="oj"` | `POST /hint` | 401 |

## 6. 프론트엔드 구현 계획

## 6.1 JWT payload 파싱 유틸 추가

대상 파일:

- `frontend/src/api/auth.ts`

현재 `App.tsx` 내부에 `getUserid()`가 JWT payload를 직접 파싱하고 있다. OJ 표시 조건에도 payload가 필요하므로 공통 유틸로 빼는 것이 좋다.

예시:

```ts
export interface TokenPayload {
  user_id?: number;
  nickname?: string;
  is_sejong_verified?: boolean;
  exp?: number;
}

export function getTokenPayload(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isSejongVerifiedToken(): boolean {
  return getTokenPayload()?.is_sejong_verified === true;
}
```

기존 `App.tsx`의 `getUserid()`는 이 유틸을 사용하도록 바꾼다.

```ts
function getUserid(): string {
  return getTokenPayload()?.nickname ?? '';
}
```

## 6.2 App 상태에 isSejongVerified 추가

대상 파일:

- `frontend/src/App.tsx`

현재 상태:

```ts
const [token, setToken] = useState<string | null>(() => getToken());
const [userid, setUserid] = useState<string>(() => getUserid());
```

추가:

```ts
const [isSejongVerified, setIsSejongVerified] = useState<boolean>(() => isSejongVerifiedToken());
```

로그인 성공/로그아웃 시 함께 갱신한다.

```ts
const handleLogin = useCallback(() => {
  setToken(getToken());
  setUserid(getUserid());
  setIsSejongVerified(isSejongVerifiedToken());
}, []);
```

```ts
const handleLogout = useCallback(() => {
  clearToken();
  setToken(null);
  setUserid('');
  setIsSejongVerified(false);
  navigate('/', { replace: true });
}, [navigate]);
```

카카오 로그인 콜백 처리 후에도 false로 갱신되어야 한다.

```ts
setIsSejongVerified(isSejongVerifiedToken());
```

세종대 로그인은 `AuthPanel`의 `sejongLogin()` 성공 후 `handleLogin()`이 호출되므로, 토큰 payload에 `is_sejong_verified: true`가 들어 있으면 자동으로 true가 된다.

## 6.3 Header OJ 탭 숨김

대상 파일:

- `frontend/src/components/Header.tsx`

`HeaderProps`에 `isSejongVerified`를 추가한다.

```ts
interface HeaderProps {
  userid: string;
  isSejongVerified: boolean;
  onLogout: () => void;
}
```

OJ 탭만 조건부 렌더링한다.

예시:

```tsx
const visibleTabs = TABS.filter((tab) => (
  tab.path !== '/editor/oj' || isSejongVerified
));
```

```tsx
{visibleTabs.map((tab) => {
  ...
})}
```

`App.tsx`에서 prop을 넘긴다.

```tsx
<Header
  userid={userid}
  isSejongVerified={isSejongVerified}
  onLogout={handleLogout}
/>
```

## 6.4 Home OJ shortcut 숨김

대상 파일:

- `frontend/src/pages/HomePage.tsx`

`HomePageProps`에 `isSejongVerified`를 추가한다.

```ts
interface HomePageProps {
  isSejongVerified: boolean;
  onGoTo: (mode: ViewMode) => void;
  onGoToEditor: (source: Source) => void;
  onUnauthorized: () => void;
}
```

`ShortcutCard`에도 전달한다.

```tsx
function ShortcutCard({
  isSejongVerified,
  onGoTo,
  onGoToEditor,
}: {
  isSejongVerified: boolean;
  onGoTo: (m: ViewMode) => void;
  onGoToEditor: (s: Source) => void;
}) {
  const shortcuts = SHORTCUTS.filter((s) => s.source !== 'oj' || isSejongVerified);

  return (
    ...
    {shortcuts.map((s) => ...)}
  );
}
```

`App.tsx`의 두 HomePage 렌더링 지점에 모두 prop을 넘긴다.

## 6.5 `/editor/oj` 직접 접근 차단

대상 파일:

- `frontend/src/App.tsx`
- 또는 `frontend/src/pages/EditorPage.tsx`

권장 방식은 라우팅 레벨에서 차단하는 것이다.

`EditorPage`가 `useParams()`로 source를 내부에서 계산하고 있으므로, 가장 작은 변경은 `EditorPage`에 `isSejongVerified` prop을 넘겨 내부에서 차단하는 방식이다.

### EditorPage props 변경

```ts
interface EditorPageProps {
  isDark: boolean;
  isSejongVerified: boolean;
  onLogout: () => void;
}
```

### 내부 차단

```tsx
if (source === 'oj' && !isSejongVerified) {
  return (
    <main className="main-container">
      <div className="code-editor">
        <div className="oj-mode-summary">
          <span className="oj-mode-summary__tag">OJ</span>
          <span className="oj-mode-summary__text">세종대 로그인이 필요합니다.</span>
        </div>
      </div>
    </main>
  );
}
```

또는 홈으로 리다이렉트할 수 있다. 하지만 사용자가 왜 차단되었는지 알 수 있게 안내 화면을 보여주는 편이 낫다.

## 6.6 OJ API 인증 헤더 추가

대상 파일:

- `frontend/src/api/oj.ts`

현재:

```ts
const res = await fetch('http://localhost:8000/oj');
```

변경:

```ts
import { authHeaders, clearToken } from './auth';


export class SejongRequiredError extends Error {
  constructor() {
    super('SejongRequired');
  }
}
```

```ts
const res = await fetch('http://localhost:8000/oj', {
  headers: authHeaders(),
});

if (res.status === 401) {
  clearToken();
  throw new Error('Unauthorized');
}
if (res.status === 403) {
  throw new SejongRequiredError();
}
if (!res.ok) {
  throw new Error('OJ 목록을 불러오지 못했습니다.');
}
```

상세 조회도 동일하게 처리한다.

## 6.7 `/hint` 요청에 source 추가

대상 파일:

- `frontend/src/pages/EditorPage.tsx`

현재 `postHint()` payload에 `source`가 없다.

현재:

```ts
const data: HintApiResponse = await postHint({
  submission_id: submissionId,
  ...(source === 'url'
    ? { problem_url: problemUrl }
    : source === 'oj'
      ? {
          problem: buildOjProblemText(ojProblem),
          expected_input: ojProblem ? buildOjExpectedInput(ojProblem) : '',
          expected_output: ojProblem ? buildOjExpectedOutput(ojProblem) : '',
        }
      : { problem, expected_input: expectedInput, expected_output: expectedOutput }),
  code,
  language,
  error_log: '',
  hint_level: hintLevel,
});
```

변경:

```ts
const data: HintApiResponse = await postHint({
  submission_id: submissionId,
  source,
  ...(source === 'url'
    ? { problem_url: problemUrl }
    : source === 'oj'
      ? {
          problem: buildOjProblemText(ojProblem),
          expected_input: ojProblem ? buildOjExpectedInput(ojProblem) : '',
          expected_output: ojProblem ? buildOjExpectedOutput(ojProblem) : '',
        }
      : { problem, expected_input: expectedInput, expected_output: expectedOutput }),
  code,
  language,
  error_log: '',
  hint_level: hintLevel,
});
```

## 6.8 `/hint` 403 처리

대상 파일:

- `frontend/src/api/hint.ts`
- `frontend/src/pages/EditorPage.tsx`

현재 `postHint()`는 401만 특별 처리한다.

```ts
if (res.status === 401) {
  clearToken();
  throw new Error('Unauthorized');
}
return res.json();
```

403도 처리한다.

```ts
if (res.status === 403) {
  throw new Error('SejongRequired');
}
if (!res.ok) {
  throw new Error('HintRequestFailed');
}
```

`EditorPage.tsx`에서는 `SejongRequired`를 받으면 OJ 전용 안내를 보여준다.

```ts
if (err instanceof Error && err.message === 'SejongRequired') {
  setHints((prev) => [
    ...prev,
    {
      level: hintLevel,
      explanation: 'OJ 힌트는 세종대 로그인 후 사용할 수 있습니다.',
      pseudocode: '',
    },
  ]);
  return;
}
```

## 7. 구현 순서

## 7.1 백엔드 1단계: JWT 의존성 정리

1. `backend/auth.py`에 `get_current_payload()` 추가
2. 기존 `get_current_user()`가 `get_current_payload()`를 재사용하도록 변경
3. `require_sejong_token()` 추가
4. 기존 로그인/히스토리/퀴즈 API가 그대로 동작하는지 확인

완료 기준:

- 기존 일반 로그인 사용자가 기존 기능을 계속 사용할 수 있다.
- 토큰 검증 실패 시 기존처럼 401이 반환된다.

## 7.2 백엔드 2단계: 세종대 JWT 클레임 추가

1. `/auth/sejong` 성공 토큰에 `is_sejong_verified: true` 추가
2. 일반 로그인과 카카오 로그인 토큰에는 추가하지 않거나 false 유지
3. 브라우저 localStorage 토큰 payload 확인

완료 기준:

- 세종대 로그인 토큰 payload에 `is_sejong_verified: true`가 있다.
- 일반 로그인 토큰 payload에는 해당 값이 true가 아니다.

## 7.3 백엔드 3단계: OJ API 보호

1. `backend/oj_router.py`에 `require_sejong_token` import
2. OJ 라우터 전체 또는 두 엔드포인트에 dependency 추가
3. 토큰 없음, 일반 토큰, 세종대 토큰으로 각각 확인

완료 기준:

- 토큰 없음은 401
- 일반 로그인 토큰은 403
- 세종대 로그인 토큰은 200

## 7.4 백엔드 4단계: `/hint` OJ source 보호

1. `backend/models.py`의 `HintRequest`에 `source` 추가
2. `backend/router.py`의 `/hint`에서 payload 기반 인증으로 변경
3. `request.source == "oj"`이면 `is_sejong_verified` 검사
4. 신규 `Submission.source`에 `"oj"` 저장
5. direct/url 기존 동작 검증

완료 기준:

- 일반 로그인 토큰으로 `source="oj"` 요청 시 403
- 세종대 로그인 토큰으로 `source="oj"` 요청 시 성공
- direct/url 힌트는 기존처럼 동작

## 7.5 프론트엔드 1단계: 토큰 payload 유틸

1. `frontend/src/api/auth.ts`에 `getTokenPayload()`, `isSejongVerifiedToken()` 추가
2. `App.tsx`의 `getUserid()`가 공통 유틸을 사용하도록 변경
3. `isSejongVerified` state 추가
4. 로그인/로그아웃/카카오 콜백 후 상태 갱신

완료 기준:

- 세종대 로그인 후 `isSejongVerified === true`
- 일반/카카오 로그인 후 `isSejongVerified === false`

## 7.6 프론트엔드 2단계: OJ 진입점 숨김

1. `Header.tsx`에서 OJ 탭 조건부 렌더링
2. `HomePage.tsx`에서 OJ shortcut 조건부 렌더링
3. `App.tsx`에서 props 전달

완료 기준:

- 세종대 로그인에서만 OJ 진입점이 보인다.

## 7.7 프론트엔드 3단계: OJ 직접 접근과 API 호출 처리

1. `EditorPage.tsx`에서 `/editor/oj` 직접 접근 차단
2. `api/oj.ts`에 `authHeaders()` 추가
3. OJ API 401/403 처리
4. OJ 힌트 요청 payload에 `source` 추가
5. `api/hint.ts`에서 403 처리

완료 기준:

- 일반 로그인 사용자가 `/editor/oj`로 직접 들어와도 사용할 수 없다.
- 세종대 로그인 사용자는 OJ 문제 목록과 힌트를 사용할 수 있다.

## 8. 수동 검증 시나리오

## 8.1 일반 로그인

1. 일반 아이디/비밀번호 로그인
2. Header에 OJ 탭이 없는지 확인
3. Home에 OJ shortcut이 없는지 확인
4. `/editor/oj` 직접 접근
5. 세종대 로그인 필요 안내 확인
6. 개발자 도구 또는 curl로 `GET /oj` 호출
7. 403 확인
8. `POST /hint`에 `source="oj"`로 요청
9. 403 확인

## 8.2 카카오 로그인

1. 카카오 로그인
2. Header/Home에 OJ 진입점이 없는지 확인
3. `/oj` API 호출 시 403 확인
4. `source="oj"` 힌트 요청 시 403 확인

## 8.3 세종대 로그인

1. 세종대 로그인
2. JWT payload에 `is_sejong_verified: true` 확인
3. Header에 OJ 탭 표시 확인
4. Home에 OJ shortcut 표시 확인
5. `/editor/oj` 접근 가능 확인
6. `GET /oj` 정상 응답 확인
7. OJ 문제 상세 조회 정상 응답 확인
8. OJ 모드에서 힌트 요청 정상 응답 확인
9. 히스토리에 OJ submission이 `source="oj"`로 저장되는지 확인

## 8.4 토큰 없음

1. localStorage 토큰 삭제
2. 앱 접속 시 로그인 화면 표시 확인
3. `GET /oj` 직접 호출
4. 401 확인
5. `source="oj"`로 `/hint` 직접 호출
6. 401 확인

## 9. 보안 고려사항

## 9.1 DB 없는 방식의 보안 경계

이번 방식의 보안 경계는 DB가 아니라 JWT다. 따라서 JWT 서명 검증이 정상이고 `JWT_SECRET_KEY`가 안전하게 관리된다는 전제가 필요하다.

클라이언트는 JWT payload를 읽을 수 있지만, 서명 없이 payload를 바꾸면 백엔드의 `jwt.decode()`에서 실패한다. 따라서 프론트엔드에서 `is_sejong_verified`를 조작하는 것만으로는 백엔드 권한을 얻을 수 없다.

## 9.2 프론트엔드 숨김은 보안이 아니다

OJ 탭과 shortcut을 숨기는 것은 UX다. 실제 차단은 반드시 백엔드의 `/oj`, `/hint`에서 수행한다.

## 9.3 source 필드는 완전한 원본 증명이 아니다

`source`는 클라이언트 입력이므로 사용자가 OJ 문제 내용을 복사해 `source="direct"`로 보내면 백엔드는 그것이 OJ 문제인지 구분하기 어렵다.

이번 계획의 차단 범위는 다음이다.

- 정상 OJ UI 흐름
- `/oj` API 직접 호출
- `source="oj"`로 들어오는 OJ 힌트 요청

더 강한 제한이 필요하면 장기적으로 `/hint`가 OJ 문제 본문을 클라이언트에서 받지 않고, 문제 식별자만 받아 서버에서 직접 OJ 문제를 조회하도록 바꿔야 한다.

예시:

```json
{
  "source": "oj",
  "oj_problem": {
    "subject": "c_program",
    "chapter": 1,
    "problem_number": 3
  },
  "code": "...",
  "language": "c"
}
```

## 9.4 토큰 만료 전 권한 유지

세종대 로그인 JWT가 발급되면 만료 전까지 OJ 권한이 유지된다. 현재 `backend/auth.py` 기준 토큰 만료 시간은 `TOKEN_EXPIRE_MINUTES = 60`이다.

이 방식에서는 DB에서 인증 상태를 철회할 수 없으므로, 철회가 필요한 정책이 생기면 DB 컬럼 방식으로 전환해야 한다.

## 10. 완료 기준

다음 조건을 모두 만족하면 구현 완료로 본다.

- DB 스키마 변경 없이 구현된다.
- 세종대 로그인 성공 JWT에 `is_sejong_verified: true`가 들어간다.
- 일반 로그인과 카카오 로그인 JWT로는 OJ API를 사용할 수 없다.
- 비로그인 사용자는 OJ API에서 401을 받는다.
- 일반/카카오 로그인 사용자는 OJ API에서 403을 받는다.
- 세종대 로그인 사용자는 OJ API를 사용할 수 있다.
- `/hint`에서 `source="oj"` 요청은 세종대 JWT만 허용된다.
- OJ 모드 힌트 요청 payload에 `source="oj"`가 포함된다.
- Header와 Home의 OJ 진입점은 세종대 로그인 토큰에서만 보인다.
- `/editor/oj` 직접 접근 시 일반/카카오 로그인 사용자는 차단된다.
- 기존 direct/url 힌트 기능은 기존 정책대로 동작한다.

## 11. 최종 체크리스트

- [ ] `backend/auth.py`에 `get_current_payload()` 추가
- [ ] `backend/auth.py`의 `get_current_user()`가 payload 유틸을 재사용하도록 정리
- [ ] `backend/auth.py`에 `require_sejong_token()` 추가
- [ ] `/auth/sejong` 토큰에 `is_sejong_verified: true` 추가
- [ ] `/login`, `/auth/kakao` 토큰은 세종대 true가 아니도록 유지
- [ ] `backend/oj_router.py`에 세종대 토큰 의존성 추가
- [ ] `backend/models.py`의 `HintRequest`에 `source` 추가
- [ ] `backend/router.py`의 `/hint`에서 `source="oj"` 권한 검사
- [ ] `backend/router.py`에서 OJ submission source를 `"oj"`로 저장
- [ ] `frontend/src/api/auth.ts`에 token payload 유틸 추가
- [ ] `frontend/src/App.tsx`에 `isSejongVerified` state 추가
- [ ] `frontend/src/components/Header.tsx`에서 OJ 탭 조건부 표시
- [ ] `frontend/src/pages/HomePage.tsx`에서 OJ shortcut 조건부 표시
- [ ] `frontend/src/pages/EditorPage.tsx`에서 `/editor/oj` 직접 접근 차단
- [ ] `frontend/src/api/oj.ts`에 `authHeaders()` 추가
- [ ] `frontend/src/pages/EditorPage.tsx`의 `postHint()` payload에 `source` 추가
- [ ] `frontend/src/api/hint.ts`에서 403 처리
- [ ] 일반 로그인 수동 검증
- [ ] 카카오 로그인 수동 검증
- [ ] 세종대 로그인 수동 검증
- [ ] 백엔드 테스트 또는 수동 API 검증
- [ ] 프론트엔드 빌드 검증
