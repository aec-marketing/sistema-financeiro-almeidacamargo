import { useState, useEffect } from 'react'
import { supabase, type UserProfile } from '../../lib/supabase'
import { calcularTotalVenda } from '../../utils/calcular-total'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell} from 'recharts'
  
import { 
  TrendingUp, DollarSign, ShoppingCart, Users, Calendar, 
  MapPin, Package, AlertCircle 
} from 'lucide-react'

interface DashboardProps {
  user: UserProfile
}

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
  cdCli: number
  Quantidade: string
  'Preço Unitário': string
}

interface FaturamentoMensal {
  mes: string
  faturamento: number
  vendas: number
  crescimento?: number
}

interface TopProduto {
  produto: string
  quantidade: number
  faturamento: number
  percentual: number
}

interface VendaPorCidade {
  cidade: string
  vendas: number
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

export default function DashboardWithCharts({ user }: DashboardProps) {
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
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([])
  const [vendasPorCidade, setVendasPorCidade] = useState<VendaPorCidade[]>([])
  const [metricas, setMetricas] = useState<MetricasPerformance>({
    vendasHoje: 0,
    vendasSemana: 0,
    vendasMes: 0,
    metaMensal: 100,
    percentualMeta: 0
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Função para formatar moeda
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Função para obter nome do mês
  const obterNomeMes = (data: string): string => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    const [, mes] = data.split('/')
    return meses[parseInt(mes) - 1] || 'N/A'
  }

  // Função para calcular crescimento percentual
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


  // Tooltip customizado para gráficos
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
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

  // Interface para payload do PieChart
  interface PiePayload {
    payload: TopProduto
  }

  // Tooltip específico para PieChart
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: PiePayload[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.produto}</p>
          <p className="text-sm text-blue-600">
            Faturamento: {formatarMoeda(data.faturamento)}
          </p>
          <p className="text-sm text-green-600">
            Participação: {data.percentual.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  // Carregar dados do dashboard
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true)
        setError(null)

        // Query otimizada para vendas
        let queryVendas = supabase
          .from('vendas')
          .select(`
            id,
            "Número da Nota Fiscal",
            "Data de Emissao da NF",
            total,
            "Descr. Produto",
            NomeCli,
            CIDADE,
            cdCli,
            cdRepr,
            Quantidade,
            "Preço Unitário"
          `)
          .order('id', { ascending: false })
          .limit(3000) // Aumentar para ter mais dados para análise

        // Filtro para consultor de vendas
        if (user.role === 'consultor_vendas' && user.cd_representante) {
          queryVendas = queryVendas.eq('cdRepr', user.cd_representante)
        }

        const { data: vendas, error: vendasError } = await queryVendas

        if (vendasError) {
          throw vendasError
        }

        if (vendas && vendas.length > 0) {
          // ===== CÁLCULO DE KPIs PRINCIPAIS =====
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
            const [, mes, ano] = data.split('/')
            return mes === mesAtual && ano === String(anoAtual)
          })

          const faturamentoMesAtual = vendasMesAtual.reduce((acc, venda) => {
            return acc + calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }, 0)

          // Calcular crescimento mensal (comparar com mês anterior)
          const mesAnterior = hoje.getMonth() === 0 ? '12' : String(hoje.getMonth()).padStart(2, '0')
          const anoAnterior = mesAnterior === '12' ? anoAtual - 1 : anoAtual

          const vendasMesAnterior = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false
            const [, mes, ano] = data.split('/')
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

          // ===== VENDAS RECENTES =====
          const recentes = vendas
            .slice(0, 8) // Últimas 8 vendas
            .map(venda => ({
              ...venda,
              totalCalculado: calcularTotalVenda(
                venda.total,
                venda.Quantidade,
                venda['Preço Unitário']
              )
            }))

          setVendasRecentes(recentes)

          // ===== FATURAMENTO MENSAL (últimos 6 meses) =====
          const faturamentoPorMes = new Map<string, { faturamento: number, vendas: number }>()
          
          vendas.forEach(venda => {
            const data = venda['Data de Emissao da NF']
            if (data) {
              const [, mes, ano] = data.split('/')
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
            .slice(-6) // Últimos 6 meses

          setFaturamentoMensal(faturamentoMensalArray)

          // ===== TOP PRODUTOS =====
          const produtosMap = new Map<string, { quantidade: number, faturamento: number }>()
          
          vendas.forEach(venda => {
            const produto = (venda['Descr. Produto'] || 'Produto não identificado')
              .substring(0, 40) // Limitar tamanho para visualização
            const quantidade = parseFloat(venda.Quantidade?.replace(',', '.') || '0')
            const faturamento = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
            
            if (produtosMap.has(produto)) {
              const atual = produtosMap.get(produto)!
              produtosMap.set(produto, {
                quantidade: atual.quantidade + quantidade,
                faturamento: atual.faturamento + faturamento
              })
            } else {
              produtosMap.set(produto, { quantidade, faturamento })
            }
          })

          const faturamentoTotalProdutos = Array.from(produtosMap.values())
            .reduce((acc, p) => acc + p.faturamento, 0)

          const topProdutosList = Array.from(produtosMap.entries())
            .map(([produto, dados]) => ({
              produto,
              quantidade: dados.quantidade,
              faturamento: dados.faturamento,
              percentual: faturamentoTotalProdutos > 0 
                ? (dados.faturamento / faturamentoTotalProdutos) * 100 
                : 0
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
            .slice(0, 6) // Top 6 produtos

          setTopProdutos(topProdutosList)

          // ===== VENDAS POR CIDADE =====
          const cidadesMap = new Map<string, { vendas: number, faturamento: number }>()
          
          vendas.forEach(venda => {
            const cidade = venda.CIDADE || 'Não identificada'
            const faturamento = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
            
            if (cidadesMap.has(cidade)) {
              const atual = cidadesMap.get(cidade)!
              cidadesMap.set(cidade, {
                vendas: atual.vendas + 1,
                faturamento: atual.faturamento + faturamento
              })
            } else {
              cidadesMap.set(cidade, { vendas: 1, faturamento })
            }
          })

          const faturamentoTotalCidades = Array.from(cidadesMap.values())
            .reduce((acc, c) => acc + c.faturamento, 0)

          const cidadesArray = Array.from(cidadesMap.entries())
            .map(([cidade, dados]) => ({
              cidade,
              vendas: dados.vendas,
              faturamento: dados.faturamento,
              percentual: faturamentoTotalCidades > 0 
                ? (dados.faturamento / faturamentoTotalCidades) * 100 
                : 0
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
            .slice(0, 8) // Top 8 cidades

          setVendasPorCidade(cidadesArray)
          console.log('Vendas por cidade:', cidadesArray)


          // ===== MÉTRICAS DE PERFORMANCE =====
          const hoje_str = hoje.toLocaleDateString('pt-BR')
          const vendasHoje = vendas.filter(v => v['Data de Emissao da NF'] === hoje_str).length

          // Vendas da semana (últimos 7 dias)
          const semanaAtras = new Date(hoje.getTime() - (7 * 24 * 60 * 60 * 1000))
          const vendasSemana = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false
            const [dia, mes, ano] = data.split('/')
            const dataVenda = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
            return dataVenda >= semanaAtras
          }).length

          const vendasMes = vendasMesAtual.length
          const metaMensal = 150 // Meta fictícia - pode vir do banco depois
          const percentualMeta = metaMensal > 0 ? (vendasMes / metaMensal) * 100 : 0

          setMetricas({
            vendasHoje,
            vendasSemana,
            vendasMes,
            metaMensal,
            percentualMeta
          })

        } else {
          // Dados vazios
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
  }, [user])

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-80 rounded-xl"></div>
          <div className="bg-gray-200 h-80 rounded-xl"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-400 mr-3" />
          <h3 className="text-lg font-medium text-red-800">Erro ao carregar dashboard</h3>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
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
    <div className="space-y-8">
      {/* Header com informações do usuário */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg text-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
            <p className="text-blue-100 mt-2">
              {user.role === 'admin_financeiro' 
                ? 'Visão geral de toda a operação comercial'
                : `Suas vendas - ${user.nome}`
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Última atualização</p>
            <p className="text-white font-medium">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Vendas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-3xl font-bold text-gray-900">{kpis.totalVendas.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-blue-600 mt-1">↗ Últimos registros</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Faturamento Total */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
              <p className="text-3xl font-bold text-gray-900">{formatarMoeda(kpis.faturamentoTotal)}</p>
              <p className="text-xs text-green-600 mt-1">
                {kpis.crescimentoMensal >= 0 ? '↗' : '↘'} 
                {Math.abs(kpis.crescimentoMensal).toFixed(1)}% vs mês anterior
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-3xl font-bold text-gray-900">{formatarMoeda(kpis.ticketMedio)}</p>
              <p className="text-xs text-purple-600 mt-1">📊 Valor médio por venda</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Clientes Únicos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
              <p className="text-3xl font-bold text-gray-900">{kpis.clientesUnicos.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-orange-600 mt-1">👥 Base de clientes ativa</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Performance */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance do Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{metricas.vendasHoje}</p>
            <p className="text-sm text-gray-600">Vendas Hoje</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{metricas.vendasSemana}</p>
            <p className="text-sm text-gray-600">Últimos 7 dias</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{metricas.vendasMes}</p>
            <p className="text-sm text-gray-600">Vendas este mês</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{metricas.percentualMeta.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Meta mensal</p>
          </div>
        </div>
      </div>

      {/* Gráficos Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Faturamento Mensal */}
        {/* Faturamento Mensal */}
<div className="bg-white rounded-xl shadow-sm p-6">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-lg font-semibold text-gray-900">Evolução Mensal</h3>
    <Calendar className="h-5 w-5 text-gray-400" />
  </div>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={faturamentoMensal}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="mes" />
      <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}K`} />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      <Bar dataKey="faturamento" fill="#3B82F6" name="Faturamento" />
      <Bar dataKey="vendas" fill="#10B981" name="Qtd Vendas" />
    </BarChart>
  </ResponsiveContainer>
</div>

        {/* Top Produtos */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Produtos</h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={topProdutos}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="faturamento"
                nameKey="produto"
                labelLine={false}
                label={false}
              >
                {topProdutos.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legenda customizada */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {topProdutos.map((produto, index) => (
              <div key={index} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: CORES_GRAFICOS[index % CORES_GRAFICOS.length] }}
                ></div>
                <span className="truncate" title={produto.produto}>
                  {produto.produto} ({produto.percentual.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
          
        </div>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Vendas por Cidade */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vendas por Região</h3>
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={vendasPorCidade} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}K`} />
              <YAxis dataKey="cidade" type="category" width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="faturamento" fill="#F59E0B" name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas Recentes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas Recentes</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {vendasRecentes.map((venda) => (
              <div key={venda.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {venda.NomeCli}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {venda['Descr. Produto']}
                    </p>
                    <p className="text-xs text-gray-400">
                      {venda['Data de Emissao da NF']} • NF: {venda['Número da Nota Fiscal']}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {formatarMoeda(calcularTotalVenda(
                        venda.total,
                        venda.Quantidade,
                        venda['Preço Unitário']
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo detalhado do mês atual */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Resumo do Mês Atual</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Faturamento Mês</p>
                <p className="text-2xl font-bold">{formatarMoeda(kpis.faturamentoMesAtual)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-blue-400">
              <p className="text-xs text-blue-100">
                {kpis.crescimentoMensal >= 0 ? '↗ Crescimento' : '↘ Queda'} de{' '}
                <span className="font-semibold">{Math.abs(kpis.crescimentoMensal).toFixed(1)}%</span>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Vendas do Mês</p>
                <p className="text-2xl font-bold">{metricas.vendasMes}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-green-400">
              <p className="text-xs text-green-100">
                Meta: {metricas.metaMensal} vendas
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">% da Meta</p>
                <p className="text-2xl font-bold">{metricas.percentualMeta.toFixed(1)}%</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-purple-400">
              <div className="w-full bg-purple-400 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${Math.min(metricas.percentualMeta, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights e Alertas */}
      {user.role === 'admin_financeiro' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights e Alertas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Melhor cliente */}
            {vendasPorCidade.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Melhor Região</p>
                    <p className="text-xs text-green-700">
                      {vendasPorCidade[0]?.cidade} lidera com {formatarMoeda(vendasPorCidade[0]?.faturamento || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Produto em destaque */}
            {topProdutos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Produto Destaque</p>
                    <p className="text-xs text-blue-700">
                      {topProdutos[0]?.percentual.toFixed(1)}% do faturamento
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Meta mensal */}
            <div className={`border rounded-lg p-4 ${
              metricas.percentualMeta >= 80 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start">
                <div className={`p-2 rounded-lg ${
                  metricas.percentualMeta >= 80 
                    ? 'bg-green-100' 
                    : 'bg-yellow-100'
                }`}>
                  <Calendar className={`h-4 w-4 ${
                    metricas.percentualMeta >= 80 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`} />
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    metricas.percentualMeta >= 80 
                      ? 'text-green-900' 
                      : 'text-yellow-900'
                  }`}>
                    {metricas.percentualMeta >= 80 ? 'Meta no Caminho' : 'Atenção: Meta'}
                  </p>
                  <p className={`text-xs ${
                    metricas.percentualMeta >= 80 
                      ? 'text-green-700' 
                      : 'text-yellow-700'
                  }`}>
                    {metricas.percentualMeta >= 80 
                      ? 'Excelente performance!' 
                      : 'Precisamos acelerar'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer com informações adicionais */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <span>Sistema Almeida&Camargo</span>
            <span>•</span>
            <span>Dados atualizados em tempo real</span>
            <span>•</span>
            <span>
              {user.role === 'admin_financeiro' 
                ? 'Acesso total aos dados' 
                : 'Dados filtrados por representante'
              }
            </span>
          </div>
          <div className="text-xs">
            Última sincronização: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  )
}