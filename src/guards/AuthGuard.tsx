// src/guards/AuthGuard.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/admin-signup', '/accept-invitation'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If user is on a public route and is logged in, redirect to dashboard
  if (user && isPublicRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is on a protected route and not logged in, redirect to login
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};