/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { supabase, type UserProfile } from '../../lib/supabase'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
interface DashboardProps {
  user: UserProfile
}

interface KPIs {
  totalVendas: number
  faturamentoTotal: number
  ticketMedio: number
  clientesUnicos: number
}

interface VendaRecente {
  id: number
  'Número da Nota Fiscal': string
  'Data de Emissao da NF': string
  total: string
  'Descr. Produto': string
  NomeCli: string
  CIDADE: string
}

interface FaturamentoMensal {
  mes: string
  faturamento: number
  vendas: number
}

interface TopProduto {
  produto: string
  quantidade: number
  faturamento: number
}

interface VendasPorCidade {
  cidade: string
  vendas: number
  faturamento: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function Dashboard({ user }: DashboardProps) {
  const [kpis, setKpis] = useState<KPIs>({
    totalVendas: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    clientesUnicos: 0
  })
  
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([])
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([])
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([])
  const [vendasPorCidade, setVendasPorCidade] = useState<VendasPorCidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Função para converter valor brasileiro para número
  const converterValor = (valor: string): number => {
    if (!valor) return 0
    return parseFloat(valor.toString().replace(',', '.')) || 0
  }

  // Função para formatar moeda
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Função para formatar data
  const formatarData = (data: string): string => {
    if (!data) return ''
    try {
      const partes = data.split('/')
      if (partes.length === 3) {
        return `${partes[0]}/${partes[1]}/${partes[2]}`
      }
      return data
    } catch {
      return data
    }
  }

  // Função para obter nome do mês
  const obterNomeMes = (data: string): string => {
    try {
      const partes = data.split('/')
      if (partes.length === 3) {
        const mes = parseInt(partes[1])
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        return meses[mes - 1] || 'N/A'
      }
    } catch {
      return 'N/A'
    }
    return 'N/A'
  }

  // Tooltip customizado para gráficos
  const CustomTooltip = ({ active, payload, label }: { 
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Faturamento') ? formatarMoeda(entry.value) : entry.value}
            </p>
          ))}
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

        // Query para vendas
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
            Quantidade
          `)
          .limit(500) // Aumentar limite para ter mais dados para gráficos

        // Se for consultor, filtrar apenas suas vendas
        if (user.role === 'consultor_vendas' && user.cd_representante) {
          queryVendas = queryVendas.eq('cdRepr', user.cd_representante)
        }

        const { data: vendas, error: vendasError } = await queryVendas

        if (vendasError) {
          throw vendasError
        }

        if (vendas) {
          // Calcular KPIs
          const totalVendas = vendas.length
          const faturamentoTotal = vendas.reduce((acc, venda) => {
            return acc + converterValor(venda.total || '0')
          }, 0)
          const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0
          const clientesUnicos = new Set(vendas.map(v => v.cdCli)).size

          setKpis({
            totalVendas,
            faturamentoTotal,
            ticketMedio,
            clientesUnicos
          })

          // Vendas recentes
          const recentes = vendas
            .sort((a, b) => b.id - a.id)
            .slice(0, 6) // Reduzir para 6 para dar espaço aos gráficos

          setVendasRecentes(recentes)

          // Faturamento mensal
          const faturamentoPorMes = new Map<string, { faturamento: number, vendas: number }>()
          
          vendas.forEach(venda => {
            const data = venda['Data de Emissao da NF']
            if (data) {
              const partes = data.split('/')
              if (partes.length === 3) {
                const mesAno = `${partes[1]}/${partes[2]}`
                const faturamento = converterValor(venda.total || '0')
                
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
              mes: obterNomeMes(`01/${mesAno}`),
              faturamento: dados.faturamento,
              vendas: dados.vendas
            }))
            .sort((a, b) => a.mes.localeCompare(b.mes))
            .slice(-6) // Últimos 6 meses

          setFaturamentoMensal(faturamentoMensalArray)

          // Top produtos
          const produtosMap = new Map<string, { quantidade: number, faturamento: number }>()
          
          vendas.forEach(venda => {
            const produto = (venda['Descr. Produto'] || 'Produto não identificado').substring(0, 30) + '...'
            const quantidade = converterValor(venda.Quantidade || '0')
            const faturamento = converterValor(venda.total || '0')
            
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

          const topProdutosList = Array.from(produtosMap.entries())
            .map(([produto, dados]) => ({
              produto,
              quantidade: dados.quantidade,
              faturamento: dados.faturamento
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
            .slice(0, 5)

          setTopProdutos(topProdutosList)

          // Vendas por cidade
          const cidadesMap = new Map<string, { vendas: number, faturamento: number }>()
          
          vendas.forEach(venda => {
            const cidade = venda.CIDADE || 'Não identificada'
            const faturamento = converterValor(venda.total || '0')
            
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

          const cidadesArray = Array.from(cidadesMap.entries())
            .map(([cidade, dados]) => ({
              cidade,
              vendas: dados.vendas,
              faturamento: dados.faturamento
            }))
            .sort((a, b) => b.faturamento - a.faturamento)
            .slice(0, 6)

          setVendasPorCidade(cidadesArray)
          
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
console.log('Debug - vendasPorCidade:', vendasPorCidade);

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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <svg className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800">Erro ao carregar dashboard</h3>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg text-white p-8">
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-blue-100 mt-2">
          {user.role === 'admin_financeiro' 
            ? 'Visão geral completa do sistema Almeida&Camargo'
            : 'Suas vendas e performance individual'
          }
        </p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 transform hover:scale-105 transition-transform">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-3xl font-bold text-gray-900">{kpis.totalVendas.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-green-600">↗ +12% vs mês anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500 transform hover:scale-105 transition-transform">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
<p className="text-2xl font-bold text-gray-900">
  {formatarMoeda(kpis.faturamentoTotal)}
</p>              <p className="text-xs text-green-600">↗ +8% vs mês anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500 transform hover:scale-105 transition-transform">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-3xl font-bold text-gray-900">{formatarMoeda(kpis.ticketMedio)}</p>
              <p className="text-xs text-red-600">↘ -3% vs mês anterior</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 transform hover:scale-105 transition-transform">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
              <p className="text-3xl font-bold text-gray-900">{kpis.clientesUnicos}</p>
              <p className="text-xs text-green-600">↗ +5% vs mês anterior</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Faturamento Mensal */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Faturamento Mensal</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Últimos 6 meses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={faturamentoMensal} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value.toLocaleString()}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="faturamento" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Produtos - Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Produtos</h3>
            <span className="text-sm text-gray-500">Por faturamento</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topProdutos}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="faturamento"
              >
                {topProdutos.map((_, index) => (
  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
))}
              </Pie>
              <Tooltip formatter={(value) => [formatarMoeda(Number(value)), 'Faturamento']} />

            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-1 gap-2">
  {topProdutos.map((item, index) => (
    <div key={index} className="flex items-center text-sm">
      <div 
        className="w-3 h-3 rounded-full mr-2" 
        style={{ backgroundColor: COLORS[index % COLORS.length] }}
      ></div>
      <span className="truncate">{item.produto}</span>
      <span className="ml-auto font-medium">{formatarMoeda(item.faturamento)}</span>
    </div>
  ))}
</div>
        </div>

        {/* Vendas por Cidade */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vendas por Cidade</h3>
            <span className="text-sm text-gray-500">Top 6 cidades</span>
          </div>
<ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={vendasPorCidade} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="cidade" 
                axisLine={false} 
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip 
                formatter={(value) => [`${value} vendas`, 'Vendas']}
                labelFormatter={(label) => `Cidade: ${label}`}
              />
              <Bar 
                dataKey="vendas" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas Recentes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vendas Recentes</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver todas →
            </button>
          </div>
          <div className="space-y-4">
            {vendasRecentes.length > 0 ? vendasRecentes.map((venda: VendaRecente) => (
              <div key={venda.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 truncate max-w-xs">

                    {venda['Descr. Produto'] || 'Produto não identificado'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {venda.NomeCli || 'Cliente não identificado'} • {venda.CIDADE}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    NF: {venda['Número da Nota Fiscal']} • {formatarData(venda['Data de Emissao da NF'])}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-semibold text-green-600 text-sm">
                    {formatarMoeda(converterValor(venda.total))}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-sm mt-2">Nenhuma venda encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg text-white p-8">
        <h2 className="text-2xl font-bold mb-4">Performance Almeida&Camargo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{user.role === 'admin_financeiro' ? '98%' : '87%'}</div>
            <div className="text-indigo-100 text-sm">Satisfação dos Clientes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">24h</div>
            <div className="text-indigo-100 text-sm">Tempo Médio de Resposta</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">15+</div>
            <div className="text-indigo-100 text-sm">Anos de Experiência</div>
          </div>
        </div>
      </div>
    </div>
  )
}
