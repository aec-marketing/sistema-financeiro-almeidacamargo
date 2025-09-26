// src/components/Dashboard/VendedorDashboard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useUserAccess } from '../../hooks/useUserAccess'
import { calcularTotalVenda } from '../../utils/calcular-total'
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
    Search,  // ADICIONAR
  Copy     // ADICIONAR
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

            let dia, mes, ano
            if (data.includes('/')) {
              [dia, mes, ano] = data.split('/')
            } else if (data.includes('-')) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              [ano, mes, dia] = data.split('-')
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
          <div className="bg-gray-200 h-32 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-200 h-24 rounded-xl"></div>
            <div className="bg-gray-200 h-24 rounded-xl"></div>
            <div className="bg-gray-200 h-24 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || authError) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Erro ao carregar dados</h3>
              <p className="text-red-600 text-sm mt-1">{error || authError}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header personalizado */}
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
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="mb-2 px-3 py-1 rounded bg-white bg-opacity-20 text-white text-sm border border-white border-opacity-30"
            >
              <option value="2025-09" className="text-gray-900">Setembro 2025</option>
              <option value="2025-08" className="text-gray-900">Agosto 2025</option>
              <option value="2025-07" className="text-gray-900">Julho 2025</option>
              <option value="2025-06" className="text-gray-900">Junho 2025</option>
            </select>

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

      {/* KPIs Grid */}
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

        {/* Status da Meta */}
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

      {/* Seções principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minhas Últimas Vendas / Maiores Vendas do Mês */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                {mostrarMaioresVendas ? 'Maiores Vendas do Mês' : 'Minhas Últimas Vendas'}
              </h3>
              <button
                onClick={() => setMostrarMaioresVendas(!mostrarMaioresVendas)}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
              >
                {mostrarMaioresVendas ? 'Ver Últimas' : 'Ver Maiores'}
              </button>
            </div>
          </div>
          <div className="p-6">
            {(mostrarMaioresVendas ? maioresVendasMes : minhasVendas).length > 0 ? (
              <div className="space-y-3">
                {(mostrarMaioresVendas ? maioresVendasMes : minhasVendas).map((venda) => {
                  const valorTotal = calcularTotalVenda(
                    venda.total,
                    venda.Quantidade,
                    venda['Preço Unitário']
                  )
                  return (
                    <div key={venda.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {venda['Descr. Produto']}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {venda.NomeCli} • {venda.CIDADE}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          NF: {venda['Número da Nota Fiscal']} • {formatarData(venda['Data de Emissao da NF'])}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="font-bold text-green-600">{formatarMoeda(valorTotal)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>{mostrarMaioresVendas ? 'Nenhuma venda no mês selecionado' : 'Nenhuma venda registrada'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Meus Principais Clientes */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-orange-600" />
              Meus Principais Clientes
            </h3>
          </div>
          <div className="p-6">
            {meusClientes.length > 0 ? (
              <div className="space-y-3">
                {meusClientes.map((cliente, index) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold mr-3 flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-gray-900 text-sm break-words leading-relaxed">{cliente.nome}</p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="break-words">{cliente.cidade || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-orange-600 text-sm">{formatarMoeda(cliente.faturamentoTotal)}</p>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{cliente.totalCompras} compras</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate(`/clientes?vendedor=${encodeURIComponent(representanteName || '')}`)}
          className="bg-white hover:bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center transition-all hover:shadow-md"
        >
          <UserCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-semibold text-gray-900">Meus Clientes</p>
        </button>

        <button
          onClick={abrirModalContatos}
          className="bg-white hover:bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center transition-all hover:shadow-md"
        >
          <Phone className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-gray-900">Contatos</p>
        </button>

        <button
          onClick={() => navigate('/relatorios')}
          className="bg-white hover:bg-purple-50 border-2 border-purple-200 rounded-xl p-6 text-center transition-all hover:shadow-md"
        >
          <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="font-semibold text-gray-900">Relatórios</p>
        </button>

        <button
          onClick={() => alert('⏰ Funcionalidade de Agenda em desenvolvimento!\n\nEm breve você poderá:\n• Agendar visitas a clientes\n• Visualizar compromissos\n• Receber lembretes automáticos')}
          className="bg-white hover:bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center transition-all hover:shadow-md"
        >
          <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="font-semibold text-gray-900">Agenda</p>
        </button>
      </div>

      {/* Modal de Contatos */}
      {showModalContatos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Meus Contatos</h3>
                    <p className="text-sm text-gray-500">
                      {contatosClientes.length} clientes com informações de contato
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModalContatos(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="mt-4 relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou cidade..."
                  value={searchContato}
                  onChange={(e) => setSearchContato(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingContatos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-gray-600">Carregando contatos...</span>
                </div>
              ) : contatosFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contatosFiltrados.map((contato, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      {/* Header do Contato */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1 min-w-0 mr-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold mr-3 flex-shrink-0">
                            {contato.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{contato.nome}</h4>
                            <p className="text-sm text-gray-500 flex items-center">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{contato.cidade}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm flex-shrink-0">
                          <p className="font-semibold text-green-600">{formatarMoeda(contato.faturamentoTotal)}</p>
                          <p className="text-gray-500">{contato.totalCompras} compras</p>
                        </div>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-2">
                        {contato.telefone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-700">{formatarTelefone(contato.telefone)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => copiarTelefone(contato.telefone!)}
                                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                title="Copiar número"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <a
                                href={`tel:+55${contato.telefone.replace(/\D/g, '')}`}
                                className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
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
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Última compra: {formatarData(contato.ultimaCompra)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchContato ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                  </h3>
                  <p className="text-gray-500">
                    {searchContato
                      ? 'Tente buscar com outros termos'
                      : 'Os clientes não possuem informações de contato cadastradas'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
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
    </div>
  )
}

export default VendedorDashboard