# Python MCP 서버 구현 가이드

## 개요

이 문서는 MCP Python SDK를 사용하여 MCP 서버를 구현하기 위한 Python 전용 모범 사례와 예제를 제공합니다. 서버 설정, 툴 등록 패턴, Pydantic을 이용한 입력 유효성 검사, 에러 처리, 그리고 완전한 작동 예제를 다룹니다.

---

## 빠른 참조

### 핵심 임포트
```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
```

### 서버 초기화
```python
mcp = FastMCP("service_mcp")
```

### 툴 등록 패턴
```python
@mcp.tool(name="tool_name", annotations={...})
async def tool_function(params: InputModel) -> str:
    # 구현
    pass
```

---

## MCP Python SDK와 FastMCP

공식 MCP Python SDK는 MCP 서버 구축을 위한 고수준 프레임워크인 FastMCP를 제공합니다. 제공 기능:
- 함수 시그니처와 독스트링에서 자동으로 description과 inputSchema 생성
- 입력 유효성 검사를 위한 Pydantic 모델 통합
- `@mcp.tool` 데코레이터 기반 툴 등록

**전체 SDK 문서는 WebFetch로 로드:**
`https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

## 서버 명명 규칙

Python MCP 서버는 다음 명명 패턴을 따라야 합니다:
- **형식**: `{service}_mcp` (소문자, 언더스코어 사용)
- **예시**: `github_mcp`, `jira_mcp`, `stripe_mcp`

이름은 다음 조건을 충족해야 합니다:
- 범용적일 것 (특정 기능에 종속되지 않을 것)
- 통합 대상 서비스/API를 잘 설명할 것
- 작업 설명에서 쉽게 유추 가능할 것
- 버전 번호나 날짜 미포함

## 툴 구현

### 툴 명명

툴 이름에는 snake_case를 사용합니다 (예: "search_users", "create_project", "get_channel_info"). 명확하고 행동 중심적인 이름을 사용합니다.

**명명 충돌 방지**: 겹침을 방지하기 위해 서비스 컨텍스트를 포함합니다:
- "send_message" 대신 "slack_send_message" 사용
- "create_issue" 대신 "github_create_issue" 사용
- "list_tasks" 대신 "asana_list_tasks" 사용

### FastMCP를 사용한 툴 구조

툴은 `@mcp.tool` 데코레이터와 입력 유효성 검사를 위한 Pydantic 모델을 사용하여 정의합니다:

```python
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# MCP 서버 초기화
mcp = FastMCP("example_mcp")

# 입력 유효성 검사를 위한 Pydantic 모델 정의
class ServiceToolInput(BaseModel):
    '''서비스 툴 작업의 입력 모델.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,  # 문자열에서 공백 자동 제거
        validate_assignment=True,    # 할당 시 유효성 검사
        extra='forbid'              # 추가 필드 금지
    )

    param1: str = Field(..., description="첫 번째 파라미터 설명 (예: 'user123', 'project-abc')", min_length=1, max_length=100)
    param2: Optional[int] = Field(default=None, description="제약 조건이 있는 선택적 정수 파라미터", ge=0, le=1000)
    tags: Optional[List[str]] = Field(default_factory=list, description="적용할 태그 목록", max_items=10)

@mcp.tool(
    name="service_tool_name",
    annotations={
        "title": "사람이 읽기 쉬운 툴 제목",
        "readOnlyHint": True,     # 툴이 환경을 수정하지 않음
        "destructiveHint": False,  # 툴이 파괴적 작업을 수행하지 않음
        "idempotentHint": True,    # 반복 호출해도 추가 효과 없음
        "openWorldHint": False     # 툴이 외부 엔티티와 상호작용하지 않음
    }
)
async def service_tool_name(params: ServiceToolInput) -> str:
    '''툴 설명은 자동으로 'description' 필드가 됩니다.

    이 툴은 서비스에서 특정 작업을 수행합니다. 처리 전에
    ServiceToolInput Pydantic 모델로 모든 입력을 검증합니다.

    Args:
        params (ServiceToolInput): 다음을 포함하는 검증된 입력 파라미터:
            - param1 (str): 첫 번째 파라미터 설명
            - param2 (Optional[int]): 기본값이 있는 선택적 파라미터
            - tags (Optional[List[str]]): 태그 목록

    Returns:
        str: 작업 결과가 포함된 JSON 형식의 응답
    '''
    # 여기에 구현
    pass
```

## Pydantic v2 주요 기능

- 중첩 `Config` 클래스 대신 `model_config` 사용
- 더 이상 사용되지 않는 `validator` 대신 `field_validator` 사용
- 더 이상 사용되지 않는 `dict()` 대신 `model_dump()` 사용
- 검증자에는 `@classmethod` 데코레이터 필요
- 검증자 메서드에는 타입 힌트 필수

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CreateUserInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    name: str = Field(..., description="사용자의 전체 이름", min_length=1, max_length=100)
    email: str = Field(..., description="사용자의 이메일 주소", pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    age: int = Field(..., description="사용자의 나이", ge=0, le=150)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Email cannot be empty")
        return v.lower()
```

## 응답 형식 옵션

유연성을 위해 여러 출력 형식을 지원합니다:

```python
from enum import Enum

class ResponseFormat(str, Enum):
    '''툴 응답의 출력 형식.'''
    MARKDOWN = "markdown"
    JSON = "json"

class UserSearchInput(BaseModel):
    query: str = Field(..., description="검색 쿼리")
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="출력 형식: 사람이 읽기 위한 'markdown' 또는 기계 처리용 'json'"
    )
```

**Markdown 형식**:
- 명확성을 위해 헤더, 목록, 포맷팅 사용
- 타임스탬프를 사람이 읽기 쉬운 형식으로 변환 (예: 에폭 시간 대신 "2024-01-15 10:30:00 UTC")
- ID는 괄호 안에 표시 이름과 함께 표시 (예: "@john.doe (U123456)")
- 장황한 메타데이터 생략 (예: 모든 이미지 URL 대신 하나만 표시)
- 관련 정보를 논리적으로 그룹화

**JSON 형식**:
- 프로그래밍 방식 처리에 적합한 완전하고 구조화된 데이터 반환
- 가능한 모든 필드와 메타데이터 포함
- 일관된 필드 이름과 타입 사용

## 페이지네이션 구현

리소스를 나열하는 툴의 경우:

```python
class ListInput(BaseModel):
    limit: Optional[int] = Field(default=20, description="반환할 최대 결과 수", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="페이지네이션을 위해 건너뛸 결과 수", ge=0)

async def list_items(params: ListInput) -> str:
    # 페이지네이션으로 API 요청
    data = await api_request(limit=params.limit, offset=params.offset)

    # 페이지네이션 정보 반환
    response = {
        "total": data["total"],
        "count": len(data["items"]),
        "offset": params.offset,
        "items": data["items"],
        "has_more": data["total"] > params.offset + len(data["items"]),
        "next_offset": params.offset + len(data["items"]) if data["total"] > params.offset + len(data["items"]) else None
    }
    return json.dumps(response, indent=2)
```

## 에러 처리

명확하고 실행 가능한 에러 메시지를 제공합니다:

```python
def _handle_api_error(e: Exception) -> str:
    '''모든 툴에 걸쳐 일관된 에러 포맷팅.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"
```

## 공유 유틸리티

공통 기능을 재사용 가능한 함수로 추출합니다:

```python
# 공유 API 요청 함수
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''모든 API 호출을 위한 재사용 가능한 함수.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
```

## Async/Await 모범 사례

네트워크 요청과 I/O 작업에는 항상 async/await를 사용합니다:

```python
# 좋음: 비동기 네트워크 요청
async def fetch_data(resource_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/resource/{resource_id}")
        response.raise_for_status()
        return response.json()

# 나쁨: 동기 요청 (블로킹)
def fetch_data(resource_id: str) -> dict:
    response = requests.get(f"{API_URL}/resource/{resource_id}")
    return response.json()
```

## 타입 힌트

코드 전반에 타입 힌트를 사용합니다:

```python
from typing import Optional, List, Dict, Any

async def get_user(user_id: str) -> Dict[str, Any]:
    data = await fetch_user(user_id)
    return {"id": data["id"], "name": data["name"]}
```

## 툴 독스트링

모든 툴은 명시적 타입 정보와 함께 포괄적인 독스트링을 가져야 합니다:

```python
async def search_users(params: UserSearchInput) -> str:
    '''
    이름, 이메일, 또는 팀으로 Example 시스템의 사용자를 검색합니다.

    이 툴은 Example 플랫폼의 모든 사용자 프로필을 검색하며,
    부분 매칭과 다양한 검색 필터를 지원합니다. 사용자를
    생성하거나 수정하지 않으며, 기존 사용자만 검색합니다.

    Args:
        params (UserSearchInput): 다음을 포함하는 검증된 입력 파라미터:
            - query (str): 이름/이메일과 매칭할 검색 문자열 (예: "john", "@example.com", "team:marketing")
            - limit (Optional[int]): 반환할 최대 결과 수, 1-100 사이 (기본값: 20)
            - offset (Optional[int]): 페이지네이션을 위해 건너뛸 결과 수 (기본값: 0)

    Returns:
        str: 다음 스키마의 검색 결과가 포함된 JSON 형식 문자열:

        성공 응답:
        {
            "total": int,           # 총 매칭 수
            "count": int,           # 이 응답의 결과 수
            "offset": int,          # 현재 페이지네이션 오프셋
            "users": [
                {
                    "id": str,      # 사용자 ID (예: "U123456789")
                    "name": str,    # 전체 이름 (예: "John Doe")
                    "email": str,   # 이메일 주소 (예: "john@example.com")
                    "team": str     # 팀 이름 (예: "Marketing") - 선택적
                }
            ]
        }

        에러 응답:
        "Error: <에러 메시지>" 또는 "No users found matching '<query>'"

    Examples:
        - 사용 시: "Find all marketing team members" -> query="team:marketing"인 params
        - 사용 시: "Search for John's account" -> query="john"인 params
        - 사용 금지: 사용자를 생성해야 할 때 (대신 example_create_user 사용)
        - 사용 금지: 사용자 ID가 있고 전체 세부 정보가 필요할 때 (대신 example_get_user 사용)

    Error Handling:
        - 입력 유효성 검사 에러는 Pydantic 모델이 처리
        - 요청이 너무 많은 경우 "Error: Rate limit exceeded" 반환 (429 상태)
        - API 키가 유효하지 않은 경우 "Error: Invalid API authentication" 반환 (401 상태)
        - 결과 형식의 목록 또는 "No users found matching 'query'" 반환
    '''
```

## 완전한 예제

```python
#!/usr/bin/env python3
'''
Example Service용 MCP 서버.

이 서버는 Example API와 상호작용하는 툴을 제공합니다.
사용자 검색, 프로젝트 관리, 데이터 내보내기 기능을 포함합니다.
'''

from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
from pydantic import BaseModel, Field, field_validator, ConfigDict
from mcp.server.fastmcp import FastMCP

# MCP 서버 초기화
mcp = FastMCP("example_mcp")

# 상수
API_BASE_URL = "https://api.example.com/v1"

# 열거형
class ResponseFormat(str, Enum):
    '''툴 응답의 출력 형식.'''
    MARKDOWN = "markdown"
    JSON = "json"

# 입력 유효성 검사를 위한 Pydantic 모델
class UserSearchInput(BaseModel):
    '''사용자 검색 작업의 입력 모델.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    query: str = Field(..., description="이름/이메일과 매칭할 검색 문자열", min_length=2, max_length=200)
    limit: Optional[int] = Field(default=20, description="반환할 최대 결과 수", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="페이지네이션을 위해 건너뛸 결과 수", ge=0)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN, description="출력 형식")

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace only")
        return v.strip()

# 공유 유틸리티 함수
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''모든 API 호출을 위한 재사용 가능한 함수.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()

def _handle_api_error(e: Exception) -> str:
    '''모든 툴에 걸쳐 일관된 에러 포맷팅.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"

# 툴 정의
@mcp.tool(
    name="example_search_users",
    annotations={
        "title": "Search Example Users",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True
    }
)
async def example_search_users(params: UserSearchInput) -> str:
    '''이름, 이메일, 또는 팀으로 Example 시스템의 사용자를 검색합니다.

    [위에 표시된 전체 독스트링]
    '''
    try:
        # 검증된 파라미터로 API 요청
        data = await _make_api_request(
            "users/search",
            params={
                "q": params.query,
                "limit": params.limit,
                "offset": params.offset
            }
        )

        users = data.get("users", [])
        total = data.get("total", 0)

        if not users:
            return f"No users found matching '{params.query}'"

        # 요청된 형식에 따라 응답 포맷
        if params.response_format == ResponseFormat.MARKDOWN:
            lines = [f"# User Search Results: '{params.query}'", ""]
            lines.append(f"Found {total} users (showing {len(users)})")
            lines.append("")

            for user in users:
                lines.append(f"## {user['name']} ({user['id']})")
                lines.append(f"- **Email**: {user['email']}")
                if user.get('team'):
                    lines.append(f"- **Team**: {user['team']}")
                lines.append("")

            return "\n".join(lines)

        else:
            # 기계가 읽을 수 있는 JSON 형식
            import json
            response = {
                "total": total,
                "count": len(users),
                "offset": params.offset,
                "users": users
            }
            return json.dumps(response, indent=2)

    except Exception as e:
        return _handle_api_error(e)

if __name__ == "__main__":
    mcp.run()
```

---

## 고급 FastMCP 기능

### Context 파라미터 주입

FastMCP는 로깅, 진행률 보고, 리소스 읽기, 사용자 상호작용 같은 고급 기능을 위해 `Context` 파라미터를 툴에 자동으로 주입할 수 있습니다:

```python
from mcp.server.fastmcp import FastMCP, Context

mcp = FastMCP("example_mcp")

@mcp.tool()
async def advanced_search(query: str, ctx: Context) -> str:
    '''로깅과 진행률 접근을 위한 context를 사용하는 고급 툴.'''

    # 장기 작업의 진행률 보고
    await ctx.report_progress(0.25, "Starting search...")

    # 디버깅을 위한 정보 로깅
    await ctx.log_info("Processing query", {"query": query, "timestamp": datetime.now()})

    # 검색 수행
    results = await search_api(query)
    await ctx.report_progress(0.75, "Formatting results...")

    # 서버 설정 접근
    server_name = ctx.fastmcp.name

    return format_results(results)

@mcp.tool()
async def interactive_tool(resource_id: str, ctx: Context) -> str:
    '''사용자로부터 추가 입력을 요청할 수 있는 툴.'''

    # 필요할 때 민감한 정보 요청
    api_key = await ctx.elicit(
        prompt="Please provide your API key:",
        input_type="password"
    )

    # 제공된 키 사용
    return await api_call(resource_id, api_key)
```

**Context 기능:**
- `ctx.report_progress(progress, message)` - 장기 작업의 진행률 보고
- `ctx.log_info(message, data)` / `ctx.log_error()` / `ctx.log_debug()` - 로깅
- `ctx.elicit(prompt, input_type)` - 사용자로부터 입력 요청
- `ctx.fastmcp.name` - 서버 설정 접근
- `ctx.read_resource(uri)` - MCP 리소스 읽기

### 리소스 등록

효율적인 템플릿 기반 접근을 위한 데이터 노출:

```python
@mcp.resource("file://documents/{name}")
async def get_document(name: str) -> str:
    '''MCP 리소스로 문서 노출.

    리소스는 복잡한 파라미터가 필요 없는 정적 또는 준정적 데이터에 유용합니다.
    유연한 접근을 위해 URI 템플릿을 사용합니다.
    '''
    document_path = f"./docs/{name}"
    with open(document_path, "r") as f:
        return f.read()

@mcp.resource("config://settings/{key}")
async def get_setting(key: str, ctx: Context) -> str:
    '''context와 함께 리소스로 설정 노출.'''
    settings = await load_settings()
    return json.dumps(settings.get(key, {}))
```

**리소스 vs 툴 사용 기준:**
- **리소스**: 간단한 파라미터(URI 템플릿)로 데이터 접근 시
- **툴**: 유효성 검사와 비즈니스 로직이 필요한 복잡한 작업 시

### 구조화된 출력 타입

FastMCP는 문자열 외에 여러 반환 타입을 지원합니다:

```python
from typing import TypedDict
from dataclasses import dataclass
from pydantic import BaseModel

# 구조화된 반환을 위한 TypedDict
class UserData(TypedDict):
    id: str
    name: str
    email: str

@mcp.tool()
async def get_user_typed(user_id: str) -> UserData:
    '''구조화된 데이터 반환 - FastMCP가 직렬화 처리.'''
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}

# 복잡한 유효성 검사를 위한 Pydantic 모델
class DetailedUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    metadata: Dict[str, Any]

@mcp.tool()
async def get_user_detailed(user_id: str) -> DetailedUser:
    '''Pydantic 모델 반환 - 자동으로 스키마 생성.'''
    user = await fetch_user(user_id)
    return DetailedUser(**user)
```

### 수명 주기 관리

요청에 걸쳐 지속되는 리소스 초기화:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def app_lifespan():
    '''서버 수명 동안 살아있는 리소스 관리.'''
    # 연결 초기화, 설정 로드 등
    db = await connect_to_database()
    config = load_configuration()

    # 모든 툴에서 접근 가능하게 만들기
    yield {"db": db, "config": config}

    # 종료 시 정리
    await db.close()

mcp = FastMCP("example_mcp", lifespan=app_lifespan)

@mcp.tool()
async def query_data(query: str, ctx: Context) -> str:
    '''context를 통해 수명 주기 리소스 접근.'''
    db = ctx.request_context.lifespan_state["db"]
    results = await db.query(query)
    return format_results(results)
```

### 트랜스포트 옵션

FastMCP는 두 가지 주요 트랜스포트 메커니즘을 지원합니다:

```python
# stdio 트랜스포트 (로컬 툴용) - 기본값
if __name__ == "__main__":
    mcp.run()

# Streamable HTTP 트랜스포트 (원격 서버용)
if __name__ == "__main__":
    mcp.run(transport="streamable_http", port=8000)
```

**트랜스포트 선택 기준:**
- **stdio**: 커맨드라인 툴, 로컬 통합, 서브프로세스 실행
- **Streamable HTTP**: 웹 서비스, 원격 접근, 다수의 클라이언트

---

## 코드 모범 사례

### 코드 구성 가능성 및 재사용성

구현 시 반드시 구성 가능성과 코드 재사용을 우선시해야 합니다:

1. **공통 기능 추출**:
   - 여러 툴에서 사용하는 작업은 재사용 가능한 헬퍼 함수로 추출
   - 코드 중복 대신 HTTP 요청을 위한 공유 API 클라이언트 구축
   - 에러 처리 로직을 유틸리티 함수에 집중
   - 비즈니스 로직을 조합 가능한 전용 함수로 추출
   - 공유 마크다운 또는 JSON 필드 선택 및 포맷팅 기능 추출

2. **중복 방지**:
   - 툴 간에 유사한 코드를 절대 복사-붙여넣기 금지
   - 비슷한 로직을 두 번 작성하게 된다면 함수로 추출
   - 페이지네이션, 필터링, 필드 선택, 포맷팅 같은 공통 작업은 공유
   - 인증/인가 로직은 중앙화

### Python 전용 모범 사례

1. **타입 힌트 사용**: 함수 파라미터와 반환 값에 항상 타입 어노테이션 포함
2. **Pydantic 모델**: 모든 입력 유효성 검사에 명확한 Pydantic 모델 정의
3. **수동 유효성 검사 지양**: 제약 조건과 함께 Pydantic이 입력 유효성 검사 처리
4. **올바른 임포트 순서**: 임포트 그룹화 (표준 라이브러리, 서드파티, 로컬)
5. **에러 처리**: 구체적인 예외 타입 사용 (일반 Exception이 아닌 httpx.HTTPStatusError)
6. **비동기 컨텍스트 관리자**: 정리가 필요한 리소스에 `async with` 사용
7. **상수**: 모듈 레벨 상수는 UPPER_CASE로 정의

## 품질 체크리스트

Python MCP 서버 구현을 완료하기 전에 다음을 확인합니다:

### 전략적 설계
- [ ] 툴이 단순 API 엔드포인트 래퍼가 아닌 완전한 워크플로를 가능하게 함
- [ ] 툴 이름이 자연스러운 작업 세분화를 반영함
- [ ] 응답 형식이 에이전트 컨텍스트 효율성에 최적화됨
- [ ] 적절한 경우 사람이 읽기 쉬운 식별자 사용
- [ ] 에러 메시지가 에이전트를 올바른 사용법으로 안내함

### 구현 품질
- [ ] 집중된 구현: 가장 중요하고 가치 있는 툴이 구현됨
- [ ] 모든 툴이 설명적인 이름과 문서 보유
- [ ] 유사한 작업 간에 반환 타입이 일관됨
- [ ] 모든 외부 호출에 에러 처리 구현됨
- [ ] 서버 이름이 `{service}_mcp` 형식을 따름
- [ ] 모든 네트워크 작업이 async/await 사용
- [ ] 공통 기능이 재사용 가능한 함수로 추출됨
- [ ] 에러 메시지가 명확하고 실행 가능하며 교육적임
- [ ] 출력이 올바르게 검증되고 포맷됨

### 툴 설정
- [ ] 모든 툴의 데코레이터에 'name'과 'annotations' 구현됨
- [ ] 어노테이션이 올바르게 설정됨 (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- [ ] 모든 툴이 Field() 정의와 함께 Pydantic BaseModel을 입력 유효성 검사에 사용
- [ ] 모든 Pydantic Field에 명시적 타입, 설명, 제약 조건이 있음
- [ ] 모든 툴에 명시적 입력/출력 타입과 함께 포괄적인 독스트링 있음
- [ ] 독스트링에 dict/JSON 반환을 위한 완전한 스키마 구조 포함
- [ ] Pydantic 모델이 입력 유효성 검사 처리 (수동 유효성 검사 불필요)

### 고급 기능 (해당하는 경우)
- [ ] 로깅, 진행률, 또는 사용자 입력 요청을 위한 Context 주입 사용
- [ ] 적절한 데이터 엔드포인트에 리소스 등록됨
- [ ] 지속적 연결을 위한 수명 주기 관리 구현됨
- [ ] 구조화된 출력 타입 사용 (TypedDict, Pydantic 모델)
- [ ] 적절한 트랜스포트 설정됨 (stdio 또는 streamable HTTP)

### 코드 품질
- [ ] 파일에 Pydantic 임포트를 포함한 올바른 임포트 있음
- [ ] 해당하는 경우 페이지네이션이 올바르게 구현됨
- [ ] 잠재적으로 큰 결과 세트를 위한 필터링 옵션 제공됨
- [ ] 모든 비동기 함수가 `async def`로 올바르게 정의됨
- [ ] HTTP 클라이언트 사용이 적절한 컨텍스트 관리자와 함께 비동기 패턴을 따름
- [ ] 코드 전반에 타입 힌트 사용됨
- [ ] 상수가 UPPER_CASE로 모듈 레벨에 정의됨

### 테스트
- [ ] 서버 실행 성공: `python your_server.py --help`
- [ ] 모든 임포트가 올바르게 해석됨
- [ ] 샘플 툴 호출이 예상대로 작동함
- [ ] 에러 시나리오가 우아하게 처리됨
