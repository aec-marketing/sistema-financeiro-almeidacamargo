// =====================================================
// HOOK PARA BUSCAR PERFORMANCE POR MARCA
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface MarcaPerformanceData {
  nome: string;
  totalAno: number;
  totalMes: number;
  percentualMes: number; // % do mês em relação ao ano
  percentualAno: number; // % dessa marca no total do ano
  submarcas?: Array<{
    nome: string;
    totalAno: number;
    totalMes: number;
    percentualDoGrupo: number;
  }>;
}

interface UseMarcasPerformanceResult {
  marcas: MarcaPerformanceData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Mapeamento de marcas para o grupo Alcam
const MARCAS_ALCAM = ['A DEFINIR', 'ALMEIDA E CAMARGO', 'Automação', 'Laudo Técnico'];

export function useMarcasPerformance(
  mes: number,
  ano: number,
  refreshTrigger?: number
): UseMarcasPerformanceResult {
  const [marcas, setMarcas] = useState<MarcaPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarcas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar vendas do ano
      const { data: vendasAno } = await supabase
        .from('vendas')
        .select('total, MARCA')
        .like('"Data de Emissao da NF"', `%/${ano}`);

      // Buscar vendas do mês
      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('total, MARCA')
        .like('"Data de Emissao da NF"', `%/${String(mes).padStart(2, '0')}/${ano}`);

      if (!vendasAno || !vendasMes) {
        setMarcas([]);
        setIsLoading(false);
        return;
      }

      // Agrupar vendas por marca
      const calcularTotalMarca = (vendas: Array<{ total: number | string; MARCA: string }>, marcaNome: string | string[]) => {        const marcasArray = Array.isArray(marcaNome) ? marcaNome : [marcaNome];
        return vendas
          .filter(v => v.MARCA && marcasArray.includes(v.MARCA))
          .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
      };

      // Calcular total geral do ano para percentuais
      const totalGeralAno = vendasAno.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      // Marcas principais
      const marcasPrincipais = ['SMC', 'BANNER', 'WAGO', 'PFANNENBERG', 'FAMATEL'];

      const dadosMarcas: MarcaPerformanceData[] = [];

      // Processar marcas principais
      for (const marca of marcasPrincipais) {
        const totalAno = calcularTotalMarca(vendasAno, marca);
        const totalMes = calcularTotalMarca(vendasMes, marca);

        dadosMarcas.push({
          nome: marca,
          totalAno,
          totalMes,
          percentualMes: totalAno > 0 ? (totalMes / totalAno) * 100 : 0,
          percentualAno: totalGeralAno > 0 ? (totalAno / totalGeralAno) * 100 : 0,
        });
      }

      // Processar Alcam (agrupamento) com detalhamento de submarcas
      const totalAnoAlcam = calcularTotalMarca(vendasAno, MARCAS_ALCAM);
      const totalMesAlcam = calcularTotalMarca(vendasMes, MARCAS_ALCAM);

      // Calcular dados individuais de cada submarca
      const submarcasAlcam = MARCAS_ALCAM.map(submarca => {
        const totalAnoSubmarca = calcularTotalMarca(vendasAno, submarca);
        const totalMesSubmarca = calcularTotalMarca(vendasMes, submarca);

        return {
          nome: submarca,
          totalAno: totalAnoSubmarca,
          totalMes: totalMesSubmarca,
          percentualDoGrupo: totalAnoAlcam > 0 ? (totalAnoSubmarca / totalAnoAlcam) * 100 : 0,
        };
      }); // Mostrar todas as submarcas

      dadosMarcas.push({
        nome: 'ALCAM',
        totalAno: totalAnoAlcam,
        totalMes: totalMesAlcam,
        percentualMes: totalAnoAlcam > 0 ? (totalMesAlcam / totalAnoAlcam) * 100 : 0,
        percentualAno: totalGeralAno > 0 ? (totalAnoAlcam / totalGeralAno) * 100 : 0,
        submarcas: submarcasAlcam,
      });

      // Ordenar por total do ano (maior para menor)
      dadosMarcas.sort((a, b) => b.totalAno - a.totalAno);

      setMarcas(dadosMarcas);
    } catch (err) {
      console.error('Erro ao buscar marcas:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas, refreshTrigger]);

  return {
    marcas,
    isLoading,
    error,
    refetch: fetchMarcas,
  };
}