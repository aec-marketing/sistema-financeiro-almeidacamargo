// src/components/Dashboard/DashboardAdmin.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useUserAccess } from '../../hooks/useUserAccess'
import { calcularTotalVenda } from '../../utils/calcular-total'
import { formatarDataISO } from '../../utils/formatters'
import { cache, CACHE_KEYS, CACHE_EXPIRATION } from '../../utils/cache'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

import {
  TrendingUp, DollarSign, ShoppingCart, Users, Calendar,
  Package, AlertCircle, Zap, BarChart3, ShoppingBag,
  FileText, AlertTriangle, Settings, Upload
} from 'lucide-react'

// Interfaces para tipagem dos dados
interface KPIs {
  totalVendas: number
  faturamentoTotal: number
  ticketMedio: number
  clientesUnicos: number
  faturamentoMesAtual: number
  crescimentoMensal: number
}

interface VendaRecente {
  id: number
  'Número da Nota Fiscal': string
  'Data de Emissao da NF': string
  total: string
  'Descr. Produto': string
  NomeCli: string
  CIDADE: string
  MARCA: string
  cdCli: number
  cdRepr: number
  Quantidade: string
  'Preço Unitário': string
}

interface FaturamentoMensal {
  mes: string
  faturamento: number
  vendas: number
  crescimento?: number
}

interface TopMarca {
  marca: string
  quantidade: number
  faturamento: number
  percentual: number
}

interface MetricasPerformance {
  vendasHoje: number
  vendasSemana: number
  vendasMes: number
  metaMensal: number
  percentualMeta: number
}

export default function DashboardAdmin() {
  const {
    user,
    loading: authLoading,
    error: authError
  } = useUserAccess()

  // Estados principais
  const [kpis, setKpis] = useState<KPIs>({
    totalVendas: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    clientesUnicos: 0,
    faturamentoMesAtual: 0,
    crescimentoMensal: 0
  })

  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([])
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([])
  const [topMarcas, setTopMarcas] = useState<TopMarca[]>([])
  const [metricas, setMetricas] = useState<MetricasPerformance>({
    vendasHoje: 0,
    vendasSemana: 0,
    vendasMes: 0,
    metaMensal: 100,
    percentualMeta: 0
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Funções utilitárias
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const obterNomeMes = (data: string): string => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]

    let mes: string
    if (data.includes('/')) {
      const partes = data.split('/')
      mes = partes[1] // Formato DD/MM/YYYY
    } else if (data.includes('-')) {
      const partes = data.split('-')
      mes = partes[1] // Formato YYYY-MM-DD
    } else {
      return 'N/A'
    }

    return meses[parseInt(mes) - 1] || 'N/A'
  }

  const calcularCrescimento = (atual: number, anterior: number): number => {
    if (anterior === 0) return atual > 0 ? 100 : 0
    return ((atual - anterior) / anterior) * 100
  }

  // Cores para os gráficos
  const CORES_GRAFICOS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]

  // Interfaces para tooltip
  interface TooltipPayload {
    color: string
    name: string
    value: number
  }

  interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayload[]
    label?: string
  }

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: TooltipPayload, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.includes('Faturamento') || entry.name.includes('Valor') 
                  ? formatarMoeda(entry.value) 
                  : entry.value.toLocaleString('pt-BR')
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Função para carregar dados com paginação (similar ao RelatorioPage)
  async function fetchAllVendas(
    user: { role?: string; cd_representante?: number }
  ): Promise<VendaRecente[]> {
    const BATCH_SIZE = 1000
    let allData: VendaRecente[] = []
    let offset = 0
    let hasMore = true

    setLoadingMessage('Carregando vendas...')

    while (hasMore) {
      let query = supabase
        .from('vendas')
        .select(`
          id,
          "Número da Nota Fiscal",
          "Data de Emissao da NF",
          total,
          "Descr. Produto",
          NomeCli,
          CIDADE,
          MARCA,
          cdCli,
          cdRepr,
          Quantidade,
          "Preço Unitário"
        `)
        .order('id', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1)

      // Filtro por representante se for consultor
      if (user.role === 'consultor_vendas' && user.cd_representante) {
        query = query.eq('cdRepr', user.cd_representante)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) {
        hasMore = false
        break
      }

      allData = [...allData, ...data]
      offset += BATCH_SIZE

      // Atualiza progresso
      const progress = Math.min((allData.length / 25000) * 100, 95)
      setLoadingProgress(progress)
      setLoadingMessage(`Carregando vendas... ${allData.length.toLocaleString('pt-BR')} registros`)

      if (data.length < BATCH_SIZE) {
        hasMore = false
      }
    }

    setLoadingProgress(100)
    setLoadingMessage(`${allData.length.toLocaleString('pt-BR')} vendas carregadas`)

    return allData
  }

  // Carregar dados do dashboard
  useEffect(() => {
    // Guard clause - aguarda autenticação completa
    if (!user?.id) {
      console.log('⏳ Aguardando autenticação...')
      return
    }

    const carregarDados = async () => {
      try {
        setLoading(true)
        setError(null)
        setLoadingProgress(0)

        const userId = user.id

        console.log('🔄 Iniciando carregamento do dashboard...')

        // Carregar TODAS as vendas (sem limit)
        const vendas = await fetchAllVendas(user)

        console.log(`✅ ${vendas.length.toLocaleString('pt-BR')} vendas carregadas`)

        if (vendas && vendas.length > 0) {
          // Calcular KPIs principais
          const totalVendas = vendas.length
          const faturamentoTotal = vendas.reduce((acc, venda) => {
            return acc + calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }, 0)
          const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0
          const clientesUnicos = new Set(vendas.map(v => v.cdCli)).size

          // Calcular faturamento do mês atual
          const hoje = new Date()
          const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0')
          const anoAtual = hoje.getFullYear()
          
          const vendasMesAtual = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false

            let mes: string, ano: string
            if (data.includes('/')) {
              const partes = data.split('/')
              mes = partes[1]
              ano = partes[2]
            } else if (data.includes('-')) {
              const partes = data.split('-')
              mes = partes[1]
              ano = partes[0]
            } else {
              return false
            }

            return mes === mesAtual && ano === String(anoAtual)
          })

          const faturamentoMesAtual = vendasMesAtual.reduce((acc, venda) => {
            return acc + calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }, 0)

          // Calcular crescimento mensal
          const mesAnterior = hoje.getMonth() === 0 ? '12' : String(hoje.getMonth()).padStart(2, '0')
          const anoAnterior = mesAnterior === '12' ? anoAtual - 1 : anoAtual

          const vendasMesAnterior = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false

            let mes: string, ano: string
            if (data.includes('/')) {
              const partes = data.split('/')
              mes = partes[1]
              ano = partes[2]
            } else if (data.includes('-')) {
              const partes = data.split('-')
              mes = partes[1]
              ano = partes[0]
            } else {
              return false
            }

            return mes === mesAnterior && ano === String(anoAnterior)
          })

          const faturamentoMesAnterior = vendasMesAnterior.reduce((acc, venda) => {
            return acc + calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }, 0)

          const crescimentoMensal = calcularCrescimento(faturamentoMesAtual, faturamentoMesAnterior)

          setKpis({
            totalVendas,
            faturamentoTotal,
            ticketMedio,
            clientesUnicos,
            faturamentoMesAtual,
            crescimentoMensal
          })

          // Vendas recentes
          const recentes = vendas.slice(0, 8).map(venda => ({
            ...venda,
            totalCalculado: calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }))

          setVendasRecentes(recentes)

          // Faturamento mensal
          const faturamentoPorMes = new Map<string, { faturamento: number, vendas: number }>()
          
          vendas.forEach(venda => {
            const data = venda['Data de Emissao da NF']
            if (data) {
              let mes: string, ano: string

              if (data.includes('/')) {
                const partes = data.split('/')
                mes = partes[1]
                ano = partes[2]
              } else if (data.includes('-')) {
                const partes = data.split('-')
                mes = partes[1]
                ano = partes[0]
              } else {
                return
              }

              if (mes && ano) {
                const mesAno = `${mes}/${ano}`
                const faturamento = calcularTotalVenda(
                  venda.total,
                  venda.Quantidade,
                  venda['Preço Unitário']
                )

                if (faturamentoPorMes.has(mesAno)) {
                  const atual = faturamentoPorMes.get(mesAno)!
                  faturamentoPorMes.set(mesAno, {
                    faturamento: atual.faturamento + faturamento,
                    vendas: atual.vendas + 1
                  })
                } else {
                  faturamentoPorMes.set(mesAno, { faturamento, vendas: 1 })
                }
              }
            }
          })

          const faturamentoMensalArray = Array.from(faturamentoPorMes.entries())
            .map(([mesAno, dados]) => ({
              mes: obterNomeMes(`01/${mesAno}`) + '/' + mesAno.split('/')[1].slice(2),
              faturamento: dados.faturamento,
              vendas: dados.vendas
            }))
            .sort((a, b) => {
              const [mesA, anoA] = a.mes.split('/')
              const [mesB, anoB] = b.mes.split('/')
              return (anoA + mesA).localeCompare(anoB + mesB)
            })
            .slice(-6)

          setFaturamentoMensal(faturamentoMensalArray)

          // Top marcas
          const marcasMap = new Map<string, { quantidade: number, faturamento: number }>()

          vendas.forEach(venda => {
            const marca = venda.MARCA || 'Marca não identificada'
            const quantidade = parseFloat(venda.Quantidade?.replace(',', '.') || '0')
            const faturamento = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )

            if (marcasMap.has(marca)) {
              const atual = marcasMap.get(marca)!
              marcasMap.set(marca, {
                quantidade: atual.quantidade + quantidade,
                faturamento: atual.faturamento + faturamento
              })
            } else {
              marcasMap.set(marca, { quantidade, faturamento })
            }
          })

          const faturamentoTotalMarcas = Array.from(marcasMap.values())
            .reduce((acc, m) => acc + m.faturamento, 0)

          const topMarcasList = Array.from(marcasMap.entries())
            .map(([marca, dados]) => ({
              marca,
              quantidade: dados.quantidade,
              faturamento: dados.faturamento,
              percentual: faturamentoTotalMarcas > 0
                ? (dados.faturamento / faturamentoTotalMarcas) * 100
                : 0
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
            .slice(0, 6)

          setTopMarcas(topMarcasList)

          // Métricas de performance
          const hoje_str = formatarDataISO(hoje)
          const vendasHoje = vendas.filter(v => v['Data de Emissao da NF'] === hoje_str).length

          const semanaAtras = new Date(hoje.getTime() - (7 * 24 * 60 * 60 * 1000))
          const vendasSemana = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false

            // Converter data para ISO se estiver em formato brasileiro
            let dataISO = data
            if (data.includes('/')) {
              const [dia, mes, ano] = data.split('/')
              dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
            }

            const dataVenda = new Date(dataISO)
            return dataVenda >= semanaAtras
          }).length

          const vendasMes = vendasMesAtual.length
          const metaMensal = 150
          const percentualMeta = metaMensal > 0 ? (vendasMes / metaMensal) * 100 : 0

          setMetricas({
            vendasHoje,
            vendasSemana,
            vendasMes,
            metaMensal,
            percentualMeta
          })

        } else {
          console.warn('Nenhuma venda encontrada')
        }

      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
        setError(`Erro ao carregar dados: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Carregando Dashboard
            </h3>

            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
              {loadingMessage || 'Preparando dados...'}
            </p>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {loadingProgress.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (authError || error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-400 mr-3" />
          <h3 className="text-lg font-medium text-red-800">Erro ao carregar dashboard</h3>
        </div>
        <p className="text-red-700 text-sm">{authError || error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Saudação */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Olá, {user?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-blue-100">
              Visão geral da operação comercial
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Última atualização</p>
            <p className="font-medium">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* KPIs Principais - Grid Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Total de Vendas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total de Vendas</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.totalVendas.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Últimos registros</p>
        </div>

        {/* Faturamento Total */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Faturamento Total</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            {formatarMoeda(kpis.faturamentoTotal)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {kpis.crescimentoMensal >= 0 ? '↗' : '↘'}
            {Math.abs(kpis.crescimentoMensal).toFixed(1)}% vs mês anterior
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ticket Médio</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            {formatarMoeda(kpis.ticketMedio)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Valor médio por venda</p>
        </div>

        {/* Clientes Únicos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Clientes Únicos</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.clientesUnicos.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Base de clientes ativa</p>
        </div>

      </div>

      {/* Atalhos Rápidos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          <button
            onClick={() => window.location.href = '/relatorios'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <BarChart3 className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 text-center">
              Novo Relatório
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/clientes'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <Users className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-green-700 dark:group-hover:text-green-300 text-center">
              Ver Clientes
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/vendas'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
          >
            <ShoppingBag className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 text-center">
              Ver Vendas
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/templates'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-500 hover:bg-yellow-50 transition-all group"
          >
            <FileText className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-yellow-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-yellow-700 text-center">
              Templates
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/admin/duplicatas'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
          >
            <AlertTriangle className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-red-700 dark:group-hover:text-red-300 text-center">
              Duplicatas
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/gestao-usuarios'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
          >
            <Settings className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 text-center">
              Usuários
            </span>
          </button>

          <button
            onClick={() => window.location.href = '/importacao'}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-500 hover:bg-cyan-50 transition-all group"
          >
            <Upload className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-cyan-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-cyan-700 text-center">
              Importar CSV
            </span>
          </button>

        </div>
      </div>

      {/* Métricas de Performance do Período */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance do Período</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metricas.vendasHoje}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Vendas Hoje</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{metricas.vendasSemana}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Últimos 7 dias</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metricas.vendasMes}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Vendas este mês</p>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metricas.percentualMeta.toFixed(1)}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Meta mensal</p>
          </div>
        </div>
      </div>

      {/* Gráficos - Grid Responsivo */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Evolução Mensal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Evolução Mensal</h3>
            <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={faturamentoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="faturamento" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Faturamento" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Marcas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 5 Marcas</h3>
            <Package className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={topMarcas.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="faturamento"
                  nameKey="marca"
                >
                  {topMarcas.slice(0, 5).map((_marca, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Legend
                  formatter={(value: string) => {
                    const marca = topMarcas.slice(0, 5).find(m => m.marca === value);
                    if (!marca) return value;
                    return `${value} (${marca.percentual.toFixed(1)}%)`;
                  }}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Vendas Recentes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vendas Recentes</h3>
          <button
            type="button"
            onClick={() => window.location.href = '/vendas'}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            Ver todas →
          </button>
        </div>
        <div className="space-y-3">
          {vendasRecentes.slice(0, 6).map((venda) => (
            <div key={venda.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:bg-blue-900/20 transition-all">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {venda['Descr. Produto']}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {venda.NomeCli} • {venda['Data de Emissao da NF']}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 text-right">
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatarMoeda(calcularTotalVenda(
                    venda.total,
                    venda.Quantidade,
                    venda['Preço Unitário']
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer com Informações */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-300 py-4">
        <p>Sistema Financeiro Almeida&Camargo • Última sincronização: {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}