// src/components/Dashboard/VendedorDashboard.tsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useUserAccess } from '../../hooks/useUserAccess'
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  Calendar,
  Phone,
  MapPin,
  Clock,
  Award,
  AlertCircle 
} from 'lucide-react'

// Interfaces específicas para o vendedor
interface VendedorKPIs {
  vendasMes: number
  faturamentoMes: number
  ticketMedio: number
  clientesAtendidos: number
  metaMensal: number
  percentualMeta: number
}

interface VendaVendedor {
  id: number
  'Data de Emissao da NF': string
  total: string
  'Descr. Produto': string
  NomeCli: string
  CIDADE: string
  'Número da Nota Fiscal': string
}

interface ClienteVendedor {
  nome: string
  cidade: string
  ultimaCompra: string
  totalCompras: number
}

const VendedorDashboard: React.FC = () => {
  const { 
    user, 
    loading: authLoading, 
    error: authError, 
    representanteName,
    representanteCode 
  } = useUserAccess()

  // Estados do dashboard
  const [kpis, setKpis] = useState<VendedorKPIs>({
    vendasMes: 0,
    faturamentoMes: 0,
    ticketMedio: 0,
    clientesAtendidos: 0,
    metaMensal: 100000, // Meta padrão de R$ 100k
    percentualMeta: 0
  })

  const [minhasVendas, setMinhasVendas] = useState<VendaVendedor[]>([])
  const [meusClientes, setMeusClientes] = useState<ClienteVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Funções utilitárias (mantidas iguais)
  const converterValor = (valor: string | number): number => {
    if (typeof valor === 'number') return valor
    if (!valor || valor === '') return 0
    const numericValue = parseFloat(valor.toString().replace(/[^\d.,]/g, '').replace(',', '.'))
    return isNaN(numericValue) ? 0 : numericValue
  }

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarData = (data: string): string => {
    try {
      return new Date(data).toLocaleDateString('pt-BR')
    } catch {
      return data
    }
  }

  // Carregar dados específicos do vendedor
  useEffect(() => {
    if (authLoading || !user || !representanteName) return

    const carregarDadosVendedor = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🛒 Carregando dados para vendedor: ${representanteName}`)

        // Query filtrada apenas para este vendedor
        const { data: vendas, error: vendasError } = await supabase
          .from('vendas')
          .select(`
            id,
            "Data de Emissao da NF",
            total,
            Quantidade,
            "Preço Unitário",
            "Descr. Produto",
            NomeCli,
            CIDADE,
            "Número da Nota Fiscal",
            NomeRepr
          `)
          .eq('NomeRepr', representanteName)
          .order('"Data de Emissao da NF"', { ascending: false })
          .limit(1000)

        if (vendasError) {
          throw new Error(`Erro ao carregar vendas: ${vendasError.message}`)
        }

        if (vendas && vendas.length > 0) {
          console.log(`📊 Vendas do representante: ${vendas.length}`)

          // Calcular KPIs do mês atual
          const agora = new Date()
          const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
          
          const vendasMes = vendas.filter(venda => {
            const dataVenda = new Date(venda['Data de Emissao da NF'])
            return dataVenda >= inicioMes
          })

          const totalVendasMes = vendasMes.length
          const faturamentoMes = vendasMes.reduce((sum, venda) => {
            return sum + converterValor(venda.total)
          }, 0)

          const ticketMedio = totalVendasMes > 0 ? faturamentoMes / totalVendasMes : 0
          const clientesAtendidos = new Set(vendasMes.map(v => v.NomeCli)).size
          const percentualMeta = kpis.metaMensal > 0 ? (faturamentoMes / kpis.metaMensal) * 100 : 0

          setKpis({
            vendasMes: totalVendasMes,
            faturamentoMes,
            ticketMedio,
            clientesAtendidos,
            metaMensal: kpis.metaMensal,
            percentualMeta
          })

          // Últimas vendas (primeiras 5)
          setMinhasVendas(vendas.slice(0, 5))

          // Top clientes (últimos 30 dias)
          const ultimo30Dias = new Date()
          ultimo30Dias.setDate(ultimo30Dias.getDate() - 30)

          const vendasRecentes = vendas.filter(venda => {
            const dataVenda = new Date(venda['Data de Emissao da NF'])
            return dataVenda >= ultimo30Dias
          })

          // Agrupar por cliente
          const clientesMap = new Map<string, ClienteVendedor>()
          
          vendasRecentes.forEach(venda => {
            const nomeCliente = venda.NomeCli
            if (!clientesMap.has(nomeCliente)) {
              clientesMap.set(nomeCliente, {
                nome: nomeCliente,
                cidade: venda.CIDADE,
                ultimaCompra: venda['Data de Emissao da NF'],
                totalCompras: 0
              })
            }
            
            const cliente = clientesMap.get(nomeCliente)!
            cliente.totalCompras += converterValor(venda.total)
            
            // Manter a data mais recente
            if (new Date(venda['Data de Emissao da NF']) > new Date(cliente.ultimaCompra)) {
              cliente.ultimaCompra = venda['Data de Emissao da NF']
            }
          })

          // Converter para array e ordenar por valor total
          const topClientes = Array.from(clientesMap.values())
            .sort((a, b) => b.totalCompras - a.totalCompras)
            .slice(0, 5)

          setMeusClientes(topClientes)

        } else {
          console.warn('⚠️ Nenhuma venda encontrada para este vendedor')
        }

      } catch (err) {
        console.error('❌ Erro ao carregar dados do vendedor:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    carregarDadosVendedor()
  }, [user, representanteName, authLoading])

  // Estados de loading e erro
  if (authLoading || loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="bg-gray-200 h-32 rounded-xl"></div>
          
          {/* Cards skeleton - Mobile first */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (authError || error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-400 mr-3" />
            <h3 className="text-lg font-medium text-red-800">Erro no Dashboard</h3>
          </div>
          <p className="text-red-700 text-sm">{authError || error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header personalizado do vendedor */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg text-white p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Olá, {user?.nome || representanteName}!</h1>
                <p className="text-green-100">Dashboard Pessoal</p>
              </div>
            </div>
          </div>
          
          {/* Meta do mês */}
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center min-w-[200px]">
            <div className="text-green-100 text-sm">Meta do Mês</div>
            <div className="text-2xl font-bold">{Math.round(kpis.percentualMeta)}%</div>
            <div className="w-full bg-green-400 rounded-full h-2 mt-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(kpis.percentualMeta, 100)}%` }}
              ></div>
            </div>
            <div className="text-green-100 text-xs mt-1">
              {formatarMoeda(kpis.faturamentoMes)} de {formatarMoeda(kpis.metaMensal)}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Mobile-First - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Vendas do mês */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 font-medium text-sm">Vendas Este Mês</p>
              <p className="text-3xl font-bold text-blue-800">{kpis.vendasMes}</p>
              <p className="text-blue-500 text-xs">transações realizadas</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        {/* Faturamento */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 font-medium text-sm">Meu Faturamento</p>
              <p className="text-2xl font-bold text-green-800">{formatarMoeda(kpis.faturamentoMes)}</p>
              <p className="text-green-500 text-xs">neste mês</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 font-medium text-sm">Ticket Médio</p>
              <p className="text-2xl font-bold text-purple-800">{formatarMoeda(kpis.ticketMedio)}</p>
              <p className="text-purple-500 text-xs">por venda</p>
            </div>
            <Target className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        {/* Clientes Atendidos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 font-medium text-sm">Meus Clientes</p>
              <p className="text-3xl font-bold text-orange-800">{kpis.clientesAtendidos}</p>
              <p className="text-orange-500 text-xs">atendidos este mês</p>
            </div>
            <Users className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        {/* Status da Meta - Card maior */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white sm:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 font-medium text-sm">Status da Meta</p>
              <p className="text-3xl font-bold">{Math.round(kpis.percentualMeta)}%</p>
              <p className="text-emerald-200 text-sm">
                {kpis.percentualMeta >= 100 
                  ? '🎉 Meta batida! Parabéns!' 
                  : kpis.percentualMeta >= 80 
                    ? '🔥 Quase lá! Continue assim!'
                    : '💪 Vamos acelerar!'
                }
              </p>
            </div>
            <Award className="h-10 w-10 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* Seções principais - Layout responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minhas Últimas Vendas */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Minhas Últimas Vendas
            </h3>
          </div>
          <div className="p-6">
            {minhasVendas.length > 0 ? (
              <div className="space-y-3">
                {minhasVendas.map((venda) => (
                  <div key={venda.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {venda['Descr. Produto'] || 'Produto não identificado'}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {venda.NomeCli} • {venda.CIDADE}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatarData(venda['Data de Emissao da NF'])} • NF: {venda['Número da Nota Fiscal']}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-green-600 text-sm">
                        {formatarMoeda(converterValor(venda.total))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Nenhuma venda recente encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Meus Principais Clientes */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Meus Principais Clientes
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                Últimos 30 dias
              </span>
            </h3>
          </div>
          <div className="p-6">
            {meusClientes.length > 0 ? (
              <div className="space-y-3">
                {meusClientes.map((cliente, index) => (
                  <div key={cliente.nome} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{cliente.nome}</p>
                        <p className="text-xs text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {cliente.cidade} • {formatarData(cliente.ultimaCompra)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 text-sm">
                        {formatarMoeda(cliente.totalCompras)}
                      </p>
                      <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        Contatar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Nenhum cliente encontrado recentemente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações rápidas - Mobile friendly */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-center transition-colors">
          <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
          <span className="text-sm font-medium text-blue-800">Meus Clientes</span>
        </button>
        
        <button className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-center transition-colors">
          <Phone className="h-6 w-6 mx-auto text-green-600 mb-2" />
          <span className="text-sm font-medium text-green-800">Contatos</span>
        </button>
        
        <button className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-center transition-colors">
          <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-2" />
          <span className="text-sm font-medium text-purple-800">Relatórios</span>
        </button>
        
        <button className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-4 text-center transition-colors">
          <Calendar className="h-6 w-6 mx-auto text-orange-600 mb-2" />
          <span className="text-sm font-medium text-orange-800">Agenda</span>
        </button>
      </div>

      {/* Footer do vendedor */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 text-center">
        <p className="text-gray-600 text-sm">
          🛒 <strong>Sistema Vendedor</strong> • 
          Representante: {representanteName || 'N/A'} • 
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  )
}

export default VendedorDashboard