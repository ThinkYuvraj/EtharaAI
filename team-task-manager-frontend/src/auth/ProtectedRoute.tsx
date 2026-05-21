import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="ttm-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

