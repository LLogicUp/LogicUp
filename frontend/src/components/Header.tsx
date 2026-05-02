import './Header.css';

export type Source = 'direct' | 'baekjoon' | 'oj';
export type ViewMode = 'home' | 'editor' | 'history' | 'quiz';

interface HeaderProps {
  source: Source;
  onSourceChange: (source: Source) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  userid: string;
  onLogout: () => void;
}

type Tab =
  | { kind: 'view'; label: string; mode: ViewMode }
  | { kind: 'source'; label: string; source: Source };

const TABS: Tab[] = [
  { kind: 'view',   label: '홈',       mode: 'home' },
  { kind: 'source', label: '직접 입력', source: 'direct' },
  { kind: 'source', label: '백준',     source: 'baekjoon' },
  { kind: 'source', label: 'OJ',       source: 'oj' },
  { kind: 'view',   label: '히스토리', mode: 'history' },
  { kind: 'view',   label: '퀴즈',     mode: 'quiz' },
];

function isActive(tab: Tab, viewMode: ViewMode, source: Source): boolean {
  if (tab.kind === 'view') return viewMode === tab.mode;
  return viewMode === 'editor' && source === tab.source;
}

function Header({ source, onSourceChange, viewMode, onViewModeChange, userid, onLogout }: HeaderProps) {
  const handleTabClick = (tab: Tab) => {
    if (tab.kind === 'view') {
      onViewModeChange(tab.mode);
    } else {
      onSourceChange(tab.source);
      onViewModeChange('editor');
    }
  };

  return (
    <header className="lu-header">
      <div className="lu-header__top">
        <div className="lu-header__logo">
          <div className="lu-header__logo-mark">L</div>
          <div className="lu-header__logo-text">
            <span className="lu-header__logo-ko">LogicUp</span>
          </div>
        </div>

        <div className="lu-header__utils">
          <span className="lu-header__greet"><b>{userid}</b>님 안녕하세요.</span>
          <button className="lu-header__util-btn" onClick={onLogout}>🔓 로그아웃</button>
        </div>
      </div>

      <nav className="lu-header__tabs" role="tablist">
        {TABS.map((tab) => {
          const active = isActive(tab, viewMode, source);
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={active}
              className={`lu-header__tab${active ? ' lu-header__tab--active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

export default Header;
