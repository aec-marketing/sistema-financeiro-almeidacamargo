/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/csv-processor.ts
import { supabase } from '../lib/supabase'
import { registrarAuditoria } from './vendas-audit'
import type { UserProfile } from '../lib/supabase'

export interface ResultadoImportacao {
  inseridos: number
  atualizados: number
  erros: number
  detalhes: string[]
  registrosComErro: Array<{
    linha: number
    dados: any
    erro: string
  }>
}

export interface DadosCSV {
  headers: string[]
  rows: string[][]
}

/**
 * Processa arquivo CSV e retorna dados estruturados
 */
export function processarCSV(conteudo: string): DadosCSV {
  const linhas = conteudo
    .split('\n')
    .map(linha => linha.trim())
    .filter(linha => linha.length > 0)

  if (linhas.length === 0) {
    throw new Error('Arquivo CSV vazio')
  }

  // Detectar separador automaticamente
  const separador = detectarSeparador(linhas[0])
  console.log('🔍 Separador detectado:', separador === ';' ? 'ponto e vírgula (;)' : 'vírgula (,)')

  // Primeira linha como cabeçalhos
  const headers = parsearLinhaCSV(linhas[0], separador)
  
  // Demais linhas como dados
  const rows = linhas.slice(1).map(linha => parsearLinhaCSV(linha, separador))

  console.log('📊 Headers encontrados:', headers)
  console.log('📝 Primeira linha de dados:', rows[0])

  return { headers, rows }
}

/**
 * Detecta o separador do CSV (vírgula ou ponto e vírgula)
 */
function detectarSeparador(primeiraLinha: string): string {
  const contadorVirgula = (primeiraLinha.match(/,/g) || []).length
  const contadorPontoVirgula = (primeiraLinha.match(/;/g) || []).length
  
  console.log('🔢 Vírgulas encontradas:', contadorVirgula)
  console.log('🔢 Ponto e vírgulas encontradas:', contadorPontoVirgula)
  
  // Se tem mais ponto e vírgula que vírgula, usar ponto e vírgula
  return contadorPontoVirgula > contadorVirgula ? ';' : ','
}

/**
 * Parseia uma linha CSV considerando aspas e separadores
 */
function parsearLinhaCSV(linha: string, separador: string = ','): string[] {
  const resultado: string[] = []
  let atual = ''
  let dentroAspas = false
  
  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]
    
    if (char === '"') {
      dentroAspas = !dentroAspas
    } else if (char === separador && !dentroAspas) {
      resultado.push(atual.trim())
      atual = ''
    } else {
      atual += char
    }
  }
  
  resultado.push(atual.trim())
  return resultado.map(item => item.replace(/^"|"$/g, '')) // Remove aspas das pontas
}

/**
 * Importa dados de clientes
 */
export async function importarClientes(
  dadosCSV: DadosCSV,
  usuario: UserProfile
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = {
    inseridos: 0,
    atualizados: 0,
    erros: 0,
    detalhes: [],
    registrosComErro: []
  }

  // Mapeamento das colunas mais comuns
  const mapeamentoColunas = criarMapeamentoColunas(dadosCSV.headers, [
    'Entidade', 'entidade', 'codigo', 'id', 'ID',
    'Nome', 'nome', 'razao_social', 'empresa',
    'CNPJ', 'cnpj', 'documento',
    'Município', 'municipio', 'cidade',
    'Sigla Estado', 'estado', 'uf', 'UF',
    'Telefone', 'telefone', 'fone',
    'CEP', 'cep',
    'endereco', 'endereço',
    'InscrEst', 'inscrest', 'inscricao_estadual', 'ie', 'IE', 'Inscr Est',
    'C.N.A.E.', 'CNAE', 'cnae', 'C.N.A.E', 'atividade', 'codigo_atividade'
  ])

  resultado.detalhes.push(`📊 Processando ${dadosCSV.rows.length} registros de clientes`)
  resultado.detalhes.push(`🗂️ Colunas detectadas: ${dadosCSV.headers.join(', ')}`)

  for (let i = 0; i < dadosCSV.rows.length; i++) {
    const linha = dadosCSV.rows[i]
    
    try {
      const cliente = mapearDadosCliente(dadosCSV.headers, linha, mapeamentoColunas)
      
      if (!cliente.Entidade) {
        resultado.erros++
        resultado.registrosComErro.push({
          linha: i + 2, // +2 porque linha 1 é header e arrays começam em 0
          dados: linha,
          erro: 'Campo Entidade/ID obrigatório não encontrado'
        })
        continue
      }

      // Verificar se cliente já existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('Entidade', cliente.Entidade)
        .single()

      if (clienteExistente) {
        // Atualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update(cliente)
          .eq('Entidade', cliente.Entidade)

        if (error) throw error
        resultado.atualizados++
      } else {
        // Inserir novo cliente
        const { error } = await supabase
          .from('clientes')
          .insert([cliente])

        if (error) throw error
        resultado.inseridos++
      }
    } catch (error) {
      resultado.erros++
      resultado.registrosComErro.push({
        linha: i + 2,
        dados: linha,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  // Registrar auditoria
  await registrarAuditoria(
    0, // ID genérico para importação
    'CREATE',
    usuario,
    undefined,
    {
      tipo: 'importacao_clientes',
      inseridos: resultado.inseridos,
      atualizados: resultado.atualizados,
      erros: resultado.erros
    }
  )

  resultado.detalhes.push(`✅ ${resultado.inseridos} clientes inseridos`)
  resultado.detalhes.push(`🔄 ${resultado.atualizados} clientes atualizados`)
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro`)
  }

  return resultado
}

/**
 * Importa dados de vendas
 */
export async function importarVendas(
  dadosCSV: DadosCSV,
  usuario: UserProfile
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = {
    inseridos: 0,
    atualizados: 0,
    erros: 0,
    detalhes: [],
    registrosComErro: []
  }

  const mapeamentoColunas = criarMapeamentoColunas(dadosCSV.headers, [
    'Número da Nota Fiscal', 'numero_nf', 'nf', 'nota_fiscal',
    'Data de Emissao da NF', 'data_emissao', 'data', 'data_venda',
    'Quantidade', 'quantidade', 'qtd', 'qty',
    'Preço Unitário', 'preco_unitario', 'preco', 'valor_unitario',
    'total', 'valor_total', 'Total',
    'Cód. Referência', 'codigo_produto', 'cod_produto', 'produto_codigo',
    'Descr. Produto', 'descricao_produto', 'descricao', 'produto',
    'Cod de Natureza de Operação', 'cod_natureza', 'natureza_operacao',
    'Código Fiscal da Operação', 'codigo_fiscal', 'cfop',
    'Descr de Natureza de Operação', 'descr_natureza', 'desc_natureza',
    'Cód. Subgrupo de Produto', 'cod_subgrupo', 'subgrupo_codigo',
    'Desc. Subgrupo de Produto', 'desc_subgrupo', 'subgrupo_desc',
    'cdEmpresa', 'codigo_empresa', 'empresa_codigo',
    'NomeEmpresa', 'nome_empresa', 'empresa',
    'Valor Icms Total', 'valor_icms', 'icms_total',
    'Valor do IPI', 'valor_ipi', 'ipi',
    'Base de Calc Icms', 'base_icms', 'base_calculo_icms',
    'VlrBaseICMSTotItem', 'vlr_base_icms', 'base_icms_item',
    'VlrIpiTotItem', 'vlr_ipi_item', 'ipi_item',
    'cdCli', 'codigo_cliente', 'cliente_codigo',
    'cdRepr', 'codigo_representante', 'representante_codigo',
    'NomeCli', 'nome_cliente', 'cliente',
    'NomeRepr', 'nome_representante', 'representante',
    'MARCA', 'marca', 'Marca',
    'GRUPO', 'grupo', 'categoria',
    'CIDADE', 'cidade', 'municipio'
  ])

  resultado.detalhes.push(`📊 Processando ${dadosCSV.rows.length} registros de vendas`)

  for (let i = 0; i < dadosCSV.rows.length; i++) {
    const linha = dadosCSV.rows[i]
    
    try {
      const venda = mapearDadosVenda(dadosCSV.headers, linha, mapeamentoColunas)
      
      if (!venda['Número da Nota Fiscal']) {
        resultado.erros++
        resultado.registrosComErro.push({
          linha: i + 2,
          dados: linha,
          erro: 'Número da NF obrigatório não encontrado'
        })
        continue
      }

      // Verificar se venda já existe
      const { data: vendaExistente } = await supabase
        .from('vendas')
        .select('id')
        .eq('"Número da Nota Fiscal"', venda['Número da Nota Fiscal'])
        .single()

      if (vendaExistente) {
        // Atualizar venda existente
        const { error } = await supabase
          .from('vendas')
          .update(venda)
          .eq('"Número da Nota Fiscal"', venda['Número da Nota Fiscal'])

        if (error) throw error
        resultado.atualizados++
      } else {
        // Inserir nova venda
        const { error } = await supabase
          .from('vendas')
          .insert([venda])

        if (error) throw error
        resultado.inseridos++
      }
    } catch (error) {
      resultado.erros++
      resultado.registrosComErro.push({
        linha: i + 2,
        dados: linha,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  // Registrar auditoria
  await registrarAuditoria(
    0,
    'CREATE',
    usuario,
    undefined,
    {
      tipo: 'importacao_vendas',
      inseridos: resultado.inseridos,
      atualizados: resultado.atualizados,
      erros: resultado.erros
    }
  )

  resultado.detalhes.push(`✅ ${resultado.inseridos} vendas inseridas`)
  resultado.detalhes.push(`🔄 ${resultado.atualizados} vendas atualizadas`)
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro`)
  }

  return resultado
}

/**
 * Importa dados de produtos/itens
 */
export async function importarProdutos(
  dadosCSV: DadosCSV,
  usuario: UserProfile
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = {
    inseridos: 0,
    atualizados: 0,
    erros: 0,
    detalhes: [],
    registrosComErro: []
  }

  const mapeamentoColunas = criarMapeamentoColunas(dadosCSV.headers, [
    'Cód. Referência', 'codigo_referencia', 'codigo', 'cod_produto',
    'Descr. Produto', 'descricao_produto', 'descricao', 'produto',
    'Descr. Resumo Produto', 'resumo_produto', 'descr_resumo', 'resumo',
    'Cód. do Produto', 'codigo_do_produto', 'cod_interno',
    'Compl. Cód. do Produto', 'complemento_codigo', 'compl_codigo',
    'Faixa do ICMS', 'faixa_icms', 'icms_faixa',
    'Peso Bruto Kg', 'peso_bruto', 'peso',
    'Peso Liquido Kg', 'peso_liquido', 'peso_liq',
    'Status Importado/Nacional', 'status_importado', 'origem',
    'Status de Tipo de Produto', 'status_tipo', 'tipo_produto',
    'Cód. Categoria de Grupo', 'cod_categoria_grupo', 'categoria_codigo',
    'Descr. Categoria de Grupo', 'descr_categoria_grupo', 'categoria_desc',
    'Cód. Subgrupo de Produto', 'cod_subgrupo', 'subgrupo_codigo',
    'Desc. Subgrupo de Produto', 'desc_subgrupo', 'subgrupo_desc',
    'Cód. Grupo Produto', 'cod_grupo', 'grupo_codigo',
    'Descr. Grupo Produto', 'descr_grupo', 'grupo_desc',
    'Código Cat Prod', 'codigo_cat_prod', 'cat_prod',
    'Descr. Categoria de Prod', 'descr_categoria_prod', 'categoria_produto',
    'N.B.M.', 'NBM', 'nbm', 'ncm',
    'Aliquota de IPI', 'aliquota_ipi', 'ipi_aliquota',
    'Cód. Marca Produtos', 'cod_marca', 'marca_codigo',
    'Descr. Marca Produto', 'descr_marca', 'marca', 'fabricante',
    'Cód. Conta Contábil Reduzida', 'cod_conta_contabil', 'conta_codigo',
    'Descr. Conta Contabil', 'descr_conta_contabil', 'conta_desc',
    'cd_ctcResult', 'cd_ctc_result', 'ctc_codigo',
    'ds_ctcResult', 'ds_ctc_result', 'ctc_desc',
    'Cód. Unidade de Medida', 'cod_unidade', 'unidade_codigo',
    'Descr. Unidade de Medida', 'descr_unidade', 'unidade_desc',
    'Código EAN 13', 'codigo_ean', 'ean13', 'codigo_barras',
    'Largura', 'largura', 'width',
    'Altura', 'altura', 'height',
    'Comprimento', 'comprimento', 'length',
    'Detalhamento Técnico', 'detalhamento_tecnico', 'especificacoes', 'detalhes'
  ])

  resultado.detalhes.push(`📊 Processando ${dadosCSV.rows.length} registros de produtos`)

  for (let i = 0; i < dadosCSV.rows.length; i++) {
    const linha = dadosCSV.rows[i]
    
    try {
      const produto = mapearDadosProduto(dadosCSV.headers, linha, mapeamentoColunas)
      
      if (!produto['Cód. Referência']) {
        resultado.erros++
        resultado.registrosComErro.push({
          linha: i + 2,
          dados: linha,
          erro: 'Código de Referência obrigatório não encontrado'
        })
        continue
      }

      // Verificar se produto já existe
      const { data: produtoExistente } = await supabase
        .from('itens')
        .select('id')
        .eq('"Cód. Referência"', produto['Cód. Referência'])
        .single()

      if (produtoExistente) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('itens')
          .update(produto)
          .eq('"Cód. Referência"', produto['Cód. Referência'])

        if (error) throw error
        resultado.atualizados++
      } else {
        // Inserir novo produto
        const { error } = await supabase
          .from('itens')
          .insert([produto])

        if (error) throw error
        resultado.inseridos++
      }
    } catch (error) {
      resultado.erros++
      resultado.registrosComErro.push({
        linha: i + 2,
        dados: linha,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }

  // Registrar auditoria
  await registrarAuditoria(
    0,
    'CREATE',
    usuario,
    undefined,
    {
      tipo: 'importacao_produtos',
      inseridos: resultado.inseridos,
      atualizados: resultado.atualizados,
      erros: resultado.erros
    }
  )

  resultado.detalhes.push(`✅ ${resultado.inseridos} produtos inseridos`)
  resultado.detalhes.push(`🔄 ${resultado.atualizados} produtos atualizados`)
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro`)
  }

  return resultado
}

/**
 * Cria mapeamento inteligente de colunas
 */
function criarMapeamentoColunas(headers: string[], possiveisNomes: string[]): Map<string, number> {
  const mapeamento = new Map<string, number>()
  
  headers.forEach((header, index) => {
    const headerLimpo = header.toLowerCase().trim()
    
    // Procurar correspondência exata primeiro
    const correspondencia = possiveisNomes.find(nome => 
      nome.toLowerCase() === headerLimpo
    )
    
    if (correspondencia) {
      mapeamento.set(correspondencia, index)
      return
    }
    
    // Procurar correspondência parcial
    const correspondenciaParcial = possiveisNomes.find(nome =>
      headerLimpo.includes(nome.toLowerCase()) ||
      nome.toLowerCase().includes(headerLimpo)
    )
    
    if (correspondenciaParcial) {
      mapeamento.set(correspondenciaParcial, index)
    }
  })
  
  return mapeamento
}

/**
 * Mapeia dados de linha CSV para objeto Cliente
 */
interface Cliente {
  Entidade?: string;
  Nome?: string;
  CNPJ?: string;
  Município?: string;
  'Sigla Estado'?: string;
  Telefone?: string;
  CEP?: string;
  endereco?: string;
  InscrEst?: string;
  'C.N.A.E.'?: string;
}

function mapearDadosCliente(headers: string[], linha: string[], mapeamento: Map<string, number>): Cliente {
  const cliente: Cliente = {}
  
  // Campos obrigatórios com fallbacks
  cliente.Entidade = obterValor(linha, headers, mapeamento, ['Entidade', 'entidade', 'codigo', 'id', 'ID'])
  cliente.Nome = obterValor(linha, headers, mapeamento, ['Nome', 'nome', 'razao_social', 'empresa'])
  cliente.CNPJ = obterValor(linha, headers, mapeamento, ['CNPJ', 'cnpj', 'documento'])
  cliente['Município'] = obterValor(linha, headers, mapeamento, ['Município', 'municipio', 'cidade'])
  cliente['Sigla Estado'] = obterValor(linha, headers, mapeamento, ['Sigla Estado', 'estado', 'uf', 'UF']) || 'SP'
  cliente.Telefone = obterValor(linha, headers, mapeamento, ['Telefone', 'telefone', 'fone'])
  cliente.CEP = obterValor(linha, headers, mapeamento, ['CEP', 'cep'])
  cliente.endereco = obterValor(linha, headers, mapeamento, ['endereco', 'endereço'])
  
  // Campos adicionais que estavam faltando
  const inscricaoEstadual = obterValor(linha, headers, mapeamento, ['InscrEst', 'inscrest', 'inscricao_estadual', 'ie', 'IE', 'Inscr Est'])
  const cnae = obterValor(linha, headers, mapeamento, ['C.N.A.E.', 'CNAE', 'cnae', 'C.N.A.E', 'atividade', 'codigo_atividade'])
  
  // Corrigir notação científica da Inscrição Estadual
  if (inscricaoEstadual) {
    if (inscricaoEstadual.includes('E+') || inscricaoEstadual.includes('e+')) {
      // Converter de notação científica para número normal
      const numeroConvertido = parseFloat(inscricaoEstadual).toString()
      cliente.InscrEst = numeroConvertido
    } else {
      cliente.InscrEst = inscricaoEstadual
    }
  }
  
  if (cnae) {
    cliente['C.N.A.E.'] = cnae
  }
  
  console.log('🗂️ Cliente mapeado:', {
    Entidade: cliente.Entidade,
    Nome: cliente.Nome,
    InscrEst: cliente.InscrEst,
    'C.N.A.E.': cliente['C.N.A.E.']
  })
  
  return cliente
}

/**
 * Mapeia dados de linha CSV para objeto Venda
 */
function mapearDadosVenda(headers: string[], linha: string[], mapeamento: Map<string, number>): any {
  const venda: any = {}
  
  // Campos básicos
  venda['Número da Nota Fiscal'] = obterValor(linha, headers, mapeamento, ['Número da Nota Fiscal', 'numero_nf', 'nf', 'nota_fiscal'])
  venda['Data de Emissao da NF'] = obterValor(linha, headers, mapeamento, ['Data de Emissao da NF', 'data_emissao', 'data', 'data_venda'])
  venda.Quantidade = obterValor(linha, headers, mapeamento, ['Quantidade', 'quantidade', 'qtd', 'qty'])
  venda['Preço Unitário'] = obterValor(linha, headers, mapeamento, ['Preço Unitário', 'preco_unitario', 'preco', 'valor_unitario'])
  venda.total = obterValor(linha, headers, mapeamento, ['total', 'valor_total', 'Total'])
  
  // Produto
  venda['Cód. Referência'] = obterValor(linha, headers, mapeamento, ['Cód. Referência', 'codigo_produto', 'cod_produto'])
  venda['Descr. Produto'] = obterValor(linha, headers, mapeamento, ['Descr. Produto', 'descricao_produto', 'descricao', 'produto'])
  
  // Natureza da operação
  venda['Cod de Natureza de Operação'] = obterValor(linha, headers, mapeamento, ['Cod de Natureza de Operação', 'cod_natureza', 'natureza_operacao'])
  venda['Código Fiscal da Operação'] = obterValor(linha, headers, mapeamento, ['Código Fiscal da Operação', 'codigo_fiscal', 'cfop'])
  venda['Descr de Natureza de Operação'] = obterValor(linha, headers, mapeamento, ['Descr de Natureza de Operação', 'descr_natureza', 'desc_natureza'])
  
  // Subgrupo
  venda['Cód. Subgrupo de Produto'] = obterValor(linha, headers, mapeamento, ['Cód. Subgrupo de Produto', 'cod_subgrupo', 'subgrupo_codigo'])
  venda['Desc. Subgrupo de Produto'] = obterValor(linha, headers, mapeamento, ['Desc. Subgrupo de Produto', 'desc_subgrupo', 'subgrupo_desc'])
  
  // Empresa
  venda.cdEmpresa = obterValor(linha, headers, mapeamento, ['cdEmpresa', 'codigo_empresa', 'empresa_codigo'])
  venda.NomeEmpresa = obterValor(linha, headers, mapeamento, ['NomeEmpresa', 'nome_empresa', 'empresa'])
  
  // Valores fiscais
  venda['Valor Icms Total'] = obterValor(linha, headers, mapeamento, ['Valor Icms Total', 'valor_icms', 'icms_total'])
  venda['Valor do IPI'] = obterValor(linha, headers, mapeamento, ['Valor do IPI', 'valor_ipi', 'ipi'])
  venda['Base de Calc Icms'] = obterValor(linha, headers, mapeamento, ['Base de Calc Icms', 'base_icms', 'base_calculo_icms'])
  venda.VlrBaseICMSTotItem = obterValor(linha, headers, mapeamento, ['VlrBaseICMSTotItem', 'vlr_base_icms', 'base_icms_item'])
  venda.VlrIpiTotItem = obterValor(linha, headers, mapeamento, ['VlrIpiTotItem', 'vlr_ipi_item', 'ipi_item'])
  
  // Cliente e representante
  venda.cdCli = obterValor(linha, headers, mapeamento, ['cdCli', 'codigo_cliente', 'cliente_codigo'])
  venda.cdRepr = obterValor(linha, headers, mapeamento, ['cdRepr', 'codigo_representante', 'representante_codigo'])
  venda.NomeCli = obterValor(linha, headers, mapeamento, ['NomeCli', 'nome_cliente', 'cliente'])
  venda.NomeRepr = obterValor(linha, headers, mapeamento, ['NomeRepr', 'nome_representante', 'representante'])
  
  // Outros campos
  venda.MARCA = obterValor(linha, headers, mapeamento, ['MARCA', 'marca', 'Marca'])
  venda.GRUPO = obterValor(linha, headers, mapeamento, ['GRUPO', 'grupo', 'categoria'])
  venda.CIDADE = obterValor(linha, headers, mapeamento, ['CIDADE', 'cidade', 'municipio'])
  
  console.log('💰 Venda mapeada (sample):', {
    'Número da Nota Fiscal': venda['Número da Nota Fiscal'],
    'Descr. Produto': venda['Descr. Produto'],
    'cdEmpresa': venda.cdEmpresa,
    'Valor Icms Total': venda['Valor Icms Total']
  })
  
  return venda
}

/**
 * Mapeia dados de linha CSV para objeto Produto
 */
function mapearDadosProduto(headers: string[], linha: string[], mapeamento: Map<string, number>): any {
  const produto: any = {}
  
  // Campos básicos
  produto['Cód. Referência'] = obterValor(linha, headers, mapeamento, ['Cód. Referência', 'codigo_referencia', 'codigo'])
  produto['Descr. Produto'] = obterValor(linha, headers, mapeamento, ['Descr. Produto', 'descricao_produto', 'descricao', 'produto'])
  produto['Descr. Resumo Produto'] = obterValor(linha, headers, mapeamento, ['Descr. Resumo Produto', 'resumo_produto', 'descr_resumo', 'resumo'])
  produto['Cód. do Produto'] = obterValor(linha, headers, mapeamento, ['Cód. do Produto', 'codigo_do_produto', 'cod_interno'])
  produto['Compl. Cód. do Produto'] = obterValor(linha, headers, mapeamento, ['Compl. Cód. do Produto', 'complemento_codigo', 'compl_codigo'])
  
  // Classificações fiscais
  produto['Faixa do ICMS'] = obterValor(linha, headers, mapeamento, ['Faixa do ICMS', 'faixa_icms', 'icms_faixa'])
  produto['N.B.M.'] = obterValor(linha, headers, mapeamento, ['N.B.M.', 'NBM', 'nbm', 'ncm'])
  produto['Aliquota de IPI'] = obterValor(linha, headers, mapeamento, ['Aliquota de IPI', 'aliquota_ipi', 'ipi_aliquota'])
  
  // Peso e dimensões
  produto['Peso Bruto Kg'] = obterValor(linha, headers, mapeamento, ['Peso Bruto Kg', 'peso_bruto', 'peso'])
  produto['Peso Liquido Kg'] = obterValor(linha, headers, mapeamento, ['Peso Liquido Kg', 'peso_liquido', 'peso_liq'])
  produto.Largura = obterValor(linha, headers, mapeamento, ['Largura', 'largura', 'width'])
  produto.Altura = obterValor(linha, headers, mapeamento, ['Altura', 'altura', 'height'])
  produto.Comprimento = obterValor(linha, headers, mapeamento, ['Comprimento', 'comprimento', 'length'])
  
  // Status e tipos
  produto['Status Importado/Nacional'] = obterValor(linha, headers, mapeamento, ['Status Importado/Nacional', 'status_importado', 'origem'])
  produto['Status de Tipo de Produto'] = obterValor(linha, headers, mapeamento, ['Status de Tipo de Produto', 'status_tipo', 'tipo_produto'])
  
  // Categorias e grupos
  produto['Cód. Categoria de Grupo'] = obterValor(linha, headers, mapeamento, ['Cód. Categoria de Grupo', 'cod_categoria_grupo', 'categoria_codigo'])
  produto['Descr. Categoria de Grupo'] = obterValor(linha, headers, mapeamento, ['Descr. Categoria de Grupo', 'descr_categoria_grupo', 'categoria_desc'])
  produto['Cód. Subgrupo de Produto'] = obterValor(linha, headers, mapeamento, ['Cód. Subgrupo de Produto', 'cod_subgrupo', 'subgrupo_codigo'])
  produto['Desc. Subgrupo de Produto'] = obterValor(linha, headers, mapeamento, ['Desc. Subgrupo de Produto', 'desc_subgrupo', 'subgrupo_desc'])
  produto['Cód. Grupo Produto'] = obterValor(linha, headers, mapeamento, ['Cód. Grupo Produto', 'cod_grupo', 'grupo_codigo'])
  produto['Descr. Grupo Produto'] = obterValor(linha, headers, mapeamento, ['Descr. Grupo Produto', 'descr_grupo', 'grupo_desc'])
  produto['Código Cat Prod'] = obterValor(linha, headers, mapeamento, ['Código Cat Prod', 'codigo_cat_prod', 'cat_prod'])
  produto['Descr. Categoria de Prod'] = obterValor(linha, headers, mapeamento, ['Descr. Categoria de Prod', 'descr_categoria_prod', 'categoria_produto'])
  
  // Marca
  produto['Cód. Marca Produtos'] = obterValor(linha, headers, mapeamento, ['Cód. Marca Produtos', 'cod_marca', 'marca_codigo'])
  produto['Descr. Marca Produto'] = obterValor(linha, headers, mapeamento, ['Descr. Marca Produto', 'descr_marca', 'marca', 'fabricante'])
  
  // Contabilidade
  produto['Cód. Conta Contábil Reduzida'] = obterValor(linha, headers, mapeamento, ['Cód. Conta Contábil Reduzida', 'cod_conta_contabil', 'conta_codigo'])
  produto['Descr. Conta Contabil'] = obterValor(linha, headers, mapeamento, ['Descr. Conta Contabil', 'descr_conta_contabil', 'conta_desc'])
  produto.cd_ctcResult = obterValor(linha, headers, mapeamento, ['cd_ctcResult', 'cd_ctc_result', 'ctc_codigo'])
  produto.ds_ctcResult = obterValor(linha, headers, mapeamento, ['ds_ctcResult', 'ds_ctc_result', 'ctc_desc'])
  
  // Unidade de medida
  produto['Cód. Unidade de Medida'] = obterValor(linha, headers, mapeamento, ['Cód. Unidade de Medida', 'cod_unidade', 'unidade_codigo'])
  produto['Descr. Unidade de Medida'] = obterValor(linha, headers, mapeamento, ['Descr. Unidade de Medida', 'descr_unidade', 'unidade_desc'])
  
  // Outros
  produto['Código EAN 13'] = obterValor(linha, headers, mapeamento, ['Código EAN 13', 'codigo_ean', 'ean13', 'codigo_barras'])
  produto['Detalhamento Técnico'] = obterValor(linha, headers, mapeamento, ['Detalhamento Técnico', 'detalhamento_tecnico', 'especificacoes', 'detalhes'])
  
  console.log('📦 Produto mapeado (sample):', {
    'Cód. Referência': produto['Cód. Referência'],
    'Descr. Produto': produto['Descr. Produto'],
    'Descr. Marca Produto': produto['Descr. Marca Produto'],
    'Status Importado/Nacional': produto['Status Importado/Nacional']
  })
  
  return produto
}

/**
 * Obtém valor de uma linha baseado em possíveis nomes de coluna
 */
function obterValor(linha: string[], headers: string[], mapeamento: Map<string, number>, possiveisNomes: string[]): string {
  for (const nome of possiveisNomes) {
    const indice = mapeamento.get(nome)
    if (indice !== undefined && linha[indice]) {
      return linha[indice].trim()
    }
  }
  
  // Fallback: procurar por similaridade nos headers originais
  for (const nome of possiveisNomes) {
    const indiceEncontrado = headers.findIndex(header => 
      header.toLowerCase().includes(nome.toLowerCase()) ||
      nome.toLowerCase().includes(header.toLowerCase())
    )
    
    if (indiceEncontrado !== -1 && linha[indiceEncontrado]) {
      return linha[indiceEncontrado].trim()
    }
  }
  
  return ''
}