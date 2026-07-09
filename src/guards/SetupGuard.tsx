  // src/components/SetupGuard.tsx
  import React, { useEffect, useState } from 'react';
  import { Navigate, useLocation } from 'react-router-dom';
  import { supabase } from '../lib/supabase';

  interface SetupGuardProps {
    children: React.ReactNode;
  }

  export const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
    const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
      const checkAdmin = async () => {
        try {
          const { data, error } = await supabase.rpc('has_admins');

          if (error) throw error;
          setHasAdmin(data || false);
        } catch (checkError) {
          console.error('Error checking admin:', checkError);
          setHasAdmin(false);
        } finally {
          setLoading(false);
        }
      };

      if (location.pathname === '/admin-signup') {
        setLoading(false);
        return;
      }

      checkAdmin();
    }, [location.pathname]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (!hasAdmin && location.pathname !== '/admin-signup') {
      return <Navigate to="/admin-signup" replace />;
    }

    return <>{children}</>;
  };