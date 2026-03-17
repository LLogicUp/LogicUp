# Node/TypeScript MCP 서버 구현 가이드

## 개요

이 문서는 MCP TypeScript SDK를 사용하여 MCP 서버를 구현하기 위한 Node/TypeScript 전용 모범 사례와 예제를 제공합니다. 프로젝트 구조, 서버 설정, 툴 등록 패턴, Zod를 이용한 입력 유효성 검사, 에러 처리, 그리고 완전한 작동 예제를 다룹니다.

---

## 빠른 참조

### 핵심 임포트

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { z } from "zod";
```

### 서버 초기화

```typescript
const server = new McpServer({
  name: "service-mcp-server",
  version: "1.0.0"
});
```

### 툴 등록 패턴

```typescript
server.registerTool(
  "tool_name",
  {
    title: "Tool Display Name",
    description: "What the tool does",
    inputSchema: { param: z.string() },
    outputSchema: { result: z.string() }
  },
  async ({ param }) => {
    const output = { result: `Processed: ${param}` };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output // 구조화된 데이터를 위한 최신 패턴
    };
  }
);
```

---

## MCP TypeScript SDK

공식 MCP TypeScript SDK가 제공하는 기능:

- 서버 초기화를 위한 `McpServer` 클래스
- 툴 등록을 위한 `registerTool` 메서드
- 런타임 입력 유효성 검사를 위한 Zod 스키마 통합
- 타입 안전 툴 핸들러 구현

**중요 - 최신 API만 사용할 것:**

- **사용**: `server.registerTool()`, `server.registerResource()`, `server.registerPrompt()`
- **사용 금지**: `server.tool()`, `server.setRequestHandler(ListToolsRequestSchema, ...)`, 수동 핸들러 등록 등 구식 deprecated API
- `register*` 메서드는 더 나은 타입 안전성, 자동 스키마 처리를 제공하며 권장되는 방식입니다

자세한 내용은 참조의 MCP SDK 문서를 확인하세요.

## 서버 명명 규칙

Node/TypeScript MCP 서버는 다음 명명 패턴을 따라야 합니다:

- **형식**: `{service}-mcp-server` (소문자, 하이픈 사용)
- **예시**: `github-mcp-server`, `jira-mcp-server`, `stripe-mcp-server`

이름은 다음 조건을 충족해야 합니다:

- 범용적일 것 (특정 기능에 종속되지 않을 것)
- 통합 대상 서비스/API를 잘 설명할 것
- 작업 설명에서 쉽게 유추 가능할 것
- 버전 번호나 날짜 미포함

## 프로젝트 구조

Node/TypeScript MCP 서버는 다음 구조로 생성합니다:

```
{service}-mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts          # McpServer 초기화가 포함된 메인 엔트리 포인트
│   ├── types.ts          # TypeScript 타입 정의 및 인터페이스
│   ├── tools/            # 툴 구현 (도메인별 파일)
│   ├── services/         # API 클라이언트 및 공유 유틸리티
│   ├── schemas/          # Zod 유효성 검사 스키마
│   └── constants.ts      # 공유 상수 (API_URL, CHARACTER_LIMIT 등)
└── dist/                 # 빌드된 JavaScript 파일 (엔트리 포인트: dist/index.js)
```

## 툴 구현

### 툴 명명

툴 이름에는 snake_case를 사용합니다 (예: "search_users", "create_project", "get_channel_info"). 명확하고 행동 중심적인 이름을 사용합니다.

**명명 충돌 방지**: 겹침을 방지하기 위해 서비스 컨텍스트를 포함합니다:

- "send_message" 대신 "slack_send_message" 사용
- "create_issue" 대신 "github_create_issue" 사용
- "list_tasks" 대신 "asana_list_tasks" 사용

### 툴 구조

툴은 `registerTool` 메서드를 사용하여 등록하며 다음 요건을 충족해야 합니다:

- 런타임 입력 유효성 검사와 타입 안전성을 위해 Zod 스키마 사용
- `description` 필드는 반드시 명시적으로 제공해야 합니다 — JSDoc 주석은 자동으로 추출되지 않습니다
- `title`, `description`, `inputSchema`, `annotations`를 명시적으로 제공합니다
- `inputSchema`는 JSON 스키마가 아닌 Zod 스키마 객체여야 합니다
- 모든 파라미터와 반환 값에 타입을 명시합니다

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// 입력 유효성 검사를 위한 Zod 스키마
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

// Zod 스키마에서 타입 정의 추출
type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `Search for users in the Example system by name, email, or team.

This tool searches across all user profiles in the Example platform, supporting partial matches and various search filters. It does NOT create or modify users, only searches existing ones.

Args:
  - query (string): Search string to match against names/emails
  - limit (number): Maximum results to return, between 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with schema:
  {
    "total": number,           // Total number of matches found
    "count": number,           // Number of results in this response
    "offset": number,          // Current pagination offset
    "users": [
      {
        "id": string,          // User ID (e.g., "U123456789")
        "name": string,        // Full name (e.g., "John Doe")
        "email": string,       // Email address
        "team": string,        // Team name (optional)
        "active": boolean      // Whether user is active
      }
    ],
    "has_more": boolean,       // Whether more results are available
    "next_offset": number      // Offset for next page (if has_more is true)
  }

Examples:
  - Use when: "Find all marketing team members" -> params with query="team:marketing"
  - Use when: "Search for John's account" -> params with query="john"
  - Don't use when: You need to create a user (use example_create_user instead)

Error Handling:
  - Returns "Error: Rate limit exceeded" if too many requests (429 status)
  - Returns "No users found matching '<query>'" if search returns empty`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    try {
      // 입력 유효성 검사는 Zod 스키마가 처리
      // 검증된 파라미터로 API 요청
      const data = await makeApiRequest<any>(
        "users/search",
        "GET",
        undefined,
        {
          q: params.query,
          limit: params.limit,
          offset: params.offset
        }
      );

      const users = data.users || [];
      const total = data.total || 0;

      if (!users.length) {
        return {
          content: [{
            type: "text",
            text: `No users found matching '${params.query}'`
          }]
        };
      }

      // 구조화된 출력 준비
      const output = {
        total,
        count: users.length,
        offset: params.offset,
        users: users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          ...(user.team ? { team: user.team } : {}),
          active: user.active ?? true
        })),
        has_more: total > params.offset + users.length,
        ...(total > params.offset + users.length ? {
          next_offset: params.offset + users.length
        } : {})
      };

      // 요청된 형식에 따라 텍스트 표현 포맷
      let textContent: string;
      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines = [`# User Search Results: '${params.query}'`, "",
          `Found ${total} users (showing ${users.length})`, ""];
        for (const user of users) {
          lines.push(`## ${user.name} (${user.id})`);
          lines.push(`- **Email**: ${user.email}`);
          if (user.team) lines.push(`- **Team**: ${user.team}`);
          lines.push("");
        }
        textContent = lines.join("\n");
      } else {
        textContent = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: output // 구조화된 데이터를 위한 최신 패턴
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  }
);
```

## 입력 유효성 검사를 위한 Zod 스키마

Zod는 런타임 타입 유효성 검사를 제공합니다:

```typescript
import { z } from "zod";

// 유효성 검사가 포함된 기본 스키마
const CreateUserSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  email: z.string()
    .email("Invalid email format"),
  age: z.number()
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Age cannot be greater than 150")
}).strict();  // 추가 필드 금지를 위해 .strict() 사용

// 열거형(enum)
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const SearchSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
});

// 기본값을 가진 선택적 필드
const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip")
});
```

## 응답 형식 옵션

유연성을 위해 여러 출력 형식을 지원합니다:

```typescript
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const inputSchema = z.object({
  query: z.string(),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
});
```

**Markdown 형식**:

- 명확성을 위해 헤더, 목록, 포맷팅 사용
- 타임스탬프를 사람이 읽기 쉬운 형식으로 변환
- ID는 괄호 안에 표시 이름과 함께 표시
- 장황한 메타데이터 생략
- 관련 정보를 논리적으로 그룹화

**JSON 형식**:

- 프로그래밍 방식 처리에 적합한 완전하고 구조화된 데이터 반환
- 가능한 모든 필드와 메타데이터 포함
- 일관된 필드 이름과 타입 사용

## 페이지네이션 구현

리소스를 나열하는 툴의 경우:

```typescript
const ListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

async function listItems(params: z.infer<typeof ListSchema>) {
  const data = await apiRequest(params.limit, params.offset);

  const response = {
    total: data.total,
    count: data.items.length,
    offset: params.offset,
    items: data.items,
    has_more: data.total > params.offset + data.items.length,
    next_offset: data.total > params.offset + data.items.length
      ? params.offset + data.items.length
      : undefined
  };

  return JSON.stringify(response, null, 2);
}
```

## 문자 제한 및 잘라내기

응답이 너무 커지는 것을 방지하기 위해 CHARACTER_LIMIT 상수를 추가합니다:

```typescript
// constants.ts의 모듈 레벨
export const CHARACTER_LIMIT = 25000;  // 최대 응답 크기 (문자 수)

async function searchTool(params: SearchInput) {
  let result = generateResponse(data);

  // 문자 제한 확인 및 필요시 잘라내기
  if (result.length > CHARACTER_LIMIT) {
    const truncatedData = data.slice(0, Math.max(1, data.length / 2));
    response.data = truncatedData;
    response.truncated = true;
    response.truncation_message =
      `Response truncated from ${data.length} to ${truncatedData.length} items. ` +
      `Use 'offset' parameter or add filters to see more results.`;
    result = JSON.stringify(response, null, 2);
  }

  return result;
}
```

## 에러 처리

명확하고 실행 가능한 에러 메시지를 제공합니다:

```typescript
import axios, { AxiosError } from "axios";

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
```

## 공유 유틸리티

공통 기능을 재사용 가능한 함수로 추출합니다:

```typescript
// 공유 API 요청 함수
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

## Async/Await 모범 사례

네트워크 요청과 I/O 작업에는 항상 async/await를 사용합니다:

```typescript
// 좋음: 비동기 네트워크 요청
async function fetchData(resourceId: string): Promise<ResourceData> {
  const response = await axios.get(`${API_URL}/resource/${resourceId}`);
  return response.data;
}

// 나쁨: Promise 체인
function fetchData(resourceId: string): Promise<ResourceData> {
  return axios.get(`${API_URL}/resource/${resourceId}`)
    .then(response => response.data);  // 읽기 어렵고 유지보수 어려움
}
```

## TypeScript 모범 사례

1. **Strict TypeScript 사용**: tsconfig.json에서 strict 모드 활성화
2. **인터페이스 정의**: 모든 데이터 구조에 명확한 인터페이스 정의
3. **`any` 사용 금지**: `any` 대신 적절한 타입 또는 `unknown` 사용
4. **런타임 유효성 검사를 위한 Zod**: 외부 데이터 검증에 Zod 스키마 사용
5. **타입 가드**: 복잡한 타입 확인을 위한 타입 가드 함수 생성
6. **에러 처리**: 적절한 에러 타입 확인으로 항상 try-catch 사용
7. **Null 안전성**: 옵셔널 체이닝(`?.`)과 nullish 합산(`??`) 활용

```typescript
// 좋음: Zod와 인터페이스를 사용한 타입 안전
interface UserResponse {
  id: string;
  name: string;
  email: string;
  team?: string;
  active: boolean;
}

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  team: z.string().optional(),
  active: z.boolean()
});

type User = z.infer<typeof UserSchema>;

async function getUser(id: string): Promise<User> {
  const data = await apiCall(`/users/${id}`);
  return UserSchema.parse(data);  // 런타임 유효성 검사
}

// 나쁨: any 사용
async function getUser(id: string): Promise<any> {
  return await apiCall(`/users/${id}`);  // 타입 안전성 없음
}
```

## 패키지 설정

### package.json

```json
{
  "name": "{service}-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for {Service} API integration",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "axios": "^1.7.9",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 완전한 예제

```typescript
#!/usr/bin/env node
/**
 * Example Service용 MCP 서버.
 *
 * 이 서버는 Example API와 상호작용하는 툴을 제공합니다.
 * 사용자 검색, 프로젝트 관리, 데이터 내보내기 기능을 포함합니다.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios, { AxiosError } from "axios";

// 상수
const API_BASE_URL = "https://api.example.com/v1";
const CHARACTER_LIMIT = 25000;

// 열거형
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Zod 스키마
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

// 공유 유틸리티 함수
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

// MCP 서버 인스턴스 생성
const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// 툴 등록
server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `[위에 표시된 전체 설명]`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    // 위에 표시된 구현
  }
);

// 메인 함수
// stdio용 (로컬):
async function runStdio() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running via stdio");
}

// streamable HTTP용 (원격):
async function runHTTP() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`MCP server running on http://localhost:${port}/mcp`);
  });
}

// 환경에 따라 트랜스포트 선택
const transport = process.env.TRANSPORT || 'stdio';
if (transport === 'http') {
  runHTTP().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
```

---

## 고급 MCP 기능

### 리소스 등록

URI 기반 접근을 위한 효율적인 데이터 노출:

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";

// URI 템플릿으로 리소스 등록
server.registerResource(
  {
    uri: "file://documents/{name}",
    name: "Document Resource",
    description: "Access documents by name",
    mimeType: "text/plain"
  },
  async (uri: string) => {
    // URI에서 파라미터 추출
    const match = uri.match(/^file:\/\/documents\/(.+)$/);
    if (!match) {
      throw new Error("Invalid URI format");
    }

    const documentName = match[1];
    const content = await loadDocument(documentName);

    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: content
      }]
    };
  }
);

// 사용 가능한 리소스를 동적으로 나열
server.registerResourceList(async () => {
  const documents = await getAvailableDocuments();
  return {
    resources: documents.map(doc => ({
      uri: `file://documents/${doc.name}`,
      name: doc.name,
      mimeType: "text/plain",
      description: doc.description
    }))
  };
});
```

**리소스 vs 툴 사용 기준:**

- **리소스**: 간단한 URI 기반 파라미터로 데이터 접근 시
- **툴**: 유효성 검사와 비즈니스 로직이 필요한 복잡한 작업 시
- **리소스**: 데이터가 상대적으로 정적이거나 템플릿 기반일 때
- **툴**: 작업에 부작용이 있거나 복잡한 워크플로가 있을 때

### 트랜스포트 옵션

TypeScript SDK는 두 가지 주요 트랜스포트 메커니즘을 지원합니다:

#### Streamable HTTP (원격 서버 권장)

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  // 각 요청마다 새 트랜스포트 생성 (상태 비저장, 요청 ID 충돌 방지)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
```

#### stdio (로컬 통합용)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**트랜스포트 선택 기준:**

- **Streamable HTTP**: 웹 서비스, 원격 접근, 다수의 클라이언트
- **stdio**: 커맨드라인 툴, 로컬 개발, 서브프로세스 통합

### 알림 지원

서버 상태 변경 시 클라이언트에 알림:

```typescript
// 툴 목록 변경 시 알림
server.notification({
  method: "notifications/tools/list_changed"
});

// 리소스 변경 시 알림
server.notification({
  method: "notifications/resources/list_changed"
});
```

알림은 서버 기능이 실제로 변경될 때만 드물게 사용합니다.

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

## 빌드 및 실행

항상 TypeScript 코드를 빌드한 후 실행합니다:

```bash
# 프로젝트 빌드
npm run build

# 서버 실행
npm start

# 자동 재로드로 개발
npm run dev
```

구현을 완료하기 전에 `npm run build`가 성공적으로 완료되었는지 반드시 확인합니다.

## 품질 체크리스트

Node/TypeScript MCP 서버 구현을 완료하기 전에 다음을 확인합니다:

### 전략적 설계

- [ ] 툴이 단순 API 엔드포인트 래퍼가 아닌 완전한 워크플로를 가능하게 함
- [ ] 툴 이름이 자연스러운 작업 세분화를 반영함
- [ ] 응답 형식이 에이전트 컨텍스트 효율성에 최적화됨
- [ ] 적절한 경우 사람이 읽기 쉬운 식별자 사용
- [ ] 에러 메시지가 에이전트를 올바른 사용법으로 안내함

### 구현 품질

- [ ] 집중된 구현: 가장 중요하고 가치 있는 툴이 구현됨
- [ ] 모든 툴이 완전한 구성으로 `registerTool`을 사용하여 등록됨
- [ ] 모든 툴에 `title`, `description`, `inputSchema`, `annotations` 포함
- [ ] 어노테이션이 올바르게 설정됨 (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- [ ] 모든 툴이 `.strict()` 강제와 함께 런타임 입력 유효성 검사를 위한 Zod 스키마 사용
- [ ] 모든 Zod 스키마에 적절한 제약 조건과 설명적인 에러 메시지 있음
- [ ] 모든 툴에 명시적 입력/출력 타입이 포함된 포괄적인 설명 있음
- [ ] 설명에 반환 값 예제와 완전한 스키마 문서 포함
- [ ] 에러 메시지가 명확하고 실행 가능하며 교육적임

### TypeScript 품질

- [ ] 모든 데이터 구조에 TypeScript 인터페이스 정의됨
- [ ] tsconfig.json에서 Strict TypeScript 활성화됨
- [ ] `any` 타입 미사용 — `unknown` 또는 적절한 타입 사용
- [ ] 모든 비동기 함수에 명시적 Promise`<T>` 반환 타입 있음
- [ ] 에러 처리에 적절한 타입 가드 사용 (예: `axios.isAxiosError`, `z.ZodError`)

### 고급 기능 (해당하는 경우)

- [ ] 적절한 데이터 엔드포인트에 리소스 등록됨
- [ ] 적절한 트랜스포트 설정됨 (stdio 또는 streamable HTTP)
- [ ] 동적 서버 기능을 위한 알림 구현됨
- [ ] SDK 인터페이스와 타입 안전

### 프로젝트 설정

- [ ] Package.json에 필요한 모든 의존성 포함
- [ ] 빌드 스크립트가 dist/ 디렉토리에 작동하는 JavaScript 생성
- [ ] 메인 엔트리 포인트가 dist/index.js로 올바르게 설정됨
- [ ] 서버 이름이 `{service}-mcp-server` 형식을 따름
- [ ] tsconfig.json이 strict 모드로 올바르게 설정됨

### 코드 품질

- [ ] 해당하는 경우 페이지네이션이 올바르게 구현됨
- [ ] 대용량 응답이 CHARACTER_LIMIT 상수를 확인하고 명확한 메시지와 함께 잘라냄
- [ ] 잠재적으로 큰 결과 세트를 위한 필터링 옵션 제공됨
- [ ] 모든 네트워크 작업이 타임아웃과 연결 오류를 우아하게 처리함
- [ ] 공통 기능이 재사용 가능한 함수로 추출됨
- [ ] 유사한 작업 간에 반환 타입이 일관됨

### 테스트 및 빌드

- [ ] `npm run build`가 오류 없이 성공적으로 완료됨
- [ ] dist/index.js 생성 및 실행 가능
- [ ] 서버 실행: `node dist/index.js --help`
- [ ] 모든 임포트가 올바르게 해석됨
- [ ] 샘플 툴 호출이 예상대로 작동함
