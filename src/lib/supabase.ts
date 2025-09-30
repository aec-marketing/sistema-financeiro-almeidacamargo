import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================
// TYPES BASEADOS NA ESTRUTURA DAS TABELAS
// ============================================

export type Cliente = {
  id: number
  Entidade: string // É text, não number
  Nome: string
  CEP: string
  'Município': string
  'Sigla Estado': string
  endereco: string
  Telefone: string
  CNPJ: string
  InscrEst: string
  'C.N.A.E.': string
}

export type ItemProduto = {
  id: number
  'Cód. Referência': string
  'Descr. Produto': string
  'Descr. Resumo Produto': string
  'Cód. do Produto': string
  'Compl. Cód. do Produto': string
  'Faixa do ICMS': string
  'Peso Bruto Kg': string
  'Peso Liquido Kg': string
  'Status Importado/Nacional': string
  'Status de Tipo de Produto': string
  'Cód. Categoria de Grupo': string
  'Descr. Categoria de Grupo': string
  'Cód. Subgrupo de Produto': string
  'Desc. Subgrupo de Produto': string
  'Cód. Grupo Produto': string
  'Descr. Grupo Produto': string
  'Código Cat Prod': string
  'Descr. Categoria de Prod': string
  'N.B.M.': string
  'Aliquota de IPI': string
  'Cód. Marca Produtos': string
  'Descr. Marca Produto': string
  'Cód. Conta Contábil Reduzida': string
  'Descr. Conta Contabil': string
  cd_ctcResult: string
  ds_ctcResult: string
  'Cód. Unidade de Medida': string
  'Descr. Unidade de Medida': string
  'Código EAN 13': string
  Largura: string
  Altura: string
  Comprimento: string
  'Detalhamento Técnico': string
}

export type Venda = {
  id: number
  'Número da Nota Fiscal': string
  'Data de Emissao da NF': string
  Quantidade: string
  'Preço Unitário': string
  total: string
  'Cód. Referência': string
  'Descr. Produto': string
  'Cod de Natureza de Operação': string
  'Código Fiscal da Operação': string
  TIPO: string
  'Descr de Natureza de Operação': string
  'Cód. Subgrupo de Produto': string
  'Desc. Subgrupo de Produto': string
  cdEmpresa: number
  NomeEmpresa: string
  'Valor Icms Total': string
  'Valor do IPI': string
  cdCli: string // É text, não number
  NomeCli: string
  cdRepr: number
  NomeRepr: string
  'Base de Calc Icms': string
  VlrBaseICMSTotItem: string
  VlrIpiTotItem: string
  MARCA: string
  GRUPO: string
  'CLIENTE + CIDADE': string
  CIDADE: string
  'cod. Referência + Descrição produto': string
}

export type UserProfile = {
  id: string
  role: 'admin_financeiro' | 'consultor_vendas' | 'observador' // ADICIONE 'observador'
  nome: string
  cd_representante?: number
  ativo: boolean
  created_at: string
}

// ============================================
// FUNÇÕES AUXILIARES PARA AUTH
// ============================================

/**
 * Obtém o perfil do usuário logado
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return null
  }
}

/**
 * Verifica se o usuário é admin financeiro
 */
export async function isAdminFinanceiro(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'admin_financeiro'
}

/**
 * Cria perfil automaticamente após signup
 */
export async function createUserProfile(
  userId: string, 
  userData: {
    nome: string
    role?: 'admin_financeiro' | 'consultor_vendas'
    cd_representante?: number
  }
) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nome: userData.nome,
      role: userData.role || 'consultor_vendas',
      cd_representante: userData.cd_representante,
      ativo: true
    })

  if (error) {
    console.error('Erro ao criar perfil:', error)
    throw error
  }

  return data
}

// ============================================
// FUNÇÕES DE CONSULTA OTIMIZADAS
// ============================================

/**
 * Busca vendas com filtros (otimizada para dashboard)
 */
export async function getVendasDashboard(filtros?: {
  dataInicio?: string
  dataFim?: string
  cdRepresentante?: number
  limite?: number
}) {
  let query = supabase
    .from('vendas')
    .select(`
      id,
      "Numero da N",
      "Data de Emis",
      Quantidade,
      "Preço Unitari", 
      total,
      "Descr. Produt",
      NomeEmpres,
      NomeCli,
      MARCA,
      GRUPO,
      CIDADE,
      cdRepr
    `)

  // Aplicar filtros se fornecidos
  if (filtros?.dataInicio) {
    query = query.gte('Data de Emis', filtros.dataInicio)
  }
  
  if (filtros?.dataFim) {
    query = query.lte('Data de Emis', filtros.dataFim)
  }
  
  if (filtros?.cdRepresentante) {
    query = query.eq('cdRepr', filtros.cdRepresentante)
  }

  // Ordenar por data mais recente
  query = query.order('Data de Emis', { ascending: false })
  
  // Limitar resultados se especificado
  if (filtros?.limite) {
    query = query.limit(filtros.limite)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar vendas:', error)
    throw error
  }

  return data
}

/**
 * Busca KPIs para dashboard
 */
export async function getKPIsDashboard(cdRepresentante?: number) {
  let query = supabase
    .from('vendas')
    .select('total, "Data de Emis", cdCli, cdRepr')

  // Se for consultor, filtrar apenas suas vendas
  if (cdRepresentante) {
    query = query.eq('cdRepr', cdRepresentante)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar KPIs:', error)
    throw error
  }

  // Calcular KPIs no frontend (mais eficiente que views)
  const totalVendas = data?.length || 0
  const faturamentoTotal = data?.reduce((acc, venda) => {
    const valor = parseFloat(venda.total?.replace(',', '.') || '0')
    return acc + valor
  }, 0) || 0
  
  const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0
  const clientesUnicos = new Set(data?.map(v => v.cdCli)).size

  return {
    totalVendas,
    faturamentoTotal,
    ticketMedio,
    clientesUnicos
  }
}