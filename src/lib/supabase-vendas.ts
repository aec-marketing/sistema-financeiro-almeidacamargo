// src/lib/supabase-vendas.ts
import { supabase } from './supabase'
import { registrarAuditoria } from '../utils/vendas-audit'
import type { Venda, UserProfile } from './supabase'

export interface NovaVenda {
  'Número da Nota Fiscal': string
  'Data de Emissao da NF': string
  'Quantidade': string
  'Preço Unitário': string
  'total': string
  'Cód. Referência': string
  'cdCli': string
  'cdRepr': number
  'NomeCli': string
  'NomeRepr': string
  'MARCA': string
  'GRUPO': string
  'CIDADE': string
  'Descr. Produto': string
}

/**
 * Cria uma nova venda na base de dados
 */
export async function criarVenda(
  dadosVenda: NovaVenda,
  usuario: UserProfile
): Promise<{ sucesso: boolean; venda?: Venda; erro?: string }> {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .insert([dadosVenda])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar venda:', error)
      return { 
        sucesso: false, 
        erro: error.message.includes('duplicate') 
          ? 'Já existe uma venda com estes dados'
          : 'Erro ao salvar venda na base de dados'
      }
    }

    // Registrar auditoria
    await registrarAuditoria(data.id, 'CREATE', usuario, null, dadosVenda)

    return { sucesso: true, venda: data }
  } catch (err) {
    console.error('Erro interno ao criar venda:', err)
    return { sucesso: false, erro: 'Erro interno do sistema' }
  }
}

/**
 * Atualiza uma venda existente
 */
export async function atualizarVenda(
  vendaId: number,
  dadosAtualizados: Partial<NovaVenda>,
  vendaAnterior: Venda,
  usuario: UserProfile
): Promise<{ sucesso: boolean; venda?: Venda; erro?: string }> {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .update(dadosAtualizados)
      .eq('id', vendaId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar venda:', error)
      return { 
        sucesso: false, 
        erro: error.message.includes('duplicate') 
          ? 'Já existe uma venda com estes dados'
          : 'Erro ao atualizar venda na base de dados'
      }
    }

    // Registrar auditoria
    await registrarAuditoria(vendaId, 'UPDATE', usuario, vendaAnterior, dadosAtualizados)

    return { sucesso: true, venda: data }
  } catch (err) {
    console.error('Erro interno ao atualizar venda:', err)
    return { sucesso: false, erro: 'Erro interno do sistema' }
  }
}

/**
 * Exclui uma venda da base de dados
 */
export async function excluirVenda(
  vendaId: number,
  vendaAnterior: Venda,
  usuario: UserProfile
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    // Registrar auditoria ANTES de excluir
    await registrarAuditoria(vendaId, 'DELETE', usuario, vendaAnterior, null)

    const { error } = await supabase
      .from('vendas')
      .delete()
      .eq('id', vendaId)

    if (error) {
      console.error('Erro ao excluir venda:', error)
      return { sucesso: false, erro: 'Erro ao excluir venda da base de dados' }
    }

    return { sucesso: true }
  } catch (err) {
    console.error('Erro interno ao excluir venda:', err)
    return { sucesso: false, erro: 'Erro interno do sistema' }
  }
}

/**
 * Busca uma venda específica por ID
 */
export async function buscarVendaPorId(vendaId: number): Promise<{
  sucesso: boolean
  venda?: Venda
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('id', vendaId)
      .single()

    if (error) {
      return { 
        sucesso: false, 
        erro: error.code === 'PGRST116' ? 'Venda não encontrada' : 'Erro ao buscar venda'
      }
    }

    return { sucesso: true, venda: data }
  } catch (err) {
    console.error('Erro ao buscar venda:', err)
    return { sucesso: false, erro: 'Erro interno' }
  }
}

/**
 * Busca vendas com filtros e paginação
 */
export async function buscarVendas(parametros: {
  userId?: string
  userRole?: string
  cdRepresentante?: number
  searchTerm?: string
  cidade?: string
  dataInicio?: string
  dataFim?: string
  page: number
  itemsPorPagina: number
}): Promise<{
  sucesso: boolean
  vendas: Venda[]
  total: number
  erro?: string
}> {
  try {
    let query = supabase
      .from('vendas')
      .select('*', { count: 'exact' })

    // Filtrar por representante se for consultor
    if (parametros.userRole === 'consultor_vendas' && parametros.cdRepresentante) {
      query = query.eq('cdRepr', parametros.cdRepresentante)
    }

    // Aplicar busca por texto
    if (parametros.searchTerm) {
      query = query.or(`NomeCli.ilike.%${parametros.searchTerm}%,NomeRepr.ilike.%${parametros.searchTerm}%,"Descr. Produto".ilike.%${parametros.searchTerm}%,"Número da Nota Fiscal".ilike.%${parametros.searchTerm}%`)
    }

    // Filtrar por cidade
    if (parametros.cidade) {
      query = query.eq('CIDADE', parametros.cidade)
    }

    // Filtrar por período
    if (parametros.dataInicio) {
      query = query.gte('"Data de Emissao da NF"', parametros.dataInicio)
    }
    if (parametros.dataFim) {
      query = query.lte('"Data de Emissao da NF"', parametros.dataFim)
    }

    // Paginação
    const from = (parametros.page - 1) * parametros.itemsPorPagina
    const to = from + parametros.itemsPorPagina - 1

    query = query
      .range(from, to)
      .order('id', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar vendas:', error)
      return { sucesso: false, vendas: [], total: 0, erro: 'Erro ao buscar vendas' }
    }

    return { 
      sucesso: true, 
      vendas: data || [], 
      total: count || 0 
    }
  } catch (err) {
    console.error('Erro interno ao buscar vendas:', err)
    return { sucesso: false, vendas: [], total: 0, erro: 'Erro interno' }
  }
}

/**
 * Busca dados de cliente por código
 */
export async function buscarClientePorCodigo(codigo: string): Promise<{
  sucesso: boolean
  cliente?: {
    nome: string
    cidade: string
    estado: string
  }
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('Nome, Município, "Sigla Estado"')
      .eq('Entidade', codigo)
      .single()

    if (error) {
      return { 
        sucesso: false, 
        erro: error.code === 'PGRST116' ? 'Cliente não encontrado' : 'Erro ao buscar cliente'
      }
    }

    return {
      sucesso: true,
      cliente: {
        nome: data.Nome,
        cidade: data.Município,
        estado: data['Sigla Estado'] || 'SP'
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return { sucesso: false, erro: 'Erro interno' }
  }
}

/**
 * Busca dados de produto por código
 */
export async function buscarProdutoPorCodigo(codigo: string): Promise<{
  sucesso: boolean
  produto?: {
    descricao: string
    marca: string
    grupo: string
  }
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('itens')
      .select('"Descr. Produto", "Descr. Marca Produto", "Descr. Grupo Produto"')
      .eq('"Cód. Referência"', codigo)
      .single()

    if (error) {
      return { 
        sucesso: false, 
        erro: error.code === 'PGRST116' ? 'Produto não encontrado' : 'Erro ao buscar produto'
      }
    }

    return {
      sucesso: true,
      produto: {
        descricao: data['Descr. Produto'] || 'Descrição não disponível',
        marca: data['Descr. Marca Produto'] || 'Marca não disponível',
        grupo: data['Descr. Grupo Produto'] || 'Grupo não disponível'
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return { sucesso: false, erro: 'Erro interno' }
  }
}

/**
 * Busca representantes únicos
 */
export async function buscarRepresentantes(): Promise<{
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
      return { sucesso: false, representantes: [], erro: 'Erro ao buscar representantes' }
    }

    // Criar mapa único de representantes
    const representantesMap = new Map<number, string>()
    
    data.forEach(item => {
      if (item.cdRepr && item.NomeRepr) {
        representantesMap.set(item.cdRepr, item.NomeRepr)
      }
    })

    // Converter para array e ordenar
    const representantes = Array.from(representantesMap.entries())
      .map(([codigo, nome]) => ({ codigo, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    return { sucesso: true, representantes }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return { sucesso: false, representantes: [], erro: 'Erro interno' }
  }
}

/**
 * Verifica duplicatas de número de NF
 */
export async function verificarDuplicataNF(
  numeroNF: string, 
  vendaIdExcluir?: number
): Promise<{
  temDuplicata: boolean
  quantidade: number
  vendas?: Array<{ id: number; cliente: string; data: string }>
}> {
  try {
    let query = supabase
      .from('vendas')
      .select('id, NomeCli, "Data de Emissao da NF"')
      .eq('"Número da Nota Fiscal"', numeroNF)

    // Excluir venda atual se estiver editando
    if (vendaIdExcluir) {
      query = query.neq('id', vendaIdExcluir)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao verificar duplicata:', error)
      return { temDuplicata: false, quantidade: 0 }
    }

    const vendas = data?.map(v => ({
      id: v.id,
      cliente: v.NomeCli,
      data: v['Data de Emissao da NF']
    })) || []

    return {
      temDuplicata: vendas.length > 0,
      quantidade: vendas.length,
      vendas
    }
  } catch (err) {
    console.error('Erro ao verificar duplicata:', err)
    return { temDuplicata: false, quantidade: 0 }
  }
}