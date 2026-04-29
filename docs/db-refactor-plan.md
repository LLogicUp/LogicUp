# DB 리팩토링 계획

## 현재 문제점

`POST /hint` 호출 시마다 새 `Submission`이 생성됨.
→ 같은 코드에 힌트 레벨 1→2→3 요청 시 3개의 Submission이 만들어지는 중복 발생.

---

## 변경 목표

| # | 변경 내용                                                   |
| - | ----------------------------------------------------------- |
| 1 | Submission 1:N Hint 구조 실제 활성화 (submission_id 재사용) |
| 2 | `external_problem_id` 수정 엔드포인트 추가                |
| 3 | `hint_category` 테이블 추가 + LLM 자동 분류 저장          |

---

## 1. Submission 1:N Hint 재사용 구조

### 변경 전 흐름

```
POST /hint (level 1) → Submission 생성 → Hint(level=1) 생성
POST /hint (level 2) → Submission 생성 → Hint(level=2) 생성  ← 중복!
POST /hint (level 3) → Submission 생성 → Hint(level=3) 생성  ← 중복!
```

### 변경 후 흐름

```
POST /hint (level 1) → Submission 생성 → Hint(level=1) 생성 → submission_id 반환
POST /hint (level 2, submission_id=X) → 기존 Submission 재사용 → Hint(level=2) 추가
POST /hint (level 3, submission_id=X) → 기존 Submission 재사용 → Hint(level=3) 추가
```

### models.py 변경 (HintRequest)

```python
class HintRequest(BaseModel):
    submission_id: int | None = None   # 추가: 기존 제출 재사용
    problem: str = ""
    problem_number: int = 0
    code: str
    expected_input: str = ""
    expected_output: str = ""
    error_log: str = ""
    hint_level: int = 1
```

### schemas.py 변경 (HintResponse 추가)

```python
class HintResponse(BaseModel):
    submission_id: int          # 프론트에서 저장해 두고 다음 요청에 재사용
    hint_id: int
    hint_level: int
    explanation: str
    pseudocode: str
    error_categories: list[str]
```

### router.py 변경 (POST /hint 로직)

```
1. submission_id가 요청에 있으면:
   - DB에서 해당 submission 조회 (user_id 검증)
   - 없으면 404
   - 이미 같은 hint_level이 존재하면 409
   - Hint 추가만 수행 (카테고리는 최초 생성 시만 저장)

2. submission_id가 없으면:
   - Submission 신규 생성
   - flush()로 id 확보
   - LLM 응답의 error_categories → HintCategory 레코드 생성
   - Hint 생성

3. 공통: submission당 hint 3개 초과 불가 (400 에러)
4. 응답에 submission_id 포함
```

---

## 2. external_problem_id 수정 엔드포인트

```
PATCH /submissions/{submission_id}
Authorization: Bearer <token>

Body: {"external_problem_id": "1234"}
Response: {"submission_id": 1, "external_problem_id": "1234"}
```

- 본인 소유 submission만 수정 가능 (403)
- 없는 submission은 404

---

## 3. hint_category 테이블

### 스키마

```sql
CREATE TABLE hint_categories (
    id          SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    category    VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_hint_categories_submission_id ON hint_categories(submission_id);
```

### 분류 시점

- **Submission 최초 생성 시 1회만** LLM이 반환한 `error_categories` 배열로 레코드 생성
- 기존 submission에 힌트를 추가할 때는 카테고리 재분류 없음

### LLM 응답 활용

기존 prompts.py의 SYSTEM_PROMPT가 이미 `error_categories` 배열을 JSON으로 반환함.
→ 별도 LLM 호출 없이 `/hint` 응답에서 파싱해 저장.

### db_models.py 추가

```python
class HintCategory(Base):
    __tablename__ = "hint_categories"

    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("Submission", back_populates="categories")
```

---

## 4. Alembic 마이그레이션

새 파일: `add_hint_categories_table`

```python
def upgrade():
    op.create_table(
        "hint_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("submission_id", sa.Integer(), sa.ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_hint_categories_submission_id", "hint_categories", ["submission_id"])

def downgrade():
    op.drop_index("ix_hint_categories_submission_id", table_name="hint_categories")
    op.drop_table("hint_categories")
```

---

## 영향 범위

| 파일                      | 변경 유형                                          |
| ------------------------- | -------------------------------------------------- |
| backend/db_models.py      | HintCategory 클래스 추가, Submission 관계 추가     |
| backend/models.py         | HintRequest.submission_id 추가                     |
| backend/schemas.py        | HintResponse 추가                                  |
| backend/router.py         | POST /hint 로직 변경, PATCH /submissions/{id} 추가 |
| backend/alembic/versions/ | 마이그레이션 파일 신규 생성                        |

프론트엔드: `/hint` 응답에서 `submission_id`를 받아 다음 힌트 요청 시 전달 필요 (별도 작업).
