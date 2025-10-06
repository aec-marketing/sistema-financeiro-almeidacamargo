// src/components/Auth/RoleGuard.tsx
import React from 'react'
import { useUserAccess } from '../../hooks/useUserAccess'
import { AlertCircle, Lock, Users, ShieldCheck } from 'lucide-react'

// Props para diferentes tipos de proteção
interface RoleGuardProps {
  children: React.ReactNode
  // Tipos de proteção disponíveis
  requireAdmin?: boolean
  requireVendedor?: boolean
  requireRole?: 'admin_financeiro' | 'consultor_vendas'
  requirePermission?: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'canManageUsers'
  // Customização visual
  fallback?: React.ReactNode
  showMessage?: boolean
  className?: string
}

/**
 * Componente para controle de acesso baseado em roles
 * 
 * Este componente protege partes da aplicação baseado nas permissões
 * do usuário, mostrando mensagens ou componentes alternativos quando
 * o usuário não tem acesso.
 * 
 * @example
 * // Apenas admin pode ver
 * <RoleGuard requireAdmin>
 *   <button>Excluir Venda</button>
 * </RoleGuard>
 * 
 * // Qualquer usuário logado pode ver
 * <RoleGuard requirePermission="canRead">
 *   <ClientesList />
 * </RoleGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requireAdmin = false,
  requireVendedor = false,
  requireRole,
  requirePermission,
  fallback,
  showMessage = true,
  className = ''
}) => {
  const { 
    user, 
    loading, 
    error, 
    isAdmin, 
    isVendedor,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManageUsers
  } = useUserAccess()

  // Estado de carregamento
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Verificando permissões...</span>
      </div>
    )
  }

  // Estado de erro
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Erro de Autenticação</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Usuário não logado
  if (!user) {
    if (fallback) return <>{fallback}</>
    
    if (showMessage) {
      return (
        <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Login Necessário</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Faça login para acessar esta funcionalidade
              </p>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Verificações de permissão
  let hasAccess = true

  // Verificação por role específico
  if (requireRole) {
    hasAccess = user.role === requireRole
  }

  // Verificação de admin
  if (requireAdmin) {
    hasAccess = isAdmin
  }

  // Verificação de vendedor
  if (requireVendedor) {
    hasAccess = isVendedor
  }

  // Verificação de permissão específica
  if (requirePermission) {
    switch (requirePermission) {
      case 'canRead':
        hasAccess = canRead
        break
      case 'canCreate':
        hasAccess = canCreate
        break
      case 'canUpdate':
        hasAccess = canUpdate
        break
      case 'canDelete':
        hasAccess = canDelete
        break
      case 'canManageUsers':
        hasAccess = canManageUsers
        break
      default:
        hasAccess = false
    }
  }

  // Se não tem acesso, mostra fallback ou mensagem
  if (!hasAccess) {
    if (fallback) return <>{fallback}</>
    
    if (showMessage) {
      return (
        <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
          <div className="flex items-center">
            <ShieldCheck className="h-5 w-5 text-orange-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Acesso Restrito</h3>
              <p className="text-sm text-orange-700 mt-1">
                {requireAdmin && !isAdmin && 'Apenas administradores podem acessar esta área'}
                {requireVendedor && !isVendedor && 'Apenas vendedores podem acessar esta área'}
                {requireRole && user.role !== requireRole && `Perfil ${requireRole} necessário`}
                {requirePermission && 'Você não tem permissão para esta ação'}
                {!requireAdmin && !requireVendedor && !requireRole && !requirePermission && 'Permissões insuficientes'}
              </p>
              <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                Seu perfil atual: <span className="font-medium capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Se tem acesso, renderiza o conteúdo
  return <>{children}</>
}

/**
 * Hook auxiliar para usar permissões em componentes funcionais
 * 
 * @example
 * const { isAdmin, canDelete } = usePermissions()
 * if (canDelete) return <DeleteButton />
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePermissions = () => {
  const {
    isAdmin,
    isVendedor,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManageUsers,
    user,
    representanteName,
    representanteCode
  } = useUserAccess()

  return {
    isAdmin,
    isVendedor,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManageUsers,
    user,
    representante: {
      nome: representanteName,
      codigo: representanteCode
    }
  }
}

/**
 * Componente para mostrar informações do usuário atual
 * Útil para debug e desenvolvimento
 */
export const UserInfo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, isAdmin, isVendedor, representanteName } = useUserAccess()

  if (!user) return null

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-800">{user.nome}</h4>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <div>Role: <span className="font-medium">{user.role}</span></div>
            {isVendedor && representanteName && (
              <div>Representante: <span className="font-medium">{representanteName}</span></div>
            )}
            <div>Permissões: 
              <span className="font-medium ml-1">
                {isAdmin ? 'Administrador Total' : 'Vendedor (Dados Próprios)'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className={`w-3 h-3 rounded-full ${user.ativo ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
      </div>
    </div>
  )
}

export default RoleGuard