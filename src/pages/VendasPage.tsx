// src/pages/VendasPage.tsx (VERSÃO ATUALIZADA COM CRUD)
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, Plus, Edit3, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUserAccess } from '../hooks/useUserAccess'
import { formatarData, formatarMoeda, converterValor } from '../utils/formatters'
import { calcularTotalVenda } from '../utils/calcular-total'
import { registrarAuditoria } from '../utils/vendas-audit'
import ModalVenda from '../components/vendas/ModalVenda'
import CopyButton from '../components/CopyButton'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendas</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {totalVendas.toLocaleString()} venda{totalVendas !== 1 ? 's' : ''} encontrada{totalVendas !== 1 ? 's' : ''}
            {user?.role === 'consultor_vendas' ? ' (suas vendas)' : ''}
          </p>
        </div>

        {/* Botão Nova Venda - Apenas para Admin */}
        {isAdmin && (
          <button
            onClick={abrirModalCriacao}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm dark:shadow-gray-900/50"
          >
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por cliente, produto, representante ou NF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtro por cidade */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300 w-4 h-4" />
            <select
              value={filtroCity}
              onChange={(e) => setFiltroCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800"
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
          <p className="text-gray-600 dark:text-gray-300 mt-2">Carregando vendas...</p>
        </div>
      )}

      {/* Tabela de Vendas - MOBILE OPTIMIZED */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 overflow-hidden">

          {vendas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {debouncedSearchTerm || filtroCity
                  ? 'Nenhuma venda encontrada com os filtros aplicados'
                  : 'Nenhuma venda encontrada'
                }
              </p>
              {isAdmin && !debouncedSearchTerm && !filtroCity && (
                <button
                  onClick={abrirModalCriacao}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeira venda
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Versão Desktop - Tabela com indicador de scroll */}
              <div className="hidden lg:block relative">
                {/* Indicador de scroll - gradiente no final */}
                <div className="absolute right-0 top-0 bottom-12 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          NF
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          Produto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          Cidade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap text-right">
                          Qtd
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap text-right">
                          Preço Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap text-right">
                          Total
                        </th>
                        {isAdmin && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            Ações
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                      {vendas.map((venda) => (
                        <tr key={venda.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatarData(venda['Data de Emissao da NF'])}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              {venda['Número da Nota Fiscal']}
                              <CopyButton
                                text={venda['Número da Nota Fiscal']}
                                successMessage="Número da NF copiado!"
                                iconSize={12}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-[200px] truncate" title={venda.NomeCli || 'N/A'}>
                              {venda.NomeCli || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-[250px]">
                              <div className="font-medium truncate" title={venda['Cód. Referência']}>
                                {venda['Cód. Referência'] || 'N/A'}
                              </div>
                              <div className="text-gray-600 dark:text-gray-300 text-xs truncate" title={venda['Descr. Produto']}>
                                {venda['Descr. Produto'] || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {venda.CIDADE}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                            {venda.Quantidade}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                            {formatarMoeda(converterValor(venda['Preço Unitário'] || '0'))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatarMoeda(calcularTotalVenda(venda.total, venda.Quantidade, venda['Preço Unitário']))}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => abrirModalEdicao(venda)}
                                  disabled={excluindoVenda === venda.id}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50"
                                  title="Editar venda"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => confirmarExclusao(venda)}
                                  disabled={excluindoVenda === venda.id}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-50 dark:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
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

                {/* Hint de scroll */}
                <div className="text-center py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
                  ← Deslize para ver mais colunas →
                </div>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <div key={venda.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                    {/* Header: Produto + Valor */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {venda['Cód. Referência'] || 'N/A'}
                        </p>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                          {venda['Descr. Produto'] || 'N/A'}
                        </h3>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                          {formatarMoeda(calcularTotalVenda(venda.total, venda.Quantidade, venda['Preço Unitário']))}
                        </p>
                      </div>
                    </div>

                    {/* Cliente e Cidade */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Cliente</p>
                      <p className="text-sm text-gray-900 dark:text-white">{venda.NomeCli || 'N/A'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{venda.CIDADE}</p>
                    </div>

                    {/* Detalhes da Venda */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Quantidade</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{venda.Quantidade}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Preço Unit.</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatarMoeda(converterValor(venda['Preço Unitário'] || '0'))}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Data, NF e Ações */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatarData(venda['Data de Emissao da NF'])}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600 dark:text-gray-300">NF: {venda['Número da Nota Fiscal']}</span>
                          <CopyButton
                            text={venda['Número da Nota Fiscal']}
                            successMessage="Número da NF copiado!"
                            iconSize={12}
                          />
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => abrirModalEdicao(venda)}
                            disabled={excluindoVenda === venda.id}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50"
                            title="Editar venda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmarExclusao(venda)}
                            disabled={excluindoVenda === venda.id}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-50 dark:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                            title="Excluir venda"
                          >
                            {excluindoVenda === venda.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-200">
              Página {currentPage} de {totalPages} • {totalVendas.toLocaleString()} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${ currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100' }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Visualização de Consultor
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
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


