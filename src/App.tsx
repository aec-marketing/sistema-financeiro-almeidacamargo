import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase, type UserProfile } from './lib/supabase'
import LoginForm from './components/Auth/LoginForm'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/DashboardWithCharts'
import VendasPage from './pages/VendasPage'
import AdminDuplicatas from './pages/AdminDuplicatas'
import GestaoUsuarios from './pages/GestaoUsuarios'

// Páginas completas
import ClientesPage from './pages/ClientesPage'
import RelatoriosPage from './pages/RelatorioPage'  // ← Esta linha deve existir
import TemplatesPage from './pages/TemplatesPage';
import ImportacaoDados from './pages/ImportacaoDados.tsx'

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
          
          if (error) {
            console.error('Erro ao buscar perfil:', error)
          } else if (profile) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    )
  }

  // Se não tem usuário, mostra login
  if (!user) {
    return <LoginForm onSuccess={handleLogin} />
  }

  // Verificar se usuário está ativo
  if (user && !user.ativo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Desativada</h2>
          <p className="text-gray-600 mb-6">
            Sua conta foi desativada pelo administrador. Entre em contato para mais informações.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    )
  }

  // App com routing
  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
<Routes>
  <Route path="/" element={<Dashboard user={user} />} />
  <Route path="/vendas" element={<VendasPage user={user} />} />
  <Route path="/clientes" element={<ClientesPage user={user} />} />
  <Route path="/admin/duplicatas" element={<AdminDuplicatas user={user} />} />
 
 <Route path="/relatorios" element={<RelatoriosPage user={user} />} />
  <Route path="/templates" element={<TemplatesPage user={user} />} />
<Route path="/gestao-usuarios" element={<GestaoUsuarios />} />
<Route path="/admin/importacao" element={<ImportacaoDados />} />

</Routes>
      </Layout>
    </Router>
  )
}

export default App