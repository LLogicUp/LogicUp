import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  fetchHistory,
  fetchProblemList,
  fetchDirectProblemList,
  UnauthorizedError,
  type HistoryItem,
  type ProblemSummary,
  type DirectProblemSummary,
} from '../api/history';

type HistoryTab = 'all' | 'url' | 'direct';
type LanguageFilter = 'all' | 'c' | 'cpp' | 'python' | 'java';
type QuizLanguage = Exclude<LanguageFilter, 'all'>;

type DrillDown =
  | { kind: 'problem'; problemId: string; label: string }
  | { kind: 'direct'; problemText: string; label: string };

// 탭 공통 카드 타입
type GroupedCard =
  | { kind: 'problem'; data: ProblemSummary }
  | { kind: 'direct'; data: DirectProblemSummary };

const HINT_LEVEL_LABEL: Record<number, string> = {
  1: '오류 위치',
  2: '관련 개념',
  3: '의사코드',
};

const TAB_LABELS: Record<HistoryTab, string> = {
  all: '전체',
  url: '문제 불러오기',
  direct: '직접 입력',
};

const LANGUAGE_LABELS: Record<string, string> = {
  c: 'C',
  cpp: 'C++',
  python: 'Python',
  java: 'Java',
};

const LANGUAGE_FILTERS: { key: LanguageFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'c', label: 'C' },
  { key: 'cpp', label: 'C++' },
  { key: 'python', label: 'Python' },
  { key: 'java', label: 'Java' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cardLabel(card: GroupedCard): string {
  const title = card.data.title?.trim();
  if (title) return title;
  if (card.kind === 'problem') return card.data.external_problem_id ?? '불러온 문제';
  return card.data.problem_snippet || '직접 입력';
}

function cardDate(card: GroupedCard): string {
  return card.data.last_hint_at;
}

function languageLabel(language?: string): string {
  return LANGUAGE_LABELS[language || 'c'] ?? language ?? 'C';
}

function cardLanguage(card: GroupedCard): string {
  return card.data.language || 'c';
}

interface HistoryPageProps {
  onLogout: () => void;
  onGoToQuiz?: (categories: string[], language: QuizLanguage) => void;
}

function HistoryPage({ onLogout, onGoToQuiz }: HistoryPageProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [activeLanguage, setActiveLanguage] = useState<LanguageFilter>('all');
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [allList, setAllList] = useState<GroupedCard[]>([]);
  const [problemList, setProblemList] = useState<ProblemSummary[]>([]);
  const [directList, setDirectList] = useState<DirectProblemSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const limit = 10;

  const handleUnauthorized = useCallback(() => onLogout(), [onLogout]);

  // 탭 변경 시 상태 리셋
  useEffect(() => {
    setPage(1);
    setDrillDown(null);
    setItems([]);
    setError('');
  }, [activeTab]);

  // 드릴다운 없을 때 → 목록 로드
  useEffect(() => {
    if (drillDown !== null) return;

    setListLoading(true);

    let load: Promise<void>;

    if (activeTab === 'all') {
      load = Promise.all([fetchProblemList(), fetchDirectProblemList()])
        .then(([problems, directs]) => {
          const combined: GroupedCard[] = [
            ...problems.items.map((p): GroupedCard => ({ kind: 'problem', data: p })),
            ...directs.items.map((d): GroupedCard => ({ kind: 'direct', data: d })),
          ];
          combined.sort(
            (a, b) => new Date(cardDate(b)).getTime() - new Date(cardDate(a)).getTime()
          );
          setAllList(combined);
        });
    } else if (activeTab === 'url') {
      load = fetchProblemList().then((d) => setProblemList(d.items));
    } else {
      load = fetchDirectProblemList().then((d) => setDirectList(d.items));
    }

    load
      .catch((err) => { if (err instanceof UnauthorizedError) handleUnauthorized(); })
      .finally(() => setListLoading(false));
  }, [activeTab, drillDown, handleUnauthorized]);

  // 드릴다운 선택 시 → 힌트 목록 로드
  useEffect(() => {
    if (drillDown === null) return;

    setLoading(true);
    setError('');

    const params =
      drillDown.kind === 'problem'
        ? { page, limit, source: 'url' as const, problem_id: drillDown.problemId }
        : { page, limit, source: 'direct' as const, problem_text: drillDown.problemText };

    fetchHistory(params)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) handleUnauthorized();
        else setError('히스토리를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [drillDown, page, handleUnauthorized]);

  const totalPages = Math.max(1, Math.ceil(total / limit));


  const handleCardClick = (card: GroupedCard) => {
    if (card.kind === 'problem') {
      setDrillDown({
        kind: 'problem',
        problemId: card.data.external_problem_id,
        label: cardLabel(card),
      });
    } else {
      setDrillDown({
        kind: 'direct',
        problemText: card.data.problem,
        label: cardLabel(card),
      });
    }
  };

  const renderTabs = () => (
    <>
      <div className="history-tabs">
        {(Object.keys(TAB_LABELS) as HistoryTab[]).map((tab) => (
          <button
            key={tab}
            className={`history-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      {drillDown === null && (
        <div className="history-language-tabs">
          {LANGUAGE_FILTERS.map((language) => (
            <button
              key={language.key}
              className={`history-language-tab${activeLanguage === language.key ? ' active' : ''}`}
              onClick={() => setActiveLanguage(language.key)}
            >
              {language.label}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const renderCardList = (cards: GroupedCard[], emptyMsg: string) => {
    if (listLoading) return <div className="history-status">불러오는 중...</div>;
    if (cards.length === 0) return <div className="history-status">{emptyMsg}</div>;
    return (
      <div className="problem-list">
        {cards.map((card, i) => (
          <div
            key={card.kind === 'problem' ? `p-${card.data.external_problem_id}` : `d-${i}-${card.data.last_hint_at}`}
            className="problem-card-row"
          >
            <button
              className="problem-card"
              onClick={() => handleCardClick(card)}
            >
              <div className="problem-card-top">
                <span className="problem-number">{cardLabel(card)}</span>
                <span className="problem-language-badge">{languageLabel(card.data.language)}</span>
                <span className="problem-hint-count">힌트 {card.data.hint_count}회</span>
                <span className="problem-last-date">{formatDate(cardDate(card))}</span>
              </div>
              {card.data.categories && card.data.categories.length > 0 && (
                <div className="problem-category-tags">
                  {card.data.categories.map((cat) => (
                    <span key={cat} className="problem-category-tag">{cat}</span>
                  ))}
                </div>
              )}
            </button>
            {onGoToQuiz && (
              <button
                className="problem-quiz-btn"
                onClick={() => onGoToQuiz(card.data.categories ?? [], cardLanguage(card) as QuizLanguage)}
                disabled={(card.data.categories ?? []).length === 0}
                title={(card.data.categories ?? []).length === 0 ? '생성할 오류 유형이 없습니다.' : undefined}
              >
                퀴즈
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderHintList = () => {
    if (loading) return <div className="history-status">불러오는 중...</div>;
    if (error) return <div className="history-status history-error">{error}</div>;
    if (items.length === 0) return <div className="history-status">힌트 기록이 없습니다.</div>;

    return (
      <>
        <div className="history-list">
          {items.map((item) => (
            <div key={item.hint_id} className="history-card">
              <div className="history-card-header">
                <span className="history-level">{HINT_LEVEL_LABEL[item.hint_level] ?? `레벨 ${item.hint_level}`}</span>
                <span className="history-date">{formatDate(item.created_at)}</span>
              </div>
              {item.code_snippet && (
                <pre className="history-code">{item.code_snippet}{item.code_snippet.length >= 200 ? '...' : ''}</pre>
              )}
              {item.explanation && (
                <div className="history-explanation">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {item.explanation}
                  </ReactMarkdown>
                </div>
              )}
              {item.pseudocode && (
                <div className="history-pseudocode">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {item.pseudocode}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="history-pagination">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>이전</button>
          <span>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>다음</button>
        </div>
      </>
    );
  };

  const renderList = () => {
    const filterByLanguage = (cards: GroupedCard[]) => (
      activeLanguage === 'all'
        ? cards
        : cards.filter((card) => cardLanguage(card) === activeLanguage)
    );
    const emptyMsg = activeLanguage === 'all'
      ? undefined
      : `${LANGUAGE_LABELS[activeLanguage]} 기록이 없습니다.`;

    if (activeTab === 'all') {
      return renderCardList(filterByLanguage(allList), emptyMsg ?? '저장된 힌트 이력이 없습니다.');
    }
    if (activeTab === 'url') {
      return renderCardList(
        filterByLanguage(problemList.map((p): GroupedCard => ({ kind: 'problem', data: p }))),
        emptyMsg ?? '불러온 문제 기록이 없습니다.',
      );
    }
    return renderCardList(
      filterByLanguage(directList.map((d): GroupedCard => ({ kind: 'direct', data: d }))),
      emptyMsg ?? '직접 입력 기록이 없습니다.',
    );
  };

  return (
    <div className="history-page">
      {renderTabs()}
      {drillDown === null ? (
        renderList()
      ) : (
        <>
          <button className="history-back-btn" onClick={() => { setDrillDown(null); setPage(1); }}>
            ← {drillDown.label} 목록으로
          </button>
          {renderHintList()}
        </>
      )}
    </div>
  );
}

export default HistoryPage;
