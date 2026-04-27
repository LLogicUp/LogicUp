export type Source = 'direct' | 'baekjoon' | 'oj';
export type ViewMode = 'editor' | 'history' | 'quiz';

const SOURCE_LABELS: Record<Source, string> = {
  direct: '직접 입력',
  baekjoon: '백준',
  oj: 'OJ',
};

interface HeaderProps {
  source: Source;
  onSourceChange: (source: Source) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  userid: string;
  onLogout: () => void;
}

function Header({ source, onSourceChange, viewMode, onViewModeChange, userid, onLogout }: HeaderProps) {
  return (
    <header className="App-header">
      <h1>LogicUp</h1>
      <div className="header-controls">
        {viewMode === 'editor' && (
          <nav className="nav-tabs">
            {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
              <button
                key={s}
                className={`nav-tab${source === s ? ' active' : ''}`}
                onClick={() => onSourceChange(s)}
              >
                {SOURCE_LABELS[s]}
              </button>
            ))}
          </nav>
        )}
        <div className="view-toggle">
          <button
            className={`nav-tab${viewMode === 'editor' ? ' active' : ''}`}
            onClick={() => onViewModeChange('editor')}
          >
            에디터
          </button>
          <button
            className={`nav-tab${viewMode === 'history' ? ' active' : ''}`}
            onClick={() => onViewModeChange('history')}
          >
            히스토리
          </button>
          <button
            className={`nav-tab${viewMode === 'quiz' ? ' active' : ''}`}
            onClick={() => onViewModeChange('quiz')}
          >
            퀴즈
          </button>
        </div>
        <div className="user-info">
          <span className="userid">{userid}</span>
          <button className="logout-button" onClick={onLogout}>로그아웃</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
