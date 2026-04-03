export type Source = 'direct' | 'baekjoon' | 'oj';

const SOURCE_LABELS: Record<Source, string> = {
  direct: '직접 입력',
  baekjoon: '백준',
  oj: 'OJ',
};

interface HeaderProps {
  source: Source;
  onSourceChange: (source: Source) => void;
}

function Header({ source, onSourceChange }: HeaderProps) {
  return (
    <header className="App-header">
      <h1>LogicUp</h1>
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
    </header>
  );
}

export default Header;
