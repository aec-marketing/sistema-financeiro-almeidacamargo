// src/hooks/useUserAccess.ts
import { useState, useEffect } from 'react'
import { supabase, type UserProfile } from '../lib/supabase'

// Tipos específicos para controle de acesso
export interface UserAccess {
  user: UserProfile | null
  loading: boolean
  error: string | null
  // Permissões booleanas para facilitar uso
  isAdmin: boolean
  isVendedor: boolean
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManageUsers: boolean
  // Dados filtrados do usuário
  representanteName: string | null
  representanteCode: number | null
}

// Dados iniciais vazios
const initialUserAccess: UserAccess = {
  user: null,
  loading: true,
  error: null,
  isAdmin: false,
  isVendedor: false,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canManageUsers: false,
  representanteName: null,
  representanteCode: null
}

/**
 * Hook principal para controle de acesso e permissões
 * 
 * Este hook centraliza toda a lógica de permissões do sistema,
 * facilitando o controle de acesso nas páginas e componentes.
 * 
 * @returns {UserAccess} Objeto com todas as informações de acesso do usuário
 */
export const useUserAccess = (): UserAccess => {
  const [userAccess, setUserAccess] = useState<UserAccess>(initialUserAccess)

  useEffect(() => {
    let mounted = true

    const loadUserAccess = async () => {
      try {
        // Busca o usuário autenticado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          throw new Error(`Erro de autenticação: ${authError.message}`)
        }

        if (!authUser) {
          // Usuário não logado
          if (mounted) {
            setUserAccess({
              ...initialUserAccess,
              loading: false,
              error: null
            })
          }
          return
        }

        // Busca o perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          throw new Error(`Erro ao carregar perfil: ${profileError.message}`)
        }

        if (!profile) {
          throw new Error('Perfil de usuário não encontrado')
        }

        // Verifica se o usuário está ativo
        if (!profile.ativo) {
          throw new Error('Usuário inativo. Entre em contato com o administrador.')
        }

        // Define permissões baseadas no role
        const isAdmin = profile.role === 'admin_financeiro'
        const isVendedor = profile.role === 'consultor_vendas'

        // Busca dados do representante (para vendedores)
        let representanteName: string | null = null
        let representanteCode: number | null = null

        if (isVendedor && profile.cd_representante) {
          // Busca o nome do representante na tabela de vendas
          const { data: reprData } = await supabase
            .from('vendas')
            .select('"NomeRepr", "cdRepr"')
            .eq('"cdRepr"', profile.cd_representante)
            .limit(1)
            .single()

          if (reprData) {
            representanteName = reprData.NomeRepr
            representanteCode = reprData.cdRepr
          }
        }

        // Monta objeto final com todas as permissões
        const newUserAccess: UserAccess = {
          user: profile,
          loading: false,
          error: null,
          
          // Roles básicos
          isAdmin,
          isVendedor,
            isAtivo: profile?.ativo ?? false, // Adicionar esta linha

          // Permissões detalhadas
          canRead: true, // Todos podem ler (com filtros)
          canCreate: isAdmin, // Apenas admin pode criar
          canUpdate: isAdmin, // Apenas admin pode editar
          canDelete: isAdmin, // Apenas admin pode excluir
          canManageUsers: isAdmin, // Apenas admin gerencia usuários
          
          // Dados do representante
          representanteName,
          representanteCode
        }

        if (mounted) {
          setUserAccess(newUserAccess)
        }

      } catch (error) {
        console.error('Erro no useUserAccess:', error)
        
        if (mounted) {
          setUserAccess({
            ...initialUserAccess,
            loading: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
        }
      }
    }

    loadUserAccess()

    // Listener para mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserAccess({
          ...initialUserAccess,
          loading: false,
          error: null
        })
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Recarrega os dados quando o usuário faz login
        loadUserAccess()
      }
    })

    // Cleanup
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return userAccess
}

/**
 * Hook auxiliar para verificar permissões específicas
 * 
 * @param permission - Nome da permissão a verificar
 * @returns {boolean} Se o usuário tem a permissão
 */
export const useHasPermission = (permission: keyof UserAccess): boolean => {
  const userAccess = useUserAccess()
  return Boolean(userAccess[permission])
}

/**
 * Hook para obter filtros de query baseados no usuário
 * 
 * Este hook retorna os filtros que devem ser aplicados nas queries
 * para cada tipo de usuário (admin vê tudo, vendedor só seus dados)
 * 
 * @returns {object} Objeto com filtros para diferentes tabelas
 */
export const useUserFilters = () => {
  const { isAdmin, representanteCode, representanteName } = useUserAccess()

  return {
    // Filtro para tabela de vendas
    vendasFilter: isAdmin 
      ? {} // Admin vê tudo
      : representanteName 
        ? { 'NomeRepr': representanteName } 
        : { 'cdRepr': representanteCode },
    
    // Filtro para clientes (baseado nas vendas do representante)
    clientesFilter: isAdmin 
      ? {} // Admin vê todos
      : representanteName
        ? { 'vendedor': representanteName } // Será aplicado via join
        : {},
    
    // Verifica se deve aplicar filtros
    shouldFilter: !isAdmin,
    
    // Dados do representante para uso geral
    representante: {
      nome: representanteName,
      codigo: representanteCode
    }
  }
}