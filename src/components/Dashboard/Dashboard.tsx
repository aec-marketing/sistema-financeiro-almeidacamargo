import { useState, useEffect } from 'react'
import { supabase, type UserProfile } from '../../lib/supabase'
import { calcularTotalVenda } from '../../utils/calcular-total'

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
  cdCli: number
  cdRepr: number
  Quantidade: string
  'Preço Unitário': string
}

interface TopProduto {
  produto: string
  quantidade: number
  faturamento: number
}

export default function Dashboard({ user }: DashboardProps) {
  const [kpis, setKpis] = useState<KPIs>({
    totalVendas: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    clientesUnicos: 0
  })
  
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([])
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([])
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
      // Assumindo formato DD/MM/YYYY
      const partes = data.split('/')
      if (partes.length === 3) {
        return `${partes[0]}/${partes[1]}/${partes[2]}`
      }
      return data
    } catch {
      return data
    }
  }

  // Carregar dados do dashboard
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Carregando dados do dashboard...')

        // Query simplificada primeiro para testar
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
          .limit(100) // Limitar para teste

        // Se for consultor, filtrar apenas suas vendas
        if (user.role === 'consultor_vendas' && user.cd_representante) {
          queryVendas = queryVendas.eq('cdRepr', user.cd_representante)
        }

        console.log('Executando query...')
        const { data: vendas, error: vendasError } = await queryVendas

        if (vendasError) {
          console.error('Erro na query:', vendasError)
          throw vendasError
        }

        console.log('Dados carregados:', vendas?.length, 'registros')

        if (vendas) {
          // Calcular KPIs
          const totalVendas = vendas.length
          const faturamentoTotal = vendas.reduce((acc, venda) => {
            const totalCalculado = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
            return acc + totalCalculado
          }, 0)
          const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0
          const clientesUnicos = new Set(vendas.map(v => v.cdCli)).size

          setKpis({
            totalVendas,
            faturamentoTotal,
            ticketMedio,
            clientesUnicos
          })

          // Vendas mais recentes (últimas 10)
          const recentes = vendas
            .sort((a, b) => b.id - a.id)
            .slice(0, 10)

          setVendasRecentes(recentes)

          // Top 5 produtos mais vendidos
          const produtosMap = new Map<string, { quantidade: number, faturamento: number }>()
          
          vendas.forEach(venda => {
            const produto = venda['Descr. Produto'] || 'Produto não identificado'
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

          console.log('Dashboard carregado com sucesso!')
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-64 rounded-lg"></div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800">Erro ao carregar dashboard</h3>
        </div>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">
          {user.role === 'admin_financeiro' 
            ? 'Visão geral completa do sistema'
            : 'Suas vendas e performance'
          }
        </p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.totalVendas.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatarMoeda(kpis.faturamentoTotal)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">{formatarMoeda(kpis.ticketMedio)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.clientesUnicos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas Recentes */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Vendas Recentes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {vendasRecentes.length > 0 ? vendasRecentes.map((venda) => (
                <div key={venda.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {venda['Descr. Produto'] || 'Produto não identificado'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {venda.NomeCli || 'Cliente não identificado'} • {venda.CIDADE}
                    </p>
                    <p className="text-xs text-gray-500">
                      NF: {venda['Número da Nota Fiscal']} • {formatarData(venda['Data de Emissao da NF'])}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-green-600">
                      {formatarMoeda(converterValor(venda.total))}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-8">Nenhuma venda encontrada</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Produtos */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Produtos</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topProdutos.length > 0 ? topProdutos.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {item.produto}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qtd: {item.quantidade.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-gray-900">
                      {formatarMoeda(item.faturamento)}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-8">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}