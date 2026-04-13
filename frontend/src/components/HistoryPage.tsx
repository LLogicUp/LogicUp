import { useState, useEffect } from 'react';
import { fetchHistory, type HistoryItem } from '../api/history';

const HINT_LEVEL_LABEL: Record<number, string> = {
  1: '오류 위치',
  2: '관련 개념',
  3: '의사코드',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceLabel(item: HistoryItem): string {
  if (item.source === 'baekjoon' && item.external_problem_id) {
    return `백준 ${item.external_problem_id}번`;
  }
  if (item.source === 'oj' && item.external_problem_id) {
    return `OJ ${item.external_problem_id}`;
  }
  return '직접 입력';
}

function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchHistory(page, limit)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => setError('히스토리를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) return <div className="history-status">불러오는 중...</div>;
  if (error) return <div className="history-status history-error">{error}</div>;
  if (items.length === 0) return <div className="history-status">저장된 힌트 이력이 없습니다.</div>;

  return (
    <div className="history-page">
      <div className="history-list">
        {items.map((item) => (
          <div key={item.hint_id} className="history-card">
            <div className="history-card-header">
              <span className="history-source">{sourceLabel(item)}</span>
              <span className="history-level">{HINT_LEVEL_LABEL[item.hint_level] ?? `레벨 ${item.hint_level}`}</span>
              <span className="history-date">{formatDate(item.created_at)}</span>
            </div>
            {item.code_snippet && (
              <pre className="history-code">{item.code_snippet}{item.code_snippet.length >= 200 ? '...' : ''}</pre>
            )}
            {item.explanation && (
              <p className="history-explanation">{item.explanation}</p>
            )}
            {item.pseudocode && (
              <pre className="history-pseudocode">{item.pseudocode}</pre>
            )}
          </div>
        ))}
      </div>
      <div className="history-pagination">
        <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
          이전
        </button>
        <span>{page} / {totalPages}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          다음
        </button>
      </div>
    </div>
  );
}

export default HistoryPage;
