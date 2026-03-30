import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

function App() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [code, setCode] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [pseudocode, setPseudocode] = useState<string>('');
  const [hintLevel, setHintLevel] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const requestHint = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, error_log: '', hint_level: hintLevel }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? '');
      setPseudocode(data.pseudocode ?? '');
      if (hintLevel < 4) setHintLevel(hintLevel + 1);
    } catch {
      setExplanation('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
      setPseudocode('');
    } finally {
      setLoading(false);
    }
  };

  const getButtonLabel = () => {
    if (loading) return '요청 중...';
    if (hintLevel > 3) return '힌트 완료';
    return `힌트 요청 (${hintLevel}단계)`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>LogicUp</h1>
      </header>
      <main className="main-container">
        <div className="code-editor">
          <h2>Code Input</h2>
          <Editor
            height="400px"
            defaultLanguage="c"
            value={code}
            onChange={(value) => setCode(value ?? '')}
            theme={isDark ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <div className="hint-display">
          <h2>Hint</h2>
          <div className="hint-content">
            {explanation ? (
              <>
                <span className="hint-level-badge">{hintLevel - 1}단계 힌트</span>
                <p>{explanation}</p>
                {pseudocode && (
                  <div className="hint-pseudocode">
                    <h3>의사코드</h3>
                    <pre>{pseudocode}</pre>
                  </div>
                )}
              </>
            ) : (
              <p className="hint-placeholder">코드를 입력하고 힌트를 요청하세요.</p>
            )}
          </div>
        </div>
      </main>
      <footer className="App-footer">
        <button
          onClick={requestHint}
          disabled={loading || hintLevel > 3}
        >
          {getButtonLabel()}
        </button>
      </footer>
    </div>
  );
}

export default App;
