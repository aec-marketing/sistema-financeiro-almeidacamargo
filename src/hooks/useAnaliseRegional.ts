// =====================================================
// HOOK PARA ANÁLISE REGIONAL DE VENDAS
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CidadeVenda, CrescimentoCidade } from '../types/observador';
import { calcularCrescimento } from '../utils/calculos-metas';
import { ordenarPor, agruparPor } from '../utils/observador-helpers';

interface UseAnaliseRegionalResult {
  cidadesVenda: CidadeVenda[];
  crescimentoCidades: CrescimentoCidade[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para buscar análise de vendas por região/cidade
 * @param mes - Mês para filtrar (1-12)
 * @param ano - Ano para filtrar
 * @param refreshTrigger - Trigger para forçar re-fetch
 */
export function useAnaliseRegional(
  mes: number,
  ano: number,
  refreshTrigger?: number
): UseAnaliseRegionalResult {
  const [cidadesVenda, setCidadesVenda] = useState<CidadeVenda[]>([]);
  const [crescimentoCidades, setCrescimentoCidades] = useState<CrescimentoCidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnaliseRegional = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

  

      // Mês anterior para comparação
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anoAnterior = mes === 1 ? ano - 1 : ano;
      const dataInicioMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`;
      const dataFimMesAnterior = `${ano}-${String(mes).padStart(2, '0')}-01`;

      // 1. Buscar vendas do mês atual
      const { data: vendasMes, error: vendasMesError } = await supabase
        .from('vendas')
        .select('total, CIDADE')
        .like('"Data de Emissao da NF"', `%/${String(mes).padStart(2, '0')}/${ano}`);

      if (vendasMesError) throw vendasMesError;

      // 2. Buscar vendas do mês anterior
      const { data: vendasMesAnterior, error: vendasMesAnteriorError } = await supabase
        .from('vendas')
        .select('total, CIDADE')
        .gte('"Data de Emissao da NF"', dataInicioMesAnterior)
        .lt('"Data de Emissao da NF"', dataFimMesAnterior);

      if (vendasMesAnteriorError) throw vendasMesAnteriorError;

      // 3. Agrupar vendas por cidade - MÊS ATUAL
      const vendasPorCidadeMes = agruparPor(vendasMes || [], 'CIDADE');
      const cidadesArrayMes = Object.entries(vendasPorCidadeMes).map(([cidade, vendas]) => {
        const faturamento = vendas.reduce((acc, v) => {
          const valor = Number(v.total) || 0;
          return acc + valor;
        }, 0);
        return {
          cidade: cidade || 'Não informada',
          faturamento,
          numeroVendas: vendas.length,
        };
      });

      // 4. Agrupar vendas por cidade - MÊS ANTERIOR
      const vendasPorCidadeMesAnterior = agruparPor(vendasMesAnterior || [], 'CIDADE');
      const cidadesArrayMesAnterior = Object.entries(vendasPorCidadeMesAnterior).map(([cidade, vendas]) => {
        const faturamento = vendas.reduce((acc, v) => {
          const valor = Number(v.total) || 0;
          return acc + valor;
        }, 0);
        return {
          cidade: cidade || 'Não informada',
          faturamento,
        };
      });

      // 5. Calcular crescimento por cidade
      const crescimentoPorCidade: CrescimentoCidade[] = cidadesArrayMes.map(cidadeMes => {
        const cidadeAnterior = cidadesArrayMesAnterior.find(c => c.cidade === cidadeMes.cidade);
        const faturamentoAnterior = cidadeAnterior?.faturamento || 0;
        
        const crescimentoPercentual = calcularCrescimento(
          cidadeMes.faturamento, 
          faturamentoAnterior
        );

        let tendencia: 'subindo' | 'descendo' | 'estavel' = 'estavel';
        if (crescimentoPercentual > 5) tendencia = 'subindo';
        if (crescimentoPercentual < -5) tendencia = 'descendo';

        return {
          cidade: cidadeMes.cidade,
          mesAtual: cidadeMes.faturamento,
          mesAnterior: faturamentoAnterior,
          crescimentoPercentual,
          tendencia,
        };
      });

      // 6. Ordenar por faturamento e pegar top 10
      const top10Cidades = ordenarPor(cidadesArrayMes, 'faturamento', 'desc').slice(0, 10);

      // 7. Montar array final de CidadeVenda com crescimento
      const cidadesComCrescimento: CidadeVenda[] = top10Cidades.map(cidade => {
        const crescimento = crescimentoPorCidade.find(c => c.cidade === cidade.cidade);
        
        return {
          cidade: cidade.cidade,
          totalVendas: cidade.faturamento,
          faturamento: cidade.faturamento,
          crescimento: crescimento?.crescimentoPercentual || 0,
          numeroVendas: cidade.numeroVendas,
        };
      });

      setCidadesVenda(cidadesComCrescimento);
      setCrescimentoCidades(
        ordenarPor(crescimentoPorCidade, 'crescimentoPercentual', 'desc')
      );

    } catch (err) {
      console.error('Erro ao buscar análise regional:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano]);

  // Buscar dados ao montar e quando mudar mês/ano/refresh
  useEffect(() => {
    fetchAnaliseRegional();
  }, [fetchAnaliseRegional, refreshTrigger]);

  return {
    cidadesVenda,
    crescimentoCidades,
    isLoading,
    error,
    refetch: fetchAnaliseRegional,
  };
}