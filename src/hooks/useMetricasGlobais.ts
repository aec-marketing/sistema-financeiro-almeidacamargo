// =====================================================
// HOOK PARA MÉTRICAS GLOBAIS DA EMPRESA
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MetricasGlobais, ProdutoVenda, ClienteCompra } from '../types/observador';
import { calcularCrescimento, calcularTicketMedio } from '../utils/calculos-metas';
import { ordenarPor } from '../utils/observador-helpers';

interface UseMetricasGlobaisResult {
  metricas: MetricasGlobais | null;
  topProdutos: ProdutoVenda[];
  topClientes: ClienteCompra[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para buscar métricas globais da empresa
 * @param mes - Mês para filtrar (1-12)
 * @param ano - Ano para filtrar
 * @param refreshTrigger - Trigger para forçar re-fetch
 */
export function useMetricasGlobais(
  mes: number,
  ano: number,
  refreshTrigger?: number
): UseMetricasGlobaisResult {
  const [metricas, setMetricas] = useState<MetricasGlobais | null>(null);
  const [topProdutos, setTopProdutos] = useState<ProdutoVenda[]>([]);
  const [topClientes, setTopClientes] = useState<ClienteCompra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetricas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Datas para filtros - Formato ISO
      const mesFormatado = String(mes).padStart(2, '0');
      const mesInicio = `${ano}-${mesFormatado}-01`;

      // Calcular último dia do mês
      const ultimoDiaMes = new Date(ano, mes, 0).getDate();
      const mesFim = `${ano}-${mesFormatado}-${String(ultimoDiaMes).padStart(2, '0')}`;

      // Calcular mês anterior
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anoAnterior = mes === 1 ? ano - 1 : ano;
      const mesAnteriorFormatado = String(mesAnterior).padStart(2, '0');
      const mesAnteriorInicio = `${anoAnterior}-${mesAnteriorFormatado}-01`;
      const ultimoDiaMesAnterior = new Date(anoAnterior, mesAnterior, 0).getDate();
      const mesAnteriorFim = `${anoAnterior}-${mesAnteriorFormatado}-${String(ultimoDiaMesAnterior).padStart(2, '0')}`;

      // 1. Buscar vendas do mês atual
      const { data: vendasMes, error: vendasMesError } = await supabase
        .from('vendas')
        .select('total, cdCli, NomeCli, CIDADE, "Descr. Produto", "Cód. Referência", MARCA')
        .gte('"Data de Emissao da NF"', mesInicio)
        .lte('"Data de Emissao da NF"', mesFim);

      if (vendasMesError) throw vendasMesError;

      // 2. Buscar vendas do mês anterior
      const { data: vendasMesAnterior, error: vendasMesAnteriorError } = await supabase
        .from('vendas')
        .select('total, cdCli')
        .gte('"Data de Emissao da NF"', mesAnteriorInicio)
        .lte('"Data de Emissao da NF"', mesAnteriorFim);

      if (vendasMesAnteriorError) throw vendasMesAnteriorError;

      // 3. Calcular faturamento total do mês
      const faturamentoTotal = vendasMes?.reduce((acc, v) => {
  const valor = Number(v.total) || 0;
  return acc + valor;
}, 0) || 0;
      const totalVendas = vendasMes?.length || 0;

      // 4. Calcular faturamento do mês anterior
      const faturamentoMesAnterior = vendasMesAnterior?.reduce((acc, v) => {
  const valor = Number(v.total) || 0;
  return acc + valor;
}, 0) || 0;
      const totalVendasMesAnterior = vendasMesAnterior?.length || 0;

      // 5. Calcular clientes únicos (ativos nos últimos 6 meses)
      const seisMesesAtras = new Date(ano, mes - 7, 1);
      const dataInicioSeisMeses = `${seisMesesAtras.getFullYear()}-${String(seisMesesAtras.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: vendasSeisMeses, error: vendasSeisError } = await supabase
        .from('vendas')
        .select('cdCli')
        .gte('"Data de Emissao da NF"', dataInicioSeisMeses)
        .lte('"Data de Emissao da NF"', mesFim);

      if (vendasSeisError) throw vendasSeisError;

      const clientesUnicos = new Set(vendasSeisMeses?.map(v => v.cdCli) || []).size;

      // 6. Calcular clientes únicos do mês anterior
      const clientesUnicosMesAnterior = new Set(vendasMesAnterior?.map(v => v.cdCli) || []).size;

      // 7. Calcular ticket médio
      const ticketMedio = calcularTicketMedio(faturamentoTotal, totalVendas);

      // 8. Calcular crescimentos
      const crescimentoFaturamento = calcularCrescimento(faturamentoTotal, faturamentoMesAnterior);
      const crescimentoVendas = calcularCrescimento(totalVendas, totalVendasMesAnterior);
      const crescimentoClientes = calcularCrescimento(clientesUnicos, clientesUnicosMesAnterior);

      // 9. Montar objeto de métricas
      const metricasGlobais: MetricasGlobais = {
        faturamentoTotal,
        totalVendas,
        clientesAtivos: clientesUnicos,
        ticketMedio,
        comparativoMesAnterior: {
          faturamento: crescimentoFaturamento,
          vendas: crescimentoVendas,
          clientes: crescimentoClientes,
        },
      };

      setMetricas(metricasGlobais);

      // 10. Calcular TOP 5 PRODUTOS
      const produtosMap = new Map<string, {
        descricao: string;
        codigoReferencia: string;
        marca: string;
        totalVendido: number;
        faturamento: number;
        numeroVendas: number;
      }>();

      vendasMes?.forEach(venda => {
        const chave = venda['Cód. Referência'] || 'SEM_CODIGO';
        const atual = produtosMap.get(chave);

        if (atual) {
          atual.totalVendido += 1;
          atual.faturamento += Number(venda.total) || 0;
          atual.numeroVendas += 1;
        } else {
          produtosMap.set(chave, {
            descricao: venda['Descr. Produto'] || 'Produto sem descrição',
            codigoReferencia: venda['Cód. Referência'] || 'N/A',
            marca: venda.MARCA || 'Sem marca',
            totalVendido: 1,
            faturamento: Number(venda.total) || 0,
            numeroVendas: 1,
          });
        }
      });

      const produtosArray = Array.from(produtosMap.values()).map(p => ({
        ...p,
        percentualTotal: faturamentoTotal > 0 ? (p.faturamento / faturamentoTotal) * 100 : 0,
      }));

      // Ordenar primeiro por número de vendas, depois por faturamento como desempate
      const top5Produtos = produtosArray
        .sort((a, b) => {
          if (b.numeroVendas !== a.numeroVendas) {
            return b.numeroVendas - a.numeroVendas; // Mais vendas primeiro
          }
          return b.faturamento - a.faturamento; // Em caso de empate, maior faturamento
        })
        .slice(0, 5);
      setTopProdutos(top5Produtos);

      // 11. Calcular TOP 5 CLIENTES
      const clientesMap = new Map<string, {
        nomeCliente: string;
        cidade: string;
        faturamento: number;
        numeroCompras: number;
      }>();

      vendasMes?.forEach(venda => {
        const chave = venda.cdCli || 'DESCONHECIDO';
        const atual = clientesMap.get(chave);

        if (atual) {
          atual.faturamento += Number(venda.total) || 0;
          atual.numeroCompras += 1;
        } else {
          clientesMap.set(chave, {
            nomeCliente: venda.NomeCli || 'Cliente desconhecido',
            cidade: venda.CIDADE || 'N/A',
            faturamento: Number(venda.total) || 0,
            numeroCompras: 1,
          });
        }
      });

      const clientesArray = Array.from(clientesMap.values()).map(c => ({
        ...c,
        ticketMedio: calcularTicketMedio(c.faturamento, c.numeroCompras),
      }));

      const top5Clientes = ordenarPor(clientesArray, 'faturamento', 'desc').slice(0, 5);
      setTopClientes(top5Clientes);

    } catch (err) {
      console.error('Erro ao buscar métricas globais:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [mes, ano]);

  // Buscar dados ao montar e quando mudar mês/ano/refresh
  useEffect(() => {
    fetchMetricas();
  }, [fetchMetricas, refreshTrigger]);

  return {
    metricas,
    topProdutos,
    topClientes,
    isLoading,
    error,
    refetch: fetchMetricas,
  };
}