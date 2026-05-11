import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import UserBar from './components/UserBar';
import HistoryPage from './components/HistoryPage';
import QuizPage from './components/quiz/QuizPage';
import AuthPanel from './components/AuthPanel';
import { getToken, clearToken, kakaoLogin } from './api/auth';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import type { Source } from './components/Header';
import './App.css';

function getUserid(): string {
  const token = getToken();
  if (!token) return '';
  try {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return payload.nickname ?? '';
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

  const navigate = useNavigate();

  // 카카오 로그인 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      navigate('/', { replace: true });
      kakaoLogin(code)
        .then(() => {
          setToken(getToken());
          setUserid(getUserid());
        })
        .catch((err: Error) => {
          setKakaoError(err.message || '카카오 로그인에 실패했습니다.');
        });
    }
  }, [navigate]);

  const handleLogin = useCallback(() => {
    setToken(getToken());
    setUserid(getUserid());
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setToken(null);
    setUserid('');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleQuizUnauthorized = useCallback(() => {
    clearToken();
    setToken(null);
    setUserid('');
    navigate('/', { replace: true });
  }, [navigate]);

  if (!token) {
    return <AuthPanel onLogin={handleLogin} initialError={kakaoError} />;
  }

  return (
    <div className={`App${isDark ? ' dark' : ''}`}>
      <Header userid={userid} onLogout={handleLogout} />
      <UserBar userid={userid} onUnauthorized={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onGoTo={(mode) => navigate(`/${mode === 'home' ? '' : mode}`)}
              onGoToEditor={(src: Source) => navigate(`/editor/${src}`)}
              onUnauthorized={handleLogout}
            />
          }
        />
        <Route
          path="/editor/:source"
          element={<EditorPage isDark={isDark} onLogout={handleLogout} />}
        />
        <Route
          path="/history"
          element={
            <HistoryPage
              onLogout={handleLogout}
              onGoToQuiz={(categories) =>
                navigate('/quiz', { state: { autoGenerate: true, categories } })
              }
            />
          }
        />
        <Route
          path="/quiz"
          element={<QuizPage onUnauthorized={handleQuizUnauthorized} />}
        />
        {/* 알 수 없는 경로는 홈으로 */}
        <Route
          path="*"
          element={
            <HomePage
              onGoTo={(mode) => navigate(`/${mode === 'home' ? '' : mode}`)}
              onGoToEditor={(src: Source) => navigate(`/editor/${src}`)}
              onUnauthorized={handleLogout}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
