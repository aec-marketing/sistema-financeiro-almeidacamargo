import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, type UserProfile } from './lib/supabase'
import { ToastProvider } from './contexts/ToastContext'
import LoginForm from './components/Auth/LoginForm'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/DashboardWithCharts'
import VendasPage from './pages/VendasPage'
import AdminDuplicatas from './pages/AdminDuplicatas'
import GestaoUsuarios from './pages/GestaoUsuarios'

// Páginas completas
import ClientesPage from './pages/ClientesPage'
import RelatoriosPage from './pages/RelatorioPage'
import TemplatesPage from './pages/TemplatesPage';
import ImportacaoDados from './pages/ImportacaoDados.tsx'
import { DashboardObservador } from './pages/DashboardObservador';
import { ObservadorRoute } from './components/Auth/ObservadorRoute';
import ImportacaoPage from './pages/ImportacaoPage';
import ComparativoPeriodosPage from './pages/ComparativoPeriodosPage';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Timeout para evitar loading infinito
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    const checkAuth = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      // ADICIONE ESTES LOGS AQUI:
      if (error) {
  console.error('Erro ao buscar perfil:', error)
} else if (profile) {
  console.log('🔍 Perfil carregado:', profile);
  console.log('🔍 Role:', profile?.role);
  setUser(profile)
}
    }
  } catch (error) {
    console.error('Erro na verificação de auth:', error)
  } finally {
    clearTimeout(timeout)
    setLoading(false)
  }
}

    checkAuth()

    return () => clearTimeout(timeout)
  }, [])

  const handleLogin = async (userData: UserProfile) => {
    // Verificar se usuário está ativo
    if (!userData.ativo) {
      alert('⚠️ Sua conta está desativada. Entre em contato com o administrador.')
      await supabase.auth.signOut()
      return
    }

    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Carregando sistema...</p>
        </div>
      </div>
    )
  }

  // ENVOLVER TUDO COM ROUTER
  return (
  <ToastProvider>
    <Router>
      <Routes>
      {/* ROTA DE LOGIN */}
      <Route 
        path="/login" 
        element={
          user ? (
            // Se já logado, redirecionar baseado no role
            user.role === 'observador' ? (
              <Navigate to="/dashboard-observador" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <LoginForm onSuccess={handleLogin} />
          )
        } 
      />

        {/* ROTA DO DASHBOARD OBSERVADOR - FORA DO LAYOUT */}
        <Route 
          path="/dashboard-observador" 
          element={
            <ObservadorRoute>
              <DashboardObservador />
            </ObservadorRoute>
          } 
        />

        {/* DEMAIS ROTAS - PROTEGIDAS E DENTRO DO LAYOUT */}
        <Route 
          path="/*" 
          element={
            user ? (
              // Verificar se usuário está ativo
              user.ativo ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/vendas" element={<VendasPage />} />
                    <Route path="/clientes" element={<ClientesPage />} />
                    <Route path="/admin/duplicatas" element={<AdminDuplicatas />} />
                    <Route path="/relatorios" element={<RelatoriosPage />} />
                    <Route path="/templates" element={<TemplatesPage />} />
                    <Route path="/gestao-usuarios" element={<GestaoUsuarios />} />
                    <Route path="/admin/importacao" element={<ImportacaoDados />} />
  <Route path="/comparativo" element={<ComparativoPeriodosPage />} />

                    {/* Rota protegida - apenas admin */}
                    <Route
                      path="/importacao"
                      element={
                        user?.role === 'admin_financeiro' ? (
                          <ImportacaoPage />
                        ) : (
                          <Navigate to="/" replace />
                        )
                      }
                    />
                  </Routes>
                </Layout>
              ) : (
                // Usuário desativado
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Conta Desativada</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Sua conta foi desativada pelo administrador. Entre em contato para mais informações.
                    </p>
                    <button
                      onClick={handleLogout}
                      className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </div>
              )
            ) : (
              // Não logado - redirecionar para login
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  </ToastProvider>
  )
}

export default App