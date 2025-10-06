import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { UserProfile } from '../../lib/supabase'
import { BookmarkPlus, Upload, Users } from 'lucide-react'
import { useUserAccess } from '../../hooks/useUserAccess'
import ThemeToggle from '../ThemeToggle'



interface LayoutProps {
  user: UserProfile
  onLogout: () => void
  children: React.ReactNode
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { isAdmin } = useUserAccess() // Adicionar esta linha

  // Array base de navegação
  const baseNavigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2zm0 0V9a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: 'Vendas',
      href: '/vendas',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      name: 'Clientes',
      href: '/clientes',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      name: 'Relatórios',
      href: '/relatorios',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: 'Templates',
      href: '/templates',
      icon: <BookmarkPlus className="h-5 w-5" />
    },
    {
      name: 'Importação',
      href: '/importacao',
      icon: <Upload className="h-5 w-5" />,
      adminOnly: true
    }
  ]

  // Item de Gestão de Usuários (apenas para admin)
  const gestaoUsuariosItem = {
    name: 'Gestão de Usuários',
    href: '/gestao-usuarios',
    icon: <Users className="h-5 w-5" />
  }

  // Atualizar a lógica de navegação para considerar itens adminOnly:
  const navigation = baseNavigation.filter(item => {
    // Se item tem adminOnly=true, mostrar apenas para admin
    if (item.adminOnly && !isAdmin) {
      return false
    }
    return true
  }).concat(
    // Adicionar gestão de usuários se for admin
    isAdmin ? [gestaoUsuariosItem] : []
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
<div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
  {/* Overlay */}
  <div
    className={`fixed inset-0 bg-gray-600 dark:bg-gray-900 transition-opacity ${ sidebarOpen ? 'opacity-75 dark:opacity-75' : 'opacity-0' }`}
    onClick={() => setSidebarOpen(false)}
  />
  
  {/* Sidebar panel */}
  <div className={`relative flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transform transition ${ sidebarOpen ? 'translate-x-0' : '-translate-x-full' }`}>
    
    {/* Botão fechar (X) - CORRIGIDO */}
    <div className="absolute top-0 right-0 -mr-12 pt-2">
      <button
        className={`ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-opacity ${ sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' }`}
        onClick={() => setSidebarOpen(false)}
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    {/* Conteúdo do sidebar */}
    <div className="flex-1 h-full pt-5 pb-4 overflow-y-auto flex flex-col">
      
      {/* Logo/Header */}
      <div className="flex-shrink-0 flex items-center px-4 mb-6">
        <div className="h-10 w-10 bg-blue-600 dark:bg-blue-500 rounded-lg mr-3 flex items-center justify-center">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Sistema Financeiro</h1>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Almeida&Camargo</p>
        </div>
      </div>
      
      {/* Navigation - AJUSTADO ESPAÇAMENTO */}
      <nav className="flex-1 px-2 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`group flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors ${ location.pathname === item.href ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white' }`}
          >
            <span className={`mr-3 ${location.pathname === item.href ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      {/* User info + Logout - NOVO */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {user.nome.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.nome}</p>
            <p className={`text-xs truncate ${ user.role === 'admin_financeiro' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400' }`}>
              {user.role === 'admin_financeiro' ? 'Admin Financeiro' : 'Consultor'}
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mb-3">
          <ThemeToggle showLabel className="w-full justify-center" />
        </div>

        {/* Botão Logout - DESTAQUE MOBILE */}
        <button
          onClick={() => {
            setSidebarOpen(false);
            onLogout();
          }}
          className="w-full flex items-center justify-center px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
      
    </div>
  </div>
</div>
      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="h-8 w-8 bg-blue-600 dark:bg-blue-500 rounded-lg mr-3 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Sistema Financeiro</h1>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Almeida&Camargo</p>
              </div>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${ location.pathname === item.href ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white' }`}
                >
                  <span className={location.pathname === item.href ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}>
                    {item.icon}
                  </span>
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Theme Toggle */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <ThemeToggle showLabel className="w-full justify-center" />
          </div>

          {/* User info at bottom */}
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {user.nome.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.nome}</p>
              <p className={`text-xs truncate ${ user.role === 'admin_financeiro' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400' }`}>
                {user.role === 'admin_financeiro' ? 'Admin Financeiro' : 'Consultor de Vendas'}
              </p>
            </div>
            <button
  onClick={onLogout}
  className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded flex-shrink-0"
  title="Sair"
>
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
</button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex-col flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50 dark:bg-gray-900">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}