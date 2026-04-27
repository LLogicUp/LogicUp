import { useState, useEffect } from 'react';
import Header, { type Source, type ViewMode } from './components/Header';
import ProblemInput from './components/ProblemInput';
import CodeEditor from './components/CodeEditor';
import HintPanel, { type Hint } from './components/HintPanel';
import HistoryPage from './components/HistoryPage';
import QuizPage from './components/quiz/QuizPage';
import AuthPanel from './components/AuthPanel';
import { getToken, clearToken, authHeaders, kakaoLogin } from './api/auth';
import './App.css';

function getUserid(): string {
  const token = getToken();
  if (!token) return '';
  try {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return payload.userid ?? '';
  } catch {
    return '';
  }
}

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

  const [token, setToken] = useState<string | null>(() => getToken());
  const [userid, setUserid] = useState<string>(() => getUserid());
  const [kakaoError, setKakaoError] = useState('');

  // 카카오 로그인 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, document.title, '/');
      kakaoLogin(code)
        .then(() => {
          setToken(getToken());
          setUserid(getUserid());
        })
        .catch((err: Error) => {
          setKakaoError(err.message || '카카오 로그인에 실패했습니다.');
        });
    }
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [source, setSource] = useState<Source>('direct');
  const [problemNumber, setProblemNumber] = useState('');
  const [problem, setProblem] = useState('');
  const [expectedInput, setExpectedInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [code, setCode] = useState('');
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    const t = getToken();
    setToken(t);
    setUserid(getUserid());
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setUserid('');
    setViewMode('editor');
  };

  const handleSourceChange = (newSource: Source) => {
    setSource(newSource);
    setProblem('');
    setExpectedInput('');
    setExpectedOutput('');
    setProblemNumber('');
  };

  const requestHint = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...(source === 'baekjoon'
            ? { problem_number: parseInt(problemNumber) || 0 }
            : { problem, expected_input: expectedInput, expected_output: expectedOutput }),
          code,
          error_log: '',
          hint_level: hintLevel,
        }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
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

  const resetAll = () => {
    setProblem('');
    setExpectedInput('');
    setExpectedOutput('');
    setProblemNumber('');
    setCode('');
    setHints([]);
    setHintLevel(1);
  };

  const getButtonLabel = () => {
    if (loading) return '요청 중...';
    if (hintLevel > 3) return '힌트 완료';
    return `힌트 요청 (${hintLevel}단계)`;
  };

  if (!token) {
    return <AuthPanel onLogin={handleLogin} initialError={kakaoError} />;
  }

  return (
    <div className={`App${isDark ? ' dark' : ''}`}>
      <Header
        source={source}
        onSourceChange={handleSourceChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        userid={userid}
        onLogout={handleLogout}
      />
      {viewMode === 'history' ? (
        <HistoryPage onLogout={handleLogout} />
      ) : viewMode === 'quiz' ? (
        <QuizPage />
      ) : (
        <>
          <main className="main-container">
            <div className="code-editor">
              <ProblemInput
                source={source}
                problem={problem}
                expectedInput={expectedInput}
                expectedOutput={expectedOutput}
                problemNumber={problemNumber}
                onProblemChange={setProblem}
                onExpectedInputChange={setExpectedInput}
                onExpectedOutputChange={setExpectedOutput}
                onProblemNumberChange={setProblemNumber}
              />
              <CodeEditor
                code={code}
                isDark={isDark}
                onCodeChange={setCode}
              />
            </div>
            <HintPanel hints={hints} />
          </main>
          <footer className="App-footer">
            <button
              onClick={requestHint}
              disabled={loading || hintLevel > 3}
            >
              {getButtonLabel()}
            </button>
            <button
              className="reset-button"
              onClick={resetAll}
              disabled={loading}
            >
              Reset
            </button>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
