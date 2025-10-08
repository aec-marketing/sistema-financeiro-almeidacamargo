// src/types/comparativo.ts

/**
 * Tipos para o sistema de Comparativo de Períodos
 * Baseado na lógica de filtros da página de Relatórios
 */

// ============================================
// TIPOS DE PERÍODO
// ============================================

export type TipoPeriodo = 'mom' | 'yoy' | 'qoq' | 'custom';

// Mapeamento dos tipos de período para labels amigáveis
export const TIPOS_PERIODO = {
  mom: { label: 'Mês vs Mês Anterior', descricao: 'Compara mês atual com o mês anterior' },
  yoy: { label: 'Ano vs Ano Anterior', descricao: 'Compara mesmo período do ano passado' },
  qoq: { label: 'Trimestre vs Trimestre Anterior', descricao: 'Compara trimestre atual com anterior' },
  custom: { label: 'Período Customizado', descricao: 'Defina datas específicas para comparar' }
} as const;

// ============================================
// ESTRUTURA DE PERÍODO
// ============================================

export interface PeriodoComparacao {
  periodoA: {
    inicio: Date;
    fim: Date;
    label: string; // Ex: "Janeiro 2025"
  };
  periodoB: {
    inicio: Date;
    fim: Date;
    label: string; // Ex: "Abril 2025"
  };
}

// ============================================
// FILTROS (baseado em RelatorioPage)
// ============================================

export type OperadorFiltro = 'incluir' | 'excluir';
export type LogicaFiltro = 'AND' | 'OR' | 'EXCEPT';

export interface FiltroComparacao {
  id?: number;
  campo: string; // Ex: "MARCA", "NomeRepr", "CIDADE"
  operador: OperadorFiltro;
  valores: string[]; // Array de valores selecionados
  logica: LogicaFiltro;
}

// ============================================
// AGRUPAMENTO E MÉTRICA
// ============================================

export type AgrupamentoPor = 'marca' | 'produto' | 'vendedor' | 'cliente' | 'cidade';
export type MetricaVisualizada = 'faturamento' | 'quantidade' | 'ambos';

// Labels amigáveis para agrupamento
export const AGRUPAMENTOS = {
  marca: { label: 'Por Marca', campo: 'MARCA', icone: '🏢' },
  produto: { label: 'Por Produto', campo: 'Descr. Produto', icone: '📦' },
  vendedor: { label: 'Por Vendedor', campo: 'NomeRepr', icone: '👤' },
  cliente: { label: 'Por Cliente', campo: 'NomeCli', icone: '🏬' },
  cidade: { label: 'Por Cidade', campo: 'CIDADE', icone: '📍' }
} as const;

// ============================================
// CONFIGURAÇÃO COMPLETA
// ============================================

export interface ConfigComparacao {
  periodos: PeriodoComparacao;
  filtros: FiltroComparacao[];
  agrupamento: AgrupamentoPor;
  metrica: MetricaVisualizada;
}

// ============================================
// RESULTADOS
// ============================================

// Resumo geral da comparação
export interface ResumoComparacao {
  faturamentoA: number;
  faturamentoB: number;
  quantidadeA: number;
  quantidadeB: number;
  ticketMedioA: number;
  ticketMedioB: number;
  clientesA: number;
  clientesB: number;
}

// Detalhamento por item (marca/produto/vendedor/etc)
export interface ItemDetalhado {
  chave: string; // Nome do produto/marca/vendedor
  periodoA: {
    quantidade: number;
    valor: number;
  };
  periodoB: {
    quantidade: number;
    valor: number;
  };
  variacaoQtd: number; // Percentual
  variacaoValor: number; // Percentual
}

// Resultado completo da comparação
export interface ResultadoComparacao {
  resumo: ResumoComparacao;
  detalhamento: ItemDetalhado[];
  insights: string[]; // Insights gerados automaticamente
}