import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase, type UserProfile } from './lib/supabase'
import LoginForm from './components/Auth/LoginForm'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/DashboardWithCharts'
import VendasPage from './pages/VendasPage'
import AdminDuplicatas from './pages/AdminDuplicatas'

// Páginas completas
import ClientesPage from './pages/ClientesPage'
import RelatoriosPage from './pages/RelatorioPage'  // ← Esta linha deve existir
import TemplatesPage from './pages/TemplatesPage';

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
  <Route path="/clientes" element={<ClientesPage user={user} />} />
  <Route path="/admin/duplicatas" element={<AdminDuplicatas user={user} />} />
 
 <Route path="/relatorios" element={<RelatoriosPage user={user} />} />
  <Route path="/templates" element={<TemplatesPage user={user} />} />

</Routes>
      </Layout>
    </Router>
  )
}

export default App