// Componente para adicionar no canto superior direito da ClientesPage.tsx

import { useState, useEffect } from 'react'
import { AlertTriangle, Zap, Eye, RefreshCw } from 'lucide-react'
import { detectarDuplicatas, gerarRelatorio, type GrupoDuplicata } from '../utils/duplicatas'
import { useNavigate } from 'react-router-dom'

interface BotaoDuplicatasProps {
  user: {
    role: 'admin_financeiro' | 'consultor_vendas'
    nome: string
  }
}

export default function BotaoDuplicatas({ user }: BotaoDuplicatasProps) {
  const [, setGrupos] = useState<GrupoDuplicata[]>([])
  const [loading, setLoading] = useState(false)
  const [relatorio, setRelatorio] = useState<{
    totalGrupos: number
    totalDuplicatas: number
    porCriterio: Record<string, number>
    alta_confianca: number
    media_confianca: number
    baixa_confianca: number
  } | null>(null)

  const navigate = useNavigate()

  // Só mostra para admin
  if (user.role !== 'admin_financeiro') {
    return null
  }

  // Carregar duplicatas ao montar o componente
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    carregarDuplicatas()
  }, [])

  const carregarDuplicatas = async () => {
    setLoading(true)
    try {
      const gruposDetectados = await detectarDuplicatas()
      setGrupos(gruposDetectados)
      
      // Gerar relatório personalizado com categorias
      const relatorioBase = gerarRelatorio(gruposDetectados)
      
      // Contar por níveis de confiança
      const alta_confianca = gruposDetectados.filter(g => g.confianca >= 85).length
      const media_confianca = gruposDetectados.filter(g => g.confianca >= 70 && g.confianca < 85).length
      const baixa_confianca = gruposDetectados.filter(g => g.confianca < 70).length

      setRelatorio({
        ...relatorioBase,
        alta_confianca,
        media_confianca,
        baixa_confianca
      })

    } catch (error) {
      console.error('Erro ao carregar duplicatas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Navegar para página de duplicatas
  const irParaDuplicatas = () => {
    navigate('/admin/duplicatas')
  }

  // Se não há duplicatas, não mostra nada
  if (!loading && (!relatorio || relatorio.totalGrupos === 0)) {
    return null
  }

  // Determinar estado do botão baseado na confiança
  const temAltaConfianca = relatorio && relatorio.alta_confianca > 0
  const temMediaConfianca = relatorio && relatorio.media_confianca > 0

  return (
    <div className="relative">
      {loading ? (
        // Estado de carregamento
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-600">Verificando duplicatas...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Botão principal - Alta confiança (85%+) */}
          {temAltaConfianca && (
            <button
              onClick={irParaDuplicatas}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <Zap className="h-4 w-4" />
              <span className="text-sm">
                {relatorio.alta_confianca} duplicatas para mesclar
              </span>
              {relatorio.alta_confianca > 5 && (
                <div className="bg-red-400 text-red-50 px-2 py-0.5 rounded-full text-xs font-bold">
                  Urgente
                </div>
              )}
            </button>
          )}

          {/* Alerta sutil - Média confiança (70-84%) */}
          {temMediaConfianca && !temAltaConfianca && (
            <button
              onClick={irParaDuplicatas}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg border border-yellow-300 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {relatorio.media_confianca} possíveis duplicatas
              </span>
            </button>
          )}

          {/* Informação discreta - Todas as outras */}
          {!temAltaConfianca && !temMediaConfianca && relatorio && relatorio.totalGrupos > 0 && (
            <button
              onClick={irParaDuplicatas}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-sm transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Ver análise de duplicatas</span>
            </button>
          )}

          {/* Tooltip com detalhes */}
          {relatorio && (
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
                <h4 className="font-semibold text-gray-900 mb-2">Análise de Duplicatas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total detectadas:</span>
                    <span className="font-medium">{relatorio.totalGrupos}</span>
                  </div>
                  
                  {relatorio.alta_confianca > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">Alta confiança (85%+):</span>
                      <span className="font-medium text-red-600">{relatorio.alta_confianca}</span>
                    </div>
                  )}
                  
                  {relatorio.media_confianca > 0 && (
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Média confiança (70-84%):</span>
                      <span className="font-medium text-yellow-600">{relatorio.media_confianca}</span>
                    </div>
                  )}
                  
                  {relatorio.baixa_confianca > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Baixa confiança (&lt;70%):</span>
                      <span className="font-medium text-gray-500">{relatorio.baixa_confianca}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Clique para ir à página de administração de duplicatas
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

