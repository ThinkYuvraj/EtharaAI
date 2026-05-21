import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../frontend-api';
import { Card, SectionTitle } from '../ui/Layout';
import AuthRoleSidePane from '../ui/AuthRoleSidePane';

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => name.trim().length >= 2 && email.trim().length > 3 && password.length >= 6, [
    name,
    email,
    password,
  ]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      await signup(name.trim(), email.trim(), password);
      nav('/');
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Signup failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ttm-page ttm-auth-page">
      <div className="ttm-herobar ttm-auth-herobar">
        <div className="ttm-brand">Team Task Manager</div>
        <div className="ttm-pill">Create / Assign / Track</div>
      </div>

      <div className="ttm-grid ttm-auth-grid">
        <div className="ttm-col">
          <SectionTitle title="Create your account" subtitle="Set up your workspace, invite teammates, and organize project delivery." />

          <Card>
            <div className="ttm-auth-card">
              <AuthRoleSidePane mode="signup" role="member" />

              <div className="ttm-auth-main">
                <form className="ttm-form" onSubmit={onSubmit}>
                  <label>
                    <span>Full name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="At least 6 characters"
                    />
                  </label>

                  {err ? <div className="ttm-error">{err}</div> : null}

                  <button className="ttm-btn" disabled={!canSubmit || submitting}>
                    {submitting ? 'Creating...' : 'Sign up'}
                  </button>

                  <div className="ttm-footnote">
                    Already have an account? <a href="/login">Login</a>
                  </div>
                </form>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

