// =====================================================
// REDIRECIONAMENTO AUTOMÁTICO BASEADO EM ROLE
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Componente que redireciona automaticamente baseado no role do usuário
 */
export function AutoRedirect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        // Buscar usuário logado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Buscar perfil do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        // Redirecionar baseado no role
        switch (profile.role) {
          case 'observador':
            navigate('/dashboard-observador', { replace: true });
            break;
          case 'admin_financeiro':
            navigate('/dashboard', { replace: true });
            break;
          case 'consultor_vendas':
            navigate('/dashboard', { replace: true });
            break;
          default:
            navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return null;
}