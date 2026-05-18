import { useState, useEffect } from 'react';
import { login, register, sejongLogin } from '../api/auth';

interface AuthPanelProps {
  onLogin: () => void;
  initialError?: string;
}

type Mode = 'login' | 'register' | 'sejong';

function AuthPanel({ onLogin, initialError = '' }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [sejongPassword, setSejongPassword] = useState('');
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

  const handleSejongLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sejongLogin(studentId, sejongPassword);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSejongModeOpen = () => {
    setStudentId('');
    setSejongPassword('');
    setError('');
    setMode('sejong');
  };

  const handleBackToSocial = () => {
    setStudentId('');
    setSejongPassword('');
    setError('');
    setMode('login');
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

  if (mode === 'sejong') {
    return (
      <div className="auth-overlay">
        <div className="auth-panel">
          <h2>LogicUp</h2>
          <div className="sejong-form-header">
            <button type="button" className="sejong-back-btn" onClick={handleBackToSocial}>
              ← 뒤로
            </button>
            <span>세종대 포털 로그인</span>
          </div>
          <form onSubmit={handleSejongLogin} className="auth-form">
            <input
              type="text"
              placeholder="학번"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="포털 비밀번호"
              value={sejongPassword}
              onChange={(e) => setSejongPassword(e.target.value)}
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? '처리 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <div className="social-login-row">
          <button
            type="button"
            className="kakao-login-btn"
            onClick={handleKakaoLogin}
            disabled={loading}
          >
            카카오로 로그인
          </button>
          <button
            type="button"
            className="sejong-login-btn"
            onClick={handleSejongModeOpen}
            disabled={loading}
          >
            세종대 포털
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPanel;
