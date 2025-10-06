// src/pages/GestaoUsuarios.tsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserAccess } from '../hooks/useUserAccess'
import RoleGuard from '../components/Auth/RoleGuard'
import {
  Users,
  Plus,
  Edit3,
  Shield,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  AlertCircle,
  Mail
} from 'lucide-react'

// Interfaces
interface UsuarioSistema {
  id: string
  email: string
  nome: string
  role: 'admin_financeiro' | 'consultor_vendas'
  cd_representante?: number
  ativo: boolean
  created_at: string
  ultimo_login?: string
  representante?: {
    codigo: number
    nome: string
    totalVendas: number
  }
}

interface Representante {
  codigo: number
  nome: string
  totalVendas: number
  faturamentoTotal: number
}

interface NovoUsuario {
  nome: string
  email: string
  role: 'admin_financeiro' | 'consultor_vendas'
  cd_representante?: number
  senha: string
}

const GestaoUsuarios: React.FC = () => {
  const { user, isAdmin } = useUserAccess()
  
  // Estados principais
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados do modal
  const [showModalNovo, setShowModalNovo] = useState(false)
  const [showModalEdicao, setShowModalEdicao] = useState(false)
  const [usuarioEdicao, setUsuarioEdicao] = useState<UsuarioSistema | null>(null)
  
  // Estados do formulário
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuario>({
    nome: '',
    email: '',
    role: 'consultor_vendas',
    senha: ''
  })
  const [salvando, setSalvando] = useState(false)

  // Carregar dados iniciais
  useEffect(() => {
    if (user && isAdmin) {
      carregarDados()
    }
  }, [user, isAdmin])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar usuários do sistema
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        throw new Error(`Erro ao carregar usuários: ${profilesError.message}`)
      }

      // Carregar representantes únicos
      const { data: reprData, error: reprError } = await supabase
        .from('vendas')
        .select('cdRepr, NomeRepr')
        .not('NomeRepr', 'is', null)
        .not('cdRepr', 'is', null)

      if (reprError) {
        throw new Error(`Erro ao carregar representantes: ${reprError.message}`)
      }

      // Agrupar representantes únicos e calcular estatísticas
      const reprMap = new Map<number, { nome: string, vendas: number }>()
      
      reprData.forEach(item => {
        const codigo = item.cdRepr
        const nome = item.NomeRepr
        
        if (reprMap.has(codigo)) {
          reprMap.get(codigo)!.vendas += 1
        } else {
          reprMap.set(codigo, { nome, vendas: 1 })
        }
      })

      const representantesList = Array.from(reprMap.entries())
        .map(([codigo, data]) => ({
          codigo,
          nome: data.nome,
          totalVendas: data.vendas,
          faturamentoTotal: 0 // Calcularemos depois se necessário
        }))
        .sort((a, b) => b.totalVendas - a.totalVendas)

      // Enriquecer usuários com dados dos representantes
      const usuariosEnriquecidos = profiles.map(profile => ({
        ...profile,
        representante: profile.cd_representante 
          ? representantesList.find(r => r.codigo === profile.cd_representante)
          : undefined
      }))

      setUsuarios(usuariosEnriquecidos)
      setRepresentantes(representantesList)

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

// Filtrar usuários - localizar por volta da linha 155
const usuariosFiltrados = usuarios.filter(usuario =>
  usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  usuario.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (usuario.representante?.nome?.toLowerCase().includes(searchTerm.toLowerCase()))
)
  // Criar novo usuário
// Criar novo usuário
const criarUsuario = async () => {
  try {
    setSalvando(true)
    
    // Validações básicas
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (novoUsuario.role === 'consultor_vendas' && !novoUsuario.cd_representante) {
      alert('Selecione um representante para vendedores')
      return
    }

    // ⚠️ LIMITAÇÃO TÉCNICA: O Supabase Auth faz login automático ao criar usuário
    // Isso vai deslogar você da conta admin temporariamente
    const confirmar = window.confirm(
      '⚠️ ATENÇÃO: Criar usuário via interface irá deslogar você temporariamente.\n\n' +
      'Recomendamos criar usuários manualmente via Supabase Dashboard.\n\n' +
      'Deseja continuar mesmo assim?'
    )

    if (!confirmar) {
      setSalvando(false)
      return
    }

    console.log('Criando usuário:', novoUsuario)

    // MÉTODO ATUAL - CAUSA LOGOUT DO ADMIN
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: novoUsuario.email,
      password: novoUsuario.senha,
      options: {
        data: {
          nome: novoUsuario.nome
        }
      }
    })

    if (authError) {
      throw new Error(`Erro ao criar usuário: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado')
    }

    // Criar perfil na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        nome: novoUsuario.nome,
        role: novoUsuario.role,
        cd_representante: novoUsuario.cd_representante,
        ativo: true
      })

    if (profileError) {
      throw new Error(`Erro ao criar perfil: ${profileError.message}`)
    }

    alert(
      'Usuário criado com sucesso!\n\n' +
      '⚠️ VOCÊ FOI DESLOGADO. Faça login novamente com sua conta admin.\n\n' +
      `Email criado: ${novoUsuario.email}\n` +
      `Senha: ${novoUsuario.senha}`
    )

    // Limpar formulário
    setNovoUsuario({
      nome: '',
      email: '',
      role: 'consultor_vendas',
      senha: ''
    })
    setShowModalNovo(false)

  } catch (err) {
    console.error('Erro ao criar usuário:', err)
    alert(err instanceof Error ? err.message : 'Erro ao criar usuário')
  } finally {
    setSalvando(false)
  }
}

  // Ativar/Desativar usuário
  const toggleUsuarioStatus = async (usuarioId: string, novoStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: novoStatus })
        .eq('id', usuarioId)

      if (error) {
        throw new Error(`Erro ao atualizar status: ${error.message}`)
      }

      // Atualizar estado local
      setUsuarios(prev => 
        prev.map(u => 
          u.id === usuarioId 
            ? { ...u, ativo: novoStatus }
            : u
        )
      )

      alert(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`)

    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  // Editar usuário
  const editarUsuario = async () => {
    if (!usuarioEdicao) return

    try {
      setSalvando(true)

      // Validações básicas
      if (!usuarioEdicao.nome) {
        alert('O nome é obrigatório')
        return
      }

      if (usuarioEdicao.role === 'consultor_vendas' && !usuarioEdicao.cd_representante) {
        alert('Selecione um representante para vendedores')
        return
      }

      // Atualizar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome: usuarioEdicao.nome,
          role: usuarioEdicao.role,
          cd_representante: usuarioEdicao.cd_representante,
          ativo: usuarioEdicao.ativo
        })
        .eq('id', usuarioEdicao.id)

      if (profileError) {
        throw new Error(`Erro ao atualizar perfil: ${profileError.message}`)
      }

      // Recarregar dados
      await carregarDados()

      // Fechar modal
      setShowModalEdicao(false)
      setUsuarioEdicao(null)

      alert('Usuário atualizado com sucesso!')

    } catch (err) {
      console.error('Erro ao editar usuário:', err)
      alert(err instanceof Error ? err.message : 'Erro ao editar usuário')
    } finally {
      setSalvando(false)
    }
  }

  // Renderização de loading
  if (loading) {
    return (
      <RoleGuard requireAdmin>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="bg-gray-200 dark:bg-gray-700 h-8 w-1/3 rounded"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-xl"></div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard requireAdmin>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Users className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                Gestão de Usuários
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Gerencie usuários do sistema e suas permissões
              </p>
            </div>
            <button
              onClick={() => setShowModalNovo(true)}
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">Total de Usuários</p>
                <p className="text-2xl font-bold text-blue-800">{usuarios.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-green-600 dark:text-green-400 font-medium text-sm">Usuários Ativos</p>
                <p className="text-2xl font-bold text-green-800">
                  {usuarios.filter(u => u.ativo).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-purple-600 dark:text-purple-400 font-medium text-sm">Administradores</p>
                <p className="text-2xl font-bold text-purple-800">
                  {usuarios.filter(u => u.role === 'admin_financeiro').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-orange-600 dark:text-orange-400 font-medium text-sm">Vendedores</p>
                <p className="text-2xl font-bold text-orange-800">
                  {usuarios.filter(u => u.role === 'consultor_vendas').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={carregarDados}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Role/Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Representante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${ usuario.role === 'admin_financeiro' ? 'bg-red-500' : 'bg-blue-500' }`}>
                          {usuario.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {usuario.nome}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {usuario.email || 'Email não disponível'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ usuario.role === 'admin_financeiro' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800' }`}>
                        {usuario.role === 'admin_financeiro' ? 'Admin' : 'Vendedor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {usuario.representante ? (
                        <div>
                          <div className="font-medium">{usuario.representante.nome}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Cód: {usuario.representante.codigo} • {usuario.representante.totalVendas} vendas
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setUsuarioEdicao(usuario)
                          setShowModalEdicao(true)
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => toggleUsuarioStatus(usuario.id, !usuario.ativo)}
                        className={`transition-colors ${ usuario.ativo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900' }`}
                      >
                        {usuario.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-600 dark:text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Novo Usuário */}
        {showModalNovo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Criar Novo Usuário</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={novoUsuario.nome}
                    onChange={(e) => setNovoUsuario(prev => ({...prev, nome: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario(prev => ({...prev, email: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="joao.silva@almeidacamargo.com.br"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={novoUsuario.senha}
                    onChange={(e) => setNovoUsuario(prev => ({...prev, senha: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Tipo de Usuário *
                  </label>
                  <select
                    value={novoUsuario.role}
                    onChange={(e) => setNovoUsuario(prev => ({
                      ...prev, 
                      role: e.target.value as 'admin_financeiro' | 'consultor_vendas',
                      cd_representante: e.target.value === 'admin_financeiro' ? undefined : prev.cd_representante
                    }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="consultor_vendas">Consultor de Vendas</option>
                    <option value="admin_financeiro">Admin Financeiro</option>
                  </select>
                </div>

                {novoUsuario.role === 'consultor_vendas' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Representante *
                    </label>
                    <select
                      value={novoUsuario.cd_representante || ''}
                      onChange={(e) => setNovoUsuario(prev => ({
                        ...prev, 
                        cd_representante: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um representante...</option>
                      {representantes.map((repr) => (
                        <option key={repr.codigo} value={repr.codigo}>
                          {repr.nome} (Cód: {repr.codigo}) - {repr.totalVendas} vendas
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModalNovo(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={criarUsuario}
                  disabled={salvando}
                  className="px-6 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Edição de Usuário */}
        {showModalEdicao && usuarioEdicao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Usuário</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{usuarioEdicao.email}</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={usuarioEdicao.nome}
                    onChange={(e) => setUsuarioEdicao(prev => prev ? {...prev, nome: e.target.value} : null)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={usuarioEdicao.email || 'Email não disponível'}
                    disabled
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    title="O email não pode ser alterado"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    ⚠️ O email não pode ser alterado por limitações do Supabase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Tipo de Usuário *
                  </label>
                  <select
                    value={usuarioEdicao.role}
                    onChange={(e) => setUsuarioEdicao(prev => prev ? {
                      ...prev,
                      role: e.target.value as 'admin_financeiro' | 'consultor_vendas',
                      cd_representante: e.target.value === 'admin_financeiro' ? undefined : prev.cd_representante
                    } : null)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="consultor_vendas">Consultor de Vendas</option>
                    <option value="admin_financeiro">Admin Financeiro</option>
                  </select>
                </div>

                {usuarioEdicao.role === 'consultor_vendas' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Representante *
                    </label>
                    <select
                      value={usuarioEdicao.cd_representante || ''}
                      onChange={(e) => setUsuarioEdicao(prev => prev ? {
                        ...prev,
                        cd_representante: e.target.value ? Number(e.target.value) : undefined
                      } : null)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um representante...</option>
                      {representantes.map((repr) => (
                        <option key={repr.codigo} value={repr.codigo}>
                          {repr.nome} (Cód: {repr.codigo}) - {repr.totalVendas} vendas
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usuarioEdicao.ativo}
                      onChange={(e) => setUsuarioEdicao(prev => prev ? {...prev, ativo: e.target.checked} : null)}
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Usuário ativo
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 ml-8">
                    Usuários inativos não conseguem fazer login no sistema
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModalEdicao(false)
                    setUsuarioEdicao(null)
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={editarUsuario}
                  disabled={salvando}
                  className="px-6 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 max-w-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Erro</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

export default GestaoUsuarios