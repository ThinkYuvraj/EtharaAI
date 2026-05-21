import { useMemo } from 'react';
import AccessPill from './AccessPill';

type Role = 'admin' | 'member';

type Props = {
  mode: 'signup' | 'login';
  role: Role;
};

export default function AuthRoleSidePane({ mode, role }: Props) {
  const isAdmin = role === 'admin';

  const title = useMemo(() => {
    if (mode === 'signup') return 'How roles are assigned';
    return 'How roles affect your access';
  }, [mode]);

  const bullets = useMemo(() => {
    if (mode === 'signup') {
      return [
        { k: 'User model', v: 'Your signup creates a User record.' },
        { k: 'Admin rule', v: 'The first user becomes Admin.' },
        { k: 'Member rule', v: 'All other users become Members.' },
      ];
    }

    return [
      { k: 'JWT token', v: 'Login returns a token with your role.' },
      { k: 'Dashboard gating', v: 'Admin sees admin-only actions.' },
      { k: 'Member view', v: 'Members see the project/task overview.' },
    ];
  }, [mode]);

  return (
    <aside className={`ttm-sidepane ttm-sidepane-${isAdmin ? 'admin' : 'member'}`}>
      <div className="ttm-sidepane-title">
        {title}
      </div>

      <div className="ttm-sidepane-pillrow">
        <AccessPill role={role} />
        <div className="ttm-muted">
          {isAdmin ? 'Admin features enabled' : 'Member features enabled'}
        </div>
      </div>

      <div className="ttm-sidepane-list">
        {bullets.map((b) => (
          <div key={b.k} className="ttm-sidepane-item">
            <div className="ttm-sidepane-item-k">{b.k}</div>
            <div className="ttm-sidepane-item-v">{b.v}</div>
          </div>
        ))}
      </div>

      <div className="ttm-sidepane-foot">
        After login, your token unlocks the dashboard routes for your role.
      </div>
    </aside>
  );
}

