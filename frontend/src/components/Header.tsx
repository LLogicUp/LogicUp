import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export type Source = 'direct' | 'url' | 'oj';
export type ViewMode = 'home' | 'editor' | 'history' | 'quiz';

interface HeaderProps {
  userid: string;
  onLogout: () => void;
}

type Tab = {
  label: string;
  path: string;
};

const TABS: Tab[] = [
  { label: '홈',       path: '/' },
  { label: '직접 입력', path: '/editor/direct' },
  { label: '문제 불러오기', path: '/editor/url' },
  { label: 'OJ',       path: '/editor/oj' },
  { label: '히스토리', path: '/history' },
  { label: '퀴즈',     path: '/quiz' },
];

function isActive(tabPath: string, pathname: string): boolean {
  if (tabPath === '/') return pathname === '/';
  return pathname.startsWith(tabPath);
}

function Header({ userid, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="lu-header">
      <div className="lu-header__top">
        <div className="lu-header__logo">
          <div className="lu-header__logo-mark">L</div>
          <div className="lu-header__logo-text">
            <span className="lu-header__logo-ko">LogicUp</span>
          </div>
        </div>

        <div className="lu-header__utils">
          <span className="lu-header__greet"><b>{userid}</b>님 안녕하세요.</span>
          <button className="lu-header__util-btn" onClick={onLogout}>로그아웃</button>
        </div>
      </div>

      <nav className="lu-header__tabs" role="tablist">
        {TABS.map((tab) => {
          const active = isActive(tab.path, pathname);
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={active}
              className={`lu-header__tab${active ? ' lu-header__tab--active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

export default Header;
