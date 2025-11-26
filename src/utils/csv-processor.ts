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
  // Remover BOM (Byte Order Mark) se existir - comum em arquivos UTF-8
  let conteudoLimpo = conteudo
  if (conteudoLimpo.charCodeAt(0) === 0xFEFF) {
    conteudoLimpo = conteudoLimpo.substring(1)
    console.log('⚠️ BOM (UTF-8 Byte Order Mark) detectado e removido')
  }

  const linhas = conteudoLimpo
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
  // Remove aspas das pontas e caracteres invisíveis (BOM, zero-width spaces, etc)
  return resultado.map(item => {
    let limpo = item.replace(/^"|"$/g, '')
    // Remove caracteres de controle e BOM que podem ter sobrado
    limpo = limpo.replace(/[\u200B-\u200D\uFEFF]/g, '')
    return limpo
  })
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

  // Buscar todos os clientes existentes uma vez para otimizar verificação de duplicatas
  const { data: clientesExistentes } = await supabase
    .from('clientes')
    .select('Entidade, Nome, CNPJ')

  // Criar índices para busca rápida (banco de dados existente)
  const entidadesExistentes = new Set(
    clientesExistentes?.map((c: any) => c.Entidade?.toString().trim().toLowerCase()) || []
  )
  const cnpjsExistentes = new Set(
    clientesExistentes?.map((c: any) => c.CNPJ?.toString().trim().replace(/\D/g, '')) || []
  )
  const nomesExistentes = new Set(
    clientesExistentes?.map((c: any) => c.Nome?.toString().trim().toLowerCase()) || []
  )

  // Criar índices para rastrear duplicatas DENTRO do próprio CSV sendo importado
  const entidadesNesseImporte = new Set<string>()
  const cnpjsNesseImporte = new Set<string>()
  const nomesNesseImporte = new Set<string>()

  console.log('🔍 Índices de duplicatas criados:', {
    entidades: entidadesExistentes.size,
    cnpjs: cnpjsExistentes.size,
    nomes: nomesExistentes.size
  })

  // Debug: verificar se há caracteres estranhos nas primeiras entidades
  const primeirasEntidades = Array.from(entidadesExistentes).slice(0, 3)
  console.log('🔍 Debug das primeiras 3 Entidades do banco:')
  primeirasEntidades.forEach(ent => {
    console.log(`   "${ent}" - Caracteres: [${Array.from(ent).map(c => c.charCodeAt(0)).join(', ')}]`)
  })

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

      // Debug dos primeiros 10 registros
      if (i < 10) {
        console.log(`\n📋 REGISTRO ${i} (linha ${i + 2} do CSV):`)
        console.log(`   Entidade: "${cliente.Entidade}"`)
        console.log(`   Nome: "${cliente.Nome}"`)
        console.log(`   CNPJ: "${cliente.CNPJ}"`)
      }

      // Verificar se cliente já existe (por Entidade, CNPJ ou Nome)
      let motivoDuplicata = ''
      let tipoDuplicata = '' // 'banco' ou 'arquivo'

      // Verificar por Entidade
      if (cliente.Entidade) {
        const entidadeLimpa = cliente.Entidade.toString().trim().toLowerCase()

        if (i < 10) {
          console.log(`   Entidade limpa: "${entidadeLimpa}" - Chars: [${Array.from(entidadeLimpa).map(c => c.charCodeAt(0)).join(', ')}]`)
          console.log(`   Existe no banco? ${entidadesExistentes.has(entidadeLimpa)}`)
          console.log(`   Existe neste arquivo? ${entidadesNesseImporte.has(entidadeLimpa)}`)
        }

        if (entidadesExistentes.has(entidadeLimpa)) {
          motivoDuplicata = `Entidade "${cliente.Entidade}"`
          tipoDuplicata = 'banco'
          if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata no banco`)
        } else if (entidadesNesseImporte.has(entidadeLimpa)) {
          motivoDuplicata = `Entidade "${cliente.Entidade}"`
          tipoDuplicata = 'arquivo'
          if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata interna do arquivo`)
        }
      }

      // Verificar por CNPJ (se não encontrou duplicata ainda)
      if (!motivoDuplicata && cliente.CNPJ) {
        const cnpjLimpo = cliente.CNPJ.toString().trim().replace(/\D/g, '')
        if (cnpjLimpo) {
          if (i < 10) {
            console.log(`   CNPJ limpo: "${cnpjLimpo}"`)
            console.log(`   Existe no banco? ${cnpjsExistentes.has(cnpjLimpo)}`)
            console.log(`   Existe neste arquivo? ${cnpjsNesseImporte.has(cnpjLimpo)}`)
          }

          if (cnpjsExistentes.has(cnpjLimpo)) {
            motivoDuplicata = `CNPJ "${cliente.CNPJ}"`
            tipoDuplicata = 'banco'
            if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata no banco (CNPJ)`)
          } else if (cnpjsNesseImporte.has(cnpjLimpo)) {
            motivoDuplicata = `CNPJ "${cliente.CNPJ}"`
            tipoDuplicata = 'arquivo'
            if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata interna do arquivo (CNPJ)`)
          }
        }
      }

      // Verificar por Nome (se não encontrou duplicata ainda)
      if (!motivoDuplicata && cliente.Nome) {
        const nomeLimpo = cliente.Nome.toString().trim().toLowerCase()
        if (i < 10) {
          console.log(`   Nome limpo: "${nomeLimpo}"`)
          console.log(`   Existe no banco? ${nomesExistentes.has(nomeLimpo)}`)
          console.log(`   Existe neste arquivo? ${nomesNesseImporte.has(nomeLimpo)}`)
        }

        if (nomesExistentes.has(nomeLimpo)) {
          motivoDuplicata = `Nome "${cliente.Nome}"`
          tipoDuplicata = 'banco'
          if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata no banco (Nome)`)
        } else if (nomesNesseImporte.has(nomeLimpo)) {
          motivoDuplicata = `Nome "${cliente.Nome}"`
          tipoDuplicata = 'arquivo'
          if (i < 10) console.log(`   ❌ BLOQUEADO: Duplicata interna do arquivo (Nome)`)
        }
      }

      if (motivoDuplicata) {
        // Cliente duplicado - bloquear importação
        resultado.erros++
        const origemDuplicata = tipoDuplicata === 'banco'
          ? 'já existe no banco de dados'
          : 'já apareceu anteriormente neste arquivo'
        resultado.registrosComErro.push({
          linha: i + 2,
          dados: linha,
          erro: `Cliente com ${motivoDuplicata} ${origemDuplicata}`
        })
        continue
      }

      // Inserir novo cliente
      if (i < 10) {
        console.log(`   ✅ APROVADO: Será importado`)
      }

      const { error } = await supabase
        .from('clientes')
        .insert([cliente])

      if (error) throw error
      resultado.inseridos++

      if (i < 10) {
        console.log(`   💾 INSERIDO no banco com sucesso`)
      }

      // Adicionar aos índices de controle para evitar duplicatas dentro deste mesmo importe
      if (cliente.Entidade) {
        const entidadeLimpa = cliente.Entidade.toString().trim().toLowerCase()
        entidadesNesseImporte.add(entidadeLimpa)
        if (i < 10) console.log(`   📝 Adicionado "${entidadeLimpa}" ao controle de duplicatas`)
      }
      if (cliente.CNPJ) {
        const cnpjLimpo = cliente.CNPJ.toString().trim().replace(/\D/g, '')
        if (cnpjLimpo) cnpjsNesseImporte.add(cnpjLimpo)
      }
      if (cliente.Nome) {
        nomesNesseImporte.add(cliente.Nome.toString().trim().toLowerCase())
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

  // Log final com estatísticas
  console.log('\n📊 RESUMO DA IMPORTAÇÃO:')
  console.log(`   Total de registros processados: ${dadosCSV.rows.length}`)
  console.log(`   ✅ Inseridos: ${resultado.inseridos}`)
  console.log(`   ❌ Erros/Duplicatas: ${resultado.erros}`)
  console.log(`   Entidades únicas neste importe: ${entidadesNesseImporte.size}`)
  console.log(`   CNPJs únicos neste importe: ${cnpjsNesseImporte.size}`)
  console.log(`   Nomes únicos neste importe: ${nomesNesseImporte.size}`)

  resultado.detalhes.push(`✅ ${resultado.inseridos} clientes inseridos`)
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro (incluindo duplicatas bloqueadas)`)
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
        // Venda duplicada - bloquear importação
        resultado.erros++
        resultado.registrosComErro.push({
          linha: i + 2,
          dados: linha,
          erro: `Venda com NF "${venda['Número da Nota Fiscal']}" já existe no banco de dados`
        })
        continue
      }

      // Inserir nova venda
      const { error } = await supabase
        .from('vendas')
        .insert([venda])

      if (error) throw error
      resultado.inseridos++
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
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro (incluindo duplicatas bloqueadas)`)
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
        // Produto duplicado - bloquear importação
        resultado.erros++
        resultado.registrosComErro.push({
          linha: i + 2,
          dados: linha,
          erro: `Produto com código "${produto['Cód. Referência']}" já existe no banco de dados`
        })
        continue
      }

      // Inserir novo produto
      const { error } = await supabase
        .from('itens')
        .insert([produto])

      if (error) throw error
      resultado.inseridos++
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
  if (resultado.erros > 0) {
    resultado.detalhes.push(`⚠️ ${resultado.erros} registros com erro (incluindo duplicatas bloqueadas)`)
  }

  return resultado
}

/**
 * Verifica duplicatas de clientes em lote (otimizado para grandes volumes)
 */
export async function verificarDuplicatasClientes(
  clientes: Cliente[],
  onProgresso?: (atual: number, total: number, mensagem: string) => void
): Promise<Set<number>> {
  const duplicatasIndices = new Set<number>()
  const TAMANHO_LOTE = 50 // Reduzido para evitar sobrecarga
  const totalLotes = Math.ceil(clientes.length / TAMANHO_LOTE)

  // Buscar todos os clientes existentes de uma vez (mais eficiente)
  try {
    const { data: clientesExistentes, error } = await supabase
      .from('clientes')
      .select('Entidade, Nome, CNPJ')

    if (error) {
      console.error('Erro ao buscar clientes existentes:', error)
      return duplicatasIndices
    }

    console.log('🔍 Total de clientes no banco:', clientesExistentes?.length || 0)

    // Criar índices para busca rápida
    const entidadesExistentes = new Set(
      clientesExistentes?.map((c: any) => c.Entidade?.toString().trim().toLowerCase()) || []
    )
    const cnpjsExistentes = new Set(
      clientesExistentes?.map((c: any) => c.CNPJ?.toString().trim().replace(/\D/g, '')) || []
    )
    const nomesExistentes = new Map(
      clientesExistentes?.map((c: any) => [
        c.Nome?.toString().trim().toLowerCase(),
        c
      ]) || []
    )

    console.log('📊 Índices criados:', {
      entidades: entidadesExistentes.size,
      cnpjs: cnpjsExistentes.size,
      nomes: nomesExistentes.size
    })

    // Debug: mostrar primeiros valores
    console.log('🔍 Primeiras 5 Entidades no banco:', Array.from(entidadesExistentes).slice(0, 5))
    console.log('🔍 Primeiros 5 CNPJs no banco:', Array.from(cnpjsExistentes).slice(0, 5))

    // Debug: verificar se há caracteres estranhos nas primeiras entidades
    const primeirasEntidades = Array.from(entidadesExistentes).slice(0, 3)
    console.log('🔍 Debug das primeiras 3 Entidades do banco:')
    primeirasEntidades.forEach(ent => {
      console.log(`   "${ent}" - Caracteres: [${Array.from(ent).map(c => c.charCodeAt(0)).join(', ')}]`)
    })

    // Criar índices para rastrear duplicatas DENTRO do próprio CSV
    const entidadesNoArquivo = new Set<string>()
    const cnpjsNoArquivo = new Set<string>()
    const nomesNoArquivo = new Set<string>()

    // Verificar cada cliente contra os índices
    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i]

      if (onProgresso && i % 10 === 0) {
        onProgresso(i + 1, clientes.length, `Verificando registro ${i + 1} de ${clientes.length}`)
      }

      // Debug dos primeiros 3 clientes
      if (i < 3) {
        console.log(`🔍 Cliente ${i}:`, {
          Entidade: cliente.Entidade,
          Nome: cliente.Nome,
          CNPJ: cliente.CNPJ
        })
        if (cliente.Entidade) {
          const entStr = cliente.Entidade.toString().trim().toLowerCase()
          console.log(`   Entidade limpa: "${entStr}" - Caracteres: [${Array.from(entStr).map(c => c.charCodeAt(0)).join(', ')}]`)
        }
      }

      let isDuplicata = false
      let motivoDuplicata = ''
      let tipoDuplicata = '' // 'banco' ou 'arquivo'

      // Verificar por Entidade
      if (cliente.Entidade) {
        const entidadeLimpa = cliente.Entidade.toString().trim().toLowerCase()

        if (i < 3) {
          console.log(`  🔍 Entidade "${entidadeLimpa}"`)
          console.log(`     Existe no banco? ${entidadesExistentes.has(entidadeLimpa)}`)
          console.log(`     Existe no arquivo? ${entidadesNoArquivo.has(entidadeLimpa)}`)
        }

        if (entidadesExistentes.has(entidadeLimpa)) {
          isDuplicata = true
          motivoDuplicata = 'Entidade'
          tipoDuplicata = 'banco'
        } else if (entidadesNoArquivo.has(entidadeLimpa)) {
          isDuplicata = true
          motivoDuplicata = 'Entidade'
          tipoDuplicata = 'arquivo'
        }
      }

      // Verificar por CNPJ (se não encontrou duplicata ainda)
      if (!isDuplicata && cliente.CNPJ) {
        const cnpjLimpo = cliente.CNPJ.toString().trim().replace(/\D/g, '')

        if (i < 3) {
          console.log(`  🔍 CNPJ "${cnpjLimpo}"`)
          console.log(`     Existe no banco? ${cnpjsExistentes.has(cnpjLimpo)}`)
          console.log(`     Existe no arquivo? ${cnpjsNoArquivo.has(cnpjLimpo)}`)
        }

        if (cnpjLimpo) {
          if (cnpjsExistentes.has(cnpjLimpo)) {
            isDuplicata = true
            motivoDuplicata = 'CNPJ'
            tipoDuplicata = 'banco'
          } else if (cnpjsNoArquivo.has(cnpjLimpo)) {
            isDuplicata = true
            motivoDuplicata = 'CNPJ'
            tipoDuplicata = 'arquivo'
          }
        }
      }

      // Verificar por Nome (se não encontrou duplicata ainda)
      if (!isDuplicata && cliente.Nome) {
        const nomeLimpo = cliente.Nome.toString().trim().toLowerCase()

        if (i < 3) {
          console.log(`  🔍 Nome "${nomeLimpo}"`)
          console.log(`     Existe no banco? ${nomesExistentes.has(nomeLimpo)}`)
          console.log(`     Existe no arquivo? ${nomesNoArquivo.has(nomeLimpo)}`)
        }

        if (nomesExistentes.has(nomeLimpo)) {
          isDuplicata = true
          motivoDuplicata = 'Nome'
          tipoDuplicata = 'banco'
        } else if (nomesNoArquivo.has(nomeLimpo)) {
          isDuplicata = true
          motivoDuplicata = 'Nome'
          tipoDuplicata = 'arquivo'
        }
      }

      // Se é duplicata, adicionar ao conjunto e continuar
      if (isDuplicata) {
        duplicatasIndices.add(i)
        if (i < 10) {
          console.log(`  ❌ DUPLICATA por ${motivoDuplicata} (origem: ${tipoDuplicata}): linha ${i}`)
        }
        continue
      }

      // Se NÃO é duplicata, adicionar aos índices do arquivo
      if (cliente.Entidade) {
        entidadesNoArquivo.add(cliente.Entidade.toString().trim().toLowerCase())
      }
      if (cliente.CNPJ) {
        const cnpjLimpo = cliente.CNPJ.toString().trim().replace(/\D/g, '')
        if (cnpjLimpo) cnpjsNoArquivo.add(cnpjLimpo)
      }
      if (cliente.Nome) {
        nomesNoArquivo.add(cliente.Nome.toString().trim().toLowerCase())
      }
    }

    if (onProgresso) {
      onProgresso(clientes.length, clientes.length, `Verificação concluída: ${duplicatasIndices.size} duplicatas encontradas`)
    }

    // Log final detalhado
    console.log('✅ VERIFICAÇÃO CONCLUÍDA:')
    console.log(`   Total de linhas: ${clientes.length}`)
    console.log(`   Duplicatas encontradas: ${duplicatasIndices.size}`)
    console.log(`   Registros novos: ${clientes.length - duplicatasIndices.size}`)
    console.log(`   Duplicatas internas no arquivo: ${entidadesNoArquivo.size} únicas de ${clientes.length - duplicatasIndices.size} processadas`)

    // Mostrar alguns clientes NÃO duplicados (que serão importados)
    const naoduplicados = clientes.filter((_, index) => !duplicatasIndices.has(index)).slice(0, 3)
    console.log('📝 Primeiros 3 clientes que SERÃO importados:', naoduplicados)

  } catch (err) {
    console.error('Erro ao verificar duplicatas:', err)
  }

  return duplicatasIndices
}

/**
 * Verifica duplicatas de vendas em lote (otimizado para grandes volumes)
 */
export async function verificarDuplicatasVendas(
  vendas: any[],
  onProgresso?: (atual: number, total: number, mensagem: string) => void
): Promise<Set<number>> {
  const duplicatasIndices = new Set<number>()

  try {
    // Extrair todos os números de NF únicos
    const numeroNFs = [...new Set(
      vendas
        .map(v => v['Número da Nota Fiscal'])
        .filter(nf => nf)
        .map(nf => nf.toString().trim())
    )]

    if (numeroNFs.length === 0) return duplicatasIndices

    // Buscar em lotes para evitar query muito grande
    const TAMANHO_LOTE = 100
    const nfsExistentes = new Set<string>()

    for (let i = 0; i < numeroNFs.length; i += TAMANHO_LOTE) {
      const lote = numeroNFs.slice(i, Math.min(i + TAMANHO_LOTE, numeroNFs.length))

      if (onProgresso) {
        onProgresso(i, numeroNFs.length, `Verificando NFs ${i} a ${i + lote.length} de ${numeroNFs.length}`)
      }

      const { data, error } = await supabase
        .from('vendas')
        .select('"Número da Nota Fiscal"')
        .in('"Número da Nota Fiscal"', lote)

      if (!error && data) {
        data.forEach((v: any) => {
          nfsExistentes.add(v['Número da Nota Fiscal']?.toString().trim())
        })
      }

      // Pequeno delay para não sobrecarregar o DB
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Marcar duplicatas
    vendas.forEach((venda, index) => {
      const nf = venda['Número da Nota Fiscal']?.toString().trim()
      if (nf && nfsExistentes.has(nf)) {
        duplicatasIndices.add(index)
      }
    })

    if (onProgresso) {
      onProgresso(numeroNFs.length, numeroNFs.length, `Verificação concluída: ${duplicatasIndices.size} duplicatas encontradas`)
    }

  } catch (err) {
    console.error('Erro ao verificar duplicatas de vendas:', err)
  }

  return duplicatasIndices
}

/**
 * Verifica duplicatas de produtos em lote (otimizado para grandes volumes)
 */
export async function verificarDuplicatasProdutos(
  produtos: any[],
  onProgresso?: (atual: number, total: number, mensagem: string) => void
): Promise<Set<number>> {
  const duplicatasIndices = new Set<number>()

  try {
    // Extrair todos os códigos únicos
    const codigos = [...new Set(
      produtos
        .map(p => p['Cód. Referência'])
        .filter(cod => cod)
        .map(cod => cod.toString().trim())
    )]

    if (codigos.length === 0) return duplicatasIndices

    // Buscar em lotes
    const TAMANHO_LOTE = 100
    const codigosExistentes = new Set<string>()

    for (let i = 0; i < codigos.length; i += TAMANHO_LOTE) {
      const lote = codigos.slice(i, Math.min(i + TAMANHO_LOTE, codigos.length))

      if (onProgresso) {
        onProgresso(i, codigos.length, `Verificando códigos ${i} a ${i + lote.length} de ${codigos.length}`)
      }

      const { data, error } = await supabase
        .from('itens')
        .select('"Cód. Referência"')
        .in('"Cód. Referência"', lote)

      if (!error && data) {
        data.forEach((p: any) => {
          codigosExistentes.add(p['Cód. Referência']?.toString().trim())
        })
      }

      // Pequeno delay para não sobrecarregar o DB
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Marcar duplicatas
    produtos.forEach((produto, index) => {
      const cod = produto['Cód. Referência']?.toString().trim()
      if (cod && codigosExistentes.has(cod)) {
        duplicatasIndices.add(index)
      }
    })

    if (onProgresso) {
      onProgresso(codigos.length, codigos.length, `Verificação concluída: ${duplicatasIndices.size} duplicatas encontradas`)
    }

  } catch (err) {
    console.error('Erro ao verificar duplicatas de produtos:', err)
  }

  return duplicatasIndices
}

/**
 * Cria mapeamento inteligente de colunas
 */
export function criarMapeamentoColunas(headers: string[], possiveisNomes: string[]): Map<string, number> {
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