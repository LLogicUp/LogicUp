import { useState, useEffect } from 'react';
import { login, register } from '../api/auth';

interface AuthPanelProps {
  onLogin: () => void;
  initialError?: string;
}

type Mode = 'login' | 'register';

function AuthPanel({ onLogin, initialError = '' }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(userid, password);
        await login(userid, password);
      } else {
        await login(userid, password);
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const restApiKey = process.env.REACT_APP_KAKAO_REST_API_KEY;
    const redirectUri = process.env.REACT_APP_KAKAO_REDIRECT_URI;
    if (!restApiKey || !redirectUri) {
      setError('카카오 로그인 설정이 올바르지 않습니다.');
      return;
    }
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${restApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  return (
    <div className="auth-overlay">
      <div className="auth-panel">
        <h2>LogicUp</h2>
        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            로그인
          </button>
          <button
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            회원가입
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="아이디"
            value={userid}
            onChange={(e) => setUserid(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
        <div className="auth-divider">또는</div>
        <button
          type="button"
          className="kakao-login-btn"
          onClick={handleKakaoLogin}
          disabled={loading}
        >
          카카오로 로그인
        </button>
      </div>
    </div>
  );
}

export default AuthPanel;
