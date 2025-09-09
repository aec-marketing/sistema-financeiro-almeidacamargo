import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase, type UserProfile } from './lib/supabase'
import LoginForm from './components/Auth/LoginForm'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/DashboardWithCharts'
import VendasPage from './pages/VendasPage'

// Páginas placeholder - SEM parâmetro user
const ClientesPage = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Clientes</h1>
      <p className="text-gray-600 mb-6">Página de clientes em desenvolvimento...</p>
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Funcionalidades Planejadas:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Lista completa de clientes</li>
          <li>• Histórico de vendas por cliente</li>
          <li>• Informações de contato</li>
          <li>• Análise de performance por cliente</li>
        </ul>
      </div>
    </div>
  </div>
)

const RelatoriosPage = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Relatórios</h1>
      <p className="text-gray-600 mb-6">Central de relatórios em desenvolvimento...</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Relatórios de Vendas</h3>
          <ul className="text-sm text-green-800 space-y-1 text-left">
            <li>• Faturamento por período</li>
            <li>• Performance por representante</li>
            <li>• Análise de produtos</li>
            <li>• Comparativo anual</li>
          </ul>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">Exportações</h3>
          <ul className="text-sm text-purple-800 space-y-1 text-left">
            <li>• Export para Excel</li>
            <li>• Relatórios em PDF</li>
            <li>• Dashboards personalizados</li>
            <li>• Agendamento automático</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)

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

  const handleLogin = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        setUser(profile)
      }
    } catch (error) {
      console.error('Erro no handleLogin:', error)
    }
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

  // App com routing
  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
<Routes>
  <Route path="/" element={<Dashboard user={user} />} />
  <Route path="/vendas" element={<VendasPage user={user} />} />
  <Route path="/clientes" element={<ClientesPage />} />
  <Route path="/relatorios" element={<RelatoriosPage />} />
</Routes>
      </Layout>
    </Router>
  )
}

export default App