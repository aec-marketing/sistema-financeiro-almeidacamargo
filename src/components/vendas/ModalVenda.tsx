// src/components/vendas/ModalVenda.tsx
import { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useUserAccess } from '../../hooks/useUserAccess'
import { formatarMoeda, converterValor } from '../../utils/formatters'
import type { Venda } from '../../lib/supabase'

interface ModalVendaProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  vendaParaEditar?: Venda | null
  modo: 'criar' | 'editar'
}

interface FormData {
  codigoCliente: string
  codigoProduto: string
  representanteId: string
  quantidade: string
  precoUnitario: string
  dataVenda: string
  numeroNF: string
}

interface PreviewData {
  cliente?: {
    nome: string
    cidade: string
    estado: string
  }
  produto?: {
    descricao: string
    marca: string
    grupo: string
  }
}

export default function ModalVenda({
  isOpen,
  onClose,
  onSuccess,
  vendaParaEditar,
  modo
}: ModalVendaProps) {
  const { user } = useUserAccess()
  const [loading, setLoading] = useState(false)
  const [buscandoDados, setBuscandoDados] = useState(false)
  const [representantes, setRepresentantes] = useState<Array<{codigo: number, nome: string}>>([])
  const [alertaDuplicata, setAlertaDuplicata] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData>({})

  // Dados do formulário
  const [formData, setFormData] = useState<FormData>({
    codigoCliente: '',
    codigoProduto: '',
    representanteId: '',
    quantidade: '1',
    precoUnitario: '0',
    dataVenda: new Date().toISOString().split('T')[0], // Hoje por padrão
    numeroNF: ''
  })

  // Carregar representantes quando modal abre
  useEffect(() => {
    if (isOpen) {
      carregarRepresentantes()
      if (vendaParaEditar && modo === 'editar') {
        preencherFormComVenda(vendaParaEditar)
      } else {
        resetarForm()
      }
    }
  }, [isOpen, vendaParaEditar, modo])

  // Resetar form ao fechar
  useEffect(() => {
    if (!isOpen) {
      resetarForm()
      setAlertaDuplicata(null)
      setPreviewData({})
    }
  }, [isOpen])

  const resetarForm = () => {
    setFormData({
      codigoCliente: '',
      codigoProduto: '',
      representanteId: '',
      quantidade: '1',
      precoUnitario: '0',
      dataVenda: new Date().toISOString().split('T')[0],
      numeroNF: ''
    })
  }

  const preencherFormComVenda = (venda: Venda) => {
    // Função para validar e converter data
    const formatarDataParaInput = (dataString: string | null | undefined): string => {
      if (!dataString) {
        return new Date().toISOString().split('T')[0]
      }

      try {
        // Tentar criar a data
        const data = new Date(dataString)

        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
          console.warn('Data inválida encontrada:', dataString)
          return new Date().toISOString().split('T')[0]
        }

        return data.toISOString().split('T')[0]
      } catch (error) {
        console.warn('Erro ao processar data:', dataString, error)
        return new Date().toISOString().split('T')[0]
      }
    }

    setFormData({
      codigoCliente: venda.cdCli || '',
      codigoProduto: venda['Cód. Referência'] || '',
      representanteId: venda.cdRepr?.toString() || '',
      quantidade: venda.Quantidade || '1',
      precoUnitario: venda['Preço Unitário'] || '0',
      dataVenda: formatarDataParaInput(venda['Data de Emissao da NF']),
      numeroNF: venda['Número da Nota Fiscal'] || ''
    })
  }

  const carregarRepresentantes = async () => {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select('cdRepr, NomeRepr')
        .not('cdRepr', 'is', null)
        .not('NomeRepr', 'is', null)

      if (error) throw error

      // Obter representantes únicos
      const representantesUnicos = data.reduce((acc: Array<{ codigo: number, nome: string }>, venda: { cdRepr: number; NomeRepr: string }) => {
        const existe = acc.find(r => r.codigo === venda.cdRepr)
        if (!existe) {
          acc.push({
            codigo: venda.cdRepr,
            nome: venda.NomeRepr
          })
        }
        return acc
      }, [])

      representantesUnicos.sort((a, b) => a.nome.localeCompare(b.nome))
      setRepresentantes(representantesUnicos)
    } catch (error) {
      console.error('Erro ao carregar representantes:', error)
    }
  }

  const buscarDadosCliente = useCallback(async (codigo: string) => {
    if (buscandoDados) return
    setBuscandoDados(true)

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('Nome, Município, "Sigla Estado"')
        .eq('Entidade', codigo)
        .single<{ Nome: string; Município: string; 'Sigla Estado': string }>()

      if (error) throw error

      if (data) {
        setPreviewData(prev => ({
          ...prev,
          cliente: {
            nome: data?.Nome,
            cidade: data?.Município,
            estado: data?.['Sigla Estado'] || 'SP'
          }
        }))
      }
    } catch (error) {
      console.error('Cliente não encontrado:', error)
      setPreviewData(prev => ({ ...prev, cliente: undefined }))
    } finally {
      setBuscandoDados(false)
    }
  }, [buscandoDados])

  const buscarDadosProduto = useCallback(async (codigo: string) => {
    if (buscandoDados) return
    setBuscandoDados(true)

    try {
      const { data, error } = await supabase
        .from('itens')
        .select('"Descr. Produto", "Descr. Marca Produto", "Descr. Grupo Produto"')
        .eq('"Cód. Referência"', codigo)
        .single()

      if (error) throw error

      if (data) {
        setPreviewData(prev => ({
          ...prev,
          produto: {
            descricao: data['Descr. Produto'],
            marca: data['Descr. Marca Produto'],
            grupo: data['Descr. Grupo Produto']
          }
        }))
      }
    } catch (error) {
      console.error('Produto não encontrado:', error)
      setPreviewData(prev => ({ ...prev, produto: undefined }))
    } finally {
      setBuscandoDados(false)
    }
  }, [buscandoDados])

  const verificarDuplicataNF = useCallback(async (numeroNF: string) => {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select('id')
        .eq('"Número da Nota Fiscal"', numeroNF)

      if (error) throw error

      // Se estamos editando, ignorar a própria venda
      let duplicatas = data || []
      if (modo === 'editar' && vendaParaEditar) {
        duplicatas = duplicatas.filter(v => v.id !== vendaParaEditar.id)
      }

      if (duplicatas.length > 0) {
        setAlertaDuplicata(`⚠️ Já existe ${duplicatas.length} venda(s) com esta NF. Continuar mesmo assim?`)
      } else {
        setAlertaDuplicata(null)
      }
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error)
    }
  }, [modo, vendaParaEditar])

  // Buscar dados do cliente quando código muda
  useEffect(() => {
    if (formData.codigoCliente && formData.codigoCliente.length >= 2) {
      buscarDadosCliente(formData.codigoCliente)
    } else {
      setPreviewData(prev => ({ ...prev, cliente: undefined }))
    }
  }, [buscarDadosCliente, formData.codigoCliente])

  // Buscar dados do produto quando código muda
  useEffect(() => {
    if (formData.codigoProduto && formData.codigoProduto.length >= 2) {
      buscarDadosProduto(formData.codigoProduto)
    } else {
      setPreviewData(prev => ({ ...prev, produto: undefined }))
    }
  }, [buscarDadosProduto, formData.codigoProduto])

  // Verificar duplicata de NF quando número muda
  useEffect(() => {
    if (formData.numeroNF && formData.numeroNF.length >= 3) {
      verificarDuplicataNF(formData.numeroNF)
    } else {
      setAlertaDuplicata(null)
    }
  }, [formData.numeroNF, verificarDuplicataNF])

  const handleInputChange = (campo: keyof FormData, valor: string) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const calcularTotal = (): number => {
    const quantidade = parseFloat(formData.quantidade) || 0
    const precoUnitario = converterValor(formData.precoUnitario) || 0
    return quantidade * precoUnitario
  }

  const validarFormulario = (): string[] => {
    const erros: string[] = []

    if (!formData.codigoCliente.trim()) erros.push('Código do cliente é obrigatório')
    if (!formData.codigoProduto.trim()) erros.push('Código do produto é obrigatório')
    if (!formData.representanteId) erros.push('Representante é obrigatório')
    if (!formData.numeroNF.trim()) erros.push('Número da NF é obrigatório')
    if (!formData.dataVenda) erros.push('Data da venda é obrigatória')
    
    const quantidade = parseFloat(formData.quantidade)
    if (!quantidade || quantidade <= 0) erros.push('Quantidade deve ser maior que zero')
    
    const preco = converterValor(formData.precoUnitario)
    if (!preco || preco <= 0) erros.push('Preço unitário deve ser maior que zero')

    if (!previewData.cliente) erros.push('Cliente não encontrado com este código')
    if (!previewData.produto) erros.push('Produto não encontrado com este código')

    return erros
  }

  const salvarVenda = async () => {
    const erros = validarFormulario()
    if (erros.length > 0) {
      alert('Corrija os seguintes erros:\n' + erros.join('\n'))
      return
    }

    setLoading(true)

    try {
      const dadosVenda = {
        'Número da Nota Fiscal': formData.numeroNF,
        'Data de Emissao da NF': formData.dataVenda,
        'Quantidade': formData.quantidade,
        'Preço Unitário': formData.precoUnitario,
        'total': calcularTotal().toString(),
        'Cód. Referência': formData.codigoProduto,
        'cdCli': formData.codigoCliente,
        'cdRepr': parseInt(formData.representanteId),
        'NomeCli': previewData.cliente?.nome || '',
        'NomeRepr': representantes.find(r => r.codigo.toString() === formData.representanteId)?.nome || '',
        'MARCA': previewData.produto?.marca || '',
        'GRUPO': previewData.produto?.grupo || '',
        'CIDADE': previewData.cliente?.cidade || '',
        'Descr. Produto': previewData.produto?.descricao || ''
      }

      let resultado
      if (modo === 'criar') {
        const { data, error } = await supabase
          .from('vendas')
          .insert([dadosVenda])
          .select()
          .single()

        if (error) throw error
        resultado = data

        // Log de auditoria para criação
        await supabase
          .from('vendas_audit')
          .insert({
            venda_id: resultado.id,
            acao: 'CREATE',
            usuario_id: user?.id,
            usuario_nome: user?.nome,
            dados_anteriores: null,
            dados_novos: dadosVenda
          })
      } else {
        // Edição
        const { data, error } = await supabase
          .from('vendas')
          .update(dadosVenda)
          .eq('id', vendaParaEditar!.id)
          .select()
          .single()

        if (error) throw error
        resultado = data

        // Log de auditoria para edição
        await supabase
          .from('vendas_audit')
          .insert({
            venda_id: vendaParaEditar!.id,
            acao: 'UPDATE',
            usuario_id: user?.id,
            usuario_nome: user?.nome,
            dados_anteriores: vendaParaEditar,
            dados_novos: dadosVenda
          })
      }

      alert(`✅ Venda ${modo === 'criar' ? 'criada' : 'atualizada'} com sucesso!`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert(`❌ Erro ao ${modo === 'criar' ? 'criar' : 'atualizar'} venda. Tente novamente.`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {modo === 'criar' ? '➕ Nova Venda' : '✏️ Editar Venda'}
          </h2>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-6">
          {/* Código do Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Código do Cliente *
            </label>
            <input
              type="text"
              value={formData.codigoCliente}
              onChange={(e) => handleInputChange('codigoCliente', e.target.value)}
              placeholder="Digite o código do cliente"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            {previewData.cliente && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800">
                    {previewData.cliente.nome}
                  </span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  📍 {previewData.cliente.cidade} - {previewData.cliente.estado}
                </div>
              </div>
            )}
          </div>

          {/* Código do Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Código do Produto *
            </label>
            <input
              type="text"
              value={formData.codigoProduto}
              onChange={(e) => handleInputChange('codigoProduto', e.target.value)}
              placeholder="Digite o código do produto"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            {previewData.produto && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800">
                    {previewData.produto.descricao}
                  </span>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  🏷️ {previewData.produto.marca} • 📦 {previewData.produto.grupo}
                </div>
              </div>
            )}
          </div>

          {/* Representante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Representante *
            </label>
            <select
              value={formData.representanteId}
              onChange={(e) => handleInputChange('representanteId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Selecione um representante</option>
              {representantes.map(repr => (
                <option key={repr.codigo} value={repr.codigo}>
                  {repr.nome} (#{repr.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Grid: Quantidade e Preço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Quantidade *
              </label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Preço Unitário *
              </label>
              <input
                type="text"
                value={formData.precoUnitario}
                onChange={(e) => handleInputChange('precoUnitario', e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Grid: Data e NF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Data da Venda *
              </label>
              <input
                type="date"
                value={formData.dataVenda}
                onChange={(e) => handleInputChange('dataVenda', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Número da NF *
              </label>
              <input
                type="text"
                value={formData.numeroNF}
                onChange={(e) => handleInputChange('numeroNF', e.target.value)}
                placeholder="Número da nota fiscal"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Alerta de Duplicata */}
          {alertaDuplicata && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">{alertaDuplicata}</span>
              </div>
            </div>
          )}

          {/* Total Calculado */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Total da Venda:</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatarMoeda(calcularTotal())}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvarVenda}
            disabled={loading || buscandoDados}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {modo === 'criar' ? 'Criar Venda' : 'Atualizar Venda'}
          </button>
        </div>
      </div>
    </div>
  )
}