// src/utils/insights-generator.ts

/**
 * Gerador de insights automáticos para comparações
 * Analisa os dados e gera observações relevantes
 */

import type { ResultadoComparacao, ItemDetalhado } from '../types/comparativo';import { calcularVariacao } from './data-aggregator';

// ============================================
// CONFIGURAÇÕES DE THRESHOLDS
// ============================================

const THRESHOLDS = {
  CRESCIMENTO_SIGNIFICATIVO: 50, // % - crescimento considerado significativo
  QUEDA_SIGNIFICATIVA: -20,      // % - queda considerada significativa
  CRESCIMENTO_MODERADO: 20,      // % - crescimento moderado
  QUEDA_MODERADA: -10,           // % - queda moderada
  VARIACAO_BAIXA: 5              // % - variação baixa (estável)
};

// ============================================
// FUNÇÃO PRINCIPAL: Gerar Insights
// ============================================

/**
 * Gera insights automáticos baseados nos resultados da comparação
 */
export const gerarInsights = (resultado: ResultadoComparacao): string[] => {
  const insights: string[] = [];

  // ============================================
  // 1. ANÁLISE DO RESUMO GERAL
  // ============================================
  
  insights.push(...analisarResumoGeral(resultado));

  // ============================================
  // 2. ANÁLISE DE CRESCIMENTOS
  // ============================================
  
  insights.push(...analisarCrescimentos(resultado.detalhamento));

  // ============================================
  // 3. ANÁLISE DE QUEDAS
  // ============================================
  
  insights.push(...analisarQuedas(resultado.detalhamento));

  // ============================================
  // 4. ANÁLISE DE TICKET MÉDIO
  // ============================================
  
  insights.push(...analisarTicketMedio(resultado));

  // ============================================
  // 5. ANÁLISE DE ESTABILIDADE
  // ============================================
  
  insights.push(...analisarEstabilidade(resultado.detalhamento));

  return insights;
};

// ============================================
// ANÁLISE 1: Resumo Geral
// ============================================

const analisarResumoGeral = (resultado: ResultadoComparacao): string[] => {
  const insights: string[] = [];
  const { resumo } = resultado;

  // Calcular variações gerais
  const variacaoFaturamento = calcularVariacao(
    resumo.faturamentoA,
    resumo.faturamentoB
  );
  const variacaoQuantidade = calcularVariacao(
    resumo.quantidadeA,
    resumo.quantidadeB
  );
  const variacaoClientes = calcularVariacao(
    resumo.clientesA,
    resumo.clientesB
  );

  // Insight de faturamento
  if (variacaoFaturamento > THRESHOLDS.CRESCIMENTO_SIGNIFICATIVO) {
    insights.push(
      `🎉 Faturamento cresceu ${variacaoFaturamento.toFixed(1)}%! ` +
      `De R$ ${formatarMoeda(resumo.faturamentoA)} para R$ ${formatarMoeda(resumo.faturamentoB)}.`
    );
  } else if (variacaoFaturamento < THRESHOLDS.QUEDA_SIGNIFICATIVA) {
    insights.push(
      `⚠️ Faturamento caiu ${Math.abs(variacaoFaturamento).toFixed(1)}%. ` +
      `De R$ ${formatarMoeda(resumo.faturamentoA)} para R$ ${formatarMoeda(resumo.faturamentoB)}.`
    );
  } else if (Math.abs(variacaoFaturamento) < THRESHOLDS.VARIACAO_BAIXA) {
    insights.push(
      `📊 Faturamento estável (${variacaoFaturamento > 0 ? '+' : ''}${variacaoFaturamento.toFixed(1)}%). ` +
      `Mantendo em torno de R$ ${formatarMoeda(resumo.faturamentoB)}.`
    );
  }

  // Insight de quantidade vs faturamento
  const diferencaVariacao = Math.abs(variacaoFaturamento - variacaoQuantidade);
  if (diferencaVariacao > 15) {
    if (variacaoFaturamento > variacaoQuantidade) {
      insights.push(
        `💡 Faturamento cresceu mais que a quantidade vendida. ` +
        `Indicativo de vendas de produtos com maior valor agregado.`
      );
    } else {
      insights.push(
        `💡 Quantidade vendida cresceu mais que o faturamento. ` +
        `Indicativo de vendas de produtos com menor valor unitário.`
      );
    }
  }

  // Insight de clientes
  if (variacaoClientes > 20) {
    insights.push(
      `👥 Base de clientes ativos cresceu ${variacaoClientes.toFixed(1)}%! ` +
      `De ${resumo.clientesA} para ${resumo.clientesB} clientes.`
    );
  } else if (variacaoClientes < -15) {
    insights.push(
      `⚠️ Base de clientes ativos reduziu ${Math.abs(variacaoClientes).toFixed(1)}%. ` +
      `De ${resumo.clientesA} para ${resumo.clientesB} clientes.`
    );
  }

  return insights;
};

// ============================================
// ANÁLISE 2: Maiores Crescimentos
// ============================================

const analisarCrescimentos = (detalhamento: ItemDetalhado[]): string[] => {
  const insights: string[] = [];

  // Filtrar apenas itens com crescimento significativo
  const crescimentos = detalhamento
    .filter(item => item.variacaoValor > THRESHOLDS.CRESCIMENTO_SIGNIFICATIVO)
    .sort((a, b) => b.variacaoValor - a.variacaoValor)
    .slice(0, 3); // Top 3

  if (crescimentos.length > 0) {
    insights.push(`🚀 **Destaques de crescimento:**`);
    
    crescimentos.forEach((item, index) => {
      insights.push(
        `${index + 1}. **${item.chave}** cresceu ${item.variacaoValor.toFixed(1)}% ` +
        `(de R$ ${formatarMoeda(item.periodoA.valor)} para R$ ${formatarMoeda(item.periodoB.valor)})`
      );
    });
  }

  return insights;
};

// ============================================
// ANÁLISE 3: Maiores Quedas
// ============================================

const analisarQuedas = (detalhamento: ItemDetalhado[]): string[] => {
  const insights: string[] = [];

  // Filtrar apenas itens com queda significativa
  const quedas = detalhamento
    .filter(item => item.variacaoValor < THRESHOLDS.QUEDA_SIGNIFICATIVA)
    .sort((a, b) => a.variacaoValor - b.variacaoValor)
    .slice(0, 3); // Top 3 quedas

  if (quedas.length > 0) {
    insights.push(`📉 **Atenção - quedas significativas:**`);
    
    quedas.forEach((item, index) => {
      insights.push(
        `${index + 1}. **${item.chave}** caiu ${Math.abs(item.variacaoValor).toFixed(1)}% ` +
        `(de R$ ${formatarMoeda(item.periodoA.valor)} para R$ ${formatarMoeda(item.periodoB.valor)})`
      );
    });
  }

  return insights;
};

// ============================================
// ANÁLISE 4: Ticket Médio
// ============================================

const analisarTicketMedio = (resultado: ResultadoComparacao): string[] => {
  const insights: string[] = [];
  const { resumo } = resultado;

  const variacaoTicket = calcularVariacao(
    resumo.ticketMedioA,
    resumo.ticketMedioB
  );

  if (Math.abs(variacaoTicket) < THRESHOLDS.VARIACAO_BAIXA) {
    insights.push(
      `📊 Ticket médio estável (${variacaoTicket > 0 ? '+' : ''}${variacaoTicket.toFixed(1)}%). ` +
      `O crescimento vem principalmente do volume de vendas.`
    );
  } else if (variacaoTicket > 15) {
    insights.push(
      `📈 Ticket médio cresceu ${variacaoTicket.toFixed(1)}%. ` +
      `Clientes estão comprando produtos de maior valor ou em maior quantidade.`
    );
  } else if (variacaoTicket < -15) {
    insights.push(
      `📉 Ticket médio caiu ${Math.abs(variacaoTicket).toFixed(1)}%. ` +
      `Pode indicar estratégia de vendas focada em volume.`
    );
  }

  return insights;
};

// ============================================
// ANÁLISE 5: Itens Estáveis
// ============================================

const analisarEstabilidade = (detalhamento: ItemDetalhado[]): string[] => {
  const insights: string[] = [];

  // Contar itens estáveis (variação baixa)
  const itensEstaveis = detalhamento.filter(
    item => Math.abs(item.variacaoValor) < THRESHOLDS.VARIACAO_BAIXA
  );

  if (itensEstaveis.length > 0) {
    const percentualEstavel = (itensEstaveis.length / detalhamento.length) * 100;
    
    if (percentualEstavel > 50) {
      insights.push(
        `🔄 ${percentualEstavel.toFixed(0)}% dos itens apresentam performance estável, ` +
        `mantendo resultados consistentes entre os períodos.`
      );
    }
  }

  // Identificar itens que apareceram apenas em um período
  const novosItens = detalhamento.filter(
    item => item.periodoA.valor === 0 && item.periodoB.valor > 0
  );
  
  const itensDesaparecidos = detalhamento.filter(
    item => item.periodoA.valor > 0 && item.periodoB.valor === 0
  );

  if (novosItens.length > 0) {
    insights.push(
      `✨ ${novosItens.length} novo(s) item(ns) apareceu(ram) no segundo período.`
    );
  }

  if (itensDesaparecidos.length > 0) {
    insights.push(
      `⚠️ ${itensDesaparecidos.length} item(ns) deixou(aram) de ter vendas no segundo período.`
    );
  }

  return insights;
};

// ============================================
// HELPER: Formatar Moeda
// ============================================

const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};