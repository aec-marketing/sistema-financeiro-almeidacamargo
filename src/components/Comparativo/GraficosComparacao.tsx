// src/components/Comparativo/GraficosComparacao.tsx

/**
 * Componente que exibe gráficos de comparação entre períodos
 * Tipos: Barras Agrupadas e Gráfico de Linha
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { ItemDetalhado, MetricaVisualizada } from '../../types/comparativo';

// ============================================
// INTERFACES
// ============================================

interface GraficosComparacaoProps {
  dados: ItemDetalhado[];
  metrica: MetricaVisualizada;
  labelPeriodoA: string;
  labelPeriodoB: string;
  tituloEixo: string; // Ex: "Marca", "Produto"
}

// ============================================
// CORES
// ============================================

const CORES = {
  periodoA: '#3b82f6', // Azul
  periodoB: '#10b981', // Verde
  positivo: '#10b981', // Verde
  negativo: '#ef4444'  // Vermelho
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function GraficosComparacao({
  dados,
  metrica,
  labelPeriodoA,
  labelPeriodoB,
  tituloEixo
}: GraficosComparacaoProps) {

  // ============================================
  // PREPARAR DADOS PARA GRÁFICOS
  // ============================================

  // Top 10 para melhor visualização
  const top10Dados = useMemo(() => {
    return [...dados]
      .sort((a, b) => b.periodoB.valor - a.periodoB.valor)
      .slice(0, 10);
  }, [dados]);

  // Dados formatados para gráfico de barras
  const dadosBarras = useMemo(() => {
    return top10Dados.map(item => ({
      nome: item.chave.length > 20 ? item.chave.substring(0, 20) + '...' : item.chave,
      nomeCompleto: item.chave,
      [labelPeriodoA]: metrica === 'quantidade' ? item.periodoA.quantidade : item.periodoA.valor,
      [labelPeriodoB]: metrica === 'quantidade' ? item.periodoB.quantidade : item.periodoB.valor,
      variacao: metrica === 'quantidade' ? item.variacaoQtd : item.variacaoValor
    }));
  }, [top10Dados, labelPeriodoA, labelPeriodoB, metrica]);

  // Dados formatados para gráfico de variação
  const dadosVariacao = useMemo(() => {
    return [...dados]
      .sort((a, b) => Math.abs(b.variacaoValor) - Math.abs(a.variacaoValor))
      .slice(0, 15)
      .map(item => ({
        nome: item.chave.length > 15 ? item.chave.substring(0, 15) + '...' : item.chave,
        nomeCompleto: item.chave,
        variacao: metrica === 'quantidade' ? item.variacaoQtd : item.variacaoValor
      }));
  }, [dados, metrica]);

  // ============================================
  // FORMATADORES
  // ============================================

  const formatarValorEixo = (valor: number): string => {
    if (metrica === 'quantidade') {
      return valor.toLocaleString('pt-BR');
    }
    if (valor >= 1000000) {
      return `R$ ${(valor / 1000000).toFixed(1)}M`;
    }
    if (valor >= 1000) {
      return `R$ ${(valor / 1000).toFixed(0)}k`;
    }
    return `R$ ${valor.toFixed(0)}`;
  };

  const formatarTooltip = (valor: number): string => {
    if (metrica === 'quantidade') {
      return `${valor.toLocaleString('pt-BR')} un`;
    }
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarVariacao = (valor: number): string => {
    return `${valor > 0 ? '+' : ''}${valor.toFixed(1)}%`;
  };

  // ============================================
  // TOOLTIP CUSTOMIZADO
  // ============================================

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {payload[0].payload.nomeCompleto}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <strong>{entry.name}:</strong> {formatarTooltip(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipVariacao = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {payload[0].payload.nomeCompleto}
          </p>
          <p className={`text-sm font-bold ${payload[0].value > 0 ? 'text-green-600' : 'text-red-600'}`}>
            Variação: {formatarVariacao(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-8">
      
      {/* Gráfico 1: Barras Agrupadas - Comparação Lado a Lado */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          📊 Comparação entre Períodos (Top 10)
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosBarras} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="nome"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatarValorEixo}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar
                dataKey={labelPeriodoA}
                fill={CORES.periodoA}
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
              <Bar
                dataKey={labelPeriodoB}
                fill={CORES.periodoB}
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
          Comparação dos 10 maiores {tituloEixo.toLowerCase()}s por {metrica === 'quantidade' ? 'quantidade' : 'faturamento'}
        </p>
      </div>

      {/* Gráfico 2: Barras de Variação */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          📈 Maiores Variações (Top 15)
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={dadosVariacao}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="nome"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltipVariacao />} />
              <Bar dataKey="variacao" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {dadosVariacao.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.variacao >= 0 ? CORES.positivo : CORES.negativo}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
          Itens com maiores variações percentuais entre os períodos (positivas e negativas)
        </p>
      </div>

      {/* Gráfico 3: Linha de Evolução (apenas se houver dados suficientes) */}
      {dadosBarras.length >= 5 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            📉 Evolução entre Períodos
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosBarras} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="nome"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={formatarValorEixo}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey={labelPeriodoA}
                  stroke={CORES.periodoA}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey={labelPeriodoB}
                  stroke={CORES.periodoB}
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 text-center">
            Visualização da evolução dos valores entre os dois períodos
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-xl">💡</div>
          <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Dica de Análise:</p>
            <ul className="space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
              <li>Barras <span className="font-bold text-green-600 dark:text-green-400">verdes</span> indicam crescimento positivo</li>
              <li>Barras <span className="font-bold text-red-600 dark:text-red-400">vermelhas</span> indicam queda no período</li>
              <li>Compare a altura das barras azuis e verdes para identificar mudanças</li>
              <li>Use os gráficos em conjunto com a tabela detalhada para análise completa</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}