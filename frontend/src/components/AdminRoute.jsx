import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin) {
    // Non-admins are redirected to their own files
    return <Navigate to="/my-files" replace />;
  }

  return children;
}

