// src/pages/VendasPage.tsx (VERSÃO ATUALIZADA COM CRUD)
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, Plus, Edit3, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUserAccess } from '../hooks/useUserAccess'
import { formatarData, formatarMoeda, converterValor } from '../utils/formatters'
import { calcularTotalVenda } from '../utils/calcular-total'
import { registrarAuditoria } from '../utils/vendas-audit'
import ModalVenda from '../components/vendas/ModalVenda'
import type { Venda } from '../lib/supabase'

const ITENS_POR_PAGINA = 20

export default function VendasPage() {
  const { user, isAdmin } = useUserAccess()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCity, setFiltroCity] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalVendas, setTotalVendas] = useState(0)

  // Estados do CRUD Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modoModal, setModoModal] = useState<'criar' | 'editar'>('criar')
  const [vendaEditando, setVendaEditando] = useState<Venda | null>(null)
  const [excluindoVenda, setExcluindoVenda] = useState<number | null>(null)

  // Debounce para search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filtroCity])

  const carregarVendas = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('vendas')
        .select(`
          *
        `, { count: 'exact' })

      // Filtrar por representante se for consultor
      if (user.role === 'consultor_vendas' && user.cd_representante) {
        query = query.eq('cdRepr', user.cd_representante)
      }

      // Aplicar filtros de busca
      if (debouncedSearchTerm) {
        query = query.or(`NomeCli.ilike.%${debouncedSearchTerm}%,NomeRepr.ilike.%${debouncedSearchTerm}%,"Descr. Produto".ilike.%${debouncedSearchTerm}%,"Número da Nota Fiscal".ilike.%${debouncedSearchTerm}%`)
      }

      if (filtroCity) {
        query = query.eq('CIDADE', filtroCity)
      }

      // Paginação
      const from = (currentPage - 1) * ITENS_POR_PAGINA
      const to = from + ITENS_POR_PAGINA - 1

      query = query.range(from, to).order('id', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Erro ao carregar vendas:', error)
        return
      }

      setVendas(data || [])
      setTotalVendas(count || 0)
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    } finally {
      setLoading(false)
    }
  }, [user, debouncedSearchTerm, filtroCity, currentPage])

  // Carregar vendas quando filtros ou página mudam
  useEffect(() => {
    if (user) {
      carregarVendas()
    }
  }, [user, currentPage, debouncedSearchTerm, filtroCity, carregarVendas])

  // Cidades únicas para o filtro
  const cidades = useMemo(() => {
    return Array.from(new Set(vendas.map(v => v.CIDADE).filter(Boolean))).sort()
  }, [vendas])

  const totalPages = Math.ceil(totalVendas / ITENS_POR_PAGINA)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Funções do CRUD
  const abrirModalCriacao = () => {
    setModoModal('criar')
    setVendaEditando(null)
    setModalAberto(true)
  }

  const abrirModalEdicao = (venda: Venda) => {
    setModoModal('editar')
    setVendaEditando(venda)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setVendaEditando(null)
  }

  const onSucessoCRUD = () => {
    carregarVendas() // Recarregar lista após sucesso
    fecharModal()
  }

  const confirmarExclusao = async (venda: Venda) => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO!\n\nTem certeza que deseja EXCLUIR esta venda?\n\n` +
      `🏢 Cliente: ${venda.NomeCli}\n` +
      `📦 Produto: ${venda['Descr. Produto'] || 'N/A'}\n` +
      `💰 Valor: ${formatarMoeda(calcularTotalVenda(venda.total, venda.Quantidade, venda['Preço Unitário']))}\n` +
      `📋 NF: ${venda['Número da Nota Fiscal']}\n\n` +
      `Esta ação não pode ser desfeita!`
    )

    if (!confirmacao) return

    setExcluindoVenda(venda.id)

    try {
      // Registrar auditoria ANTES da exclusão
      if (user) {
        await registrarAuditoria(venda.id, 'DELETE', user, venda, undefined)
      }

      // Excluir venda
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', venda.id)

      if (error) {
        console.error('Erro ao excluir venda:', error)
        alert('❌ Erro ao excluir venda. Tente novamente.')
        return
      }

      alert('✅ Venda excluída com sucesso!')
      carregarVendas() // Recarregar lista
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      alert('❌ Erro interno ao excluir venda.')
    } finally {
      setExcluindoVenda(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">
            {totalVendas.toLocaleString()} venda{totalVendas !== 1 ? 's' : ''} encontrada{totalVendas !== 1 ? 's' : ''}
            {user?.role === 'consultor_vendas' ? ' (suas vendas)' : ''}
          </p>
        </div>

        {/* Botão Nova Venda - Apenas para Admin */}
        {isAdmin && (
          <button
            onClick={abrirModalCriacao}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por cliente, produto, representante ou NF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtro por cidade */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filtroCity}
              onChange={(e) => setFiltroCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">Todas as cidades</option>
              {cidades.map(cidade => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Carregando vendas...</p>
        </div>
      )}

      {/* Tabela de Vendas */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Unit.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NF
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {venda['Cód. Referência'] || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {venda['Descr. Produto'] || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{venda.NomeCli || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{venda.CIDADE}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(venda['Data de Emissao da NF'])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venda.Quantidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarMoeda(converterValor(venda['Preço Unitário'] || '0'))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">
                        {formatarMoeda(calcularTotalVenda(
                          venda.total,
                          venda.Quantidade,
                          venda['Preço Unitário']
                        ))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venda['Número da Nota Fiscal']}
                    </td>
                    
                    {/* Coluna de Ações - Apenas para Admin */}
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botão Editar */}
                          <button
                            onClick={() => abrirModalEdicao(venda)}
                            disabled={excluindoVenda === venda.id}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Editar venda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Botão Excluir */}
                          <button
                            onClick={() => confirmarExclusao(venda)}
                            disabled={excluindoVenda === venda.id}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Excluir venda"
                          >
                            {excluindoVenda === venda.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mensagem quando não há vendas */}
          {vendas.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 mt-2">
                {debouncedSearchTerm || filtroCity 
                  ? 'Nenhuma venda encontrada com os filtros aplicados' 
                  : 'Nenhuma venda encontrada'
                }
              </p>
              {isAdmin && !debouncedSearchTerm && !filtroCity && (
                <button
                  onClick={abrirModalCriacao}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeira venda
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && !loading && (
        <div className="bg-white rounded-xl shadow-sm px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Página {currentPage} de {totalPages} • {totalVendas.toLocaleString()} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (pageNum > totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de CRUD */}
      <ModalVenda
        isOpen={modalAberto}
        onClose={fecharModal}
        onSuccess={onSucessoCRUD}
        vendaParaEditar={vendaEditando}
        modo={modoModal}
      />

      {/* Alerta de permissão para consultores */}
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Visualização de Consultor
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Você está visualizando apenas suas vendas. Para gerenciar todas as vendas, 
                entre em contato com um administrador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


