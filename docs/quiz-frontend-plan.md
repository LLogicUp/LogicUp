# 퀴즈 프론트엔드 API 연동 구현 계획

> 작성일: 2026-04-29  
> 기준 명세: `quiz_api_spec.md`  
> 대상: `frontend/src/api/quiz.ts` 및 `frontend/src/components/quiz/` 전체

---

## 현재 상태 분석

### 무엇이 이미 있나

| 파일 | 현재 상태 |
|------|-----------|
| `api/quiz.ts` | 목 데이터 + 목 API 함수만 존재. 실제 HTTP 호출 없음 |
| `QuizPage.tsx` | 스크린 상태 머신 완성. `target`(문제별 모드) 분기 포함 |
| `QuizSetList.tsx` | 세트 목록 렌더링. 카테고리 필터 UI 없음 |
| `QuizSession.tsx` | 문제 풀기 화면. 변경 불필요 |
| `QuizResult.tsx` | 채점 결과 화면. 변경 불필요 |
| `AnswerInput.tsx` | 단답형 입력 컴포넌트. 변경 불필요 |

### API 명세 vs 현재 타입 차이

| 항목 | 현재 타입 | 명세 |
|------|-----------|------|
| `QuizSetSummary.categories` | 없음 | `string[]` 필드 추가됨 |
| `QuizSetSummary.created_at` | 있음 | 명세에 없음 (제거 가능) |
| `QuizQuestion.categories` | 없음 | `string[]` 필드 추가됨 |
| `CategoryStat` 타입 | 없음 | `{ category: string; count: number }` 신규 |
| `fetchQuizCategories` | 없음 | `GET /quiz/categories` 신규 |
| `fetchProblemQuiz` | 있음 (목) | 명세에 없음 → 제거 대상 |
| `submitProblemQuiz` | 있음 (목) | 명세에 없음 → 제거 대상 |

### target 모드 처리 결정

`QuizPage`가 `target` prop을 받아 "문제별 퀴즈 모드"로 동작하는 로직은 API 명세에 대응 엔드포인트가 없다.  
→ **target 모드는 제거하고 일반 퀴즈 목록 모드로 통합한다.**  
→ `App.tsx`의 `handleQuizRequest` / `handleQuizTargetDone` / `quizTarget` 상태도 함께 제거한다.

---

## 구현 범위

```
수정 파일
├── frontend/src/api/quiz.ts          ← 전면 교체 (목 제거 + 실제 API)
├── frontend/src/components/quiz/QuizPage.tsx    ← target 모드 제거 + categories 로드
├── frontend/src/components/quiz/QuizSetList.tsx ← 카테고리 필터 UI 추가
└── frontend/src/App.tsx              ← quizTarget 관련 코드 제거

유지 파일 (변경 없음)
├── frontend/src/components/quiz/QuizSession.tsx
├── frontend/src/components/quiz/QuizResult.tsx
└── frontend/src/components/quiz/AnswerInput.tsx
```

---

## 단계별 구현 계획

### Step 1 — api/quiz.ts 타입 정리

**목표**: API 명세와 타입을 일치시킨다. 목 데이터는 이 단계에서 전부 삭제한다.

변경 사항:
- `CategoryStat` 타입 추가
  ```ts
  export interface CategoryStat {
    category: string;
    count: number;
  }
  ```
- `QuizSetSummary` 수정
  - `created_at` 제거
  - `categories: string[]` 추가
- `QuizQuestion` 수정
  - `categories: string[]` 추가
- `QuizSubmitRequest` 타입 추가 (요청 바디)
  ```ts
  export interface QuizSubmitRequest {
    set_id: number;
    answers: QuizAnswerDraft[];
  }
  ```
- `QuizQuestionResult` 수정 — 명세는 `explanation`과 `mistake_types`를 항상 반환하므로 optional 제거
  ```ts
  // 변경 전
  explanation?: string;
  mistake_types?: string[];
  // 변경 후
  explanation: string;
  mistake_types: string[];
  ```
- `QuizTarget` 타입 제거
- `QuizScreenState`에서 `'empty'` 유지 (빈 목록 대응)

---

### Step 2 — api/quiz.ts API 함수 교체

**목표**: 목 함수를 실제 `fetch` 호출로 교체한다.

공통 헬퍼 작성:

> `api/auth.ts`에 이미 `authHeaders()`가 있으므로 재사용한다.
> ```ts
> import { authHeaders } from './auth';
> ```

```ts
const BASE = 'http://localhost:8000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}
```

구현할 함수:

| 함수 | 엔드포인트 | 비고 |
|------|------------|------|
| `fetchQuizCategories()` | `GET /quiz/categories` | 신규 |
| `fetchQuizSets(category?)` | `GET /quiz/sets[?category=]` | 목 교체 |
| `fetchQuizSet(setId)` | `GET /quiz/sets/{set_id}` | 목 교체 |
| `submitQuiz(setId, answers)` | `POST /quiz/submit` | 목 교체 |

제거할 함수:
- `fetchProblemQuiz`
- `submitProblemQuiz`
- `gradeAnswers` 헬퍼
- `delay` 헬퍼
- 모든 MOCK_* 상수

반환 타입 주의:
- `fetchQuizSet` 응답: 명세 기준 `{ id, title, questions[] }`
- 현재 목 API의 `{ set_id, title, questions[] }`는 제거하고 명세와 동일한 `id` 키로 통일

인증 실패 처리:
- `apiFetch`는 `401`에서 `new Error('Unauthorized')`를 던짐
- `QuizPage`는 이 에러를 자체 에러 화면으로만 처리하지 말고 상위로 전달할 수 있어야 함
- `App.tsx`에 `handleQuizUnauthorized`를 추가해 `clearToken()` + 로그인 화면 복귀 흐름을 재사용
- `QuizPage`에 `onUnauthorized?: () => void` prop 추가 후, 목록/상세/제출 API 호출에서 `Unauthorized` 발생 시 호출
- 일반 API 에러만 기존처럼 `screen = 'error'`로 표시

---

### Step 3 — QuizSetList.tsx 카테고리 필터 추가

**목표**: 카테고리 버튼을 상단에 렌더링하고, 선택 시 부모에게 전달한다.

Props 변경:
```ts
interface QuizSetListProps {
  sets: QuizSetSummary[];
  categories: CategoryStat[];   // 추가
  activeCategory: string | null; // 추가
  onCategoryChange: (cat: string | null) => void; // 추가
  onStart: (setId: number) => void;
}
```

UI 구성:
- "전체" 버튼 + 각 카테고리 버튼 (count 뱃지 포함)
- 선택된 카테고리는 활성 스타일 적용
- 카테고리 버튼 클릭 → `onCategoryChange` 호출
- 세트 카드에 `categories` 태그 표시 추가

---

### Step 4 — QuizPage.tsx 리팩토링

**목표**: target 모드 제거, categories 로드·필터 상태 관리 추가.

상태 변경:
- 제거: `isProblemMode`, target 관련 분기
- 추가: `categories: CategoryStat[]`
- 추가: `activeCategory: string | null`

`loadSets` 함수 변경:
- 초기 로드 시 `fetchQuizCategories()`와 `fetchQuizSets()` 병렬 호출
- category 변경 시 `fetchQuizSets(activeCategory)` 재호출

`handleStart` 반환 타입 변경:
- `fetchQuizSet(setId)` 응답은 명세대로 `id` 키를 사용하므로 별도 키 변환 없이 사용

Props 변경:
```ts
interface QuizPageProps {
  onUnauthorized?: () => void; // 추가
  // target, onTargetDone 제거
}
```

---

### Step 5 — App.tsx 정리

**목표**: target 모드 관련 코드 제거.

제거 대상:
- `quizTarget` state
- `handleQuizRequest` 함수
- `handleQuizTargetDone` 함수
- `QuizPage`에 전달하던 `target`, `onTargetDone` props
- `HistoryPage`에 전달하던 `onQuizRequest` prop
- `import type { QuizTarget }` 제거

추가 대상:
- `handleQuizUnauthorized` 함수
- `QuizPage onUnauthorized={handleQuizUnauthorized}` 연결
- 퀴즈 API에서 `Unauthorized` 발생 시 기존 힌트 API와 동일하게 세션 정리 후 로그인 화면 복귀

**HistoryPage 영향 범위 확인 완료**

`HistoryPage`의 `onQuizRequest` prop은 이미 optional(`?`)로 선언되어 있다.
```ts
interface HistoryPageProps {
  onLogout: () => void;
  onQuizRequest?: (id: string, label: string) => void; // optional
}
```
내부적으로 `{onQuizRequest && ( ... )}` 조건부 렌더링으로 "퀴즈 풀기" 버튼을 표시하고 있으므로,
**App.tsx에서 prop을 전달하지 않는 것만으로 버튼이 자동으로 사라진다.**
`HistoryPage.tsx` 파일 자체는 수정하지 않아도 된다.

---

## 파일별 변경 요약

```
api/quiz.ts
  - 목 데이터 전부 삭제
  - CategoryStat 타입 추가
  - QuizSetSummary.categories 추가, created_at 제거
  - QuizQuestion.categories 추가
  - QuizSubmitRequest 타입 추가
  - QuizTarget 제거
  - 기존 `authHeaders()`를 사용하는 apiFetch 헬퍼 작성
  - fetchQuizCategories 추가
  - fetchQuizSets, fetchQuizSet, submitQuiz 실제 API로 교체
  - fetchProblemQuiz, submitProblemQuiz 제거

QuizSetList.tsx
  - categories, activeCategory, onCategoryChange props 추가
  - 카테고리 필터 버튼 UI 추가
  - 세트 카드에 categories 태그 추가

QuizPage.tsx
  - target / isProblemMode 제거
  - categories 상태 + 로드 로직 추가
  - activeCategory 상태 + 필터 콜백 추가
  - fetchQuizCategories 병렬 호출
  - Unauthorized 발생 시 상위 `onUnauthorized` 호출
  - QuizSetList props 업데이트

App.tsx
  - quizTarget, handleQuizRequest, handleQuizTargetDone 제거
  - handleQuizUnauthorized 추가
  - QuizPage props 정리
  - HistoryPage onQuizRequest prop 제거 
```

---

## 체크리스트

- [ ] Step 1: 타입 정리 완료 (`QuizQuestionResult.explanation`, `mistake_types` required로 변경 포함)
- [ ] Step 2: API 함수 교체 완료 (`authHeaders` 재사용 + 401 처리 포함)
- [ ] Step 3: 카테고리 필터 UI 완료
- [ ] Step 4: QuizPage 리팩토링 완료
- [ ] Step 5: App.tsx 정리 완료
- [ ] TypeScript 빌드 오류 없음 (`npm run build`)
- [ ] 퀴즈 목록 로드 동작 확인
- [ ] 카테고리 필터 동작 확인
- [ ] 퀴즈 세션 → 제출 → 결과 플로우 확인
