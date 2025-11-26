// src/pages/ImportacaoDados.tsx
import React, { useState, useRef } from 'react'
import { Upload, FileText, Users, Package, ShoppingCart, AlertTriangle, CheckCircle, X, Download, Search } from 'lucide-react'
import { useUserAccess } from '../hooks/useUserAccess'
import { RoleGuard } from '../components/Auth/RoleGuard'

type TipoImportacao = 'clientes' | 'vendas' | 'produtos'

interface PreviewData {
  headers: string[]
  rows: string[][]
  totalLinhas: number
  amostra: number
}

interface EstadoUpload {
  arquivo: File | null
  tipo: TipoImportacao | null
  preview: PreviewData | null
  processando: boolean
  concluido: boolean
  erro: string | null
  resultados?: {
    inseridos: number
    atualizados: number
    erros: number
    detalhes: string[]
  }
  // Novos estados para verificação de duplicatas
  verificandoDuplicatas: boolean
  duplicatasVerificadas: boolean
  duplicatasIndices: Set<number>
  progressoVerificacao: {
    atual: number
    total: number
    mensagem: string
  } | null
}

export default function ImportacaoDados() {
  const { user } = useUserAccess()
  const [estadoUpload, setEstadoUpload] = useState<EstadoUpload>({
    arquivo: null,
    tipo: null,
    preview: null,
    processando: false,
    concluido: false,
    erro: null,
    verificandoDuplicatas: false,
    duplicatasVerificadas: false,
    duplicatasIndices: new Set<number>(),
    progressoVerificacao: null
  })

  const inputFileRef = useRef<HTMLInputElement>(null)

  // Configurações por tipo de importação
  const configImportacao = {
    clientes: {
      titulo: 'Importar Clientes',
      descricao: 'Atualizar base de clientes com dados do ERP',
      icone: Users,
      cor: 'bg-blue-600 hover:bg-blue-700',
      corSecundaria: 'bg-blue-50 border-blue-200 text-blue-800',
      exemploColunas: ['Entidade', 'Nome', 'CNPJ', 'Município', 'Sigla Estado', 'Telefone'],
      tabela: 'clientes'
    },
    vendas: {
      titulo: 'Importar Vendas',
      descricao: 'Adicionar novas vendas ou atualizar existentes',
      icone: ShoppingCart,
      cor: 'bg-green-600 hover:bg-green-700',
      corSecundaria: 'bg-green-50 border-green-200 text-green-800',
      exemploColunas: ['Número da Nota Fiscal', 'Data de Emissao da NF', 'Quantidade', 'Preço Unitário', 'cdCli', 'NomeCli'],
      tabela: 'vendas'
    },
    produtos: {
      titulo: 'Importar Produtos',
      descricao: 'Atualizar catálogo de produtos/itens',
      icone: Package,
      cor: 'bg-purple-600 hover:bg-purple-700',
      corSecundaria: 'bg-purple-50 border-purple-200 text-purple-800',
      exemploColunas: ['Cód. Referência', 'Descr. Produto', 'Descr. Marca Produto', 'Descr. Grupo Produto'],
      tabela: 'itens'
    }
  }

  const selecionarTipoImportacao = (tipo: TipoImportacao) => {
    setEstadoUpload({
      arquivo: null,
      tipo,
      preview: null,
      processando: false,
      concluido: false,
      erro: null,
      verificandoDuplicatas: false,
      duplicatasVerificadas: false,
      duplicatasIndices: new Set<number>(),
      progressoVerificacao: null
    })
  }

  // Função para verificar duplicatas manualmente
  const verificarDuplicatasManual = async () => {
    if (!estadoUpload.arquivo || !estadoUpload.tipo || !user) return

    setEstadoUpload(prev => ({
      ...prev,
      verificandoDuplicatas: true,
      progressoVerificacao: { atual: 0, total: 100, mensagem: 'Iniciando verificação...' }
    }))

    try {
      // Ler arquivo completo
      const conteudoCompleto = await lerArquivoCompleto(estadoUpload.arquivo)

      // Importar utilitários
      const {
        processarCSV,
        verificarDuplicatasClientes,
        verificarDuplicatasVendas,
        verificarDuplicatasProdutos
      } = await import('../utils/csv-processor')

      const dadosCSV = processarCSV(conteudoCompleto)

      // Callback de progresso
      const onProgresso = (atual: number, total: number, mensagem: string) => {
        setEstadoUpload(prev => ({
          ...prev,
          progressoVerificacao: { atual, total, mensagem }
        }))
      }

      let duplicatasIndices: Set<number>

      // Mapear dados e verificar duplicatas baseado no tipo
      switch (estadoUpload.tipo) {
        case 'clientes': {
          const { criarMapeamentoColunas } = await import('../utils/csv-processor')
          const mapeamento = criarMapeamentoColunas(dadosCSV.headers, [
            'Entidade', 'entidade', 'codigo', 'id', 'ID',
            'Nome', 'nome', 'razao_social', 'empresa',
            'CNPJ', 'cnpj', 'documento'
          ])

          // Mapear clientes
          const clientes = dadosCSV.rows.map(linha => ({
            Entidade: linha[mapeamento.get('Entidade') ?? -1],
            Nome: linha[mapeamento.get('Nome') ?? -1],
            CNPJ: linha[mapeamento.get('CNPJ') ?? -1]
          }))

          duplicatasIndices = await verificarDuplicatasClientes(clientes, onProgresso)
          break
        }

        case 'vendas': {
          const vendas = dadosCSV.rows.map(linha => ({
            'Número da Nota Fiscal': linha[0] // Assumindo primeira coluna
          }))
          duplicatasIndices = await verificarDuplicatasVendas(vendas, onProgresso)
          break
        }

        case 'produtos': {
          const produtos = dadosCSV.rows.map(linha => ({
            'Cód. Referência': linha[0] // Assumindo primeira coluna
          }))
          duplicatasIndices = await verificarDuplicatasProdutos(produtos, onProgresso)
          break
        }

        default:
          duplicatasIndices = new Set<number>()
      }

      setEstadoUpload(prev => ({
        ...prev,
        verificandoDuplicatas: false,
        duplicatasVerificadas: true,
        duplicatasIndices,
        progressoVerificacao: null
      }))

    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error)
      setEstadoUpload(prev => ({
        ...prev,
        verificandoDuplicatas: false,
        progressoVerificacao: null,
        erro: 'Erro ao verificar duplicatas: ' + (error instanceof Error ? error.message : 'erro desconhecido')
      }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0]
    if (!arquivo) return

    // Validar tipo de arquivo
    if (!arquivo.name.toLowerCase().endsWith('.csv')) {
      setEstadoUpload(prev => ({
        ...prev,
        erro: 'Apenas arquivos CSV são aceitos'
      }))
      return
    }

    // Validar tamanho (max 10MB)
    if (arquivo.size > 10 * 1024 * 1024) {
      setEstadoUpload(prev => ({
        ...prev,
        erro: 'Arquivo muito grande. Máximo 10MB permitido.'
      }))
      return
    }

    setEstadoUpload(prev => ({
      ...prev,
      arquivo,
      erro: null
    }))

    // Ler e fazer preview do arquivo
    lerArquivoPreview(arquivo)
  }

  const lerArquivoPreview = (arquivo: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const conteudo = e.target?.result as string
        const linhas = conteudo.split('\n').filter(linha => linha.trim() !== '')
        
        if (linhas.length === 0) {
          setEstadoUpload(prev => ({
            ...prev,
            erro: 'Arquivo CSV vazio'
          }))
          return
        }

        // Primeira linha como cabeçalhos
        const headers = linhas[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
        
        // Próximas linhas como dados (máximo 5 para preview)
        const dadosLinhas = linhas.slice(1, 6)
        const rows = dadosLinhas.map(linha => 
          linha.split(',').map(celula => celula.trim().replace(/['"]/g, ''))
        )

        const preview: PreviewData = {
          headers,
          rows,
          totalLinhas: linhas.length - 1, // -1 por causa do header
          amostra: Math.min(5, dadosLinhas.length)
        }

        setEstadoUpload(prev => ({
          ...prev,
          preview,
          erro: null
        }))
      } catch (error) {
        console.error('Erro ao ler arquivo:', error)
        setEstadoUpload(prev => ({
          ...prev,
          erro: 'Erro ao processar arquivo CSV'
        }))
      }
    }

    reader.onerror = () => {
      setEstadoUpload(prev => ({
        ...prev,
        erro: 'Erro ao ler arquivo'
      }))
    }

    reader.readAsText(arquivo, 'UTF-8')
  }

  const processarImportacao = async () => {
    if (!estadoUpload.arquivo || !estadoUpload.tipo || !estadoUpload.preview || !user) return

    setEstadoUpload(prev => ({
      ...prev,
      processando: true,
      erro: null
    }))

    try {
      // Ler o arquivo completo novamente para processamento
      const conteudoCompleto = await lerArquivoCompleto(estadoUpload.arquivo)
      
      // Importar utilidades de processamento
      const { processarCSV, importarClientes, importarVendas, importarProdutos } = await import('../utils/csv-processor')
      
      // Processar CSV
      const dadosCSV = processarCSV(conteudoCompleto)
      
      let resultados
      
      // Executar importação baseada no tipo
      switch (estadoUpload.tipo) {
        case 'clientes':
          resultados = await importarClientes(dadosCSV, user)
          break
        case 'vendas':
          resultados = await importarVendas(dadosCSV, user)
          break
        case 'produtos':
          resultados = await importarProdutos(dadosCSV, user)
          break
        default:
          throw new Error('Tipo de importação inválido')
      }

      setEstadoUpload(prev => ({
        ...prev,
        processando: false,
        concluido: true,
        resultados: {
          inseridos: resultados.inseridos,
          atualizados: resultados.atualizados,
          erros: resultados.erros,
          detalhes: resultados.detalhes
        }
      }))

      // Log dos erros se houver
      if (resultados.registrosComErro.length > 0) {
        console.warn('Registros com erro:', resultados.registrosComErro)
      }

    } catch (error) {
      console.error('Erro na importação:', error)
      const mensagemErro = error instanceof Error 
        ? `Erro durante importação: ${error.message}`
        : 'Erro interno durante a importação'
      
      setEstadoUpload(prev => ({
        ...prev,
        processando: false,
        erro: mensagemErro
      }))
    }
  }

  // Função para ler arquivo completo
  const lerArquivoCompleto = (arquivo: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const conteudo = e.target?.result as string
        resolve(conteudo)
      }
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'))
      }
      
      reader.readAsText(arquivo, 'UTF-8')
    })
  }

  const resetarUpload = () => {
    setEstadoUpload({
      arquivo: null,
      tipo: null,
      preview: null,
      processando: false,
      concluido: false,
      erro: null
    })
    if (inputFileRef.current) {
      inputFileRef.current.value = ''
    }
  }

  const baixarModeloCSV = (tipo: TipoImportacao) => {
    const config = configImportacao[tipo]
    const cabecalhos = config.exemploColunas.join(',')
    const exemploLinha = config.exemploColunas.map(() => 'exemplo').join(',')
    
    const conteudoCSV = `${cabecalhos}\n${exemploLinha}`
    
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `modelo_${tipo}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <RoleGuard requireAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Importação de Dados
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Atualize as bases de dados com arquivos CSV do ERP
            </p>
          </div>

          {estadoUpload.tipo && (
            <button
              onClick={resetarUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar Importação
            </button>
          )}
        </div>

        {/* Seleção do Tipo de Importação */}
        {!estadoUpload.tipo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.entries(configImportacao) as Array<[TipoImportacao, typeof configImportacao[TipoImportacao]]>).map(([tipo, config]) => {
              const IconeComponente = config.icone
              
              return (
                <div
                  key={tipo}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-lg ${config.cor}`}>
                        <IconeComponente className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {config.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {config.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Colunas esperadas:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {config.exemploColunas.slice(0, 3).map(coluna => (
                          <span
                            key={coluna}
                            className={`px-2 py-1 text-xs rounded-md border ${config.corSecundaria}`}
                          >
                            {coluna}
                          </span>
                        ))}
                        {config.exemploColunas.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                            +{config.exemploColunas.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => selecionarTipoImportacao(tipo)}
                        className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors ${config.cor}`}
                      >
                        Importar
                      </button>
                      <button
                        onClick={() => baixarModeloCSV(tipo)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
                        title="Baixar modelo CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Interface de Upload */}
        {estadoUpload.tipo && !estadoUpload.preview && !estadoUpload.concluido && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {configImportacao[estadoUpload.tipo].titulo}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Selecione o arquivo CSV com os dados para importar
                </p>
              </div>

              {/* Área de Drop/Upload */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full">
                    <FileText className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                  </div>
                  
                  <div>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                        <Upload className="w-4 h-4" />
                        Selecionar Arquivo CSV
                      </span>
                      <input
                        ref={inputFileRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>Ou arraste e solte o arquivo aqui</p>
                    <p className="text-xs mt-1">Máximo 10MB • Apenas arquivos .CSV</p>
                  </div>
                </div>
              </div>

              {/* Erro de Upload */}
              {estadoUpload.erro && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{estadoUpload.erro}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview dos Dados */}
        {estadoUpload.preview && !estadoUpload.concluido && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Preview dos Dados
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {estadoUpload.preview.totalLinhas} registros encontrados • Mostrando primeiras {estadoUpload.preview.amostra} linhas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 text-sm font-medium rounded-full">
                    {estadoUpload.arquivo?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela de Preview */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    {estadoUpload.preview.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                  {estadoUpload.preview.rows.map((row, rowIndex) => {
                    const isDuplicata = estadoUpload.duplicatasVerificadas && estadoUpload.duplicatasIndices.has(rowIndex)
                    return (
                      <tr
                        key={rowIndex}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          isDuplicata
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'dark:bg-gray-900'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {rowIndex + 1}
                            {isDuplicata && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 text-xs rounded-full font-medium">
                                Duplicata
                              </span>
                            )}
                          </div>
                        </td>
                        {row.map((celula, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={`px-4 py-3 whitespace-nowrap text-sm max-w-xs truncate ${
                              isDuplicata
                                ? 'text-red-900 dark:text-red-200 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                            title={celula}
                          >
                            {celula || <span className="text-gray-600 dark:text-gray-300 italic">vazio</span>}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Aviso de Verificação de Duplicatas */}
            {!estadoUpload.duplicatasVerificadas && !estadoUpload.verificandoDuplicatas && (
              <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      Verificação de Duplicatas Recomendada
                    </p>
                    <p className="text-xs text-yellow-800">
                      Para arquivos grandes, recomendamos verificar duplicatas antes da importação.
                      Isso pode levar alguns minutos dependendo do tamanho do arquivo ({estadoUpload.preview.totalLinhas} registros).
                    </p>
                  </div>
                  <button
                    onClick={verificarDuplicatasManual}
                    disabled={estadoUpload.verificandoDuplicatas}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Verificar Duplicatas
                  </button>
                </div>
              </div>
            )}

            {/* Progresso da Verificação */}
            {estadoUpload.verificandoDuplicatas && estadoUpload.progressoVerificacao && (
              <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {estadoUpload.progressoVerificacao.mensagem}
                    </p>
                    <div className="mt-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(estadoUpload.progressoVerificacao.atual / estadoUpload.progressoVerificacao.total) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resultado da Verificação */}
            {estadoUpload.duplicatasVerificadas && (
              <div className={`px-6 py-4 border-t ${
                estadoUpload.duplicatasIndices.size > 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {estadoUpload.duplicatasIndices.size > 0 ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            {estadoUpload.duplicatasIndices.size} duplicatas encontradas
                          </p>
                          <p className="text-xs text-red-800">
                            Esses registros já existem no banco de dados e serão bloqueados na importação
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Nenhuma duplicata encontrada
                          </p>
                          <p className="text-xs text-green-800">
                            Todos os {estadoUpload.preview.totalLinhas} registros são novos e podem ser importados
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={verificarDuplicatasManual}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 underline"
                  >
                    Verificar Novamente
                  </button>
                </div>
              </div>
            )}

            {/* Ações do Preview */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  ✅ Arquivo válido • {estadoUpload.preview.headers.length} colunas detectadas
                  {estadoUpload.duplicatasVerificadas && (
                    <span className="ml-2">
                      • {estadoUpload.preview.totalLinhas - estadoUpload.duplicatasIndices.size} registros serão importados
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetarUpload}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={processarImportacao}
                    disabled={estadoUpload.processando || estadoUpload.verificandoDuplicatas}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {estadoUpload.processando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Importar {estadoUpload.duplicatasVerificadas
                          ? estadoUpload.preview.totalLinhas - estadoUpload.duplicatasIndices.size
                          : estadoUpload.preview.totalLinhas} Registros
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados da Importação */}
        {estadoUpload.concluido && estadoUpload.resultados && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Importação Concluída!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Os dados foram processados e atualizados na base de dados
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {estadoUpload.resultados.inseridos}
                </div>
                <div className="text-sm text-green-700">Novos Registros</div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {estadoUpload.resultados.atualizados}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Atualizados</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {estadoUpload.resultados.erros}
                </div>
                <div className="text-sm text-yellow-700">Erros/Avisos</div>
              </div>
            </div>

            {/* Detalhes */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Detalhes do Processamento:</h4>
              <div className="space-y-2">
                {estadoUpload.resultados.detalhes.map((detalhe, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <span>{detalhe}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Finais */}
            <div className="flex justify-center gap-3">
              <button
                onClick={resetarUpload}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Nova Importação
              </button>
            </div>
          </div>
        )}

        {/* Informações e Dicas */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Dicas para Importação
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Use a primeira linha para os <strong>nomes das colunas</strong></p>
                <p>• <strong>Codificação UTF-8</strong> recomendada para acentos</p>
                <p>• <strong>Faça backup</strong> antes de grandes importações</p>
                <p>• <strong>Teste primeiro</strong> com poucos registros</p>
                <p>• Registros duplicados serão <strong>atualizados automaticamente</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}