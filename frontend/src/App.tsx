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

  const [problem, setProblem] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [code, setCode] = useState('');
  const [hints, setHints] = useState<{ level: number; explanation: string; pseudocode: string }[]>([]);
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestHint = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          code,
          expected_output: expectedOutput,
          error_log: '',
          hint_level: hintLevel,
        }),
      });
      const data = await res.json();
      setHints((prev) => [
        ...prev,
        {
          level: hintLevel,
          explanation: data.explanation ?? '',
          pseudocode: data.pseudocode ?? '',
        },
      ]);
      if (hintLevel < 4) setHintLevel(hintLevel + 1);
    } catch {
      setHints((prev) => [
        ...prev,
        {
          level: hintLevel,
          explanation: '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.',
          pseudocode: '',
        },
      ]);
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
          <div className="input-field">
            <label>문제 설명</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="문제를 입력하세요 (선택)"
              rows={4}
            />
          </div>
          <div className="input-field">
            <label>정답 예시 출력</label>
            <textarea
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="정답 예시 출력을 입력하세요 (선택)"
              rows={3}
            />
          </div>
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
            {hints.length > 0 ? (
              hints.map((hint) => (
                <div key={hint.level} className="hint-item">
                  <span className="hint-level-badge">{hint.level}단계 힌트</span>
                  <p>{hint.explanation}</p>
                  {hint.pseudocode && (
                    <div className="hint-pseudocode">
                      <h3>의사코드</h3>
                      <pre>{hint.pseudocode}</pre>
                    </div>
                  )}
                </div>
              ))
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
