import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../frontend-api';
import { Card, SectionTitle } from '../ui/Layout';
import AuthRoleSidePane from '../ui/AuthRoleSidePane';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErr(null);
    try {
      await login(email.trim(), password);
      nav('/');
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ttm-page ttm-auth-page">
      <div className="ttm-herobar ttm-auth-herobar">
        <div className="ttm-brand">Team Task Manager</div>
        <div className="ttm-pill">Projects / Tasks / Progress</div>
      </div>

      <div className="ttm-grid ttm-auth-grid">
        <div className="ttm-col">
          <SectionTitle title="Welcome back" subtitle="Sign in to your workspace and pick up where your team left off." />

          <Card>
            <div className="ttm-auth-card">
              <AuthRoleSidePane mode="login" role="member" />

              <div className="ttm-auth-main">
                <form className="ttm-form" onSubmit={onSubmit}>
                  <label>
                    <span>Email</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com"/>
                  </label>

                  <label>
                    <span>Password</span>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="Password"
                    />
                  </label>

                  {err ? <div className="ttm-error">{err}</div> : null}

                  <button className="ttm-btn" disabled={!canSubmit || submitting}>
                    {submitting ? 'Signing in...' : 'Login'}
                  </button>
                </form>

                <div className="ttm-footnote">
                  New here? <a href="/signup">Create an account</a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

