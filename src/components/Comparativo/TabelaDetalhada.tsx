// src/components/Comparativo/TabelaDetalhada.tsx

/**
 * Componente que exibe tabela detalhada da comparação
 * Mostra item por item com valores de ambos períodos e variações
 * Permite ordenação por coluna
 */

import { useState, useMemo, type JSX } from 'react';
import type { ItemDetalhado, MetricaVisualizada } from '../../types/comparativo';

// ============================================
// INTERFACES
// ============================================

interface TabelaDetalhadaProps {
  dados: ItemDetalhado[];
  metrica: MetricaVisualizada;
  labelPeriodoA: string;
  labelPeriodoB: string;
  tituloColuna: string; // Ex: "Marca", "Produto", "Vendedor"
}

type ColunaOrdenacao = 'nome' | 'valorA' | 'valorB' | 'variacaoValor' | 'qtdA' | 'qtdB' | 'variacaoQtd';
type DirecaoOrdenacao = 'asc' | 'desc';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function TabelaDetalhada({
  dados,
  metrica,
  labelPeriodoA,
  labelPeriodoB,
  tituloColuna
}: TabelaDetalhadaProps) {

  // ============================================
  // ESTADOS
  // ============================================

  const [colunaOrdenacao, setColunaOrdenacao] = useState<ColunaOrdenacao>('variacaoValor');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>('desc');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatarNumero = (valor: number): string => {
    return Math.round(valor).toLocaleString('pt-BR');
  };

  const obterCorVariacao = (variacao: number): string => {
    if (variacao > 10) return 'text-green-600 dark:text-green-400 font-bold';
    if (variacao > 0) return 'text-green-600 dark:text-green-400';
    if (variacao < -10) return 'text-red-600 dark:text-red-400 font-bold';
    if (variacao < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const obterIconeVariacao = (variacao: number): JSX.Element | null => {
    if (variacao > 0) {
      return (
        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (variacao < 0) {
      return (
        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return null;
  };

  // ============================================
  // ORDENAÇÃO
  // ============================================

  const handleOrdenar = (coluna: ColunaOrdenacao) => {
    if (colunaOrdenacao === coluna) {
      // Alternar direção
      setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna, começar com desc
      setColunaOrdenacao(coluna);
      setDirecaoOrdenacao('desc');
    }
    setPaginaAtual(1); // Voltar para primeira página
  };

  const dadosOrdenados = useMemo(() => {
    const ordenados = [...dados].sort((a, b) => {
      let valorA: number;
      let valorB: number;

      switch (colunaOrdenacao) {
        case 'nome':
          return direcaoOrdenacao === 'asc'
            ? a.chave.localeCompare(b.chave)
            : b.chave.localeCompare(a.chave);
        
        case 'valorA':
          valorA = a.periodoA.valor;
          valorB = b.periodoA.valor;
          break;
        
        case 'valorB':
          valorA = a.periodoB.valor;
          valorB = b.periodoB.valor;
          break;
        
        case 'variacaoValor':
          valorA = a.variacaoValor;
          valorB = b.variacaoValor;
          break;
        
        case 'qtdA':
          valorA = a.periodoA.quantidade;
          valorB = b.periodoA.quantidade;
          break;
        
        case 'qtdB':
          valorA = a.periodoB.quantidade;
          valorB = b.periodoB.quantidade;
          break;
        
        case 'variacaoQtd':
          valorA = a.variacaoQtd;
          valorB = b.variacaoQtd;
          break;
        
        default:
          valorA = a.variacaoValor;
          valorB = b.variacaoValor;
      }

      return direcaoOrdenacao === 'asc' ? valorA - valorB : valorB - valorA;
    });

    return ordenados;
  }, [dados, colunaOrdenacao, direcaoOrdenacao]);

  // ============================================
  // PAGINAÇÃO
  // ============================================

  const totalPaginas = Math.ceil(dadosOrdenados.length / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const dadosPaginados = dadosOrdenados.slice(indiceInicio, indiceFim);

  // ============================================
  // COMPONENTE DE HEADER ORDENÁVEL
  // ============================================

  const HeaderOrdenavel = ({ coluna, titulo }: { coluna: ColunaOrdenacao; titulo: string }) => (
    <th
      onClick={() => handleOrdenar(coluna)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-2">
        {titulo}
        {colunaOrdenacao === coluna && (
          <span>
            {direcaoOrdenacao === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-4">
      
      {/* Info e Controles */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {indiceInicio + 1} a {Math.min(indiceFim, dadosOrdenados.length)} de {dadosOrdenados.length} itens
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Clique nos cabeçalhos para ordenar
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {/* Coluna Nome */}
              <HeaderOrdenavel coluna="nome" titulo={tituloColuna} />
              
              {/* Colunas de Faturamento (sempre) */}
              {(metrica === 'faturamento' || metrica === 'ambos') && (
                <>
                  <HeaderOrdenavel coluna="valorA" titulo={`💰 ${labelPeriodoA}`} />
                  <HeaderOrdenavel coluna="valorB" titulo={`💰 ${labelPeriodoB}`} />
                  <HeaderOrdenavel coluna="variacaoValor" titulo="Variação (R$)" />
                </>
              )}

              {/* Colunas de Quantidade (sempre) */}
              {(metrica === 'quantidade' || metrica === 'ambos') && (
                <>
                  <HeaderOrdenavel coluna="qtdA" titulo={`📦 ${labelPeriodoA}`} />
                  <HeaderOrdenavel coluna="qtdB" titulo={`📦 ${labelPeriodoB}`} />
                  <HeaderOrdenavel coluna="variacaoQtd" titulo="Variação (Qtd)" />
                </>
              )}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {dadosPaginados.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Nome */}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {item.chave}
                </td>

                {/* Faturamento */}
                {(metrica === 'faturamento' || metrica === 'ambos') && (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatarMoeda(item.periodoA.valor)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatarMoeda(item.periodoB.valor)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${obterCorVariacao(item.variacaoValor)}`}>
                      <div className="flex items-center gap-1">
                        {obterIconeVariacao(item.variacaoValor)}
                        <span>
                          {item.variacaoValor > 0 ? '+' : ''}{item.variacaoValor.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </>
                )}

                {/* Quantidade */}
                {(metrica === 'quantidade' || metrica === 'ambos') && (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatarNumero(item.periodoA.quantidade)} un
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatarNumero(item.periodoB.quantidade)} un
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${obterCorVariacao(item.variacaoQtd)}`}>
                      <div className="flex items-center gap-1">
                        {obterIconeVariacao(item.variacaoQtd)}
                        <span>
                          {item.variacaoQtd > 0 ? '+' : ''}{item.variacaoQtd.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>

          {/* Footer com Totais */}
          <tfoot className="bg-gray-100 dark:bg-gray-900">
            <tr>
              <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                TOTAL ({dadosOrdenados.length} itens)
              </td>
              
              {(metrica === 'faturamento' || metrica === 'ambos') && (
                <>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    {formatarMoeda(dadosOrdenados.reduce((sum, item) => sum + item.periodoA.valor, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    {formatarMoeda(dadosOrdenados.reduce((sum, item) => sum + item.periodoB.valor, 0))}
                  </td>
                  <td className="px-4 py-3"></td>
                </>
              )}

              {(metrica === 'quantidade' || metrica === 'ambos') && (
                <>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    {formatarNumero(dadosOrdenados.reduce((sum, item) => sum + item.periodoA.quantidade, 0))} un
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    {formatarNumero(dadosOrdenados.reduce((sum, item) => sum + item.periodoB.quantidade, 0))} un
                  </td>
                  <td className="px-4 py-3"></td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
            disabled={paginaAtual === 1}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let numeroPagina: number;
              
              if (totalPaginas <= 5) {
                numeroPagina = i + 1;
              } else if (paginaAtual <= 3) {
                numeroPagina = i + 1;
              } else if (paginaAtual >= totalPaginas - 2) {
                numeroPagina = totalPaginas - 4 + i;
              } else {
                numeroPagina = paginaAtual - 2 + i;
              }

              return (
                <button
                  key={i}
                  onClick={() => setPaginaAtual(numeroPagina)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    paginaAtual === numeroPagina
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {numeroPagina}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
            disabled={paginaAtual === totalPaginas}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}