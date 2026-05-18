import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { fetchHistory, fetchSubmissionList, fetchCategoryStats, UnauthorizedError, type HistoryItem, type CategoryStat } from '../api/history';
import type { ViewMode, Source } from '../components/Header';
import './HomePage.css';

function hintCountToLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcStreaks(counts: Map<string, number>): { current: number; longest: number } {
  if (counts.size === 0) return { current: 0, longest: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // current streak: check today, fall back to yesterday
  let current = 0;
  const start = new Date(today);
  if (!counts.has(localDateStr(start))) start.setDate(start.getDate() - 1);
  while (counts.has(localDateStr(start))) {
    current++;
    start.setDate(start.getDate() - 1);
  }

  // longest streak
  const sorted = Array.from(counts.keys()).sort();
  let longest = 0;
  let streak = 0;
  let prev: Date | null = null;
  for (const ds of sorted) {
    const cur = new Date(ds + 'T00:00:00');
    if (prev) {
      const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      streak = diff === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    if (streak > longest) longest = streak;
    prev = cur;
  }

  return { current, longest };
}

interface HomePageProps {
  onGoTo: (mode: ViewMode) => void;
  onGoToEditor: (source: Source) => void;
  onUnauthorized: () => void;
}

/* ── 최근 힌트 이력 카드 ── */
function RecentHintsCard({ onGoTo, onUnauthorized }: { onGoTo: (m: ViewMode) => void; onUnauthorized: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'url' | 'direct'>('all');

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory({ page: 1, limit: 5, ...(filter !== 'all' ? { source: filter } : {}) })
      .then((res) => { if (!controller.signal.aborted) setItems(res.items); })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });
    return () => controller.abort();
  }, [filter, onUnauthorized]);

  const FILTERS: { key: 'all' | 'url' | 'direct'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'url', label: '문제 불러오기' },
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
              <span className={`hp-tag hp-tag--${item.source === 'url' ? 'boj' : 'direct'}`}>
                {item.source === 'url' ? '불러옴' : '직접'}
              </span>
              {(item.title?.trim() || item.problem.slice(0, 30)) || '(제목 없음)'}
            </div>
            <div className="hp-hint-date">{item.created_at.slice(0, 10)}</div>
          </div>
        ))}
      </div>
      <button className="hp-more" onClick={() => onGoTo('history')}>⌄ 더보기</button>
    </Card>
  );
}

/* ── 바로가기 카드 ── */
const SHORTCUTS: { icon: string; label: string; mode: ViewMode | null; source?: Source }[] = [
  { icon: '📝', label: '직접 입력', mode: 'editor', source: 'direct' },
  { icon: '🔗', label: '문제 불러오기', mode: 'editor', source: 'url' },
  { icon: 'OJ', label: 'OJ', mode: 'editor', source: 'oj' },
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

/* ── 학습 활동 카드 ── */
function ActivityCard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [hintCounts, setHintCounts] = useState<Map<string, number>>(new Map());
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [totalHints, setTotalHints] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSubmissionList()
      .then((res) => {
        if (controller.signal.aborted) return;
        const counts = new Map<string, number>();
        res.items.forEach((s) => {
          const date = s.last_hint_at.slice(0, 10);
          counts.set(date, (counts.get(date) ?? 0) + s.hint_count);
        });
        setHintCounts(counts);
        setTotalSubmissions(res.items.length);
        setTotalHints(res.items.reduce((sum, s) => sum + s.hint_count, 0));
      })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });

    fetchCategoryStats()
      .then((res) => { if (!controller.signal.aborted) setCategoryStats(res.items); })
      .catch((err) => { if (!controller.signal.aborted && err instanceof UnauthorizedError) onUnauthorized(); });

    return () => controller.abort();
  }, [onUnauthorized]);

  const { current: currentStreak, longest: longestStreak } = calcStreaks(hintCounts);
  const activeDays = hintCounts.size;

  // contribution graph: last 26 weeks (Sun~Sat columns)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);

  const graphEnd = new Date(today);
  const graphStart = new Date(today);
  graphStart.setDate(graphStart.getDate() - graphStart.getDay()); // 이번 주 일요일
  graphStart.setDate(graphStart.getDate() - 25 * 7);              // 26주 전 일요일

  const weeks: { dateStr: string; count: number; isFuture: boolean }[][] = [];
  const cur = new Date(graphStart);
  while (cur <= graphEnd || weeks[weeks.length - 1]?.length < 7) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
      weeks.push([]);
    }
    const ds = localDateStr(cur);
    weeks[weeks.length - 1].push({
      dateStr: ds,
      count: hintCounts.get(ds) ?? 0,
      isFuture: cur > today,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const STATS = [
    { label: '총 제출', value: String(totalSubmissions) },
    { label: '총 힌트', value: String(totalHints) },
    { label: '활성 일수', value: String(activeDays) },
    { label: '현재 연속', value: `${currentStreak}일` },
    { label: '최장 연속', value: `${longestStreak}일` },
  ];

  const maxCount = categoryStats.length > 0 ? Math.max(...categoryStats.map((s) => s.count)) : 1;
  const totalCatCount = categoryStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card title="학습 활동">
      <div className="hp-act-stats">
        {STATS.map((s) => (
          <div key={s.label} className="hp-act-stat">
            <span className="hp-act-stat-label">{s.label}</span>
            <span className="hp-act-stat-value">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="hp-act-body">
        <div className="hp-contrib-wrap">
          <div className="hp-contrib-days">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="hp-contrib-graph">
            {weeks.map((week, wi) => (
              <div key={wi} className="hp-contrib-col">
                {week.map((day, di) => {
                  const level = day.isFuture ? -1 : hintCountToLevel(day.count);
                  let cls = 'hp-contrib-cell';
                  if (level > 0) cls += ` hp-contrib-cell--l${level}`;
                  if (day.dateStr === todayStr) cls += ' hp-contrib-cell--today';
                  return (
                    <div
                      key={di}
                      className={cls}
                      title={day.count > 0 ? `${day.dateStr} · 힌트 ${day.count}개` : day.dateStr}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {categoryStats.length > 0 && (
          <div className="hp-error-chart">
            <div className="hp-error-chart-title">오류 유형 분포</div>
            {categoryStats.map((s) => {
              const relWidth = Math.round((s.count / maxCount) * 100);
              const pct = Math.round((s.count / totalCatCount) * 100);
              if (pct === 0) return null;
              return (
                <div key={s.category} className="hp-error-row">
                  <span className="hp-error-label">{s.category}</span>
                  <div className="hp-error-bar-wrap">
                    <div className="hp-error-bar" style={{ width: `${relWidth}%` }} />
                  </div>
                  <span className="hp-error-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── 홈 페이지 ── */
export default function HomePage({ onGoTo, onGoToEditor, onUnauthorized }: HomePageProps) {
  return (
    <div className="hp-grid">
      <RecentHintsCard onGoTo={onGoTo} onUnauthorized={onUnauthorized} />
      <ShortcutCard onGoTo={onGoTo} onGoToEditor={onGoToEditor} />
      <ActivityCard onUnauthorized={onUnauthorized} />
    </div>
  );
}
