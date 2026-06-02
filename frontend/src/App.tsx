import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import UserBar from './components/UserBar';
import HistoryPage from './components/HistoryPage';
import QuizPage from './components/quiz/QuizPage';
import AuthPanel from './components/AuthPanel';
import { getToken, clearToken, kakaoLogin, getTokenPayload, isSejongVerifiedToken } from './api/auth';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import type { Source } from './components/Header';
import './App.css';

function getUserid(): string {
  return getTokenPayload()?.nickname ?? '';
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
  const [isSejongVerified, setIsSejongVerified] = useState<boolean>(() => isSejongVerifiedToken());
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
          setIsSejongVerified(isSejongVerifiedToken());
        })
        .catch((err: Error) => {
          setKakaoError(err.message || '카카오 로그인에 실패했습니다.');
        });
    }
  }, [navigate]);

  const handleLogin = useCallback(() => {
    setToken(getToken());
    setUserid(getUserid());
    setIsSejongVerified(isSejongVerifiedToken());
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setToken(null);
    setUserid('');
    setIsSejongVerified(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleQuizUnauthorized = useCallback(() => {
    clearToken();
    setToken(null);
    setUserid('');
    setIsSejongVerified(false);
    navigate('/', { replace: true });
  }, [navigate]);

  if (!token) {
    return <AuthPanel onLogin={handleLogin} initialError={kakaoError} />;
  }

  return (
    <div className={`App${isDark ? ' dark' : ''}`}>
      <Header userid={userid} isSejongVerified={isSejongVerified} onLogout={handleLogout} />
      <UserBar userid={userid} onUnauthorized={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onGoTo={(mode) => navigate(`/${mode === 'home' ? '' : mode}`)}
              onGoToEditor={(src: Source) => navigate(`/editor/${src}`)}
              onUnauthorized={handleLogout}
              isSejongVerified={isSejongVerified}
            />
          }
        />
        <Route
          path="/editor/:source"
          element={
            <EditorPage
              isDark={isDark}
              isSejongVerified={isSejongVerified}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryPage
              onLogout={handleLogout}
              isSejongVerified={isSejongVerified}
              onGoToQuiz={(categories, language) =>
                navigate('/quiz', { state: { autoGenerate: true, categories, language } })
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
              isSejongVerified={isSejongVerified}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
