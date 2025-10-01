// =====================================================
// TIPOS PARA SISTEMA DASHBOARD OBSERVADOR
// =====================================================

/**
 * Marca com performance de vendas
 */
export interface MarcaPerformance {
  nome: string;
  total: number;
  percentual: number;
}

/**
 * Performance individual de um vendedor
 */
export interface VendedorPerformance {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  metaMensal: number;
  metaAnual: number;
  vendasMesAtual: number;
  vendasAnoAtual: number;
  progressoMensal: number; // 0-100
  progressoAnual: number; // 0-100
  top3Marcas: MarcaPerformance[];
}

/**
 * Dados agregados de uma cidade
 */
export interface CidadeVenda {
  cidade: string;
  totalVendas: number;
  faturamento: number;
  crescimento: number; // % vs mês anterior
  numeroVendas: number;
}

/**
 * Dados de crescimento por região
 */
export interface CrescimentoCidade {
  cidade: string;
  mesAtual: number;
  mesAnterior: number;
  crescimentoPercentual: number;
  tendencia: 'subindo' | 'descendo' | 'estavel';
}

/**
 * Métricas globais da empresa
 */
export interface MetricasGlobais {
  faturamentoTotal: number;
  totalVendas: number;
  clientesAtivos: number;
  ticketMedio: number;
  comparativoMesAnterior: {
    faturamento: number; // %
    vendas: number; // %
    clientes: number; // %
  };
}

/**
 * Produto com performance de vendas
 */
export interface ProdutoVenda {
  descricao: string;
  codigoReferencia: string;
  marca: string;
  totalVendido: number;
  faturamento: number;
  percentualTotal: number;
  numeroVendas: number;
}

/**
 * Cliente com histórico de compras
 */
export interface ClienteCompra {
  nomeCliente: string;
  cidade: string;
  faturamento: number;
  numeroCompras: number;
  ticketMedio: number;
}

/**
 * Dados mensais para gráfico de evolução
 */
export interface MesVenda {
  mes: string; // 'Jan', 'Fev', 'Mar'...
  mesNumero: number; // 1-12
  ano: number;
  faturamento: number;
  numeroVendas: number;
}

/**
 * Ranking de vendedor no período
 */
export interface RankingVendedor {
  posicao: number;
  vendedorId: string;
  nomeVendedor: string;
  faturamento: number;
  numeroVendas: number;
  crescimento: number; // % vs mês anterior
  medalha?: 'ouro' | 'prata' | 'bronze';
}

/**
 * Destaques do mês
 */
export interface DestaqueMes {
  maiorVenda: {
    valor: number;
    cliente: string;
    vendedor: string;
    data: string;
  };
  vendedorMaisVendas: {
    nome: string;
    quantidade: number;
  };
  melhorTaxaConversao: {
    vendedor: string;
    taxa: number;
  };
  mvpMes: {
    nome: string;
    crescimento: number;
  };
}

/**
 * Meta por marca distribuída
 */
export interface MetaMarca {
  marca: string;
  metaAnual: number;
  realizadoAno: number;
  progresso: number; // 0-100
  projecaoFinal: number;
}

/**
 * Configuração de cores para barras de progresso
 */
export type CorProgresso = 'vermelho' | 'amarelo' | 'azul' | 'verde';

/**
 * Status de carregamento genérico
 */
export interface LoadingState<T = unknown> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}

/**
 * Configurações do slideshow
 */
export interface SlideshowConfig {
  intervalo: number; // milissegundos
  totalSlides: number;
  autoPlay: boolean;
  loopInfinito: boolean;
}

/**
 * Estado do slideshow
 */
export interface SlideshowState {
  slideAtual: number;
  isPausado: boolean;
  tempoRestante: number;
  ultimaTransicao: Date | null;
}

/**
 * Filtros para queries de dados
 */
export interface FiltrosObservador {
  mes?: number;
  ano?: number;
  dataInicio?: string;
  dataFim?: string;
  vendedorId?: string;
  cidade?: string;
}