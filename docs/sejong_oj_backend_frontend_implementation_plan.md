# 세종대 JWT 기반 OJ 접근 제어 상세 구현 계획

## 1. 개요

이 문서는 `docs/sejong_oj_access_control_plan.md`의 정책을 실제 코드 작업 단위로 나눈 상세 구현 계획이다.

이번 구현은 DB를 수정하지 않는다. 세종대 로그인 성공 시 발급되는 JWT에 `is_sejong_verified: true`를 넣고, 백엔드는 해당 JWT 클레임을 기준으로 OJ 기능 사용 여부를 판단한다.

## 2. 구현 원칙

- DB migration은 만들지 않는다.
- `users` 테이블에 새 컬럼을 추가하지 않는다.
- OJ 권한은 세종대 로그인으로 발급된 JWT에만 부여한다.
- 일반 로그인/카카오 로그인 토큰은 OJ 권한이 없다.
- 프론트엔드의 메뉴 숨김은 보조 기능이다.
- 실제 접근 차단은 백엔드의 `/oj`, `/hint`에서 수행한다.

## 3. 백엔드 상세 구현 계획

## 3.1 대상 파일

백엔드에서 수정할 파일은 다음이다.

| 파일 | 수정 목적 |
| --- | --- |
| `backend/auth.py` | JWT payload 조회 의존성, 세종대 토큰 검사 의존성 추가 |
| `backend/auth_router.py` | 세종대 로그인 성공 JWT에 `is_sejong_verified: true` 추가 |
| `backend/oj_router.py` | OJ API 전체를 세종대 JWT 전용으로 보호 |
| `backend/models.py` | `HintRequest`에 `source` 필드 추가 |
| `backend/router.py` | `/hint`에서 OJ source 권한 검사 및 `Submission.source="oj"` 저장 |

## 3.2 `backend/auth.py`

### 현재 상태

현재 `get_current_user()`는 JWT를 직접 decode한 뒤 `user_id`만 반환한다.

```python
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        ...
        return user_id
    except JWTError:
        ...
```

OJ 권한 검사를 위해서는 `user_id`뿐 아니라 `is_sejong_verified` 클레임도 읽어야 한다.

추가로 현재 `HTTPBearer()` 기본 동작은 인증 헤더가 없을 때 의존성 함수에 진입하기 전에 403을 반환할 수 있다. 이 계획의 완료 기준처럼 토큰 없음은 401, 권한 부족은 403으로 분리하려면 `HTTPBearer(auto_error=False)`로 바꾸고 credentials가 없는 경우를 직접 처리해야 한다.

### 구현 작업

1. `HTTPBearer(auto_error=False)`로 변경
2. `get_current_payload()` 추가
3. 인증 헤더가 없거나 Bearer credentials가 없으면 401 반환
4. `get_current_user()`가 `get_current_payload()`를 재사용하도록 변경
5. `require_sejong_token()` 추가

### 구현 예시

```python
security = HTTPBearer(auto_error=False)


def get_current_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if credentials is None:
        logger.warning("토큰 검증 실패 | Authorization 헤더 없음")
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            logger.warning("토큰 검증 실패 | user_id 없음")
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
        logger.info(f"토큰 검증 성공 | user_id={user_id}")
        return payload
    except JWTError:
        logger.warning("토큰 검증 실패 | 만료 또는 위조된 토큰")
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")


def get_current_user(payload: dict = Depends(get_current_payload)):
    return payload["user_id"]


def require_sejong_token(
    payload: dict = Depends(get_current_payload),
) -> dict:
    if payload.get("is_sejong_verified") is not True:
        raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
    return payload
```

### 주의사항

- `get_current_user()`의 반환값은 기존처럼 `user_id`여야 한다.
- 기존 라우터들은 `current_user_id: int = Depends(get_current_user)`를 사용하고 있으므로 반환 타입을 바꾸면 안 된다.
- `require_sejong_token()`은 DB를 조회하지 않는다.
- 401과 403을 분리한다.
- `HTTPBearer(auto_error=False)`로 인해 `credentials is None` 방어 코드를 반드시 둔다.

### 완료 기준

- 기존 로그인 기반 API가 깨지지 않는다.
- 토큰 없이 인증 API 호출 시 401을 반환한다.
- 유효하지 않은 토큰은 401을 반환한다.
- 유효한 일반 토큰은 `require_sejong_token()`에서 403을 반환한다.
- 세종대 토큰은 `require_sejong_token()`을 통과한다.

## 3.3 `backend/auth_router.py`

### 현재 상태

일반 로그인:

```python
token = create_token({"user_id": user.id, "nickname": user.nickname})
```

카카오 로그인:

```python
token = create_token({"user_id": user.id, "nickname": user.nickname})
```

세종대 로그인:

```python
token = create_token({"user_id": user.id, "nickname": user.nickname})
```

현재 세 로그인 방식의 토큰 payload가 동일하다.

### 구현 작업

세종대 로그인 성공 지점에만 `is_sejong_verified: True`를 추가한다.

```python
token = create_token({
    "user_id": user.id,
    "nickname": user.nickname,
    "is_sejong_verified": True,
})
```

### 일반/카카오 로그인 처리

일반 로그인과 카카오 로그인에는 `is_sejong_verified: True`를 넣지 않는다.

둘 중 하나를 선택한다.

### 선택 A: 아무 값도 넣지 않기

```python
token = create_token({"user_id": user.id, "nickname": user.nickname})
```

### 선택 B: 명시적으로 false 넣기

```python
token = create_token({
    "user_id": user.id,
    "nickname": user.nickname,
    "is_sejong_verified": False,
})
```

권장안은 선택 A다. 백엔드에서 `payload.get("is_sejong_verified") is True`만 허용하면 기존 토큰과도 자연스럽게 호환된다.

### 주의사항

- 세종대 인증 실패 시 토큰을 발급하지 않는다.
- 세종대 포털 인증이 성공한 뒤에만 `is_sejong_verified: True`를 넣는다.
- DB에는 세종대 인증 상태를 저장하지 않는다.

### 완료 기준

- 세종대 로그인 JWT payload에 `is_sejong_verified: true`가 있다.
- 일반 로그인 JWT payload에는 `is_sejong_verified: true`가 없다.
- 카카오 로그인 JWT payload에는 `is_sejong_verified: true`가 없다.

## 3.4 `backend/oj_router.py`

### 현재 상태

현재 OJ API는 인증 없이 공개되어 있다.

```python
oj_router = APIRouter(prefix="/oj", tags=["oj"])


@oj_router.get("")
def list_oj_index():
    ...


@oj_router.get("/{subject}/{chapter}/{problem_number}")
def get_oj_problem(subject: str, chapter: int, problem_number: int):
    ...
```

### 구현 작업

`require_sejong_token`을 import하고 OJ 라우터에 적용한다.

### 권장 구현

라우터 전체에 dependency를 건다.

```python
from fastapi import APIRouter, Depends, HTTPException
from auth import require_sejong_token


oj_router = APIRouter(
    prefix="/oj",
    tags=["oj"],
    dependencies=[Depends(require_sejong_token)],
)
```

이렇게 하면 현재 OJ 라우터의 모든 엔드포인트가 세종대 JWT 전용이 된다.

### 대안 구현

엔드포인트별로 적용할 수도 있다.

```python
@oj_router.get("")
def list_oj_index(payload: dict = Depends(require_sejong_token)):
    ...
```

```python
@oj_router.get("/{subject}/{chapter}/{problem_number}")
def get_oj_problem(
    subject: str,
    chapter: int,
    problem_number: int,
    payload: dict = Depends(require_sejong_token),
):
    ...
```

### 권장안

현재 OJ 라우터는 공개해야 할 엔드포인트가 없으므로 라우터 전체 dependency 방식이 더 적절하다.

### 완료 기준

- 토큰 없이 `GET /oj` 호출 시 401
- 일반 로그인 토큰으로 `GET /oj` 호출 시 403
- 카카오 로그인 토큰으로 `GET /oj` 호출 시 403
- 세종대 로그인 토큰으로 `GET /oj` 호출 시 200
- 위 동작이 문제 상세 API에도 동일하게 적용된다.

## 3.5 `backend/models.py`

### 현재 상태

`HintRequest`에 `source` 필드가 없다.

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

### 구현 작업

`source` 필드를 추가한다.

```python
from typing import Literal
```

```python
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

### 주의사항

- 기본값을 `"direct"`로 둔다.
- 기존 클라이언트가 `source` 없이 요청해도 깨지지 않아야 한다.
- 프론트엔드 `frontend/src/api/hint.ts`에는 이미 `source?: 'direct' | 'url' | 'oj'` 타입이 있으므로 백엔드 모델만 맞추면 된다.

### 완료 기준

- 기존 direct 힌트 요청이 그대로 동작한다.
- `source="oj"` 요청을 백엔드가 받을 수 있다.
- 잘못된 source 값은 Pydantic validation으로 거부된다.

## 3.6 `backend/router.py`

### 현재 상태

`/hint`는 이미 로그인 필수다.

```python
@router.post("/hint", response_model=HintResponse)
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
```

신규 submission 생성 시 source는 `problem_url` 여부로만 결정된다.

```python
if request.problem_url:
    source = "url"
    external_problem_id = request.problem_url
    ...
else:
    problem = request.problem
    expected_input = request.expected_input
    expected_output = request.expected_output
    source = "direct"
    external_problem_id = None
    title = ""
```

OJ 문제도 현재는 direct처럼 저장될 수 있다.

히스토리 API는 `source` 필터를 그대로 받는다. OJ submission이 저장되면 `/history`, `/history/submissions` 같은 기존 히스토리 조회에서도 OJ 기록이 노출될 수 있다.

### 구현 작업

1. `get_current_payload`를 import한다.
2. `/hint` dependency를 payload 기반으로 변경한다.
3. `current_user_id = payload["user_id"]`로 설정한다.
4. `request.source == "oj"`이면 `is_sejong_verified` 검사한다.
5. 신규 submission 생성 시 OJ source를 `"oj"`로 저장한다.
6. 히스토리 API에서 OJ 기록 조회 정책을 적용한다.

### import 변경

현재:

```python
from auth import get_current_user
```

변경:

```python
from auth import get_current_payload
```

또는 다른 라우터에서 `get_current_user`를 계속 사용한다면 둘 다 import한다.

### 함수 시그니처 변경

현재:

```python
def get_hint(
    request: HintRequest,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
```

변경:

```python
def get_hint(
    request: HintRequest,
    payload: dict = Depends(get_current_payload),
    db: Session = Depends(get_db),
):
    current_user_id = payload["user_id"]
```

### OJ 권한 검사 추가

```python
if request.source == "oj" and payload.get("is_sejong_verified") is not True:
    raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
```

이 검사는 함수 초반부, LLM 호출 및 DB 저장 전에 수행한다.

### source 분기 변경

권장 분기:

```python
if request.submission_id is not None:
    ...
else:
    if request.source == "oj":
        source = "oj"
        external_problem_id = None
        title = ""
        problem = request.problem
        expected_input = request.expected_input
        expected_output = request.expected_output
        logger.info("OJ 문제 사용")
    elif request.problem_url:
        fetched = fetch_problem_from_url(request.problem_url)
        source = "url"
        external_problem_id = request.problem_url
        ...
    else:
        problem = request.problem
        expected_input = request.expected_input
        expected_output = request.expected_output
        source = "direct"
        external_problem_id = None
        title = ""
        logger.info("직접 입력 문제 사용")
```

### submission_id 재사용 시 주의사항

현재 `/hint`는 `submission_id`가 있으면 기존 submission을 재사용한다.

```python
if request.submission_id is not None:
    submission = db.query(Submission).filter(Submission.id == request.submission_id).first()
    ...
```

이 경우에도 기존 submission이 OJ source라면 세종대 토큰을 요구해야 한다.

따라서 다음 검사도 필요하다.

```python
if submission.source == "oj" and payload.get("is_sejong_verified") is not True:
    raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
```

권장 흐름:

```python
if request.submission_id is not None:
    submission = db.query(Submission).filter(Submission.id == request.submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="submission not found")
    if submission.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="forbidden")
    if submission.source == "oj" and payload.get("is_sejong_verified") is not True:
        raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
    ...
else:
    if request.source == "oj" and payload.get("is_sejong_verified") is not True:
        raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")
    ...
```

이 검사를 넣어야 일반 토큰으로 기존 OJ submission_id에 후속 힌트를 요청하는 우회를 막을 수 있다.

### 히스토리 OJ 접근 정책 추가

OJ 기록도 세종대 로그인 사용자에게만 보여야 한다면 history 계열 API에도 payload 기반 권한 검사가 필요하다.

대상 엔드포인트:

- `/history`
- `/history/submissions`
- 필요 시 `/history/categories`

권장 정책:

- `source="oj"` 필터 요청은 세종대 토큰만 허용한다.
- `source` 필터가 없는 전체 조회에서는 일반/카카오 토큰 사용자에게 OJ 기록을 제외한다.
- 세종대 토큰 사용자는 전체 조회에서 OJ 기록까지 볼 수 있다.
- direct/url 기록은 기존처럼 일반/카카오/세종대 토큰 모두 조회 가능하다.

예시:

```python
is_sejong_verified = payload.get("is_sejong_verified") is True

if source == "oj" and not is_sejong_verified:
    raise HTTPException(status_code=403, detail="세종대 로그인이 필요합니다")

if source is None and not is_sejong_verified:
    query = query.filter(Submission.source != "oj")
elif source is not None:
    query = query.filter(Submission.source == source)
```

`/history/categories`는 source 필터가 없더라도 OJ submission의 error category가 일반 사용자 통계에 섞일 수 있다. 일반/카카오 토큰에서는 `Submission.source != "oj"` 조건을 추가한다.

이 정책을 넣어야 세종대 토큰으로 만든 OJ 기록을 같은 사용자 계정의 일반 토큰으로 조회하는 우회를 막을 수 있다.

### 완료 기준

- 일반 로그인 토큰으로 `source="oj"` 신규 힌트 요청 시 403
- 일반 로그인 토큰으로 기존 OJ `submission_id` 후속 힌트 요청 시 403
- 세종대 로그인 토큰으로 OJ 신규 힌트 요청 시 200
- 세종대 로그인 토큰으로 OJ 후속 힌트 요청 시 200
- direct/url 힌트 요청은 기존처럼 동작
- OJ submission은 DB에 `source="oj"`로 저장
- 일반/카카오 토큰으로 OJ 히스토리 조회 시 403 또는 결과 제외 정책이 적용된다.
- 일반/카카오 토큰의 전체 히스토리/통계에는 OJ 기록이 섞이지 않는다.
- 세종대 토큰의 히스토리/통계에는 OJ 기록이 정책대로 포함된다.

## 3.7 백엔드 수동 검증 명령 예시

실제 토큰을 발급받은 뒤 아래처럼 확인한다.

### 토큰 없음

```bash
curl -i http://localhost:8000/oj
```

기대 결과:

```text
401
```

### 일반 로그인 토큰

```bash
curl -i http://localhost:8000/oj \
  -H "Authorization: Bearer <NORMAL_TOKEN>"
```

기대 결과:

```text
403
```

### 세종대 로그인 토큰

```bash
curl -i http://localhost:8000/oj \
  -H "Authorization: Bearer <SEJONG_TOKEN>"
```

기대 결과:

```text
200
```

### 일반 토큰으로 OJ hint 요청

```bash
curl -i http://localhost:8000/hint \
  -H "Authorization: Bearer <NORMAL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "oj",
    "problem": "test",
    "code": "int main(){return 0;}",
    "language": "c",
    "hint_level": 1
  }'
```

기대 결과:

```text
403
```

### 일반 토큰으로 OJ 히스토리 조회

```bash
curl -i "http://localhost:8000/history?source=oj" \
  -H "Authorization: Bearer <NORMAL_TOKEN>"
```

기대 결과:

```text
403
```

### 일반 토큰으로 전체 히스토리 조회

```bash
curl -i "http://localhost:8000/history" \
  -H "Authorization: Bearer <NORMAL_TOKEN>"
```

기대 결과:

```text
200
```

응답의 `items`에 `source: "oj"` 항목이 없어야 한다.

## 4. 프론트엔드 상세 구현 계획

## 4.1 대상 파일

프론트엔드에서 수정할 파일은 다음이다.

| 파일 | 수정 목적 |
| --- | --- |
| `frontend/src/api/auth.ts` | JWT payload 파싱 유틸 추가 |
| `frontend/src/App.tsx` | `isSejongVerified` 상태 관리 및 props 전달 |
| `frontend/src/components/Header.tsx` | OJ 탭 조건부 표시 |
| `frontend/src/pages/HomePage.tsx` | OJ shortcut 조건부 표시, OJ 이력 표시 정책 |
| `frontend/src/pages/EditorPage.tsx` | `/editor/oj` 직접 접근 차단, OJ fetch 조건, hint payload에 source 추가 |
| `frontend/src/api/oj.ts` | OJ API 요청에 auth header 추가, 401/403 처리 |
| `frontend/src/api/hint.ts` | `/hint` 403 처리 |

## 4.2 `frontend/src/api/auth.ts`

### 현재 상태

현재 `auth.ts`에는 token 저장/조회와 `authHeaders()`가 있다.

```ts
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

JWT payload 파싱은 `App.tsx`의 `getUserid()` 내부에만 있다.

### 구현 작업

1. `TokenPayload` 타입 추가
2. `getTokenPayload()` 추가
3. `isSejongVerifiedToken()` 추가

### 구현 예시

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
    if (!base64url) return null;
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

### 주의사항

- 프론트엔드의 payload 파싱은 표시용이다.
- 백엔드 권한은 반드시 JWT 서명 검증 후 판단한다.
- payload parsing 실패 시 false로 처리한다.

### 완료 기준

- 세종대 JWT에서 `isSejongVerifiedToken()`이 true를 반환한다.
- 일반/카카오 JWT에서 false를 반환한다.
- 토큰이 없거나 깨졌으면 false를 반환한다.

## 4.3 `frontend/src/App.tsx`

### 현재 상태

현재 `App.tsx`는 token과 userid만 상태로 관리한다.

```ts
const [token, setToken] = useState<string | null>(() => getToken());
const [userid, setUserid] = useState<string>(() => getUserid());
```

`getUserid()`는 App 내부에서 직접 JWT를 파싱한다.

### 구현 작업

1. `getTokenPayload`, `isSejongVerifiedToken` import
2. `getUserid()`를 공통 유틸 기반으로 변경
3. `isSejongVerified` state 추가
4. 로그인 성공 시 상태 갱신
5. 카카오 로그인 콜백 성공 시 상태 갱신
6. 로그아웃/unauthorized 시 false로 초기화
7. Header/HomePage/EditorPage에 prop 전달

### import 변경

현재:

```ts
import { getToken, clearToken, kakaoLogin } from './api/auth';
```

변경:

```ts
import {
  getToken,
  clearToken,
  kakaoLogin,
  getTokenPayload,
  isSejongVerifiedToken,
} from './api/auth';
```

### getUserid 변경

```ts
function getUserid(): string {
  return getTokenPayload()?.nickname ?? '';
}
```

### state 추가

```ts
const [isSejongVerified, setIsSejongVerified] = useState<boolean>(
  () => isSejongVerifiedToken()
);
```

### 로그인 성공 핸들러 변경

```ts
const handleLogin = useCallback(() => {
  setToken(getToken());
  setUserid(getUserid());
  setIsSejongVerified(isSejongVerifiedToken());
}, []);
```

### 로그아웃 변경

```ts
const handleLogout = useCallback(() => {
  clearToken();
  setToken(null);
  setUserid('');
  setIsSejongVerified(false);
  navigate('/', { replace: true });
}, [navigate]);
```

`handleQuizUnauthorized`도 동일하게 false로 초기화한다.

### 카카오 콜백 변경

```ts
kakaoLogin(code)
  .then(() => {
    setToken(getToken());
    setUserid(getUserid());
    setIsSejongVerified(isSejongVerifiedToken());
  })
```

### props 전달

Header:

```tsx
<Header
  userid={userid}
  isSejongVerified={isSejongVerified}
  onLogout={handleLogout}
/>
```

HomePage:

```tsx
<HomePage
  isSejongVerified={isSejongVerified}
  onGoTo={(mode) => navigate(`/${mode === 'home' ? '' : mode}`)}
  onGoToEditor={(src: Source) => navigate(`/editor/${src}`)}
  onUnauthorized={handleLogout}
/>
```

EditorPage:

```tsx
<EditorPage
  isDark={isDark}
  isSejongVerified={isSejongVerified}
  onLogout={handleLogout}
/>
```

와일드카드 라우트의 HomePage에도 동일하게 전달한다.

### 완료 기준

- 세종대 로그인 후 `isSejongVerified`가 true다.
- 일반 로그인 후 false다.
- 카카오 로그인 후 false다.
- 로그아웃 후 false다.
- 새로고침해도 localStorage 토큰 기준으로 상태가 복원된다.

## 4.4 `frontend/src/components/Header.tsx`

### 현재 상태

OJ 탭이 항상 포함되어 있다.

```ts
const TABS: Tab[] = [
  { label: '홈', path: '/' },
  { label: '직접 입력', path: '/editor/direct' },
  { label: '문제 불러오기', path: '/editor/url' },
  { label: 'OJ', path: '/editor/oj' },
  { label: '히스토리', path: '/history' },
  { label: '퀴즈', path: '/quiz' },
];
```

### 구현 작업

1. `HeaderProps`에 `isSejongVerified` 추가
2. 렌더링 시 OJ 탭 필터링

### 구현 예시

```ts
interface HeaderProps {
  userid: string;
  isSejongVerified: boolean;
  onLogout: () => void;
}
```

```tsx
function Header({ userid, isSejongVerified, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visibleTabs = TABS.filter((tab) => (
    tab.path !== '/editor/oj' || isSejongVerified
  ));

  return (
    ...
    {visibleTabs.map((tab) => {
      ...
    })}
  );
}
```

### 완료 기준

- 일반/카카오 로그인 사용자는 OJ 탭을 볼 수 없다.
- 세종대 로그인 사용자는 OJ 탭을 볼 수 있다.
- OJ 탭 외 다른 탭은 기존처럼 동작한다.

## 4.5 `frontend/src/pages/HomePage.tsx`

### 현재 상태

OJ shortcut이 항상 포함되어 있다.

```ts
const SHORTCUTS = [
  { icon: '📝', label: '직접 입력', mode: 'editor', source: 'direct' },
  { icon: '🔗', label: '문제 불러오기', mode: 'editor', source: 'url' },
  { icon: 'OJ', label: 'OJ', mode: 'editor', source: 'oj' },
  ...
];
```

최근 힌트 이력 카드도 현재는 `source === "url"`이 아니면 모두 직접 입력처럼 표시한다. OJ 히스토리를 노출할 계획이라면 OJ 태그/필터를 별도로 처리해야 한다.

### 구현 작업

1. `HomePageProps`에 `isSejongVerified` 추가
2. `ShortcutCard` props에 `isSejongVerified` 추가
3. OJ shortcut 필터링
4. `RecentHintsCard`에서 OJ source 표시 정책 추가
5. 세종대 사용자인 경우에만 OJ 필터/태그를 노출

### 구현 예시

```ts
interface HomePageProps {
  isSejongVerified: boolean;
  onGoTo: (mode: ViewMode) => void;
  onGoToEditor: (source: Source) => void;
  onUnauthorized: () => void;
}
```

```tsx
type RecentFilter = 'all' | 'url' | 'direct' | 'oj';

function sourceLabel(source: Source): string {
  if (source === 'url') return '불러옴';
  if (source === 'oj') return 'OJ';
  return '직접';
}
```

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
  const shortcuts = SHORTCUTS.filter((s) => (
    s.source !== 'oj' || isSejongVerified
  ));

  return (
    <Card title="바로가기" className="hp-shortcut-card">
      <div className="hp-shortcut-grid">
        {shortcuts.map((s) => (
          ...
        ))}
      </div>
    </Card>
  );
}
```

```tsx
export default function HomePage({
  isSejongVerified,
  onGoTo,
  onGoToEditor,
  onUnauthorized,
}: HomePageProps) {
  return (
    <div className="hp-grid">
      <RecentHintsCard
        isSejongVerified={isSejongVerified}
        onGoTo={onGoTo}
        onUnauthorized={onUnauthorized}
      />
      <ShortcutCard
        isSejongVerified={isSejongVerified}
        onGoTo={onGoTo}
        onGoToEditor={onGoToEditor}
      />
      <ActivityCard onUnauthorized={onUnauthorized} />
    </div>
  );
}
```

### 완료 기준

- 일반/카카오 로그인 사용자는 Home에서 OJ shortcut을 볼 수 없다.
- 세종대 로그인 사용자는 Home에서 OJ shortcut을 볼 수 있다.
- 일반/카카오 로그인 사용자의 최근 이력/활동 통계에는 OJ 기록이 보이지 않는다.
- 세종대 로그인 사용자는 최근 이력에서 OJ 기록이 OJ로 구분되어 보인다.

## 4.6 `frontend/src/api/oj.ts`

### 현재 상태

OJ API 호출에 인증 헤더가 없다.

```ts
const res = await fetch('http://localhost:8000/oj');
```

```ts
const res = await fetch(
  `http://localhost:8000/oj/${...}`
);
```

### 구현 작업

1. `authHeaders`, `clearToken` import
2. 401/403 처리를 위한 에러 클래스 또는 에러 메시지 추가
3. `fetchOjIndex()`에 auth headers 추가
4. `fetchOjProblem()`에 auth headers 추가

### 구현 예시

```ts
import { authHeaders, clearToken } from './auth';


export class SejongRequiredError extends Error {
  constructor() {
    super('SejongRequired');
  }
}
```

```ts
function handleOjAuthError(res: Response): void {
  if (res.status === 401) {
    clearToken();
    throw new Error('Unauthorized');
  }
  if (res.status === 403) {
    throw new SejongRequiredError();
  }
}
```

```ts
export async function fetchOjIndex(): Promise<OjSubjectSummary[]> {
  const res = await fetch('http://localhost:8000/oj', {
    headers: authHeaders(),
  });
  handleOjAuthError(res);
  if (!res.ok) throw new Error('OJ 목록을 불러오지 못했습니다.');
  const data = await res.json();
  return data.subjects ?? [];
}
```

```ts
export async function fetchOjProblem(
  subject: string,
  chapter: string,
  problemNumber: string
): Promise<OjProblemDetail> {
  const res = await fetch(
    `http://localhost:8000/oj/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}/${encodeURIComponent(problemNumber)}`,
    { headers: authHeaders() }
  );
  handleOjAuthError(res);
  if (!res.ok) throw new Error('OJ 문제를 불러오지 못했습니다.');
  const data = await res.json();
  return data.problem;
}
```

### 완료 기준

- OJ API 요청에 Authorization 헤더가 포함된다.
- 401이면 토큰을 제거하고 Unauthorized로 처리한다.
- 403이면 세종대 로그인 필요 상태로 처리한다.
- 세종대 로그인 토큰이면 정상 응답을 파싱한다.

## 4.7 `frontend/src/api/hint.ts`

### 현재 상태

`HintRequest` 타입에는 이미 `source`가 있다.

```ts
export interface HintRequest {
  submission_id: number | null;
  source?: 'direct' | 'url' | 'oj';
  ...
}
```

하지만 응답 처리에서 401만 특별 처리한다.

```ts
if (res.status === 401) {
  clearToken();
  throw new Error('Unauthorized');
}
return res.json();
```

### 구현 작업

1. 403 처리 추가
2. 일반 실패 처리 추가

### 구현 예시

```ts
if (res.status === 401) {
  clearToken();
  throw new Error('Unauthorized');
}
if (res.status === 403) {
  throw new Error('SejongRequired');
}
if (!res.ok) {
  throw new Error('HintRequestFailed');
}
return res.json();
```

### 완료 기준

- `/hint`에서 403이 오면 `SejongRequired`로 구분된다.
- 기존 401 로그아웃 동작은 유지된다.
- 실패 응답을 무조건 JSON으로 파싱하지 않는다.

## 4.8 `frontend/src/pages/EditorPage.tsx`

### 현재 상태

`source`는 URL param에서 계산된다.

```ts
const source: Source =
  sourceParam === 'url' ? 'url'
  : sourceParam === 'oj' ? 'oj'
  : 'direct';
```

OJ 목록은 `fetchOjIndex()`로 불러온다.

`postHint()` payload에는 아직 `source`가 들어가지 않는다.

```ts
const data: HintApiResponse = await postHint({
  submission_id: submissionId,
  ...
  code,
  language,
  error_log: '',
  hint_level: hintLevel,
});
```

### 구현 작업

1. `EditorPageProps`에 `isSejongVerified` 추가
2. `source === "oj" && !isSejongVerified`인 경우 차단 화면 표시
3. OJ API 401/403 에러 처리
4. `postHint()` payload에 `source` 추가
5. `SejongRequired` 에러 처리
6. OJ 목록/문제 fetch effect가 세종대 미인증 상태에서 실행되지 않도록 조건 추가

### props 변경

```ts
interface EditorPageProps {
  isDark: boolean;
  isSejongVerified: boolean;
  onLogout: () => void;
}
```

```ts
export default function EditorPage({
  isDark,
  isSejongVerified,
  onLogout,
}: EditorPageProps) {
  ...
}
```

### 직접 접근 차단

렌더링 초반에 추가한다.

```tsx
if (source === 'oj' && !isSejongVerified) {
  return (
    <main className="main-container">
      <div className="code-editor">
        <div className="oj-mode-summary">
          <span className="oj-mode-summary__tag">OJ</span>
          <span className="oj-mode-summary__text">세종대 로그인 후 사용할 수 있습니다.</span>
        </div>
      </div>
    </main>
  );
}
```

주의:

- 이 차단은 UX 목적이다.
- 백엔드 차단이 최종 보안이다.
- 차단 화면을 반환하기 전에 실행되는 effect에서도 OJ API를 호출하지 않도록 해야 한다.

### OJ 목록 로딩 조건 변경

현재 OJ 목록 로딩 effect는 `source === "oj"`이면 실행된다.

```ts
useEffect(() => {
  if (source !== 'oj') return;
  ...
  fetchOjIndex()
  ...
}, [source, ojSubject]);
```

변경:

```ts
useEffect(() => {
  if (source !== 'oj' || !isSejongVerified) return;
  ...
  fetchOjIndex()
  ...
}, [source, ojSubject, isSejongVerified]);
```

이 조건이 없으면 일반/카카오 로그인 사용자가 `/editor/oj`에 직접 접근했을 때 안내 화면을 보더라도 백그라운드에서 OJ API를 호출할 수 있다.

### OJ 목록 로딩 에러 처리

현재:

```ts
.catch(() => {
  if (!cancelled) setOjError('OJ 목록을 불러오지 못했습니다.');
})
```

변경 예시:

```ts
.catch((err) => {
  if (cancelled) return;
  if (err instanceof Error && err.message === 'Unauthorized') {
    onLogout();
    return;
  }
  if (err instanceof Error && err.message === 'SejongRequired') {
    setOjError('세종대 로그인 후 사용할 수 있습니다.');
    return;
  }
  setOjError('OJ 목록을 불러오지 못했습니다.');
})
```

`SejongRequiredError` 클래스를 쓴다면 `instanceof SejongRequiredError`로 처리해도 된다.

### postHint payload 변경

현재 payload에 `source`를 추가한다.

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

### hint 에러 처리 변경

현재:

```ts
if (err instanceof Error && err.message === 'Unauthorized') {
  onLogout();
  return;
}
```

추가:

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

### 완료 기준

- 일반/카카오 로그인 사용자가 `/editor/oj`로 직접 접근하면 안내 화면을 본다.
- 세종대 로그인 사용자는 OJ editor를 사용할 수 있다.
- OJ 힌트 요청 payload에 `source: "oj"`가 포함된다.
- `/hint` 403 응답이 사용자에게 적절히 표시된다.

## 5. 통합 구현 순서

## 5.1 1단계: 백엔드 인증 기반 준비

1. `backend/auth.py` 수정
2. `backend/auth_router.py` 세종대 JWT 클레임 추가
3. 일반 로그인/세종대 로그인 토큰 payload 수동 확인

완료 기준:

- 세종대 토큰에만 `is_sejong_verified: true`가 있다.

## 5.2 2단계: 백엔드 OJ API 차단

1. `backend/oj_router.py`에 `require_sejong_token` 적용
2. 토큰 없음/일반 토큰/세종대 토큰으로 `/oj` 검증

완료 기준:

- OJ API가 더 이상 공개되어 있지 않다.

## 5.3 3단계: 백엔드 Hint 우회 차단

1. `backend/models.py`에 `source` 추가
2. `backend/router.py`에서 OJ source 검사
3. OJ submission 재사용 검사 추가
4. 히스토리 API에서 OJ 기록 조회 정책 적용
5. `Submission.source="oj"` 저장 확인

완료 기준:

- 일반 토큰으로 OJ hint 신규/후속 요청이 모두 막힌다.
- 일반 토큰의 히스토리/통계에 OJ 기록이 노출되지 않는다.

## 5.4 4단계: 프론트 인증 상태 연결

1. `frontend/src/api/auth.ts`에 payload 유틸 추가
2. `frontend/src/App.tsx`에 `isSejongVerified` 상태 추가
3. Header/Home/EditorPage에 prop 전달

완료 기준:

- 세종대 로그인 여부가 프론트 상태로 정확히 표현된다.

## 5.5 5단계: 프론트 OJ 진입점 제어

1. Header OJ 탭 조건부 표시
2. Home OJ shortcut 조건부 표시
3. `/editor/oj` 직접 접근 차단

완료 기준:

- 세종대 로그인 사용자에게만 OJ 진입점이 보인다.

## 5.6 6단계: 프론트 API 연동 보강

1. `api/oj.ts`에 auth header 추가
2. `api/oj.ts`에 401/403 처리 추가
3. `api/hint.ts`에 403 처리 추가
4. `EditorPage.tsx`의 hint payload에 source 추가

완료 기준:

- OJ API와 OJ hint 요청이 백엔드 권한 정책과 일치한다.

## 6. 최종 테스트 체크리스트

## 6.1 백엔드 체크리스트

- [ ] 일반 로그인 JWT에 `is_sejong_verified: true`가 없다.
- [ ] 카카오 로그인 JWT에 `is_sejong_verified: true`가 없다.
- [ ] 세종대 로그인 JWT에 `is_sejong_verified: true`가 있다.
- [ ] 토큰 없이 `GET /oj` 호출 시 401
- [ ] 일반 토큰으로 `GET /oj` 호출 시 403
- [ ] 세종대 토큰으로 `GET /oj` 호출 시 200
- [ ] 일반 토큰으로 `source="oj"` `/hint` 호출 시 403
- [ ] 세종대 토큰으로 `source="oj"` `/hint` 호출 시 200
- [ ] 일반 토큰으로 기존 OJ `submission_id` 후속 힌트 호출 시 403
- [ ] 일반 토큰으로 `source="oj"` 히스토리 조회 시 403 또는 결과 제외
- [ ] 일반 토큰의 전체 히스토리/통계에 OJ 기록이 포함되지 않음
- [ ] 세종대 토큰의 히스토리/통계에는 OJ 기록이 정책대로 포함됨
- [ ] direct/url 힌트 요청은 기존처럼 동작

## 6.2 프론트엔드 체크리스트

- [ ] 일반 로그인 후 Header에 OJ 탭이 없다.
- [ ] 일반 로그인 후 Home에 OJ shortcut이 없다.
- [ ] 일반 로그인 후 `/editor/oj` 직접 접근 시 안내 화면이 보인다.
- [ ] 카카오 로그인도 일반 로그인과 동일하게 동작한다.
- [ ] 세종대 로그인 후 Header에 OJ 탭이 보인다.
- [ ] 세종대 로그인 후 Home에 OJ shortcut이 보인다.
- [ ] 세종대 로그인 후 `/editor/oj`가 정상 동작한다.
- [ ] 일반 로그인 후 `/editor/oj` 직접 접근 시 OJ 목록 API가 백그라운드에서 호출되지 않는다.
- [ ] Home 최근 이력에서 OJ 기록은 세종대 로그인 사용자에게만 OJ로 구분되어 표시된다.
- [ ] OJ 목록 API 요청에 Authorization header가 포함된다.
- [ ] OJ 문제 상세 API 요청에 Authorization header가 포함된다.
- [ ] OJ hint 요청 payload에 `source: "oj"`가 포함된다.
- [ ] `/hint` 403 응답이 세종대 로그인 필요 안내로 표시된다.
- [ ] 401 응답은 기존처럼 로그아웃 처리된다.

## 6.3 빌드/실행 체크리스트

- [ ] 백엔드 서버 실행 성공
- [ ] 프론트엔드 빌드 성공
- [ ] TypeScript 타입 오류 없음
- [ ] 기존 로그인/회원가입 동작 유지
- [ ] 기존 직접 입력 힌트 동작 유지
- [ ] 기존 문제 불러오기 힌트 동작 유지
- [ ] 기존 히스토리/퀴즈 기능 동작 유지

## 7. 구현 시 주의할 우회 경로

## 7.1 `/oj` 직접 호출

프론트에서 메뉴를 숨겨도 사용자는 직접 `/oj`를 호출할 수 있다. 반드시 백엔드 라우터에서 막아야 한다.

## 7.2 `/hint` 직접 호출

사용자가 OJ 문제 내용을 알고 있으면 `/hint`에 직접 payload를 보낼 수 있다. 정상 OJ 흐름에서는 반드시 `source="oj"`를 보내고, 백엔드는 이를 차단해야 한다.

단, `source="oj"`는 보안 신호가 아니라 클라이언트가 보낸 분류 신호다. 사용자가 OJ 문제 내용을 직접 복사해서 `source="direct"`로 보내면 이 계획만으로는 차단할 수 없다.

이번 목표가 `/oj` API와 정상 OJ 흐름을 세종대 토큰으로 제한하는 것이라면 이 한계는 허용 가능하다. OJ 문제 내용 자체의 힌트 생성을 세종대 사용자로만 제한해야 한다면, 서버가 OJ 문제 식별자나 문제 해시를 검증하는 별도 설계가 필요하다.

## 7.3 기존 OJ submission_id 재사용

첫 번째 OJ 힌트를 세종대 토큰으로 만든 뒤, 이후 일반 토큰으로 같은 `submission_id`에 후속 힌트를 요청하는 우회가 가능할 수 있다.

따라서 `request.submission_id is not None`인 경우에도 `submission.source == "oj"`이면 세종대 JWT를 요구해야 한다.

## 7.4 OJ 히스토리 조회

세종대 토큰으로 생성된 OJ submission은 DB에 남는다. 같은 사용자 계정에서 일반/카카오 토큰을 발급받을 수 있다면 `/history`나 `/history/submissions`로 OJ 기록을 조회하는 우회가 가능하다.

따라서 히스토리 전체 조회에서는 일반/카카오 토큰에 OJ 기록을 제외하고, `source="oj"` 필터 조회는 403으로 막는다.

## 7.5 프론트 JWT 조작

사용자가 localStorage의 JWT payload를 임의 수정할 수는 있다. 하지만 서명이 깨지므로 백엔드에서는 401이 되어야 한다. 따라서 백엔드는 프론트 상태를 신뢰하면 안 되고, 항상 `jwt.decode()`로 검증한 payload만 신뢰한다.

## 8. 예상 변경 규모

| 영역 | 예상 변경량 | 리스크 |
| --- | --- | --- |
| `backend/auth.py` | 작음 | 기존 인증 의존성 유지 필요 |
| `backend/auth_router.py` | 매우 작음 | 세종대 토큰에만 클레임 추가해야 함 |
| `backend/oj_router.py` | 작음 | 모든 OJ API 보호 확인 필요 |
| `backend/models.py` | 매우 작음 | 기존 요청 호환성 위해 기본값 필요 |
| `backend/router.py` | 중간 | OJ 신규/후속 힌트 및 히스토리 조회 우회 차단 필요 |
| `frontend/src/api/auth.ts` | 작음 | payload parsing 공통화 |
| `frontend/src/App.tsx` | 중간 | props 전달 누락 주의 |
| `Header/HomePage` | 작음~중간 | 조건부 렌더링, OJ 히스토리 표시 정책 |
| `EditorPage.tsx` | 중간 | 직접 접근 차단, OJ fetch 조건, source payload, 에러 처리 |
| `api/oj.ts`, `api/hint.ts` | 작음 | 401/403 분기 |

## 9. 완료 정의

이 작업은 다음 조건이 모두 만족될 때 완료로 본다.

- DB 수정 없이 구현된다.
- 토큰 없음은 401, 권한 부족은 403으로 분리된다.
- 세종대 로그인 토큰으로만 OJ API를 사용할 수 있다.
- 일반/카카오 로그인 토큰은 OJ API에서 403을 받는다.
- OJ hint 요청은 세종대 토큰만 허용된다.
- 기존 OJ submission 후속 힌트도 세종대 토큰만 허용된다.
- 일반/카카오 로그인 토큰으로 OJ 히스토리와 OJ 통계를 조회할 수 없다.
- 프론트엔드에서 OJ 진입점은 세종대 로그인 사용자에게만 보인다.
- `/editor/oj` 직접 접근도 프론트에서 안내 화면으로 차단된다.
- 세종대 미인증 상태의 `/editor/oj` 직접 접근은 OJ API를 백그라운드에서 호출하지 않는다.
- direct/url 힌트 기능은 기존대로 동작한다.
- 백엔드 수동 API 검증과 프론트 빌드 검증이 통과한다.
