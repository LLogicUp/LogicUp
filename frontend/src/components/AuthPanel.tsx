import { useState, useEffect } from 'react';
import { login, register, kakaoLogin, initKakao } from '../api/auth';

interface AuthPanelProps {
  onLogin: () => void;
}

type Mode = 'login' | 'register';

function AuthPanel({ onLogin }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initKakao(process.env.REACT_APP_KAKAO_CLIENT_ID || '');
  }, []);

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
    setError('');
    const kakao = (window as any).Kakao;
    if (!kakao) {
      setError('카카오 SDK를 로드할 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    kakao.Auth.authorize({
      redirectUri: process.env.REACT_APP_KAKAO_REDIRECT_URI,
    });
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
