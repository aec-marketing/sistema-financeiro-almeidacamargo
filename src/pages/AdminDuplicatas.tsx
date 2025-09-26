import { useState, useEffect } from 'react'
import {
  detectarDuplicatas,
  analisarGrupo,
  mesclarDuplicatas,
  gerarRelatorio,
  type GrupoDuplicata} from '../utils/duplicatas'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Zap,
  Eye,
  RefreshCw,
  Shield,
  Info
} from 'lucide-react'
import { useUserAccess } from '../hooks/useUserAccess'

export default function AdminDuplicatas() {
  const { user } = useUserAccess()
  const [grupos, setGrupos] = useState<GrupoDuplicata[]>([])
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [relatorio, setRelatorio] = useState<{
  totalGrupos: number
  totalDuplicatas: number
  porCriterio: Record<string, number>
  alta_confianca: number
} | null>(null) 
 const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoDuplicata | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin_financeiro') {
      carregarDuplicatas()
    }
  }, [user?.role])


  // Verificar se é admin
  if (user?.role !== 'admin_financeiro') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Esta funcionalidade é restrita a administradores.</p>
        </div>
      </div>
    )
  }

  // Carregar duplicatas
  const carregarDuplicatas = async () => {
    setLoading(true)
    try {
      const gruposDetectados = await detectarDuplicatas()
      setGrupos(gruposDetectados)
      setRelatorio(gerarRelatorio(gruposDetectados))

      // Analisar grupos de alta confiança para preview

    } catch (error) {
      console.error('Erro ao carregar duplicatas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mesclagem automática em lote
  const mesclagemAutomatica = async () => {
    if (!confirm(`Confirma a mesclagem automática de ${relatorio?.alta_confianca} duplicatas de alta confiança?`)) {
      return
    }

    setProcessando(true)
    let sucessos = 0
    let erros = 0

    try {
      const gruposAltaConfianca = grupos.filter(g => g.confianca >= 90)
      
      for (const grupo of gruposAltaConfianca) {
        try {
          const sugestao = await analisarGrupo(grupo)
          const sucesso = await mesclarDuplicatas(sugestao)
          
          if (sucesso) {
            sucessos++
          } else {
            erros++
          }
        } catch (error) {
          console.error('Erro ao mesclar grupo:', error)
          erros++
        }
      }

      alert(`Mesclagem concluída!\n✅ ${sucessos} sucessos\n❌ ${erros} erros`)
      
      // Recarregar dados após mesclagem
      await carregarDuplicatas()
      
    } catch (error) {
      console.error('Erro na mesclagem automática:', error)
    } finally {
      setProcessando(false)
    }
  }

  // Mesclar grupo individual
  const mesclarGrupoIndividual = async (grupo: GrupoDuplicata) => {
    try {
      const sugestao = await analisarGrupo(grupo)
      const sucesso = await mesclarDuplicatas(sugestao)
      
      if (sucesso) {
        alert('Grupo mesclado com sucesso!')
        setGrupos(prev => prev.filter(g => g.chave !== grupo.chave))
        setModalAberto(false)
      } else {
        alert('Erro ao mesclar grupo')
      }
    } catch (error) {
      console.error('Erro ao mesclar grupo:', error)
      alert('Erro ao mesclar grupo')
    }
  }

  // Modal de detalhes do grupo
  const ModalDetalhes = () => {
    if (!modalAberto || !grupoSelecionado) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold">Detalhes do Grupo de Duplicatas</h2>
              <p className="text-sm text-gray-600">
                Confiança: {grupoSelecionado.confianca}% | Critério: {grupoSelecionado.criterio}
              </p>
            </div>
            <button
              onClick={() => setModalAberto(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              {grupoSelecionado.clientes.map((cliente, index) => (
                <div key={cliente.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Cliente {index + 1}</h3>
                    <span className="text-sm text-gray-500">ID: {cliente.id}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Nome:</span> {cliente.Nome}
                    </div>
                    <div>
                      <span className="font-medium">CNPJ:</span> {cliente.CNPJ}
                    </div>
                    <div>
                      <span className="font-medium">Cidade:</span> {cliente.Município}
                    </div>
                    <div>
                      <span className="font-medium">Estado:</span> {cliente['Sigla Estado']}
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span> {cliente.Telefone}
                    </div>
                    <div>
                      <span className="font-medium">Endereço:</span> {cliente.endereco}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => mesclarGrupoIndividual(grupoSelecionado)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Mesclar Grupo
              </button>
              <button
                onClick={() => setModalAberto(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciador de Duplicatas</h1>
        <p className="text-gray-600 mt-1">Detecte e mescle clientes duplicados automaticamente</p>
      </div>

      {/* Cards de Estatísticas */}
      {relatorio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Grupos Detectados</p>
                <p className="text-2xl font-bold text-blue-900">{relatorio.totalGrupos}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Total Duplicatas</p>
                <p className="text-2xl font-bold text-red-900">{relatorio.totalDuplicatas}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Alta Confiança</p>
                <p className="text-2xl font-bold text-green-900">{relatorio.alta_confianca}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">% da Base</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {((relatorio.totalDuplicatas / 3285) * 100).toFixed(1)}%
                </p>
              </div>
              <Info className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={carregarDuplicatas}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>

        <button
          onClick={mesclagemAutomatica}
          disabled={processando || !relatorio?.alta_confianca}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {processando ? 'Processando...' : `Mesclagem Automática (${relatorio?.alta_confianca || 0})`}
        </button>
      </div>

      {/* Lista de Grupos */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Grupos de Duplicatas Detectados</h2>
        </div>

        <div className="divide-y">
          {grupos.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma duplicata detectada</p>
            </div>
          ) : (
            grupos.map((grupo, index) => (
              <div key={grupo.chave} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Grupo {index + 1}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        grupo.confianca >= 90 
                          ? 'bg-green-100 text-green-800'
                          : grupo.confianca >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {grupo.confianca}% confiança
                      </span>
                      <span className="text-xs text-gray-500">
                        {grupo.clientes.length} clientes
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Primeiro cliente:</strong> {grupo.clientes[0]?.Nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      Critério: {grupo.criterio} | Chave: {grupo.chave}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setGrupoSelecionado(grupo)
                        setModalAberto(true)
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Eye className="w-4 h-4" />
                      Detalhes
                    </button>
                    
                    <button
                      onClick={() => mesclarGrupoIndividual(grupo)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mesclar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        
      </div>

      <ModalDetalhes />
    </div>
  )
}