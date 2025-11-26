// src/hooks/useDashboardData.ts
import { useCachedData } from './useCachedData';
import { supabase } from '../lib/supabase';

// ============================================
// INTERFACES
// ============================================

export interface KPIsGlobal {
  total_vendas: number;
  clientes_unicos: number;
  vendedores_ativos: number;
  faturamento_total: number;
  ticket_medio: number;
  ultima_venda: string;
  primeira_venda: string;
  vendas_hoje: number;
  vendas_mes_atual: number;
  faturamento_mes_atual: number;
}

export interface KPIsVendedor {
  cd_representante: number;
  nome_vendedor: string;
  total_vendas: number;
  clientes_unicos: number;
  faturamento_total: number;
  ticket_medio: number;
  ultima_venda: string;
  vendas_mes_atual: number;
  faturamento_mes_atual: number;
}

export interface TopProduto {
  produto: string;
  codigo: string;
  marca: string;
  quantidade_vendas: number;
  quantidade_total: number;
  faturamento_total: number;
  clientes_distintos: number;
}

export interface TopMarca {
  marca: string;
  quantidade_vendas: number;
  quantidade_total: number;
  faturamento_total: number;
  clientes_distintos: number;
  produtos_distintos: number;
}

export interface VendaRecente {
  id: number;
  'Número da Nota Fiscal': string;
  'Data de Emissao da NF': string;
  total: string;
  'Descr. Produto': string;
  NomeCli: string;
  CIDADE: string;
  MARCA: string;
  cdRepr: number;
  cdCli: string;
  Quantidade: string;
  'Preço Unitário': string;
}

export interface FaturamentoMensal {
  mes: string;
  mes_formatado: string;
  total_vendas: number;
  faturamento_total: number;
  clientes_unicos: number;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useDashboardData(cdRepresentante?: number) {
  // 1. KPIs (global ou por vendedor)
  const { data: kpis, loading: loadingKpis, error: errorKpis, invalidateCache: invalidateKpis } = useCachedData(
    cdRepresentante ? `kpis-vendedor-${cdRepresentante}` : 'kpis-global',
    async () => {
      if (cdRepresentante) {
        // Buscar KPIs de um vendedor específico
        const { data, error } = await supabase
          .from('dashboard_kpis_vendedor')
          .select('*')
          .eq('cd_representante', cdRepresentante)
          .single();

        if (error) throw error;
        return data as KPIsVendedor;
      } else {
        // Buscar KPIs globais
        const { data, error } = await supabase
          .from('dashboard_kpis_global')
          .select('*')
          .single();

        if (error) throw error;
        return data as KPIsGlobal;
      }
    },
    { cacheTime: 5 * 60 * 1000 } // Cache de 5 minutos
  );

  // 2. Top Produtos
  const { data: topProdutos, loading: loadingProdutos, invalidateCache: invalidateProdutos } = useCachedData(
    'top-produtos',
    async () => {
      const { data, error } = await supabase
        .from('dashboard_top_produtos')
        .select('*')
        .limit(10);

      if (error) throw error;
      return data as TopProduto[];
    },
    { cacheTime: 10 * 60 * 1000 } // Cache de 10 minutos
  );

  // 3. Top Marcas
  const { data: topMarcas, loading: loadingMarcas, invalidateCache: invalidateMarcas } = useCachedData(
    'top-marcas',
    async () => {
      const { data, error } = await supabase
        .from('dashboard_top_marcas')
        .select('*')
        .limit(10);

      if (error) throw error;
      return data as TopMarca[];
    },
    { cacheTime: 10 * 60 * 1000 } // Cache de 10 minutos
  );

  // 4. Vendas Recentes
  const { data: vendasRecentes, loading: loadingVendas, invalidateCache: invalidateVendas } = useCachedData(
    cdRepresentante ? `vendas-recentes-${cdRepresentante}` : 'vendas-recentes',
    async () => {
      let query = supabase
        .from('dashboard_vendas_recentes')
        .select('*')
        .limit(10);

      if (cdRepresentante) {
        query = query.eq('cdRepr', cdRepresentante);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VendaRecente[];
    },
    { cacheTime: 3 * 60 * 1000 } // Cache de 3 minutos
  );

  // 5. Faturamento Mensal
  const { data: faturamentoMensal, loading: loadingMensal, invalidateCache: invalidateMensal } = useCachedData(
    'faturamento-mensal',
    async () => {
      const { data, error } = await supabase
        .from('dashboard_faturamento_mensal')
        .select('*')
        .order('mes', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as FaturamentoMensal[];
    },
    { cacheTime: 10 * 60 * 1000 } // Cache de 10 minutos
  );

  const loading = loadingKpis || loadingProdutos || loadingMarcas || loadingVendas || loadingMensal;

  // Função para invalidar todo o cache
  const invalidateAllCache = async () => {
    await invalidateKpis();
    await invalidateProdutos();
    await invalidateMarcas();
    await invalidateVendas();
    await invalidateMensal();
    console.log('🗑️ Todo cache do dashboard invalidado');
  };

  return {
    kpis,
    topProdutos,
    topMarcas,
    vendasRecentes,
    faturamentoMensal,
    loading,
    error: errorKpis,
    invalidateAllCache
  };
}