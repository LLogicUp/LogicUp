# OJ 모드 프론트엔드 구현 계획서

> 작성일: 2026-05-14
> 담당: 프론트엔드 (View 전담)
> 배경: OJ 탭과 라우팅은 이미 존재 (`/editor/oj`)하지만, ProblemInput이 "준비 중" 상태

---

## 1. 현재 상태

| 파일                 | 현재 상태                                              |
| -------------------- | ------------------------------------------------------ |
| `Header.tsx`       | OJ 탭 있음 (`/editor/oj` 경로)                       |
| `App.tsx`          | `/editor/:source` → EditorPage 라우팅 있음          |
| `EditorPage.tsx`   | `source === 'oj'` 감지하지만 OJ 전용 처리 없음       |
| `ProblemInput.tsx` | OJ 분기에서 "준비 중입니다." 표시만 함                 |
| `api/hint.ts`      | `HintRequest`에 `source`, `problem_id` 필드 없음 |

---

## 2. OJ 모드 개요

### 단계 (Level)

| ID                 | 표시명   | 설명                     |
| ------------------ | -------- | ------------------------ |
| `c`              | C 기초   | C 언어 기초 문제         |
| `advanced_c`     | 고급 C   | 포인터, 메모리 등 심화 C |
| `data_structure` | 자료구조 | 스택, 큐, 트리 등        |
| `algorithm`      | 알고리즘 | 정렬, 탐색, DP 등        |

### 사용자 플로우

```
OJ 탭 클릭
    ↓
① 단계 선택 화면
  - C 기초 / 고급 C / 자료구조 / 알고리즘 카드 4개
    ↓
② 문제 목록 화면
  - 선택된 단계의 문제 목록
  - 뒤로가기 가능
    ↓
③ 코드 에디터 화면
  - 선택된 문제 제목만 상단에 표시 (문제 내용 출력 없음)
  - 코드 에디터 + 힌트 요청 버튼 (기존 로직 재사용)
  - 기존 HintPanel 재사용
```

> 문제 내용은 화면에 표시하지 않는다. 사용자가 직접 문제를 가지고 있으므로 제목만으로 식별 가능.

---

## 3. 타입 정의 (`api/oj.ts` 신규)

```ts
// OJ 단계 식별자. 이 4개 문자열 중 하나만 허용 (백엔드도 동일하게 사용)
export type OJLevel = 'c' | 'advanced_c' | 'data_structure' | 'algorithm';

// 단계 선택 카드 하나에 필요한 데이터 (GET /oj/levels 응답 항목)
export interface OJLevelInfo {
  id: OJLevel;           // 단계 식별자 → "c", "advanced_c" 등
  label: string;         // 화면에 표시할 이름 → "C 기초", "고급 C" 등
  description: string;   // 단계 설명 → "C 언어 기초 문제" 등
  problem_count: number; // 해당 단계의 문제 수 → 카드 뱃지에 표시
}

// 문제 목록 각 행에 필요한 데이터 (GET /oj/problems?level= 응답 항목)
export interface OJProblemSummary {
  id: number;        // 문제 고유 번호 → 힌트 요청 시 problem_id로 사용
  title: string;     // 문제 제목 → 목록과 에디터 상단에 표시
  level: OJLevel;    // 어느 단계 문제인지
  tags?: string[];   // 선택적 태그 → "포인터", "재귀" 등 (없어도 됨)
}
```

---

## 4. 백엔드 API 명세 (프론트엔드 기준 요구사항)

> 이 섹션을 백엔드 팀에 전달하면 됩니다.

### 4-1. 단계 목록 조회

```
GET /oj/levels
Authorization: Bearer <token>

Response 200:
{
  "levels": [
    {
      "id": "c",
      "label": "C 기초",
      "description": "C 언어 기초 문제",
      "problem_count": 20
    },
    ...
  ]
}
```

### 4-2. 단계별 문제 목록

```
GET /oj/problems?level=c
Authorization: Bearer <token>

Query params:
  - level: OJLevel (필수)

Response 200:
{
  "problems": [
    {
      "id": 1,
      "title": "Hello World",
      "level": "c",
      "tags": ["출력"]
    },
    ...
  ],
  "total": 20
}
```

### 4-3. 힌트 요청 (기존 `/hint` 수정)

기존 `POST /hint`에 OJ 관련 필드 추가:

```
POST /hint
Authorization: Bearer <token>

Body (기존 + 추가):
{
  "submission_id": null,
  "source": "oj",          // 추가: "direct" | "url" | "oj"
  "problem_id": 1,          // 추가: OJ 문제 ID (source가 "oj"일 때 필수)
  "code": "...",
  "language": "c",
  "error_log": "",
  "hint_level": 1
}
```

백엔드는 `source === 'oj'`이고 `problem_id`가 있으면 DB에서 문제를 조회해 힌트를 생성한다.

---

## 5. 구현 범위

### 신규 파일

```
frontend/src/
├── api/oj.ts                          ← OJ API 함수 (fetchLevels, fetchProblems)
└── components/oj/
    ├── OJLevelSelector.tsx            ← 단계 선택 카드 UI
    └── OJProblemList.tsx              ← 문제 목록 + 뒤로가기
```

### 수정 파일

```
frontend/src/
├── pages/EditorPage.tsx               ← OJ 화면 상태 관리 통합
├── components/ProblemInput.tsx        ← OJ 분기 제거
└── api/hint.ts                        ← HintRequest에 source, problem_id 추가
```

---

## 6. 컴포넌트 설계

### OJLevelSelector

```tsx
interface OJLevelSelectorProps {
  levels: OJLevelInfo[];            // 백엔드에서 받은 단계 목록. API 응답 전엔 빈 배열
  loading: boolean;                 // true면 로딩 스피너 표시
  onSelect: (level: OJLevel) => void; // 카드 클릭 시 부모(EditorPage)에 선택된 단계 전달
}
```

- 단계 카드 4개를 2×2 그리드로 표시
- 카드: 아이콘(임시), 단계명, 설명, 문제 수 뱃지
- 로딩 중: 스켈레톤 or 로딩 스피너

### OJProblemList

```tsx
interface OJProblemListProps {
  level: OJLevelInfo;               // 현재 선택된 단계 정보 (상단에 단계명 표시용)
  problems: OJProblemSummary[];     // 해당 단계의 문제 목록
  loading: boolean;                 // true면 로딩 스피너 표시
  onSelect: (problem: OJProblemSummary) => void; // 문제 클릭 시 부모에 선택된 문제 전달
  onBack: () => void;               // "← 뒤로" 클릭 시 단계 선택 화면으로 복귀
}
```

- 상단: "← 뒤로" + 단계명
- 문제 행: 번호, 제목, 태그
- 클릭 시 `onSelect` 호출

---

## 7. EditorPage 수정 사항

### 추가될 상태

```ts
// 현재 OJ 화면 단계. 'level'→단계선택, 'list'→문제목록, 'problem'→코드에디터
type OJScreen = 'level' | 'list' | 'problem';

// OJ 전용 상태 (source === 'oj' 일 때만 사용)
const [ojScreen, setOJScreen] = useState<OJScreen>('level'); // 시작은 항상 단계 선택
const [ojLevels, setOJLevels] = useState<OJLevelInfo[]>([]);             // GET /oj/levels 결과
const [ojSelectedLevel, setOJSelectedLevel] = useState<OJLevelInfo | null>(null); // 사용자가 선택한 단계
const [ojProblems, setOJProblems] = useState<OJProblemSummary[]>([]);    // GET /oj/problems 결과
const [ojProblem, setOJProblem] = useState<OJProblemSummary | null>(null); // 사용자가 선택한 문제 (id를 힌트 요청에 사용)
```

### OJ 화면 전환 로직

```ts
// 단계 선택 → 문제 목록
const handleLevelSelect = async (level: OJLevel) => { ... }

// 문제 선택 → 문제 풀기
const handleProblemSelect = async (problem: OJProblemSummary) => { ... }

// 뒤로가기
const handleOJBack = () => {
  if (ojScreen === 'list') setOJScreen('level');
  if (ojScreen === 'problem') { setOJScreen('list'); resetAll(); }
}
```

### 힌트 요청 수정

OJ 모드 시 `problem_id` 추가:

```ts
const data = await postHint({
  submission_id: submissionId,
  // source에 따라 문제 전달 방식이 다름
  ...(source === 'oj' && ojProblem
    ? { source: 'oj', problem_id: ojProblem.id }   // OJ: 문제 ID만 전달 → 백엔드가 DB에서 조회
    : source === 'url'
    ? { problem_url: problemUrl }                   // URL: 문제 주소 전달
    : { problem, expected_input: expectedInput, expected_output: expectedOutput }), // 직접 입력: 문제 텍스트 전달
  code,
  language,
  error_log: '',
  hint_level: hintLevel, // 1~3단계, 요청할 때마다 1씩 증가
});
```

---

## 8. hint.ts 수정 사항

```ts
export interface HintRequest {
  submission_id: number | null;              // 이어서 힌트 요청 시 기존 제출 ID 재사용. 첫 요청은 null
  source?: 'direct' | 'url' | 'oj';         // [추가] 문제 입력 방식. 백엔드가 힌트 생성 로직을 분기하는 데 사용
  problem_id?: number;                       // [추가] OJ 모드 전용. source가 'oj'일 때 필수
  problem?: string;                          // 직접 입력 모드 전용. 문제 설명 텍스트
  problem_url?: string;                      // URL 모드 전용. 백엔드가 크롤링해서 문제를 가져옴
  code: string;                              // 사용자가 작성한 코드
  language: 'c' | 'cpp' | 'python' | 'java'; // 코드 언어
  expected_input?: string;                   // 직접 입력 모드 전용. 예상 입력값
  expected_output?: string;                  // 직접 입력 모드 전용. 예상 출력값
  error_log: string;                         // 컴파일/런타임 에러 메시지 (없으면 빈 문자열)
  hint_level: number;                        // 요청할 힌트 단계 (1~3)
}
```

---

## 9. ProblemInput 수정 사항

OJ 분기(`source === 'oj'`)를 완전히 제거한다. EditorPage 레벨에서 조건부 렌더링으로 대체하므로 ProblemInput은 더 이상 OJ를 알 필요가 없다.

- `ojScreen === 'level'` → EditorPage가 `<OJLevelSelector>` 전체 화면 렌더링
- `ojScreen === 'list'` → EditorPage가 `<OJProblemList>` 전체 화면 렌더링
- `ojScreen === 'problem'` → 기존 EditorPage 레이아웃 그대로 사용 (코드 에디터 + 힌트패널), ProblemInput 자리에는 선택된 문제 제목 표시용 작은 컴포넌트만 배치

---

## 10. 단계별 구현 순서

| 단계   | 작업                      | 파일                                  |
| ------ | ------------------------- | ------------------------------------- |
| Step 1 | 타입 및 API 함수 작성     | `api/oj.ts`                         |
| Step 2 | HintRequest 타입 수정     | `api/hint.ts`                       |
| Step 3 | OJLevelSelector 컴포넌트  | `components/oj/OJLevelSelector.tsx` |
| Step 4 | OJProblemList 컴포넌트    | `components/oj/OJProblemList.tsx`   |
| Step 5 | EditorPage OJ 분기 통합   | `pages/EditorPage.tsx`              |
| Step 6 | ProblemInput OJ 분기 제거 | `components/ProblemInput.tsx`       |
| Step 7 | 백엔드 API 명세 문서 작성 | `docs/oj-backend-api.md`            |

---

## 11. 미결 사항 (구현 전 확인 필요)

1. **언어 선택**: OJ 문제마다 허용 언어가 다른가? 아니면 모든 문제에서 동일한 언어 선택(c, cpp, python, java)이 가능한가?
2. **문제 데이터**: "데이터 파일을 나중에 넣을 것"이라고 했는데, 일단 빈 목록 상태에서도 UI가 정상 동작해야 한다. 빈 문제 목록 처리 필요.
3. **힌트 요청 방식**: 백엔드가 `problem_id`로 DB 조회 후 힌트 생성 vs 프론트가 문제 내용을 직접 전달. 현재 계획은 `problem_id` 전달 방식으로 설정.
4. **문제 번호 체계**: DB 내 `id` 기준인지, 단계 내 순번인지.
