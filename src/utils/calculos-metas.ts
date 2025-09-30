// =====================================================
// CÁLCULOS DE METAS E PROGRESSOS
// =====================================================

// =====================================================
// CÁLCULOS DE METAS E PROGRESSOS
// =====================================================
import type { VendedorPerformance, MetaMarca } from '../types/observador';
import { isNumeroValido } from './observador-helpers';

/**
 * Calcula percentual de progresso em relação à meta
 * @param valorRealizado - Valor alcançado
 * @param valorMeta - Valor da meta
 * @returns Percentual de 0 a 100 (pode passar de 100)
 */
export function calcularProgressoMeta(
  valorRealizado: number,
  valorMeta: number
): number {
  if (!isNumeroValido(valorRealizado) || !isNumeroValido(valorMeta)) {
    return 0;
  }
  
  if (valorMeta === 0) return 0;
  
  const progresso = (valorRealizado / valorMeta) * 100;
  return Math.round(progresso * 10) / 10; // Arredonda para 1 casa decimal
}

/**
 * Calcula quanto falta para atingir a meta
 * @param valorRealizado - Valor alcançado
 * @param valorMeta - Valor da meta
 * @returns Valor faltante (positivo) ou excedente (negativo)
 */
export function calcularFaltaParaMeta(
  valorRealizado: number,
  valorMeta: number
): number {
  if (!isNumeroValido(valorRealizado) || !isNumeroValido(valorMeta)) {
    return 0;
  }
  
  return valorMeta - valorRealizado;
}

/**
 * Calcula projeção de fechamento baseada no ritmo atual
 * @param valorAcumulado - Valor acumulado até agora
 * @param diasDecorridos - Dias que já passaram no período
 * @param diasTotais - Total de dias no período
 * @returns Valor projetado para o final do período
 */
export function calcularProjecaoFinal(
  valorAcumulado: number,
  diasDecorridos: number,
  diasTotais: number
): number {
  if (!isNumeroValido(valorAcumulado) || diasDecorridos === 0 || diasTotais === 0) {
    return 0;
  }
  
  const mediaDiaria = valorAcumulado / diasDecorridos;
  return mediaDiaria * diasTotais;
}

/**
 * Calcula projeção baseada no mês atual do ano
 * @param valorAcumuladoAno - Valor acumulado no ano
 * @param mesAtual - Mês atual (1-12)
 * @returns Valor projetado para o ano completo
 */
export function calcularProjecaoAnual(
  valorAcumuladoAno: number,
  mesAtual: number
): number {
  if (!isNumeroValido(valorAcumuladoAno) || mesAtual === 0) {
    return 0;
  }
  
  const mediaMensal = valorAcumuladoAno / mesAtual;
  return mediaMensal * 12;
}

/**
 * Calcula quantos dias úteis faltam no mês
 * @param dataAtual - Data atual
 * @returns Número de dias úteis restantes (aproximado)
 */
export function calcularDiasUteisRestantes(dataAtual: Date = new Date()): number {
  const ultimoDiaMes = new Date(
    dataAtual.getFullYear(),
    dataAtual.getMonth() + 1,
    0
  ).getDate();
  
  const diaAtual = dataAtual.getDate();
  const diasRestantes = ultimoDiaMes - diaAtual;
  
  // Aproximação: ~70% dos dias são úteis (desconta finais de semana)
  return Math.round(diasRestantes * 0.7);
}

/**
 * Calcula média diária necessária para atingir meta
 * @param valorFaltante - Quanto falta para a meta
 * @param diasRestantes - Dias úteis restantes
 * @returns Média diária necessária
 */
export function calcularMediaDiariaNecessaria(
  valorFaltante: number,
  diasRestantes: number
): number {
  if (!isNumeroValido(valorFaltante) || diasRestantes === 0) {
    return 0;
  }
  
  return valorFaltante / diasRestantes;
}

/**
 * Verifica se vendedor está no ritmo para bater a meta
 * @param progressoAtual - Percentual atual (0-100)
 * @param diasDecorridos - Dias que passaram
 * @param diasTotais - Total de dias no período
 * @returns true se está no ritmo ou acima
 */
export function estaNoRitmoDaMeta(
  progressoAtual: number,
  diasDecorridos: number,
  diasTotais: number
): boolean {
  if (diasTotais === 0) return false;
  
  const progressoEsperado = (diasDecorridos / diasTotais) * 100;
  return progressoAtual >= progressoEsperado;
}

/**
 * Calcula o ranking de vendedores por performance
 * @param vendedores - Array de vendedores com performance
 * @param criterio - Critério de ordenação ('faturamento' ou 'progresso')
 * @returns Array ordenado com posições
 */
export function calcularRankingVendedores(
  vendedores: VendedorPerformance[],
  criterio: 'faturamento' | 'progresso' = 'faturamento'
): VendedorPerformance[] {
  const ordenado = [...vendedores].sort((a, b) => {
    if (criterio === 'faturamento') {
      return b.vendasMesAtual - a.vendasMesAtual;
    }
    return b.progressoMensal - a.progressoMensal;
  });
  
  return ordenado;
}

/**
 * Calcula percentual de crescimento entre dois períodos
 * @param valorAtual - Valor do período atual
 * @param valorAnterior - Valor do período anterior
 * @returns Percentual de crescimento (positivo ou negativo)
 */
export function calcularCrescimento(
  valorAtual: number,
  valorAnterior: number
): number {
  if (!isNumeroValido(valorAtual) || !isNumeroValido(valorAnterior)) {
    return 0;
  }
  
  if (valorAnterior === 0) {
    return valorAtual > 0 ? 100 : 0;
  }
  
  const crescimento = ((valorAtual - valorAnterior) / valorAnterior) * 100;
  return Math.round(crescimento * 10) / 10;
}

/**
 * Calcula ticket médio
 * @param faturamentoTotal - Faturamento total
 * @param numeroVendas - Número de vendas
 * @returns Valor médio por venda
 */
export function calcularTicketMedio(
  faturamentoTotal: number,
  numeroVendas: number
): number {
  if (!isNumeroValido(faturamentoTotal) || numeroVendas === 0) {
    return 0;
  }
  
  return faturamentoTotal / numeroVendas;
}

/**
 * Calcula distribuição percentual de cada item em relação ao total
 * @param valores - Array de valores numéricos
 * @returns Array com percentuais correspondentes
 */
export function calcularDistribuicaoPercentual(valores: number[]): number[] {
  const total = valores.reduce((acc, val) => acc + val, 0);
  
  if (total === 0) return valores.map(() => 0);
  
  return valores.map(valor => 
    Math.round((valor / total) * 1000) / 10 // 1 casa decimal
  );
}

/**
 * Calcula meses restantes no ano
 * @param mesAtual - Mês atual (1-12)
 * @returns Número de meses restantes
 */
export function calcularMesesRestantes(mesAtual: number): number {
  return Math.max(0, 12 - mesAtual);
}

/**
 * Calcula se vai bater meta anual baseado no ritmo atual
 * @param valorAcumuladoAno - Valor acumulado no ano
 * @param metaAnual - Meta do ano completo
 * @param mesAtual - Mês atual (1-12)
 * @returns Objeto com análise da situação
 */
export function analisarMetaAnual(
  valorAcumuladoAno: number,
  metaAnual: number,
  mesAtual: number
) {
  const progressoAtual = calcularProgressoMeta(valorAcumuladoAno, metaAnual);
  const projecaoFinal = calcularProjecaoAnual(valorAcumuladoAno, mesAtual);
  const progressoProjetado = calcularProgressoMeta(projecaoFinal, metaAnual);
  
  const vaiBaterMeta = projecaoFinal >= metaAnual;
  const diferenca = projecaoFinal - metaAnual;
  const percentualDiferenca = calcularCrescimento(projecaoFinal, metaAnual);
  
  return {
    progressoAtual,
    projecaoFinal,
    progressoProjetado,
    vaiBaterMeta,
    diferenca,
    percentualDiferenca,
    mesesRestantes: calcularMesesRestantes(mesAtual),
  };
}

/**
 * Calcula progresso de metas por marca
 * @param marcas - Array com dados das marcas
 * @returns Array de MetaMarca com progressos calculados
 */
export function calcularProgressoMarcas(
  marcas: Array<{
    marca: string;
    metaAnual: number;
    realizadoAno: number;
  }>
): MetaMarca[] {
  return marcas.map(m => {
    const progresso = calcularProgressoMeta(m.realizadoAno, m.metaAnual);
    const mesAtual = new Date().getMonth() + 1;
    const projecaoFinal = calcularProjecaoAnual(m.realizadoAno, mesAtual);
    
    return {
      marca: m.marca,
      metaAnual: m.metaAnual,
      realizadoAno: m.realizadoAno,
      progresso,
      projecaoFinal,
    };
  });
}

/**
 * Identifica vendedores em risco de não bater a meta
 * @param vendedores - Array de vendedores
 * @param limiteProgresso - Limite mínimo de progresso (padrão: 75%)
 * @returns Array de vendedores abaixo do limite
 */
export function identificarVendedoresEmRisco(
  vendedores: VendedorPerformance[],
  limiteProgresso: number = 75
): VendedorPerformance[] {
  return vendedores.filter(v => v.progressoMensal < limiteProgresso);
}

/**
 * Calcula top performers do período
 * @param vendedores - Array de vendedores
 * @param quantidade - Quantidade de top performers (padrão: 3)
 * @returns Array com os melhores vendedores
 */
export function calcularTopPerformers(
  vendedores: VendedorPerformance[],
  quantidade: number = 3
): VendedorPerformance[] {
  return calcularRankingVendedores(vendedores, 'progresso').slice(0, quantidade);
}