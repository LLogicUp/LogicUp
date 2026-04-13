# LogicUp DB 연동 계획 v4

## 목표

`v3`에서 사용자별 힌트 히스토리 저장/조회를 완성했다.  
`v4`의 목표는 히스토리 페이지의 **UX 개선**과 **쿼리 최적화**다.

핵심 목표 2가지:

1. 소스(백준/직접입력)별 탭 필터링을 추가한다.
2. 백준 탭에서 문제번호 목록을 보여주고, 문제번호 클릭 시 해당 문제의 힌트 기록을 조회한다.

---

## 현재 구현 상태 요약

### 현재 DB 스키마

```
users       - id, userid, password_hash, created_at
submissions - id, user_id(FK), source("baekjoon"|"direct"), external_problem_id(nullable), problem, code, ...
hints       - id, submission_id(FK), hint_level(1~3), explanation, pseudocode, created_at
```

### 현재 GET /history 동작

- source, problem_id 필터 없이 사용자의 전체 힌트를 시간순으로 반환
- `external_problem_id`에 인덱스 없음

### 현재 프론트 히스토리 페이지

- 모든 힌트를 단일 목록으로 표시
- 소스별 필터링, 문제번호 클릭 기능 없음

---

## v4 변경 범위

### DB 변경

`external_problem_id` 단독 인덱스와 `(user_id, source)` 복합 인덱스를 추가한다.

이유:
- `source` 필터 쿼리는 항상 `user_id = ? AND source = ?` 형태로 실행된다.
- 문제번호 드릴다운은 `external_problem_id` 단독 탐색이 필요하다.

```python
# 신규 Alembic 마이그레이션 (down_revision = '28a79d0a9607')
def upgrade():
    op.create_index('ix_submissions_external_problem_id', 'submissions', ['external_problem_id'])
    op.create_index('ix_submissions_user_id_source', 'submissions', ['user_id', 'source'])

def downgrade():
    op.drop_index('ix_submissions_user_id_source', table_name='submissions')
    op.drop_index('ix_submissions_external_problem_id', table_name='submissions')
```

### 백엔드 변경

#### schemas.py — 신규 모델 추가

```python
class ProblemSummary(BaseModel):
    external_problem_id: str
    hint_count: int        # 해당 문제로 요청한 힌트 횟수
    last_hint_at: datetime # 가장 최근 힌트 요청 시각
    model_config = {"from_attributes": True}

class ProblemListResponse(BaseModel):
    items: list[ProblemSummary]
```

#### router.py — GET /history 파라미터 확장

```python
from typing import Optional
from sqlalchemy import func

@router.get("/history", response_model=HistoryResponse)
def get_history(
    page: int = 1,
    limit: int = 10,
    source: Optional[str] = None,      # "baekjoon" | "direct" | None
    problem_id: Optional[str] = None,  # external_problem_id 값
    ...
):
    if source is not None:
        base_query = base_query.filter(Submission.source == source)
    if problem_id is not None:
        base_query = base_query.filter(Submission.external_problem_id == problem_id)
```

#### router.py — GET /history/problems 신규 엔드포인트

`/history` 엔드포인트보다 **앞에** 배치 (FastAPI 경로 매칭 순서).

```python
@router.get("/history/problems", response_model=ProblemListResponse)
def get_problem_list(current_user_id, db):
    rows = (
        db.query(
            Submission.external_problem_id,
            func.count(Hint.id).label("hint_count"),
            func.max(Hint.created_at).label("last_hint_at"),
        )
        .join(Hint, Hint.submission_id == Submission.id)
        .filter(
            Submission.user_id == current_user_id,
            Submission.source == "baekjoon",
            Submission.external_problem_id.isnot(None),
        )
        .group_by(Submission.external_problem_id)
        .order_by(func.max(Hint.created_at).desc())
        .all()
    )
    return ProblemListResponse(items=[ProblemSummary(...) for row in rows])
```

### 프론트엔드 변경

#### api/history.ts — 타입 및 함수 추가

```typescript
export interface ProblemSummary {
  external_problem_id: string;
  hint_count: number;
  last_hint_at: string;
}
export interface ProblemListResponse { items: ProblemSummary[]; }

export interface FetchHistoryParams {
  page?: number;
  limit?: number;
  source?: 'baekjoon' | 'direct' | 'oj';
  problem_id?: string;
}

// 기존: fetchHistory(page, limit)
// 변경: fetchHistory(params) — 객체 파라미터 방식
export async function fetchHistory(params: FetchHistoryParams = {}): Promise<HistoryResponse>

// 신규
export async function fetchProblemList(): Promise<ProblemListResponse>
```

#### HistoryPage.tsx — 탭 + 드릴다운 뷰

추가 상태:
```typescript
type HistoryTab = 'all' | 'baekjoon' | 'direct';
const [activeTab, setActiveTab] = useState<HistoryTab>('all');
const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
const [problemList, setProblemList] = useState<ProblemSummary[]>([]);
const [problemListLoading, setProblemListLoading] = useState(false);
```

렌더링 구조:
```
HistoryPage
├── 탭 바 (전체 / 백준 / 직접입력)
│
├── activeTab === 'baekjoon' && selectedProblemId === null
│   └── 백준 문제 목록 카드들 (문제번호, 힌트 횟수, 날짜)
│       → 클릭 시 setSelectedProblemId(id)
│
├── activeTab === 'baekjoon' && selectedProblemId !== null
│   ├── "← 문제 목록으로" 뒤로가기 버튼
│   └── 힌트 목록 + 페이지네이션
│
└── activeTab === 'all' | 'direct'
    └── 힌트 목록 + 페이지네이션 (기존 방식)
```

탭 변경 시 `page=1`, `selectedProblemId=null` 리셋.

#### App.css — 신규 CSS 추가

기존 CSS 변수(`--accent`, `--bg-card`, `--border-color` 등) 재사용:

```css
.history-tabs, .history-tab, .history-tab.active
.problem-list, .problem-card, .problem-card:hover
.problem-number, .problem-hint-count, .problem-last-date
.history-back-btn
```

---

## API 정책 변경 요약

| 엔드포인트 | 기존 | v4 |
|---|---|---|
| GET /history | page, limit | page, limit, source, problem_id |
| GET /history/problems | 없음 | 신규 (백준 문제 집계) |

---

## 구현 순서

1. Alembic 마이그레이션 파일 작성 → `alembic upgrade head`
2. `backend/schemas.py` — ProblemSummary, ProblemListResponse 추가
3. `backend/router.py` — /history/problems 추가 (앞에), /history 파라미터 확장
4. `frontend/src/api/history.ts` — 타입, 함수 추가
5. `frontend/src/components/HistoryPage.tsx` — 탭 + 드릴다운 UI
6. `frontend/src/App.css` — 스타일 추가

---

## 검증 방법

1. `alembic upgrade head` 성공 확인
2. `GET /history?source=baekjoon` — 백준 기록만 반환 확인
3. `GET /history/problems` — 문제별 집계 반환 확인
4. 프론트: 탭 전환 시 데이터 필터링 확인
5. 프론트: 백준 탭 → 문제 카드 → 클릭 → 힌트 목록 확인
6. 프론트: "← 문제 목록으로" 버튼 동작 확인
7. 프론트: 직접입력 탭 → 기존 방식 정상 동작 확인
