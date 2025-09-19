import { useState, useEffect } from 'react'
import { supabase, type Cliente } from '../lib/supabase'
import { Search, Building2, MapPin, Phone, FileText, Filter, RotateCcw, ChevronLeft, ChevronRight, TrendingUp, Calendar, DollarSign, X } from 'lucide-react'
import ClienteBadgeMesclado from '../components/ClienteBadgeMesclado'
import { filtrarClientesVirtuais } from '../utils/clientes-filtrados'
import { calcularTotalVenda } from '../utils/calcular-total'
import BotaoDuplicatas from '../components/BotaoDuplicatas'
// Definindo o tipo localmente para evitar problemas de importação
interface UserProfile {
  id: string
  role: 'admin_financeiro' | 'consultor_vendas'
  nome: string
  cd_representante?: number
  ativo: boolean
  created_at: string
}

interface ClientesPageProps {
  user: UserProfile
}

// Tipos para vendas e métricas
interface VendaCliente {
  id: number
  'Data de Emissao da NF': string
  total: string
  'Descr. Produto': string
  Quantidade: string
  'Preço Unitário': string
  'Número da Nota Fiscal': string
}

interface MetricasCliente {
  totalVendas: number
  faturamentoTotal: number
  ticketMedio: number
  primeiraCompra: string | null
  ultimaCompra: string | null
  statusAtivo: boolean
  frequenciaCompras: string
}

// Hook personalizado para gerenciar clientes
function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [totalClientes, setTotalClientes] = useState(0)
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Função para carregar clientes com paginação e filtros
const carregarClientes = async (
  page: number = 1, 
  search: string = '', 
  city: string = '', 
  state: string = '', 
  perPage: number = 20
) => {
  try {
    setLoading(true)
    setError(null)
    
    // Query com paginação no banco
    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('Nome', { ascending: true })

    // Aplicar filtros de busca
    const filters = []
    if (search.trim()) {
      filters.push(`Nome.ilike.%${search}%`)
      filters.push(`"Município".ilike.%${search}%`)
      filters.push(`CNPJ.ilike.%${search}%`)
    }
    if (city.trim()) {
      filters.push(`"Município".ilike.%${city}%`)
    }
    if (state.trim()) {
      filters.push(`"Sigla Estado".ilike.%${state}%`)
    }

    if (filters.length > 0) {
      query = query.or(filters.join(','))
    }

    // Aplicar paginação no banco
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao carregar clientes:', error)
      setError('Erro ao carregar clientes')
      return
    }

    // Aplicar filtro de mesclagem apenas nos registros da página atual
    const clientesFiltrados = filtrarClientesVirtuais(data || [])
    
    setClientes(clientesFiltrados)
    setTotalClientes(count || 0) // Total do banco
    setTotalPages(Math.ceil((count || 0) / perPage)) // Páginas baseadas no total
      
  } catch (err) {
    console.error('Erro:', err)
    setError('Erro inesperado ao carregar clientes')
  } finally {
    setLoading(false)
  }
}

  // Função para limpar filtros
  const clearFilters = () => {
    setSearchTerm('')
    setCityFilter('')
    setStateFilter('')
    setCurrentPage(1)
  }

  // Carregar clientes na montagem do componente
  useEffect(() => {
    carregarClientes(currentPage, searchTerm, cityFilter, stateFilter, itemsPerPage)
  }, [cityFilter, currentPage, itemsPerPage, searchTerm, stateFilter])

  // Recarregar quando filtros mudarem (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1) // Reset para primeira página ao filtrar
      carregarClientes(1, searchTerm, cityFilter, stateFilter, itemsPerPage)
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timer)
  }, [searchTerm, cityFilter, stateFilter, itemsPerPage])

  return {
    clientes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    cityFilter,
    setCityFilter,
    stateFilter,
    setStateFilter,
    totalClientes,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    clearFilters
  }
}

// Hook para buscar vendas de um cliente específico
function useVendasCliente(cliente: Cliente | null) {
  const [vendas, setVendas] = useState<VendaCliente[]>([])
  const [metricas, setMetricas] = useState<MetricasCliente | null>(null)
  const [loading, setLoading] = useState(false)


  const calcularFrequenciaCompras = (primeiraCompra: string, ultimaCompra: string, totalVendas: number): string => {
    if (!primeiraCompra || !ultimaCompra || totalVendas <= 1) return 'Cliente novo'
    
    try {
      const primeira = new Date(primeiraCompra.split('/').reverse().join('-'))
      const ultima = new Date(ultimaCompra.split('/').reverse().join('-'))
      const diffMeses = (ultima.getTime() - primeira.getTime()) / (1000 * 60 * 60 * 24 * 30)
      
      if (diffMeses <= 3) return 'Muito frequente'
      if (diffMeses <= 6) return 'Frequente'  
      if (diffMeses <= 12) return 'Regular'
      return 'Esporádico'
    } catch {
      return 'Indeterminado'
    }
  }

useEffect(() => {
  if (!cliente) {
    setVendas([])
    setMetricas(null)
    return
  }

  const carregarVendasCliente = async () => {
    try {
      setLoading(true)
      
      console.log('Buscando vendas para cliente ID:', cliente.id)
      console.log('Buscando vendas para cliente Entidade:', cliente.Entidade)
      console.log('Nome do cliente:', cliente.Nome)

      // Teste com Entidade primeiro, pois pode ser o campo correto
      const { data: vendasData, error } = await supabase
        .from('vendas')
        .select(`
             id,
    "Data de Emissao da NF",
    total,
    "Descr. Produto",
    Quantidade,
    "Preço Unitário",
    "Número da Nota Fiscal",
    cdCli,
    NomeCli
        `)
        .eq('cdCli', cliente.Entidade) // Testar com Entidade em vez de id

          .order('"Data de Emissao da NF"', { ascending: false })
          .limit(50) // Últimas 50 vendas

        if (error) {
          console.error('Erro ao carregar vendas do cliente:', error)
          return
        }

        const vendas = vendasData || []
        setVendas(vendas)

        // Calcular métricas
        if (vendas.length > 0) {
          const totalVendas = vendas.length
          const faturamentoTotal = vendas.reduce((acc, venda) => {
            const totalCalculado = calcularTotalVenda(
              venda.total,
              venda.Quantidade,
              venda['Preço Unitário']
            )
            return acc + totalCalculado
          }, 0)
          const ticketMedio = faturamentoTotal / totalVendas

          // Ordenar por data para pegar primeira e última compra
          const vendasOrdenadas = [...vendas].sort((a, b) => {
            const dataA = new Date(a['Data de Emissao da NF'].split('/').reverse().join('-'))
const dataB = new Date(b['Data de Emissao da NF'].split('/').reverse().join('-'))
            return dataA.getTime() - dataB.getTime()
          })

          const primeiraCompra = vendasOrdenadas[0]['Data de Emissao da NF']
const ultimaCompra = vendasOrdenadas[vendasOrdenadas.length - 1]['Data de Emissao da NF']

          // Cliente ativo se comprou nos últimos 6 meses
          const agora = new Date()
          const ultimaCompraDate = new Date(ultimaCompra.split('/').reverse().join('-'))
          const mesesSemCompra = (agora.getTime() - ultimaCompraDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          const statusAtivo = mesesSemCompra <= 6

          const frequenciaCompras = calcularFrequenciaCompras(primeiraCompra, ultimaCompra, totalVendas)

          setMetricas({
            totalVendas,
            faturamentoTotal,
            ticketMedio,
            primeiraCompra,
            ultimaCompra,
            statusAtivo,
            frequenciaCompras
          })
        } else {
          setMetricas({
            totalVendas: 0,
            faturamentoTotal: 0,
            ticketMedio: 0,
            primeiraCompra: null,
            ultimaCompra: null,
            statusAtivo: false,
            frequenciaCompras: 'Sem compras'
          })
        }

      } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarVendasCliente()
  }, [cliente])

  return { vendas, metricas, loading }
}

// Modal de Vendas do Cliente
function ModalVendasCliente({ cliente, isOpen, onClose }: {
  cliente: Cliente | null
  isOpen: boolean
  onClose: () => void
}) {
  const { vendas, metricas, loading } = useVendasCliente(cliente)

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (!isOpen || !cliente) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cliente.Nome}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {cliente.Município} - {cliente['Sigla Estado'] || 'SP'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Métricas do Cliente */}
              {metricas && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas do Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Card Total de Vendas */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total de Vendas</p>
                          <p className="text-2xl font-bold text-blue-900">{metricas.totalVendas}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>

                    {/* Card Faturamento Total */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Faturamento Total</p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatarMoeda(metricas.faturamentoTotal)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                      </div>
                    </div>

                    {/* Card Ticket Médio */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Ticket Médio</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {formatarMoeda(metricas.ticketMedio)}
                          </p>
                        </div>
                        <Calendar className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Status do Cliente</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            metricas.statusAtivo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {metricas.statusAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Frequência:</span>
                          <span className="text-sm font-medium">{metricas.frequenciaCompras}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Histórico de Compras</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Primeira compra:</span>
                          <span className="text-sm font-medium">
                            {metricas.primeiraCompra || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Última compra:</span>
                          <span className="text-sm font-medium">
                            {metricas.ultimaCompra || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Vendas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimas Transações</h3>
                {vendas.length > 0 ? (
                  <div className="space-y-3">
                    {vendas.map((venda) => (
                      <div key={venda.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {venda['Descr. Produto'] || 'Produto não identificado'}
                            </h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-4">
                                <span>{venda['Data de Emissao da NF']}</span>
                                <span>NF: {venda['Número da Nota Fiscal']}</span>
                                <span>Qtd: {venda.Quantidade}</span>
                              </div>
                              <div>
                                Valor unit: {formatarMoeda(parseFloat(venda['Preço Unitário']?.replace(',', '.') || '0'))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
  {formatarMoeda(calcularTotalVenda(
    venda.total,
    venda.Quantidade,
    venda['Preço Unitário']
  ))}
</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {vendas.length === 50 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">
                          Mostrando as últimas 50 transações
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma venda encontrada para este cliente</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para card de estatísticas
function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// Componente para card de cliente individual
function ClienteCard({ cliente, onVerVendas }: { 
  cliente: Cliente
  onVerVendas: (cliente: Cliente) => void 
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Nome da empresa com badge */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {cliente.Nome || 'Nome não informado'}
            </h3>
            <ClienteBadgeMesclado clienteId={cliente.id} />
          </div>
          
          {/* Informações principais em grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* CNPJ - sempre visível se existir */}
            {cliente.CNPJ && (
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                <span className="font-medium">CNPJ:</span>
                <span className="ml-1 font-mono">{cliente.CNPJ}</span>
              </div>
            )}
            
            {/* Cidade/Estado - sempre visível se existir */}
            {cliente['Município'] && (
  <div className="flex items-center text-sm text-gray-600">
    <MapPin className="w-4 h-4 mr-2 text-green-500" />
    <span className="font-medium">Local:</span>
    <span className="ml-1">{cliente['Município']} - {cliente['Sigla Estado'] || 'SP'}</span>
  </div>
)}
            
            {/* Telefone */}
            {cliente.Telefone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-purple-500" />
                <span className="font-medium">Tel:</span>
                <span className="ml-1">{cliente.Telefone}</span>
              </div>
            )}

            {/* Inscrição Estadual */}
            {cliente.InscrEst && (
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2 text-orange-500" />
                <span className="font-medium">IE:</span>
                <span className="ml-1 font-mono">{cliente.InscrEst}</span>
              </div>
            )}
          </div>

          {/* Endereço completo se disponível */}
          {cliente.endereco && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                <span className="text-xs">{cliente.endereco}</span>
              </div>
            </div>
          )}

          {/* Botão Ver Vendas */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => onVerVendas(cliente)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Ver Vendas e Métricas
            </button>
          </div>
        </div>
        
        {/* Badge da entidade e CEP */}
        <div className="flex flex-col items-end gap-2">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            ID: {cliente.Entidade || cliente.id}
          </div>
          {cliente.CEP && (
            <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono">
              {cliente.CEP}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente principal da página
export default function ClientesPage({ user }: ClientesPageProps) {
  const { 
    clientes, 
    loading, 
    error, 
    searchTerm, 
    setSearchTerm,
    cityFilter,
    setCityFilter,
    stateFilter,
    setStateFilter,
    totalClientes,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    clearFilters
  } = useClientes()

  // Estado para controlar o modal de vendas
  const [modalVendasOpen, setModalVendasOpen] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  // Função para abrir modal de vendas
  const handleVerVendas = (cliente: Cliente) => {
    setClienteSelecionado(cliente)
    setModalVendasOpen(true)
  }

  // Função para fechar modal de vendas
  const handleCloseModal = () => {
    setModalVendasOpen(false)
    setClienteSelecionado(null)
  }

  // Evita o warning do ESLint sobre user não usado
  console.log('Usuário logado:', user?.nome || 'Desconhecido')

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">❌ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-red-700 underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header da página */}
<div className="flex items-start justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
    <p className="text-gray-600 mt-1">Gerencie os clientes da Almeida&Camargo</p>
  </div>
  
  {/* Botão de duplicatas - só aparece para admin */}
  <div className="group">
    <BotaoDuplicatas user={user} />
  </div>
</div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total de Clientes"
          value={totalClientes.toLocaleString('pt-BR')}
          icon={Building2}
          color="bg-blue-500"
        />
        
        <StatCard
          title="Resultados Filtrados"
          value={clientes.length.toLocaleString('pt-BR')}
          icon={Search}
          color="bg-green-500"
        />
        
        <StatCard
  title="Cidades Atendidas"
  value={new Set(clientes.map(c => c['Município']).filter(Boolean)).size}
  icon={MapPin}
  color="bg-purple-500"
/>
      </div>

      {/* Barra de busca e filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Busca principal */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtros avançados */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filtro por cidade */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Filtrar por cidade..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por estado */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os estados</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="SC">Santa Catarina</option>
                <option value="PR">Paraná</option>
                <option value="GO">Goiás</option>
                <option value="BA">Bahia</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MT">Mato Grosso</option>
              </select>
            </div>

            {/* Botão limpar filtros */}
            {(searchTerm || cityFilter || stateFilter) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar filtros
              </button>
            )}

            {/* Selector de itens por página */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-600">Por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : clientes.length > 0 ? (
          // Lista de clientes
          <div className="space-y-4">
            {clientes.map((cliente) => (
              <ClienteCard 
                key={cliente.id} 
                cliente={cliente} 
                onVerVendas={handleVerVendas}
              />
            ))}
          </div>
        ) : (
          // Estado vazio
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || cityFilter || stateFilter ? 'Nenhum cliente encontrado' : 'Carregando clientes...'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || cityFilter || stateFilter
                ? 'Tente uma busca diferente ou limpe os filtros'
                : 'Os dados estão sendo carregados do banco'
              }
            </p>
          </div>
        )}
      </div>

      {/* Controles de paginação */}
      {!loading && clientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Informações da paginação */}
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalClientes)}</span> de{' '}
              <span className="font-medium">{totalClientes.toLocaleString('pt-BR')}</span> clientes
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
              {/* Botão página anterior */}
              <button
                onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {/* Números das páginas - versão simplificada */}
              <div className="flex items-center gap-1">
                {currentPage > 2 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      1
                    </button>
                    {currentPage > 3 && <span className="px-2 text-gray-500">...</span>}
                  </>
                )}

                {/* Páginas ao redor da atual */}
                {[currentPage - 1, currentPage, currentPage + 1].map((pageNum) => {
                  if (pageNum >= 1 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          pageNum === currentPage
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                  return null
                })}

                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Botão próxima página */}
              <button
                onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vendas */}
      <ModalVendasCliente
        cliente={clienteSelecionado}
        isOpen={modalVendasOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}