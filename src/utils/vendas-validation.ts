// src/utils/vendas-validation.ts
import { supabase } from '../lib/supabase'

/**
 * Valida se um código de cliente existe na base de dados
 */
export async function validarCodigoCliente(codigo: string): Promise<{
  valido: boolean
  cliente?: {
    nome: string
    cidade: string
    estado: string
  }
  erro?: string
}> {
  try {
    if (!codigo || codigo.trim() === '') {
      return { valido: false, erro: 'Código do cliente é obrigatório' }
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('Nome, Município, "Sigla Estado"')
      .eq('Entidade', codigo.trim())
      .single<{ Nome: string; Município: string; 'Sigla Estado': string }>()

    if (error) {
      return { 
        valido: false, 
        erro: error.code === 'PGRST116' 
          ? 'Cliente não encontrado com este código' 
          : 'Erro ao buscar cliente'
      }
    }

    return {
      valido: true,
      cliente: {
        nome: data.Nome,
        cidade: data.Município,
        estado: data['Sigla Estado'] || 'SP'
      }
    }
  } catch (err) {
    console.error('Erro na validação do cliente:', err)
    return { valido: false, erro: 'Erro interno na validação' }
  }
}

/**
 * Valida se um código de produto existe na base de dados
 */
export async function validarCodigoProduto(codigo: string): Promise<{
  valido: boolean
  produto?: {
    descricao: string
    marca: string
    grupo: string
  }
  erro?: string
}> {
  try {
    if (!codigo || codigo.trim() === '') {
      return { valido: false, erro: 'Código do produto é obrigatório' }
    }

    const { data, error } = await supabase
      .from('itens')
      .select('"Descr. Produto", "Descr. Marca Produto", "Descr. Grupo Produto"')
      .eq('"Cód. Referência"', codigo.trim())
      .single()

    if (error) {
      return { 
        valido: false, 
        erro: error.code === 'PGRST116' 
          ? 'Produto não encontrado com este código' 
          : 'Erro ao buscar produto'
      }
    }

    return {
      valido: true,
      produto: {
        descricao: data['Descr. Produto'] || 'Descrição não disponível',
        marca: data['Descr. Marca Produto'] || 'Marca não disponível',
        grupo: data['Descr. Grupo Produto'] || 'Grupo não disponível'
      }
    }
  } catch (err) {
    console.error('Erro na validação do produto:', err)
    return { valido: false, erro: 'Erro interno na validação' }
  }
}

/**
 * Verifica se já existe uma venda com o mesmo número de NF
 */
export async function verificarDuplicataNF(numeroNF: string, vendaIdExcluir?: number): Promise<{
  temDuplicata: boolean
  quantidadeDuplicatas: number
  mensagem?: string
}> {
  try {
    if (!numeroNF || numeroNF.trim() === '') {
      return { temDuplicata: false, quantidadeDuplicatas: 0 }
    }

    let query = supabase
      .from('vendas')
      .select('id')
      .eq('"Número da Nota Fiscal"', numeroNF.trim())

    // Se estamos editando, excluir a própria venda da verificação
    if (vendaIdExcluir) {
      query = query.neq('id', vendaIdExcluir)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao verificar duplicata de NF:', error)
      return { temDuplicata: false, quantidadeDuplicatas: 0 }
    }

    const quantidade = data?.length || 0
    
    return {
      temDuplicata: quantidade > 0,
      quantidadeDuplicatas: quantidade,
      mensagem: quantidade > 0 
        ? `⚠️ Já existe${quantidade > 1 ? 'm' : ''} ${quantidade} venda${quantidade > 1 ? 's' : ''} com esta NF. Continuar mesmo assim?`
        : undefined
    }
  } catch (err) {
    console.error('Erro na verificação de duplicata:', err)
    return { temDuplicata: false, quantidadeDuplicatas: 0 }
  }
}

/**
 * Valida todos os campos do formulário de venda
 */
export interface ValidacaoVenda {
  codigoCliente: string
  codigoProduto: string
  representanteId: string
  quantidade: string
  precoUnitario: string
  dataVenda: string
  numeroNF: string
}

export function validarFormularioVenda(dados: ValidacaoVenda): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []

  // Validações básicas de campos obrigatórios
  if (!dados.codigoCliente?.trim()) {
    erros.push('Código do cliente é obrigatório')
  }

  if (!dados.codigoProduto?.trim()) {
    erros.push('Código do produto é obrigatório')
  }

  if (!dados.representanteId?.trim()) {
    erros.push('Representante é obrigatório')
  }

  if (!dados.numeroNF?.trim()) {
    erros.push('Número da NF é obrigatório')
  }

  if (!dados.dataVenda?.trim()) {
    erros.push('Data da venda é obrigatória')
  }

  // Validação de quantidade
  const quantidade = parseFloat(dados.quantidade)
  if (!dados.quantidade?.trim() || isNaN(quantidade) || quantidade <= 0) {
    erros.push('Quantidade deve ser um número maior que zero')
  }

  // Validação de preço unitário
  const preco = parseFloat(dados.precoUnitario?.replace(/[^\d,.-]/g, '').replace(',', '.'))
  if (!dados.precoUnitario?.trim() || isNaN(preco) || preco <= 0) {
    erros.push('Preço unitário deve ser um valor maior que zero')
  }

  // Validação de data
  if (dados.dataVenda?.trim()) {
    const dataVenda = new Date(dados.dataVenda)
    const hoje = new Date()
    const umAnoAtras = new Date()
    umAnoAtras.setFullYear(hoje.getFullYear() - 1)

    if (isNaN(dataVenda.getTime())) {
      erros.push('Data da venda inválida')
    } else if (dataVenda > hoje) {
      erros.push('Data da venda não pode ser no futuro')
    } else if (dataVenda < umAnoAtras) {
      erros.push('Data da venda não pode ser anterior a um ano')
    }
  }

  // Validação de representante (deve ser um número)
  const reprId = parseInt(dados.representanteId)
  if (dados.representanteId?.trim() && (isNaN(reprId) || reprId <= 0)) {
    erros.push('ID do representante deve ser um número válido')
  }

  return {
    valido: erros.length === 0,
    erros
  }
}

/**
 * Carrega lista de representantes únicos da base de vendas
 */
export async function carregarRepresentantesAtivos(): Promise<{
  sucesso: boolean
  representantes: Array<{ codigo: number; nome: string }>
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('cdRepr, NomeRepr')
      .not('cdRepr', 'is', null)
      .not('NomeRepr', 'is', null)
      .not('NomeRepr', 'eq', '')

    if (error) {
      return {
        sucesso: false,
        representantes: [],
        erro: 'Erro ao buscar representantes na base de dados'
      }
    }

    // Criar lista única de representantes
    const representantesMap = new Map<number, string>()
    
    data.forEach(venda => {
      if (venda.cdRepr && venda.NomeRepr) {
        representantesMap.set(venda.cdRepr, venda.NomeRepr)
      }
    })

    // Converter para array e ordenar por nome
    const representantes = Array.from(representantesMap.entries())
      .map(([codigo, nome]) => ({ codigo, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    return {
      sucesso: true,
      representantes
    }
  } catch (err) {
    console.error('Erro ao carregar representantes:', err)
    return {
      sucesso: false,
      representantes: [],
      erro: 'Erro interno ao carregar representantes'
    }
  }
}

/**
 * Formatar valores monetários para exibição
 */
export function formatarMoedaBrasil(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

/**
 * Converter string brasileira para número
 */
export function converterStringParaNumero(valor: string): number {
  if (!valor || typeof valor !== 'string') return 0
  
  // Remove espaços, símbolos de moeda e caracteres especiais
  const limpo = valor
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '') // Remove pontos de milhares
    .replace(',', '.') // Converte vírgula decimal para ponto
  
  const numero = parseFloat(limpo)
  return isNaN(numero) ? 0 : numero
}

/**
 * Validar e formatar data brasileira
 */
export function validarFormatarData(data: string): {
  valida: boolean
  dataFormatada?: string
  erro?: string
} {
  try {
    if (!data?.trim()) {
      return { valida: false, erro: 'Data é obrigatória' }
    }

    const dataObj = new Date(data)
    
    if (isNaN(dataObj.getTime())) {
      return { valida: false, erro: 'Formato de data inválido' }
    }

    // Verificar se não é muito antiga nem futura
    const hoje = new Date()
    const umAnoAtras = new Date()
    umAnoAtras.setFullYear(hoje.getFullYear() - 2) // Permitir até 2 anos atrás

    if (dataObj > hoje) {
      return { valida: false, erro: 'Data não pode ser no futuro' }
    }

    if (dataObj < umAnoAtras) {
      return { valida: false, erro: 'Data muito antiga (máximo 2 anos atrás)' }
    }

    return {
      valida: true,
      dataFormatada: dataObj.toISOString().split('T')[0] // Formato YYYY-MM-DD
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return { valida: false, erro: 'Erro ao processar data' }
  }
}

/**
 * Gerar número de NF automático baseado na data
 * Formato: YYYYMMDD-HHMMSS (para evitar duplicatas em criações rápidas)
 */
export function gerarNumeroNFAutomatico(): string {
  const agora = new Date()
  
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  const hora = String(agora.getHours()).padStart(2, '0')
  const min = String(agora.getMinutes()).padStart(2, '0')
  const seg = String(agora.getSeconds()).padStart(2, '0')
  
  return `${ano}${mes}${dia}-${hora}${min}${seg}`
}

/**
 * Calcular métricas da venda
 */
export function calcularMetricasVenda(quantidade: number, precoUnitario: number): {
  total: number
  totalFormatado: string
  quantidadeValida: boolean
  precoValido: boolean
} {
  const qtdValida = !isNaN(quantidade) && quantidade > 0
  const precoValido = !isNaN(precoUnitario) && precoUnitario > 0
  
  const total = qtdValida && precoValido ? quantidade * precoUnitario : 0
  
  return {
    total,
    totalFormatado: formatarMoedaBrasil(total),
    quantidadeValida: qtdValida,
    precoValido: precoValido
  }
}