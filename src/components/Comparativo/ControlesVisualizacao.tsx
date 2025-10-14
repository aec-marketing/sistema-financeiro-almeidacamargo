// src/components/Comparativo/ControlesVisualizacao.tsx

/**
 * Componente para controlar como os dados serão agrupados e visualizados
 * Permite escolher: Por Marca/Produto/Vendedor/Cliente/Cidade
 * E qual métrica: Faturamento/Quantidade/Ambos
 */

import type { AgrupamentoPor, MetricaVisualizada } from '../../types/comparativo';
import { AGRUPAMENTOS } from '../../types/comparativo';

// ============================================
// INTERFACES
// ============================================

interface ControlesVisualizacaoProps {
  agrupamento: AgrupamentoPor;
  metrica: MetricaVisualizada;
  onAgrupamentoChange: (agrupamento: AgrupamentoPor) => void;
  onMetricaChange: (metrica: MetricaVisualizada) => void;
  isVendedor?: boolean;
}

// ============================================
// CONFIGURAÇÕES DE MÉTRICAS
// ============================================

const METRICAS = {
  faturamento: {
    label: 'Faturamento Total',
    icone: '💰',
    descricao: 'Valor total em reais (R$)',
    cor: 'text-green-600 dark:text-green-400'
  },
  quantidade: {
    label: 'Quantidade Vendida',
    icone: '📦',
    descricao: 'Total de unidades vendidas',
    cor: 'text-blue-600 dark:text-blue-400'
  },
  ambos: {
    label: 'Faturamento e Quantidade',
    icone: '📊',
    descricao: 'Visualizar ambas as métricas',
    cor: 'text-purple-600 dark:text-purple-400'
  }
} as const;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ControlesVisualizacao({
  agrupamento,
  metrica,
  onAgrupamentoChange,
  onMetricaChange,
  isVendedor = false
}: ControlesVisualizacaoProps) {

  // Agrupamentos permitidos para vendedor
  const agrupamentosPermitidos: AgrupamentoPor[] = isVendedor
    ? ['marca', 'produto', 'cliente', 'cidade'] // SEM 'vendedor'
    : ['marca', 'produto', 'vendedor', 'cliente', 'cidade']; // TODOS

  return (
    <div className="space-y-6">

      {/* Seção: Agrupar Por */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          Agrupar dados por:
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Escolha como deseja visualizar a comparação dos períodos
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(AGRUPAMENTOS) as AgrupamentoPor[])
            .filter(key => agrupamentosPermitidos.includes(key))
            .map(key => {
              const grupo = AGRUPAMENTOS[key];
              const isSelected = agrupamento === key;

              return (
                <button
                  key={key}
                  onClick={() => onAgrupamentoChange(key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                  }`}
                >
                  {/* Ícone */}
                  <div className="text-3xl mb-2">{grupo.icone}</div>

                  {/* Label */}
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {grupo.label}
                  </div>

                  {/* Indicador de seleção */}
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Selecionado</span>
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-gray-200 dark:border-gray-700"></div>

      {/* Seção: Métrica */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          Visualizar métrica:
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Escolha qual informação deseja comparar entre os períodos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(METRICAS) as MetricaVisualizada[]).map(key => {
            const metricaInfo = METRICAS[key];
            const isSelected = metrica === key;

            return (
              <button
                key={key}
                onClick={() => onMetricaChange(key)}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone */}
                  <div className="text-3xl">{metricaInfo.icone}</div>
                  
                  <div className="flex-1">
                    {/* Label */}
                    <div className={`font-semibold text-gray-900 dark:text-white mb-1 ${metricaInfo.cor}`}>
                      {metricaInfo.label}
                    </div>
                    
                    {/* Descrição */}
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {metricaInfo.descricao}
                    </div>

                    {/* Indicador de seleção */}
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">Selecionado</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview da Configuração */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📋</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              Configuração atual:
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Comparando <strong className="text-blue-600 dark:text-blue-400">{AGRUPAMENTOS[agrupamento].label}</strong> baseado em <strong className="text-purple-600 dark:text-purple-400">{METRICAS[metrica].label}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-xl">💡</div>
          <div className="flex-1 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Dicas:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Por Marca:</strong> Compare o desempenho de diferentes fornecedores</li>
              <li><strong>Por Produto:</strong> Identifique quais itens cresceram ou caíram</li>
              <li><strong>Por Vendedor:</strong> Analise a performance da equipe de vendas</li>
              <li><strong>Por Cliente:</strong> Veja quais clientes mudaram padrão de compra</li>
              <li><strong>Por Cidade:</strong> Entenda a distribuição geográfica das vendas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}