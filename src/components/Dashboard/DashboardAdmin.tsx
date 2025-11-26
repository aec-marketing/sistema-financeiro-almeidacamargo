// src/components/Dashboard/DashboardAdmin.tsx
// ✨ VERSÃO OTIMIZADA com Views Materializadas + Cache IndexedDB
import { useMemo } from 'react'
import { useUserAccess } from '../../hooks/useUserAccess'
import { useDashboardData } from '../../hooks/useDashboardData'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

import {
  TrendingUp, DollarSign, ShoppingCart, Users,
  Package, RefreshCw, BarChart3
} from 'lucide-react'

export default function DashboardAdmin() {
  const {
    user,
    loading: authLoading,
    error: authError
  } = useUserAccess()

  // ✨ Hook otimizado - busca views materializadas com cache
  const {
    kpis,
    topMarcas,
    vendasRecentes,
    faturamentoMensal,
    loading,
    error,
    invalidateAllCache
  } = useDashboardData()

  // Funções utilitárias
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarNumero = (valor: number): string => {
    return valor.toLocaleString('pt-BR')
  }

  // Processar dados para gráficos
  const dadosFaturamentoMensal = useMemo(() => {
    if (!faturamentoMensal) return []

    return faturamentoMensal.map(item => ({
      mes: item.mes_formatado,
      Faturamento: Number(item.faturamento_total) || 0,
      Vendas: Number(item.total_vendas) || 0
    }))
  }, [faturamentoMensal])

  const dadosTopMarcas = useMemo(() => {
    if (!topMarcas) return []

    const total = topMarcas.reduce((acc, m) => acc + Number(m.faturamento_total), 0)

    return topMarcas.slice(0, 5).map(marca => ({
      name: marca.marca,
      value: Number(marca.faturamento_total),
      percentual: total > 0 ? (Number(marca.faturamento_total) / total) * 100 : 0
    }))
  }, [topMarcas])

  // Cores para gráficos
  const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  // Calcular crescimento mensal
  const crescimentoMensal = useMemo(() => {
    if (!kpis) return 0

    const faturamentoAtual = Number(kpis.faturamento_mes_atual) || 0
    const faturamentoTotal = Number(kpis.faturamento_total) || 0

    // Estimativa simples (pode melhorar com dados históricos)
    const mediaOutrosMeses = (faturamentoTotal - faturamentoAtual) / 11

    if (mediaOutrosMeses === 0) return faturamentoAtual > 0 ? 100 : 0
    return ((faturamentoAtual - mediaOutrosMeses) / mediaOutrosMeses) * 100
  }, [kpis])

  // Tooltip customizado
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

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: TooltipPayload, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.includes('Faturamento')
                  ? formatarMoeda(entry.value)
                  : formatarNumero(entry.value)
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Estados de loading e erro
  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
          <div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (authError || error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Erro ao carregar dashboard</h3>
        <p className="text-red-700 dark:text-red-300 text-sm mt-2">{authError || error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Administrativo</h1>
            <p className="text-gray-600 dark:text-gray-300">Visão geral completa do negócio</p>
          </div>
          <button
            onClick={invalidateAllCache}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Vendas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatarNumero(kpis?.total_vendas || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatarNumero(kpis?.vendas_mes_atual || 0)} este mês
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Faturamento Total */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatarMoeda(kpis?.faturamento_total || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatarMoeda(kpis?.faturamento_mes_atual || 0)} este mês
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Ticket Médio</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {formatarMoeda(kpis?.ticket_medio || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Por venda
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Clientes Únicos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Clientes Únicos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatarNumero(kpis?.clientes_unicos || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total de clientes
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Crescimento Mensal */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Crescimento Mensal</p>
            <p className="text-3xl font-bold mt-1">
              {crescimentoMensal > 0 ? '+' : ''}{crescimentoMensal.toFixed(1)}%
            </p>
            <p className="text-sm opacity-75 mt-1">
              Comparado com média dos meses anteriores
            </p>
          </div>
          <TrendingUp className="h-16 w-16 opacity-50" />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento Mensal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Faturamento Mensal
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosFaturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="mes"
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Faturamento" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Marcas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top 5 Marcas
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosTopMarcas}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.percentual.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosTopMarcas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendas Recentes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vendas Recentes
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">NF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Marca</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {vendasRecentes?.slice(0, 10).map((venda) => (
                <tr key={venda.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {venda['Número da Nota Fiscal']}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {venda['Data de Emissao da NF']}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {venda.NomeCli}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {venda['Descr. Produto']}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {venda.MARCA}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                    {formatarMoeda(Number(venda.total) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
