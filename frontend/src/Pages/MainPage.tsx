import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/ui.css';

const NAV = [
  { to: '/dashboard/groups', label: 'Groups' },
  { to: '/dashboard/bets', label: 'Bets' },
  { to: '/dashboard/wallets', label: 'Wallet' },
];

export default function MainPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fb-bg)' }}>
      <nav className="fb-nav">
        <Link to="/dashboard/groups" className="fb-nav-logo">FriendsBet</Link>

        <div className="fb-nav-links">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`fb-nav-link${pathname.startsWith(n.to) ? ' fb-nav-link--active' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--fb-muted)' }}>{user.username}</span>
          <button className="fb-btn fb-btn--ghost fb-btn--sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <Outlet />
      </main>
    </div>
  );
}
