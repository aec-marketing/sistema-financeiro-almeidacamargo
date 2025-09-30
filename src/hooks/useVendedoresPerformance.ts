// =====================================================
// HOOK PARA BUSCAR PERFORMANCE DOS VENDEDORES
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { VendedorPerformance, MarcaPerformance } from '../types/observador';
import { calcularProgressoMeta } from '../utils/calculos-metas';
import { agruparPor, ordenarPor } from '../utils/observador-helpers';

interface UseVendedoresPerformanceResult {
  vendedores: VendedorPerformance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVendedoresPerformance(
  mes: number,
  ano: number,
  refreshTrigger?: number
): UseVendedoresPerformanceResult {
  const [vendedores, setVendedores] = useState<VendedorPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVendedores = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar todos os vendedores (consultores de vendas)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, meta_mensal, meta_anual, cd_representante')
        .eq('role', 'consultor_vendas')
        .eq('ativo', true);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setVendedores([]);
        setIsLoading(false);
        return;
      }

      // 2. Buscar TODAS as vendas do mês e do ano de uma vez


      const { data: todasVendasMes } = await supabase
  .from('vendas')
  .select('total, MARCA, NomeRepr, cdRepr')
  .like('"Data de Emissao da NF"', `%/${String(mes).padStart(2, '0')}/${ano}`);

      const { data: todasVendasAno } = await supabase
  .from('vendas')
  .select('total, MARCA, NomeRepr, cdRepr')
  .like('"Data de Emissao da NF"', `%/${ano}`);

      // 3. Processar cada vendedor
      const vendedoresComPerformance: VendedorPerformance[] = profiles.map((profile) => {
        
        // Filtrar vendas do mês deste vendedor específico
        // DEBUG: Ver o que está vindo do banco

        const vendasMesVendedor = (todasVendasMes || []).filter(v => 
  profile.cd_representante && v.cdRepr === profile.cd_representante
);

        // Filtrar vendas do ano deste vendedor específico
        const vendasAnoVendedor = (todasVendasAno || []).filter(v => 
  profile.cd_representante && v.cdRepr === profile.cd_representante
);
        // Calcular totais
// Calcular totais (converter para número)
const vendasMesAtual = vendasMesVendedor.reduce((acc, v) => {
  const valor = Number(v.total) || 0;
  return acc + valor;
}, 0);

const vendasAnoAtual = vendasAnoVendedor.reduce((acc, v) => {
  const valor = Number(v.total) || 0;
  return acc + valor;
}, 0);

        // Calcular top 3 marcas do mês
        const marcasAgrupadas = agruparPor(
          vendasMesVendedor.filter(v => v.MARCA), 
          'MARCA'
        );
        
        const marcasTotais = Object.entries(marcasAgrupadas).map(([marca, vendas]) => ({
  nome: marca,
  total: vendas.reduce((acc, v) => {
    const valor = Number(v.total) || 0;
    return acc + valor;
  }, 0),
  percentual: 0,
}));

        const marcasOrdenadas = ordenarPor(marcasTotais, 'total', 'desc');
        const top3Marcas = marcasOrdenadas.slice(0, 3);

        // Calcular percentuais das top 3 marcas
        top3Marcas.forEach(marca => {
          marca.percentual = vendasMesAtual > 0 
            ? Math.round((marca.total / vendasMesAtual) * 100) 
            : 0;
        });

        // Calcular progressos
        const progressoMensal = calcularProgressoMeta(
          vendasMesAtual,
          profile.meta_mensal || 100000
        );

        const progressoAnual = calcularProgressoMeta(
          vendasAnoAtual,
          profile.meta_anual || 1200000
        );

        return {
          id: profile.id,
          nome: profile.nome,
          email: `${profile.nome.toLowerCase().replace(/\s+/g, '.')}@almeidaecamargo.com.br`,
          metaMensal: profile.meta_mensal || 100000,
          metaAnual: profile.meta_anual || 1200000,
          vendasMesAtual,
          vendasAnoAtual,
          progressoMensal,
          progressoAnual,
          top3Marcas: top3Marcas as MarcaPerformance[],
        };
      });

      setVendedores(vendedoresComPerformance);
    } catch (err) {
      console.error('Erro ao buscar vendedores:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    fetchVendedores();
  }, [fetchVendedores, refreshTrigger]);

  return {
    vendedores,
    isLoading,
    error,
    refetch: fetchVendedores,
  };
}