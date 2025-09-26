// src/utils/vendas-audit.ts
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../lib/supabase'

export type AcaoAuditoria = 'CREATE' | 'UPDATE' | 'DELETE'

export interface LogAuditoria {
  id: number
  venda_id: number
  acao: AcaoAuditoria
  usuario_id: string
  usuario_nome: string
  dados_anteriores?: Record<string, unknown>
  dados_novos?: Record<string, unknown>
  created_at: string
}

/**
 * Registra uma ação de auditoria na base de dados
 */
export async function registrarAuditoria(
  vendaId: number,
  acao: AcaoAuditoria,
  usuario: UserProfile,
  dadosAnteriores?: Record<string, unknown>,
  dadosNovos?: Record<string, unknown>
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { error } = await supabase
      .from('vendas_audit')
      .insert({
        venda_id: vendaId,
        acao,
        usuario_id: usuario.id,
        usuario_nome: usuario.nome || 'Usuário não identificado',
        dados_anteriores: dadosAnteriores || null,
        dados_novos: dadosNovos || null
      })

    if (error) {
      console.error('Erro ao registrar auditoria:', error)
      return { sucesso: false, erro: 'Falha ao registrar log de auditoria' }
    }

    return { sucesso: true }
  } catch (err) {
    console.error('Erro interno na auditoria:', err)
    return { sucesso: false, erro: 'Erro interno no sistema de auditoria' }
  }
}

/**
 * Busca o histórico de auditoria de uma venda específica
 */
export async function buscarHistoricoVenda(vendaId: number): Promise<{
  sucesso: boolean
  historico: LogAuditoria[]
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('vendas_audit')
      .select('*')
      .eq('venda_id', vendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return { sucesso: false, historico: [], erro: 'Erro ao buscar histórico' }
    }

    return { sucesso: true, historico: data || [] }
  } catch (err) {
    console.error('Erro interno ao buscar histórico:', err)
    return { sucesso: false, historico: [], erro: 'Erro interno' }
  }
}

/**
 * Busca logs de auditoria por usuário
 */
export async function buscarLogsPorUsuario(
  usuarioId: string,
  limite: number = 50
): Promise<{
  sucesso: boolean
  logs: LogAuditoria[]
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('vendas_audit')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) {
      console.error('Erro ao buscar logs do usuário:', error)
      return { sucesso: false, logs: [], erro: 'Erro ao buscar logs do usuário' }
    }

    return { sucesso: true, logs: data || [] }
  } catch (err) {
    console.error('Erro interno ao buscar logs:', err)
    return { sucesso: false, logs: [], erro: 'Erro interno' }
  }
}

/**
 * Busca logs recentes do sistema (últimas 24h)
 */
export async function buscarLogsRecentes(limite: number = 100): Promise<{
  sucesso: boolean
  logs: LogAuditoria[]
  erro?: string
}> {
  try {
    const ontemISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('vendas_audit')
      .select('*')
      .gte('created_at', ontemISO)
      .order('created_at', { ascending: false })
      .limit(limite)

    if (error) {
      console.error('Erro ao buscar logs recentes:', error)
      return { sucesso: false, logs: [], erro: 'Erro ao buscar logs recentes' }
    }

    return { sucesso: true, logs: data || [] }
  } catch (err) {
    console.error('Erro interno ao buscar logs recentes:', err)
    return { sucesso: false, logs: [], erro: 'Erro interno' }
  }
}

/**
 * Gera relatório de atividade por período
 */
export async function gerarRelatorioAtividade(
  dataInicio: string,
  dataFim: string
): Promise<{
  sucesso: boolean
  relatorio: {
    totalOperacoes: number
    criacao: number
    edicao: number
    exclusao: number
    usuariosMaisAtivos: Array<{ usuario: string; operacoes: number }>
    diasMaisAtivos: Array<{ data: string; operacoes: number }>
  }
  erro?: string
}> {
  try {
    const { data, error } = await supabase
      .from('vendas_audit')
      .select('*')
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao gerar relatório:', error)
      return {
        sucesso: false,
        relatorio: {
          totalOperacoes: 0,
          criacao: 0,
          edicao: 0,
          exclusao: 0,
          usuariosMaisAtivos: [],
          diasMaisAtivos: []
        },
        erro: 'Erro ao gerar relatório'
      }
    }

    const logs = data || []
    
    // Contadores por ação
    const contadores = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0
    }

    // Contadores por usuário
    const usuariosMap = new Map<string, number>()
    
    // Contadores por dia
    const diasMap = new Map<string, number>()

    logs.forEach(log => {
      // Contar por ação
      contadores[log.acao as keyof typeof contadores]++

      // Contar por usuário
      const usuario = log.usuario_nome || 'Usuário desconhecido'
      usuariosMap.set(usuario, (usuariosMap.get(usuario) || 0) + 1)

      // Contar por dia
      const dia = new Date(log.created_at).toISOString().split('T')[0]
      diasMap.set(dia, (diasMap.get(dia) || 0) + 1)
    })

    // Top 5 usuários mais ativos
    const usuariosMaisAtivos = Array.from(usuariosMap.entries())
      .map(([usuario, operacoes]) => ({ usuario, operacoes }))
      .sort((a, b) => b.operacoes - a.operacoes)
      .slice(0, 5)

    // Top 5 dias mais ativos
    const diasMaisAtivos = Array.from(diasMap.entries())
      .map(([data, operacoes]) => ({ data, operacoes }))
      .sort((a, b) => b.operacoes - a.operacoes)
      .slice(0, 5)

    return {
      sucesso: true,
      relatorio: {
        totalOperacoes: logs.length,
        criacao: contadores.CREATE,
        edicao: contadores.UPDATE,
        exclusao: contadores.DELETE,
        usuariosMaisAtivos,
        diasMaisAtivos
      }
    }
  } catch (err) {
    console.error('Erro interno ao gerar relatório:', err)
    return {
      sucesso: false,
      relatorio: {
        totalOperacoes: 0,
        criacao: 0,
        edicao: 0,
        exclusao: 0,
        usuariosMaisAtivos: [],
        diasMaisAtivos: []
      },
      erro: 'Erro interno'
    }
  }
}

/**
 * Formata dados para exibir diferenças entre versões
 */
export function formatarDiferencas(dadosAnteriores: Record<string, unknown>, dadosNovos: Record<string, unknown>): {
  campos: Array<{
    campo: string
    anterior: string
    novo: string
    mudou: boolean
  }>
} {
  const campos: Array<{
    campo: string
    anterior: string
    novo: string
    mudou: boolean
  }> = []

  // Lista de campos importantes para comparar
  const camposComparar = [
    'Número da Nota Fiscal',
    'Data de Emissao da NF',
    'Quantidade',
    'Preço Unitário',
    'total',
    'Cód. Referência',
    'cdCli',
    'cdRepr',
    'NomeCli',
    'NomeRepr',
    'MARCA',
    'GRUPO',
    'CIDADE'
  ]

  camposComparar.forEach(campo => {
    const anterior = dadosAnteriores?.[campo]?.toString() || 'N/A'
    const novo = dadosNovos?.[campo]?.toString() || 'N/A'
    const mudou = anterior !== novo

    campos.push({
      campo: formatarNomeCampo(campo),
      anterior,
      novo,
      mudou
    })
  })

  return { campos }
}

/**
 * Formata nome do campo para exibição
 */
function formatarNomeCampo(campo: string): string {
  const mapeamento: Record<string, string> = {
    'Número da Nota Fiscal': 'Número NF',
    'Data de Emissao da NF': 'Data Emissão',
    'Quantidade': 'Quantidade',
    'Preço Unitário': 'Preço Unit.',
    'total': 'Total',
    'Cód. Referência': 'Cód. Produto',
    'cdCli': 'Cód. Cliente',
    'cdRepr': 'Cód. Represent.',
    'NomeCli': 'Cliente',
    'NomeRepr': 'Representante',
    'MARCA': 'Marca',
    'GRUPO': 'Grupo',
    'CIDADE': 'Cidade'
  }

  return mapeamento[campo] || campo
}

/**
 * Formatar timestamp para exibição brasileira
 */
export function formatarDataHoraBrasil(timestamp: string): string {
  try {
    const data = new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(data)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return timestamp
  }
}

/**
 * Obter ícone e cor por tipo de ação
 */
export function obterIconeAcao(acao: AcaoAuditoria): {
  icone: string
  cor: string
  descricao: string
} {
  const mapeamento = {
    CREATE: {
      icone: '✅',
      cor: 'text-green-600',
      descricao: 'Venda criada'
    },
    UPDATE: {
      icone: '✏️',
      cor: 'text-blue-600',
      descricao: 'Venda editada'
    },
    DELETE: {
      icone: '🗑️',
      cor: 'text-red-600',
      descricao: 'Venda excluída'
    }
  }

  return mapeamento[acao] || {
    icone: '❓',
    cor: 'text-gray-600',
    descricao: 'Ação desconhecida'
  }
}