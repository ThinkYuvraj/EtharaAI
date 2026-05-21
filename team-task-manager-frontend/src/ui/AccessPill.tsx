type Props = {
  role: 'admin' | 'member';
};

export default function AccessPill({ role }: Props) {
  const isAdmin = role === 'admin';

  return (
    <div className={`ttm-access-pill ttm-access-${isAdmin ? 'admin' : 'member'}`}>
      Access: {isAdmin ? 'Admin' : 'Member'}
    </div>
  );
}

