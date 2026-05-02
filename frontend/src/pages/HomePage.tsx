import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import PillButton from '../components/ui/PillButton';
import { fetchHistory, fetchSubmissionList, UnauthorizedError, type HistoryItem } from '../api/history';
import type { ViewMode, Source } from '../components/Header';
import './HomePage.css';

interface HomePageProps {
  onGoTo: (mode: ViewMode) => void;
  onGoToEditor: (source: Source) => void;
  onUnauthorized: () => void;
}

/* ── 최근 힌트 이력 카드 ── */
function RecentHintsCard({ onGoTo, onUnauthorized }: { onGoTo: (m: ViewMode) => void; onUnauthorized: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'baekjoon' | 'direct'>('all');

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory({ page: 1, limit: 5, ...(filter !== 'all' ? { source: filter } : {}) })
      .then((res) => { if (!controller.signal.aborted) setItems(res.items); })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });
    return () => controller.abort();
  }, [filter, onUnauthorized]);

  const FILTERS: { key: 'all' | 'baekjoon' | 'direct'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'baekjoon', label: '백준' },
    { key: 'direct', label: '직접 입력' },
  ];

  return (
    <Card title="최근 힌트 이력" onPlus={() => onGoTo('history')}>
      <div className="hp-filter-row">
        {FILTERS.map((f) => (
          <span
            key={f.key}
            className={`hp-filter${filter === f.key ? ' hp-filter--on' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </span>
        ))}
      </div>
      <div className="hp-hint-list">
        {items.length === 0 && (
          <p className="hp-empty">이력이 없습니다.</p>
        )}
        {items.map((item) => (
          <div key={item.hint_id} className="hp-hint-row">
            <div className="hp-hint-title">
              <span className={`hp-tag hp-tag--${item.source === 'baekjoon' ? 'boj' : 'direct'}`}>
                {item.source === 'baekjoon' ? `백준 ${item.external_problem_id}` : '직접'}
              </span>
              {item.problem.slice(0, 30) || '(제목 없음)'}
            </div>
            <div className="hp-hint-date">{item.created_at.slice(0, 10)}</div>
          </div>
        ))}
      </div>
      <button className="hp-more" onClick={() => onGoTo('history')}>⌄ 더보기</button>
    </Card>
  );
}

/* ── 오늘의 문제 카드 ── */
function TodayProblemCard({ onGoToEditor }: { onGoToEditor: (s: Source) => void }) {
  return (
    <Card title="오늘의 문제">
      <div className="hp-today-body">
        <div className="hp-today-illust">📋</div>
        <p className="hp-today-text">현재 풀이 중인 문제가 없습니다.</p>
        <PillButton variant="primary" onClick={() => onGoToEditor('direct')}>
          ＋ 새 문제 시작하기
        </PillButton>
      </div>
    </Card>
  );
}

/* ── 바로가기 카드 ── */
const SHORTCUTS: { icon: string; label: string; mode: ViewMode | null; source?: Source }[] = [
  { icon: '📝', label: '직접 입력', mode: 'editor', source: 'direct' },
  { icon: '🏅', label: '백준',     mode: 'editor', source: 'baekjoon' },
  { icon: '📜', label: '히스토리', mode: 'history' },
  { icon: '🎯', label: '퀴즈',     mode: 'quiz' },
];

function ShortcutCard({ onGoTo, onGoToEditor }: { onGoTo: (m: ViewMode) => void; onGoToEditor: (s: Source) => void }) {
  return (
    <Card title="바로가기" className="hp-shortcut-card">
      <div className="hp-shortcut-grid">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            className="hp-shortcut"
            onClick={() => s.source ? onGoToEditor(s.source) : s.mode && onGoTo(s.mode)}
          >
            <div className="hp-shortcut-icon">{s.icon}</div>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ── 코드 에디터 미니 카드 ── */
function EditorMiniCard({ onGoToEditor }: { onGoToEditor: (s: Source) => void }) {
  return (
    <Card title="코드 에디터" onPlus={() => onGoToEditor('direct')} className="hp-editor-card">
      <div className="hp-editor-mock">
        <span className="hp-code-cmt"># 직접 입력 또는 백준 탭에서 문제를 선택하세요</span>
        {'\n'}
        <span className="hp-code-kw">def</span>{' '}
        <span className="hp-code-fn">solve</span>():
        {'\n    '}
        <span className="hp-code-fn">pass</span>
      </div>
      <div className="hp-editor-footer">
        <PillButton variant="primary" onClick={() => onGoToEditor('direct')}>
          에디터 열기 →
        </PillButton>
      </div>
    </Card>
  );
}

/* ── 학습 캘린더 카드 ── */
function CalendarCard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0); // 현재 월 기준 오프셋

  useEffect(() => {
    const controller = new AbortController();
    fetchSubmissionList()
      .then((res) => {
        if (controller.signal.aborted) return;
        setActiveDates(new Set(res.items.map((s) => s.last_hint_at.slice(0, 10))));
      })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });
    return () => controller.abort();
  }, [onUnauthorized]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const baseDate = new Date(year, month, 1);
  const displayYear = baseDate.getFullYear();
  const displayMonth = baseDate.getMonth();

  const firstDow = new Date(displayYear, displayMonth, 1).getDay();
  const lastDay = new Date(displayYear, displayMonth + 1, 0).getDate();
  const prevLastDay = new Date(displayYear, displayMonth, 0).getDate();

  const todayStr = now.toISOString().slice(0, 10);

  const cells: { day: number; type: 'prev' | 'cur' | 'next'; dateStr: string }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    cells.push({ day: d, type: 'prev', dateStr: '' });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, type: 'cur', dateStr });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next', dateStr: '' });
    }
  }

  return (
    <Card title="학습 캘린더">
      <div className="hp-cal-head">
        <button className="hp-cal-nav" onClick={() => setOffset((o) => o - 1)}>{'<'}</button>
        <span>{displayYear}. {displayMonth + 1}</span>
        <button className="hp-cal-nav" onClick={() => setOffset((o) => o + 1)}>{'>'}</button>
      </div>
      <div className="hp-cal-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div key={d} className={`hp-cal-dow${i === 0 ? ' hp-cal-dow--sun' : i === 6 ? ' hp-cal-dow--sat' : ''}`}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const isMuted = c.type !== 'cur';
          const isToday = c.dateStr === todayStr;
          const hasActivity = activeDates.has(c.dateStr);
          let cls = 'hp-cal-day';
          if (isMuted) cls += ' hp-cal-day--muted';
          else if (hasActivity) cls += ' hp-cal-day--has';
          else if (isToday) cls += ' hp-cal-day--today';
          return <div key={i} className={cls}>{c.day}</div>;
        })}
      </div>
    </Card>
  );
}

/* ── 알림 카드 ── */
function NoticeCard() {
  return (
    <Card title="알림">
      <p className="hp-notice-msg">
        새로운 힌트가 도착하면<br />
        이곳에 표시됩니다.
      </p>
    </Card>
  );
}

/* ── 홈 페이지 ── */
export default function HomePage({ onGoTo, onGoToEditor, onUnauthorized }: HomePageProps) {
  return (
    <div className="hp-grid">
      <RecentHintsCard onGoTo={onGoTo} onUnauthorized={onUnauthorized} />
      <TodayProblemCard onGoToEditor={onGoToEditor} />
      <ShortcutCard onGoTo={onGoTo} onGoToEditor={onGoToEditor} />
      <EditorMiniCard onGoToEditor={onGoToEditor} />
      <CalendarCard onUnauthorized={onUnauthorized} />
      <NoticeCard />
    </div>
  );
}
