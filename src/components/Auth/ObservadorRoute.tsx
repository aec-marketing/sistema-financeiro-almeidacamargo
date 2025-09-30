// =====================================================
// ROTA PROTEGIDA PARA OBSERVADORES
// =====================================================

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ObservadorRouteProps {
  children: React.ReactNode;
}

/**
 * Componente de rota protegida para observadores
 */
export function ObservadorRoute({ children }: ObservadorRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isObservador, setIsObservador] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsObservador(profile?.role === 'observador');
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isObservador) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}