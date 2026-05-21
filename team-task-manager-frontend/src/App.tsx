import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

type Theme = 'light' | 'dark';

const THEME_KEY = 'ttm_theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === 'dark';

  return (
    <button className="ttm-theme-toggle" type="button" role="switch" aria-checked={isDark} onClick={onToggle}>
      <span className="ttm-theme-track">
        <span className="ttm-theme-thumb" />
      </span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}

function TopNav() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="ttm-nav">
      <div className="ttm-nav-left">
        <div className="ttm-nav-logo">#</div>
        <div className="ttm-nav-title">Team Task Manager</div>
      </div>
      <div className="ttm-nav-right">
        <div className="ttm-nav-role">{user.role.toUpperCase()}</div>
        <button className="ttm-nav-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="ttm-theme-shell">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <TopNav />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
