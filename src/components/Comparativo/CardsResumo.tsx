// src/components/Comparativo/CardsResumo.tsx

/**
 * Componente que exibe cards com resumo da comparação
 * Mostra: Faturamento, Quantidade, Ticket Médio e Clientes
 * Com variações percentuais entre os períodos
 */

import type { JSX } from 'react/jsx-runtime';
import type { ResumoComparacao } from '../../types/comparativo';
import { calcularVariacao } from '../../utils/data-aggregator';

// ============================================
// INTERFACES
// ============================================

interface CardsResumoProps {
  resumo: ResumoComparacao;
  labelPeriodoA: string;
  labelPeriodoB: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CardsResumo({
  resumo,
  labelPeriodoA,
  labelPeriodoB
}: CardsResumoProps) {

  // ============================================
  // CALCULAR VARIAÇÕES
  // ============================================

  const variacaoFaturamento = calcularVariacao(resumo.faturamentoA, resumo.faturamentoB);
  const variacaoQuantidade = calcularVariacao(resumo.quantidadeA, resumo.quantidadeB);
  const variacaoTicket = calcularVariacao(resumo.ticketMedioA, resumo.ticketMedioB);
  const variacaoClientes = calcularVariacao(resumo.clientesA, resumo.clientesB);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  /**
   * Formata número para moeda brasileira
   */
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  /**
   * Formata número inteiro com separador de milhares
   */
  const formatarNumero = (valor: number): string => {
    return Math.round(valor).toLocaleString('pt-BR');
  };

  /**
   * Retorna a cor baseada na variação
   */
  const obterCor = (variacao: number): string => {
    if (variacao > 0) return 'text-green-600 dark:text-green-400';
    if (variacao < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  /**
   * Retorna o ícone baseado na variação
   */
  const obterIcone = (variacao: number): JSX.Element => {
    if (variacao > 0) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    }
    if (variacao < 0) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Card 1: Faturamento Total */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={`flex items-center gap-1 ${obterCor(variacaoFaturamento)}`}>
            {obterIcone(variacaoFaturamento)}
            <span className="font-bold text-lg">
              {variacaoFaturamento > 0 ? '+' : ''}{variacaoFaturamento.toFixed(1)}%
            </span>
          </div>
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Faturamento Total
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoA}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarMoeda(resumo.faturamentoA)}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoB}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarMoeda(resumo.faturamentoB)}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Quantidade Total */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className={`flex items-center gap-1 ${obterCor(variacaoQuantidade)}`}>
            {obterIcone(variacaoQuantidade)}
            <span className="font-bold text-lg">
              {variacaoQuantidade > 0 ? '+' : ''}{variacaoQuantidade.toFixed(1)}%
            </span>
          </div>
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Quantidade Vendida
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoA}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarNumero(resumo.quantidadeA)} un
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoB}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarNumero(resumo.quantidadeB)} un
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Ticket Médio */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className={`flex items-center gap-1 ${obterCor(variacaoTicket)}`}>
            {obterIcone(variacaoTicket)}
            <span className="font-bold text-lg">
              {variacaoTicket > 0 ? '+' : ''}{variacaoTicket.toFixed(1)}%
            </span>
          </div>
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Ticket Médio
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoA}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarMoeda(resumo.ticketMedioA)}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoB}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatarMoeda(resumo.ticketMedioB)}
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Clientes Únicos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className={`flex items-center gap-1 ${obterCor(variacaoClientes)}`}>
            {obterIcone(variacaoClientes)}
            <span className="font-bold text-lg">
              {variacaoClientes > 0 ? '+' : ''}{variacaoClientes.toFixed(1)}%
            </span>
          </div>
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Clientes Únicos
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoA}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {resumo.clientesA}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">{labelPeriodoB}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {resumo.clientesB}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}