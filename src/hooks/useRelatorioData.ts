// src/hooks/useRelatorioData.ts
import { useCachedData } from './useCachedData';
import { supabase } from '../lib/supabase';

// Interfaces (copiadas do RelatorioPage para consistência)
interface Cliente {
  id: number;
  Nome: string;
  Município: string;
  'Sigla Estado': string;
  CNPJ: string;
  Entidade: string;
}

interface Item {
  id: number;
  'Descr. Marca Produto': string;
  'Descr. Grupo Produto': string;
  'Desc. Subgrupo de Produto': string;
  'Cód. Referência': string;
  'Cód. do Produto': string;
  'Descr. Produto': string;
}

interface Venda {
  id: number;
  'Data de Emissao da NF': string;
  total: string;
  Quantidade: string;
  'Preço Unitário': string;
  MARCA: string;
  GRUPO: string;
  CIDADE: string;
  NomeCli: string;
  NomeRepr: string;
  cdCli: string;
  'Descr. Produto'?: string;
  'Cód. Referência'?: string;
}

// Helper para carregar todas as páginas com paginação
async function fetchAll<T>(
  table: string,
  columns: string,
  additionalFilters?: Record<string, unknown>
): Promise<T[]> {
  let allData: T[] = [];
  let start = 0;
  const limit = 1000;
  let hasMoreData = true;

  while (hasMoreData) {
    let query = supabase
      .from(table)
      .select(columns)
      .range(start, start + limit - 1);

    // Aplicar filtros adicionais se fornecidos
    if (additionalFilters) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...(data as T[])];
      start += limit;
      if (data.length < limit) hasMoreData = false;
    } else {
      hasMoreData = false;
    }
  }

  return allData;
}

/**
 * Hook para carregar dados do relatório com cache IndexedDB
 *
 * Estratégia de cache:
 * - Clientes: 10 minutos (dados estáveis)
 * - Itens: 10 minutos (dados estáveis)
 * - Vendas: 5 minutos (dados mais dinâmicos)
 */
export function useRelatorioData(cdRepresentante?: number) {
  // 1. Carregar Clientes (cache 10 minutos)
  const {
    data: clientes,
    loading: loadingClientes,
    error: errorClientes,
    invalidateCache: invalidateClientes
  } = useCachedData<Cliente[]>(
    'relatorios-clientes',
    async () => {
      console.log('📡 Carregando clientes do banco...');
      return await fetchAll<Cliente>('clientes', '*');
    },
    { cacheTime: 10 * 60 * 1000 }
  );

  // 2. Carregar Itens (cache 10 minutos)
  const {
    data: itens,
    loading: loadingItens,
    error: errorItens,
    invalidateCache: invalidateItens
  } = useCachedData<Item[]>(
    'relatorios-itens',
    async () => {
      console.log('📡 Carregando itens do banco...');
      return await fetchAll<Item>('itens', '*');
    },
    { cacheTime: 10 * 60 * 1000 }
  );

  // 3. Carregar Vendas (cache 5 minutos)
  const {
    data: vendas,
    loading: loadingVendas,
    error: errorVendas,
    invalidateCache: invalidateVendas
  } = useCachedData<Venda[]>(
    cdRepresentante ? `relatorios-vendas-${cdRepresentante}` : 'relatorios-vendas',
    async () => {
      console.log('📡 Carregando vendas do banco...');
      const filters = cdRepresentante ? { cdRepr: cdRepresentante } : undefined;
      return await fetchAll<Venda>('vendas', '*', filters);
    },
    { cacheTime: 5 * 60 * 1000 }
  );

  // Estado de loading combinado
  const loading = loadingClientes || loadingItens || loadingVendas;

  // Primeiro erro encontrado
  const error = errorClientes || errorItens || errorVendas;

  // Função para invalidar todo o cache
  const invalidateAllCache = async () => {
    await invalidateClientes();
    await invalidateItens();
    await invalidateVendas();
    console.log('🗑️ Todo cache do relatório invalidado');
  };

  // Calcular progresso de carregamento
  const loadingProgress = (() => {
    let progress = 0;
    if (!loadingClientes) progress += 33;
    if (!loadingItens) progress += 33;
    if (!loadingVendas) progress += 34;
    return progress;
  })();

  // Mensagem de loading dinâmica
  const loadingMessage = (() => {
    if (loadingClientes) return 'Carregando clientes...';
    if (loadingItens) return 'Carregando produtos...';
    if (loadingVendas) return 'Carregando vendas...';
    return 'Finalizando...';
  })();

  return {
    // Dados
    clientes: clientes || [],
    itens: itens || [],
    vendas: vendas || [],

    // Estados
    loading,
    error,
    loadingProgress,
    loadingMessage,

    // Funções de controle
    invalidateAllCache
  };
}
