// src/components/Dashboard/VendedorDashboard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useUserAccess } from '../../hooks/useUserAccess'
import { calcularTotalVenda } from '../../utils/calcular-total'
import { useClipboard } from '../../hooks/useClipboard'
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
  AlertCircle,
  FileText,
  UserCircle,
  Search,
  Copy
} from 'lucide-react'

// Interfaces
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
  Quantidade: string
  'Preço Unitário': string
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
  faturamentoTotal: number
}

interface ContatoCliente {
  nome: string
  cidade: string
  telefone?: string
  celular?: string
  email?: string
  ultimaCompra: string
  faturamentoTotal: number
  totalCompras: number
}

const VendedorDashboard: React.FC = () => {
  const navigate = useNavigate()
  const {
    user,
    loading: authLoading,
    error: authError,
    representanteName  } = useUserAccess()
  const { copyToClipboard } = useClipboard()

  // Estados
  const [kpis, setKpis] = useState<VendedorKPIs>({
    vendasMes: 0,
    faturamentoMes: 0,
    ticketMedio: 0,
    clientesAtendidos: 0,
    metaMensal: 100000,
    percentualMeta: 0
  })

  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  })

  // Gerar lista de meses disponíveis (últimos 6 meses incluindo o atual)
  const mesesDisponiveis = React.useMemo(() => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1 // 1-12
    const anoAtual = hoje.getFullYear()

    const meses = []
    for (let i = 5; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - 1 - i, 1)
      const mes = data.getMonth() + 1
      const ano = data.getFullYear()

      meses.push({
        valor: `${ano}-${String(mes).padStart(2, '0')}`,
        label: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          .replace(/^\w/, (c) => c.toUpperCase()) // Capitalizar primeira letra
      })
    }

    return meses
  }, [])

  const [mostrarMaioresVendas, setMostrarMaioresVendas] = useState(false)
  const [minhasVendas, setMinhasVendas] = useState<VendaVendedor[]>([])
  const [maioresVendasMes, setMaioresVendasMes] = useState<VendaVendedor[]>([])
  const [meusClientes, setMeusClientes] = useState<ClienteVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModalContatos, setShowModalContatos] = useState(false)
  const [contatosClientes, setContatosClientes] = useState<ContatoCliente[]>([])
  const [searchContato, setSearchContato] = useState('')
  const [loadingContatos, setLoadingContatos] = useState(false)

  // Modal de detalhes do cliente
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteVendedor | null>(null)
  const [showModalCliente, setShowModalCliente] = useState(false)

  // Funções utilitárias

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarData = (data: string): string => {
    try {
      if (!data) return 'Data inválida'
      // Formato esperado: DD/MM/YYYY
      const [dia, mes, ano] = data.split('/')
      if (!dia || !mes || !ano) return data
      return `${dia}/${mes}/${ano}`
    } catch {
      return data
    }
  }

  const formatarTelefone = (telefone: string): string => {
    if (!telefone) return ''
    // Remove caracteres não numéricos
    const numeros = telefone.replace(/\D/g, '')

    // Formata conforme o tamanho
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
    }
    return telefone
  }

  const copiarTelefone = (telefone: string) => {
    navigator.clipboard.writeText(telefone.replace(/\D/g, ''))
    // Aqui você poderia adicionar um toast de confirmação
  }

  // Carregar dados
  useEffect(() => {
    if (authLoading || !user || !representanteName) return

    const carregarDados = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🛒 Carregando dados para: ${representanteName}`)

        // Buscar vendas do representante
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
          .limit(2000)

        if (vendasError) {
          throw new Error(`Erro ao carregar vendas: ${vendasError.message}`)
        }

        // Buscar dados dos clientes para obter a cidade correta
        const { data: clientes, error: clientesError } = await supabase
          .from('clientes')
          .select('Nome, "Município"')

        if (clientesError) {
          console.warn('Erro ao carregar clientes:', clientesError.message)
        }

        // Criar mapa de clientes para busca rápida da cidade
        const clientesMunicipioMap = new Map<string, string>()
        if (clientes) {
          clientes.forEach(cliente => {
            if (cliente.Nome && cliente['Município']) {
              clientesMunicipioMap.set(cliente.Nome.trim().toLowerCase(), cliente['Município'])
            }
          })
        }

        if (vendas && vendas.length > 0) {
          console.log(`📊 Total de vendas encontradas: ${vendas.length}`)

          // Filtrar vendas do mês selecionado
          const [anoSelecionado, mesSelecionado2] = mesSelecionado.split('-')

          const vendasMes = vendas.filter(venda => {
            const data = venda['Data de Emissao da NF']
            if (!data) return false

            let mes, ano
            if (data.includes('/')) {
              const [, mesStr, anoStr] = data.split('/')
              mes = mesStr
              ano = anoStr
            } else if (data.includes('-')) {
              const [anoStr, mesStr] = data.split('-')
              mes = mesStr
              ano = anoStr
            } else {
              return false
            }

            return mes === mesSelecionado2 && ano === anoSelecionado
          })

          console.log(`✅ Vendas filtradas do mês ${mesSelecionado}:`, vendasMes.length)

          console.log(`📅 Vendas deste mês: ${vendasMes.length}`)

          // Calcular KPIs
          const totalVendasMes = vendasMes.length
          const faturamentoMes = vendasMes.reduce((sum, venda) => {
            return sum + calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
          }, 0)

          const ticketMedio = totalVendasMes > 0 ? faturamentoMes / totalVendasMes : 0
          const clientesAtendidos = new Set(vendasMes.map(v => v.NomeCli)).size
          const percentualMeta = kpis.metaMensal > 0 ? (faturamentoMes / kpis.metaMensal) * 100 : 0

          console.log(`💰 Faturamento do mês: ${formatarMoeda(faturamentoMes)}`)
          console.log(`🎯 Percentual da meta: ${percentualMeta.toFixed(1)}%`)

          setKpis({
            vendasMes: totalVendasMes,
            faturamentoMes,
            ticketMedio,
            clientesAtendidos,
            metaMensal: kpis.metaMensal,
            percentualMeta
          })

          // Últimas 5 vendas
          setMinhasVendas(vendas.slice(0, 5))

          // Maiores 5 vendas do mês selecionado
          const maioresVendas = vendasMes
            .map(venda => ({
              ...venda,
              valorCalculado: calcularTotalVenda(
                venda.total,
                venda.Quantidade,
                venda['Preço Unitário']
              )
            }))
            .sort((a, b) => b.valorCalculado - a.valorCalculado)
            .slice(0, 5)

          setMaioresVendasMes(maioresVendas)

          // Top 5 clientes (todas as vendas)
          const clientesMap = new Map<string, ClienteVendedor>()

          vendas.forEach(venda => {
            const nomeCliente = venda.NomeCli
            const valorVenda = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )

            // Buscar município do cliente na tabela de clientes
            const chaveCliente = nomeCliente.trim().toLowerCase()
            const municipioCliente = clientesMunicipioMap.get(chaveCliente) || 'N/A'

            if (!clientesMap.has(nomeCliente)) {
              clientesMap.set(nomeCliente, {
                nome: nomeCliente,
                cidade: municipioCliente,
                ultimaCompra: venda['Data de Emissao da NF'],
                totalCompras: 0,
                faturamentoTotal: 0
              })
            }

            const cliente = clientesMap.get(nomeCliente)!
            cliente.totalCompras += 1
            cliente.faturamentoTotal += valorVenda

            // Atualizar última compra
            cliente.ultimaCompra = venda['Data de Emissao da NF']
          })

          const topClientes = Array.from(clientesMap.values())
            .sort((a, b) => b.faturamentoTotal - a.faturamentoTotal)
            .slice(0, 5)

          setMeusClientes(topClientes)
        } else {
          console.log('⚠️ Nenhuma venda encontrada')
        }

      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [authLoading, user, representanteName, mesSelecionado, kpis.metaMensal])

  // Função para carregar contatos
  const carregarContatos = async () => {
    if (!representanteName) return

    try {
      setLoadingContatos(true)

      // Buscar vendas do vendedor para identificar clientes
      const { data: vendas, error: vendasError } = await supabase
        .from('vendas')
        .select('NomeCli, CIDADE')
        .eq('NomeRepr', representanteName)
        .order('"Data de Emissao da NF"', { ascending: false })

      if (vendasError) throw vendasError

      // Buscar dados completos dos clientes
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select(`
          Nome,
          "Município",
          Telefone
        `)

      if (clientesError) throw clientesError

      // Agrupar vendas por cliente para calcular métricas
      const clientesMap = new Map<string, {
        cidade: string
        ultimaCompra: string
        totalCompras: number
        faturamentoTotal: number
      }>()

      vendas?.forEach(venda => {
        const nome = venda.NomeCli
        if (!clientesMap.has(nome)) {
          clientesMap.set(nome, {
            cidade: venda.CIDADE,
            ultimaCompra: '',
            totalCompras: 0,
            faturamentoTotal: 0
          })
        }
        const cliente = clientesMap.get(nome)!
        cliente.totalCompras += 1
      })

      // Buscar vendas com valores para calcular faturamento
      const { data: vendasComValor } = await supabase
        .from('vendas')
        .select(`
          NomeCli,
          total,
          Quantidade,
          "Preço Unitário",
          "Data de Emissao da NF"
        `)
        .eq('NomeRepr', representanteName)
        .order('"Data de Emissao da NF"', { ascending: false })

      vendasComValor?.forEach(venda => {
        const nome = venda.NomeCli
        if (clientesMap.has(nome)) {
          const cliente = clientesMap.get(nome)!
          const valorVenda = calcularTotalVenda(
            venda.total,
            venda.Quantidade,
            venda['Preço Unitário']
          )
          cliente.faturamentoTotal += valorVenda

          // Primeira venda encontrada é a mais recente (ORDER BY DESC)
          if (!cliente.ultimaCompra) {
            cliente.ultimaCompra = venda['Data de Emissao da NF'] || 'Data não disponível'
          }
        }
      })

      // Combinar dados de vendas com dados de contato dos clientes
      const contatosCompletos: ContatoCliente[] = Array.from(clientesMap.entries())
        .map(([nomeCliente, dadosVenda]) => {
          const clienteCompleto = clientes?.find(c => c.Nome === nomeCliente)

          return {
            nome: nomeCliente,
            cidade: clienteCompleto?.['Município'] || dadosVenda.cidade,
            telefone: clienteCompleto?.Telefone || undefined,
            celular: undefined,
            email: undefined,
            ultimaCompra: dadosVenda.ultimaCompra,
            faturamentoTotal: dadosVenda.faturamentoTotal,
            totalCompras: dadosVenda.totalCompras
          }
        })
        .filter(contato =>
          // Filtrar apenas clientes que têm telefone
          contato.telefone && contato.telefone.trim() !== ''
        )
        .sort((a, b) => b.faturamentoTotal - a.faturamentoTotal)
        .slice(0, 20) // Top 20 clientes com contato

      setContatosClientes(contatosCompletos)

    } catch (error) {
      console.error('Erro ao carregar contatos:', error)
    } finally {
      setLoadingContatos(false)
    }
  }

  // Função para abrir modal
  const abrirModalContatos = () => {
    setShowModalContatos(true)
    if (contatosClientes.length === 0) {
      carregarContatos()
    }
  }

  // Filtrar contatos para busca
  const contatosFiltrados = contatosClientes.filter(contato =>
    contato.nome.toLowerCase().includes(searchContato.toLowerCase()) ||
    contato.cidade.toLowerCase().includes(searchContato.toLowerCase())
  )

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-200 dark:bg-gray-700 h-24 rounded-xl"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-24 rounded-xl"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-24 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || authError) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Erro ao carregar dados</h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error || authError}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header personalizado */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg dark:shadow-gray-900/50 text-white p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-white dark:bg-gray-800 bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Olá, {user?.nome || representanteName}!</h1>
                <p className="text-green-100">Dashboard Pessoal</p>
              </div>
            </div>

            {/* Botão Copiar Resumo */}
            <button
              onClick={() => {
                const mesNome = mesesDisponiveis.find(m => m.valor === mesSelecionado)?.label || mesSelecionado
                const texto = `
📊 Meu Resumo de Vendas - ${mesNome}

💰 Faturamento: ${formatarMoeda(kpis.faturamentoMes)}
📦 Vendas: ${kpis.vendasMes}
🎯 Ticket Médio: ${formatarMoeda(kpis.ticketMedio)}
👥 Clientes Atendidos: ${kpis.clientesAtendidos}
📈 Meta: ${Math.round(kpis.percentualMeta)}% (${formatarMoeda(kpis.faturamentoMes)} de ${formatarMoeda(kpis.metaMensal)})
                `.trim()
                copyToClipboard(texto, 'Resumo copiado! Cole no WhatsApp ou email.')
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copiar Resumo
            </button>
          </div>
          
          {/* Meta do mês */}
          <div className="bg-white dark:bg-gray-800 bg-opacity-10 rounded-lg p-4 text-center min-w-[200px]">
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="mb-2 px-3 py-1 rounded bg-white dark:bg-gray-800 bg-opacity-20 text-white text-sm border border-white border-opacity-30"
            >
              {mesesDisponiveis.map((mes) => (
                <option key={mes.valor} value={mes.valor} className="text-gray-900 dark:text-white">
                  {mes.label}
                </option>
              ))}
            </select>

            <div className="text-green-100 text-sm">Meta do Mês</div>
            <div className="text-2xl font-bold">{Math.round(kpis.percentualMeta)}%</div>
            <div className="w-full bg-green-400 rounded-full h-2 mt-2">
              <div 
                className="bg-white dark:bg-gray-800 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(kpis.percentualMeta, 100)}%` }}
              ></div>
            </div>
            <div className="text-green-100 text-xs mt-1">
              {formatarMoeda(kpis.faturamentoMes)} de {formatarMoeda(kpis.metaMensal)}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Cards - MOBILE OPTIMIZED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* Vendas Este Mês */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Vendas Este Mês
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {kpis.vendasMes}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                transações realizadas
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Meu Faturamento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                Meu Faturamento
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                {formatarMoeda(kpis.faturamentoMes)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                neste mês
              </p>
            </div>
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                Ticket Médio
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                {formatarMoeda(kpis.ticketMedio)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                por venda
              </p>
            </div>
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Meus Clientes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                Meus Clientes
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {kpis.clientesAtendidos}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                atendidos este mês
              </p>
            </div>
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Status da Meta */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 sm:p-6 text-white sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs sm:text-sm text-emerald-100 font-medium mb-1">
                Status da Meta
              </p>
              <p className="text-2xl sm:text-3xl font-bold truncate">
                {Math.round(kpis.percentualMeta)}%
              </p>
              <p className="text-xs sm:text-sm text-emerald-200 mt-1">
                {kpis.percentualMeta >= 100
                  ? '🎉 Meta batida! Parabéns!'
                  : kpis.percentualMeta >= 80
                    ? '🔥 Quase lá! Continue assim!'
                    : '💪 Vamos acelerar!'
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Seções principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minhas Últimas Vendas / Maiores Vendas do Mês - MOBILE OPTIMIZED */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {mostrarMaioresVendas ? 'Maiores Vendas do Mês' : 'Minhas Últimas Vendas'}
              </h3>
              <button
                onClick={() => setMostrarMaioresVendas(!mostrarMaioresVendas)}
                className="self-start sm:self-auto px-3 py-1.5 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-700 dark:text-blue-300 rounded-md transition-colors font-medium"
              >
                {mostrarMaioresVendas ? 'Ver Últimas' : 'Ver Maiores'}
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {(mostrarMaioresVendas ? maioresVendasMes : minhasVendas).length > 0 ? (
              <div className="space-y-3">
                {(mostrarMaioresVendas ? maioresVendasMes : minhasVendas).map((venda) => {
                  const valorTotal = calcularTotalVenda(
                    venda.total,
                    venda.Quantidade,
                    venda['Preço Unitário']
                  )
                  return (
                    <div key={venda.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-blue-300 hover:shadow-sm dark:shadow-gray-900/50 transition-all">
                      {/* Header: Produto + Valor */}
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {venda['Descr. Produto']}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            {venda.NomeCli}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                            {formatarMoeda(valorTotal)}
                          </p>
                        </div>
                      </div>

                      {/* Footer: Detalhes */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-gray-100 text-xs text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {venda.CIDADE}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatarData(venda['Data de Emissao da NF'])}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">
                          NF: {venda['Número da Nota Fiscal']}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-600 dark:text-gray-300" />
                <p className="text-sm">{mostrarMaioresVendas ? 'Nenhuma venda no mês selecionado' : 'Nenhuma venda registrada'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Meus Principais Clientes - REDESIGNED */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Meus Principais Clientes
          </h3>

          {meusClientes.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Nenhum cliente atendido este mês</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meusClientes.slice(0, 5).map((cliente, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setClienteSelecionado(cliente)
                    setShowModalCliente(true)
                  }}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-300 hover:bg-orange-50 dark:bg-orange-900/20 transition-all cursor-pointer"
                >
                  {/* Badge de Posição */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Informações do Cliente */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                      {cliente.nome}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                      {cliente.cidade && (
                        <span className="flex items-center gap-1 truncate">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{cliente.cidade}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        {cliente.totalCompras}
                      </span>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm sm:text-base font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {formatarMoeda(cliente.faturamentoTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate(`/clientes?vendedor=${encodeURIComponent(representanteName || '')}`)}
          className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 rounded-xl p-6 text-center transition-all hover:shadow-md dark:shadow-gray-900/50"
        >
          <UserCircle className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 dark:text-white">Meus Clientes</p>
        </button>

        <button
          onClick={abrirModalContatos}
          className="bg-white dark:bg-gray-800 hover:bg-green-50 dark:bg-green-900/20 border-2 border-green-200 rounded-xl p-6 text-center transition-all hover:shadow-md dark:shadow-gray-900/50"
        >
          <Phone className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 dark:text-white">Contatos</p>
        </button>

        <button
          onClick={() => navigate('/relatorios')}
          className="bg-white dark:bg-gray-800 hover:bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 rounded-xl p-6 text-center transition-all hover:shadow-md dark:shadow-gray-900/50"
        >
          <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 dark:text-white">Relatórios</p>
        </button>

        <button
          onClick={() => alert('⏰ Funcionalidade de Agenda em desenvolvimento!\n\nEm breve você poderá:\n• Agendar visitas a clientes\n• Visualizar compromissos\n• Receber lembretes automáticos')}
          className="bg-white dark:bg-gray-800 hover:bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 rounded-xl p-6 text-center transition-all hover:shadow-md dark:shadow-gray-900/50"
        >
          <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 dark:text-white">Agenda</p>
        </button>
      </div>

      {/* Modal de Contatos */}
      {showModalContatos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meus Contatos</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {contatosClientes.length} clientes com informações de contato
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModalContatos(false)}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="mt-4 relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou cidade..."
                  value={searchContato}
                  onChange={(e) => setSearchContato(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingContatos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Carregando contatos...</span>
                </div>
              ) : contatosFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contatosFiltrados.map((contato, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      {/* Header do Contato */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="items-center flex-1 min-w-0 mr-4">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold mr-3 flex-shrink-0">
                            {contato.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{contato.nome}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{contato.cidade}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm flex-shrink-0">
                          <p className="font-semibold text-green-600 dark:text-green-400">{formatarMoeda(contato.faturamentoTotal)}</p>
                          <p className="text-gray-600 dark:text-gray-300">{contato.totalCompras} compras</p>
                        </div>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-2">
                        {contato.telefone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-600 dark:text-gray-300 mr-2" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">{formatarTelefone(contato.telefone)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => copiarTelefone(contato.telefone!)}
                                className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 transition-colors"
                                title="Copiar número"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <a
                                href={`tel:+55${contato.telefone.replace(/\D/g, '')}`}
                                className="p-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 text-white rounded transition-colors"
                                title="Ligar"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                              <a
                                href={`https://wa.me/55${contato.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                                title="WhatsApp"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                              </a>
                            </div>
                          </div>
                        )}


                      </div>

                      {/* Última Compra */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Última compra: {formatarData(contato.ultimaCompra)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchContato ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {searchContato
                      ? 'Tente buscar com outros termos'
                      : 'Os clientes não possuem informações de contato cadastradas'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Total: {contatosFiltrados.length} contatos</span>
                <button
                  onClick={() => setShowModalContatos(false)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cliente */}
      {showModalCliente && clienteSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                    {clienteSelecionado.nome}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Detalhes do Cliente
                  </p>
                </div>
                <button
                  onClick={() => setShowModalCliente(false)}
                  className="flex-shrink-0 ml-3 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Card de Faturamento Total */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">Faturamento Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-900">
                  {formatarMoeda(clienteSelecionado.faturamentoTotal)}
                </p>
              </div>

              {/* Informações do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total de Compras */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Total de Compras</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {clienteSelecionado.totalCompras}
                  </p>
                </div>

                {/* Ticket Médio */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Ticket Médio</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatarMoeda(clienteSelecionado.faturamentoTotal / clienteSelecionado.totalCompras)}
                  </p>
                </div>
              </div>

              {/* Localização */}
              {clienteSelecionado.cidade && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">Localização</p>
                      <p className="text-sm font-semibold text-blue-900 truncate">
                        {clienteSelecionado.cidade}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setShowModalCliente(false)}
                className="w-full px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendedorDashboard
