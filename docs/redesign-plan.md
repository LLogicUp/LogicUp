# LogicUp 프론트엔드 리디자인 계획

> 기준 문서: `docs/redesign-preview.html` (세종대 포털 스타일)
> 작성일: 2026-05-02

---

## 0. 절대 규칙 (Non-negotiable)

작업 전·중·후 항상 지켜야 하는 규칙. 위반 시 즉시 중단하고 재작업한다.

### 0.1 작업 절차 규칙
1. **스킬 → 에이전트 → 커맨드 순으로 점검**한다. 가장 앞 단계에서 처리 가능하면 그것을 우선 사용.
2. **모든 계획 파일은 `docs/` 디렉토리에 저장**한다. 루트나 임의 경로에 만들지 않는다.
3. **애매하거나 정보가 부족하면 코드를 짜기 전에 사용자에게 질문**한다.
4. **planner → tdd-guide → code-reviewer → security-reviewer → 커밋** 순서를 지킨다.
5. **TodoWrite로 다단계 진행 상황을 추적**하고, 단계 완료 시 즉시 completed 처리한다.

### 0.2 코드 규칙
6. **불변성 유지** — 기존 객체를 직접 변경하지 않고 spread로 새 객체 생성.
7. **파일은 작게, 응집도 높게** — 200~400줄 권장, 800줄 초과 금지.
8. **하드코딩 금지** — 색상/폰트/숫자는 CSS 변수 또는 상수로.
9. **`console.log` 프로덕션 금지** — 디버그 코드는 커밋 전 제거.
10. **시크릿 하드코딩 절대 금지** — 환경 변수 사용.
11. **에러는 조용히 삼키지 않는다** — try/catch에서 사용자 친화 메시지 + 로깅.
12. **사용자 입력은 시스템 경계에서 항상 검증** (Zod 권장).

### 0.3 디자인 규칙 (이번 리디자인 한정)
13. **컬러 팔레트는 프리뷰의 CSS 변수만 사용**한다 (버건디 `#8B1F2F` 계열). 임의 색상 추가 금지.
14. **폰트는 Pretendard로 통일**한다.
15. **카드 컴포넌트 규격 통일** — `border-radius:12px`, `border:1px solid #EAEAEA`, `--shadow-card`.
16. **Pill 버튼 = `border-radius:999px`** 표준화.
17. **다크모드는 이번 단계에서 보류** — 라이트 테마(세종 포털 스타일) 단일 우선. 다크 변수는 남겨두되 UI에서 토글 노출 금지.
18. **반응형 breakpoint** — 1280 / 1024 / 768 세 단계만 정의, 임의 미디어쿼리 추가 금지.
19. **기존 라우팅(viewMode)·API 클라이언트는 변경하지 않는다** — 시각적 레이어만 교체.
20. **각 PR은 단일 영역**(헤더 / 메인 그리드 / 카드 / 페이지 단위)으로 분할 — 한 번에 전부 갈아엎지 않는다.

### 0.4 검증 규칙
21. **테스트 커버리지 80% 이상 유지** — 컴포넌트 분할 후 단위 테스트 작성.
22. **빌드 통과 + 타입 에러 0** 상태에서만 커밋.
23. **시각 회귀 점검** — 변경 전/후 스크린샷을 PR 본문에 첨부.

---

## 1. 현황 분석

### 1.1 현재 구조
- `App.tsx` — 탭 라우팅(`viewMode`: editor / history / quiz)
- `Header.tsx` — 상단 탭 + 소스(`direct`/`baekjoon`) 토글
- `ProblemInput`, `CodeEditor`, `HintPanel` — 에디터 화면 3단 구성
- `App.css` — 간단한 라이트/다크 변수, 세종 포털 스타일과 거리 있음

### 1.2 프리뷰가 제시하는 변화
| 영역 | 현재 | 프리뷰 |
|------|------|--------|
| 헤더 | 단색 다크 + 탭 | 버건디 그라데이션 + 로고 + 유틸 + 탭 (포털형) |
| 사용자 영역 | 없음 | 흰색 user-bar (이름·이메일·통계·테마/위젯 설정) |
| 메인 | 1×2 (에디터 + 힌트) | 3열 카드 그리드 (이력 / 오늘의 문제 / 바로가기) + 2행 (에디터 / 캘린더 / 알림) |
| 에디터 | 풀폭 | 카드형 미니 에디터 + Lv 1·2·3 pill + 힌트 요청 버튼 |
| 컴포넌트 | 평탄 | "카드(Card)" 단위 컴포넌트화 |

---

## 2. 목표

1. 세종대 포털 스타일 비주얼을 LogicUp에 이식 (브랜드 컬러: 버건디).
2. 대시보드 형식 메인(`viewMode === 'home'`) 신설.
3. 기존 에디터/히스토리/퀴즈 페이지는 유지하되 카드 디자인 시스템에 흡수.
4. 디자인 토큰을 `theme.css`로 분리해 향후 테마 확장 가능하게 함.

---

## 3. 단계별 계획

### Phase 1 — 디자인 토큰 & 폰트 (1일)
- [ ] `frontend/src/styles/theme.css` 생성 — 프리뷰의 `:root` 변수 그대로 이식.
- [ ] `index.html`에 Pretendard CDN `<link>` 추가.
- [ ] `App.css` 변수 → `theme.css`로 이관, 기존 `.App.dark` 제거(보류).
- [ ] 빌드 통과 확인.

### Phase 2 — 공용 카드 컴포넌트 (1일)
- [ ] `components/ui/Card.tsx` — `title`, `onPlus?`, `children` props.
- [ ] `components/ui/PillButton.tsx`, `LevelPill.tsx`.
- [ ] Storybook 없으므로 `App.test.tsx`에 시각 케이스로 렌더 테스트.

### Phase 3 — 헤더 + 사용자 바 (1~2일)
- [ ] `Header.tsx` 리디자인: 로고 / 유틸(설정·타이머·로그아웃) / 탭.
- [ ] `components/UserBar.tsx` 신설: 닉네임, 이메일, 푼 문제/미해결 통계.
  - 통계 데이터: `/history/submissions` 응답에서 카운트 (신규 API 만들지 않음 — 기존 재사용).
- [ ] 탭에 `home` 추가 → `ViewMode` 타입에 `'home'` 합집합 추가.

### Phase 4 — 홈 대시보드 신설 (2~3일)
- [ ] `pages/HomePage.tsx`:
  - 최근 힌트 이력 카드 (5개, 더보기 → history 탭 이동)
  - 오늘의 문제 카드 (현재는 빈 상태 + "새 문제 시작" → editor 탭)
  - 바로가기 카드 (라우팅 단축키)
  - 코드 에디터 미니 카드 (현재 코드 미리보기, 클릭 시 editor)
  - 학습 캘린더 카드 (월별, has 마커는 제출일)
  - 알림 카드 (placeholder)
- [ ] 로그인 직후 기본 진입을 `home`으로.

### Phase 5 — 에디터/히스토리/퀴즈 카드화 (2일)
- [ ] `ProblemInput`, `CodeEditor`, `HintPanel`을 `Card` 래퍼로 감싸기.
- [ ] Hint 레벨 버튼 → `LevelPill` 사용.
- [ ] 풋터 "힌트 요청" 버튼 → `--accent-red` pill.
- [ ] `HistoryPage`, `QuizPage`도 동일 토큰 적용.

### Phase 6 — 검증 & 배포 (1일)
- [ ] `code-reviewer` 에이전트로 리뷰.
- [ ] 1280 / 1024 / 768 스크린샷 첨부.
- [ ] 커버리지 80% 확인 후 main으로 PR.

---

## 4. 신규/변경 파일 목록

```
frontend/src/
├── styles/
│   └── theme.css              (신규)
├── components/
│   ├── ui/
│   │   ├── Card.tsx           (신규)
│   │   ├── PillButton.tsx     (신규)
│   │   └── LevelPill.tsx      (신규)
│   ├── UserBar.tsx            (신규)
│   ├── Header.tsx             (수정: 버건디 헤더)
│   ├── ProblemInput.tsx       (수정: Card 래핑)
│   ├── CodeEditor.tsx         (수정: Card 래핑)
│   ├── HintPanel.tsx          (수정: Card 래핑)
│   └── HistoryPage.tsx        (수정: 토큰 적용)
├── pages/
│   └── HomePage.tsx           (신규)
└── App.tsx                    (수정: viewMode 'home' 추가)
```

---

## 5. 위험 요소 & 완화

| 위험 | 영향 | 완화 |
|------|------|------|
| 다크모드 기능 손실 | 사용자 불만 가능 | Phase 7 별도 이슈로 다크 토큰 재정의 |
| Pretendard 로딩 지연 | FOUT | `font-display: swap`, 시스템 폰트 fallback |
| 캘린더에 표시할 통계 데이터 부재 | 빈 상태 노출 | 기존 submissions 응답 재사용, 없으면 placeholder |
| 한 번에 전부 교체 시 회귀 | 빌드 실패 | Phase별 PR 분할 (절대 규칙 #20) |

---

## 6. 다음 액션

사용자 확인 사항:
1. **다크모드 보류 결정 OK?** (절대 규칙 #17)
2. **viewMode에 `home` 탭을 새로 추가**해도 되는지? (기본 진입을 home으로)
3. **캘린더의 "이벤트" 데이터** — 현재 백엔드에 학습 일정 API가 없는데, 임시로 더미/빈 상태로 둘지?

확인 후 Phase 1부터 착수합니다.
