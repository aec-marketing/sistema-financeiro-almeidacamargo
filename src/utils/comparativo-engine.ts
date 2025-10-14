// src/utils/comparativo-engine.ts

/**
 * Engine principal do sistema de Comparativo de Períodos
 * Orquestra busca de dados, aplicação de filtros e cálculo de resultados
 */

import { supabase } from '../lib/supabase';
import type {
    ConfigComparacao,
    ResultadoComparacao,
    ResumoComparacao,
    FiltroComparacao,
    LogicaFiltro
} from '../types/comparativo';

// Definição local do tipo Venda (arquivo ../types/database não existe no projeto)
export interface Venda {
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
  'Descr. Produto'?: string;
}

import {
  agregarVendas,
  calcularTotaisGerais,
  mesclarPeriodos
} from './data-aggregator';

// ============================================
// FUNÇÃO: Buscar Vendas por Período
// ============================================

/**
 * Busca vendas no Supabase dentro de um intervalo de datas
 * Se for vendedor, filtra apenas suas vendas
 */
const buscarVendasPeriodo = async (
  dataInicio: Date,
  dataFim: Date,
  cdRepresentante?: number | null
): Promise<Venda[]> => {
  try {
    // Formatar datas para ISO string (YYYY-MM-DD)
    const inicioISO = dataInicio.toISOString().split('T')[0];
    const fimISO = dataFim.toISOString().split('T')[0];

    let query = supabase
      .from('vendas')
      .select('*')
      .gte('Data de Emissao da NF', inicioISO)
      .lte('Data de Emissao da NF', fimISO);

    // Se for vendedor, filtrar apenas suas vendas
    if (cdRepresentante) {
      query = query.eq('cdRepr', cdRepresentante);
    }

    const { data, error } = await query.order('Data de Emissao da NF', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro na busca de vendas por período:', error);
    return [];
  }
};

// ============================================
// FUNÇÃO: Aplicar Filtros nas Vendas
// ============================================

/**
 * Aplica filtros de inclusão e exclusão nas vendas
 * Baseado na lógica da página de Relatórios
 */
const aplicarFiltros = (
  vendas: Venda[],
  filtros: FiltroComparacao[]
): Venda[] => {
  if (filtros.length === 0) return vendas;

  return vendas.filter(venda => {
    // Separar filtros por tipo de lógica
    const filtrosInclusivos = filtros.filter(f => f.logica === 'AND' || f.logica === 'OR');
    const filtrosExclusivos = filtros.filter(f => f.logica === 'EXCEPT');

    // ============================================
    // 1. APLICAR FILTROS INCLUSIVOS (AND/OR)
    // ============================================
    
    if (filtrosInclusivos.length > 0) {
      // Agrupar filtros por lógica
      const filtrosAND = filtrosInclusivos.filter(f => f.logica === 'AND');
      const filtrosOR = filtrosInclusivos.filter(f => f.logica === 'OR');

      // Todos os filtros AND devem passar
      const passaAND = filtrosAND.every(filtro => {
        const valorVenda = String(venda[filtro.campo as keyof Venda] || '');
        return filtro.valores.some(v => valorVenda.includes(v));
      });

      // Pelo menos um filtro OR deve passar (se existirem filtros OR)
      const passaOR = filtrosOR.length === 0 || filtrosOR.some(filtro => {
        const valorVenda = String(venda[filtro.campo as keyof Venda] || '');
        return filtro.valores.some(v => valorVenda.includes(v));
      });

      // Se não passar nos inclusivos, rejeitar
      if (!passaAND || !passaOR) {
        return false;
      }
    }

    // ============================================
    // 2. APLICAR FILTROS EXCLUSIVOS (EXCEPT)
    // ============================================
    
    if (filtrosExclusivos.length > 0) {
      // Nenhum filtro EXCEPT deve passar
      const passaEXCEPT = filtrosExclusivos.every(filtro => {
        const valorVenda = String(venda[filtro.campo as keyof Venda] || '');
        // Se o valor está na lista de exclusão, rejeitar
        return !filtro.valores.some(v => valorVenda.includes(v));
      });

      if (!passaEXCEPT) {
        return false;
      }
    }

    // Passou em todos os filtros
    return true;
  });
};

// ============================================
// FUNÇÃO PRINCIPAL: Executar Comparação
// ============================================

/**
 * Executa comparação completa entre dois períodos
 *
 * Fluxo:
 * 1. Busca dados do período A
 * 2. Busca dados do período B
 * 3. Aplica filtros em ambos
 * 4. Agrega por dimensão escolhida
 * 5. Calcula variações
 * 6. Retorna resultado estruturado
 */
export const executarComparacao = async (
  config: ConfigComparacao,
  cdRepresentante?: number | null
): Promise<ResultadoComparacao> => {
  try {
    console.log('🔍 Iniciando comparação...', {
      periodoA: config.periodos.periodoA.label,
      periodoB: config.periodos.periodoB.label,
      agrupamento: config.agrupamento,
      filtros: config.filtros.length,
      vendedor: cdRepresentante ? `Filtrando por vendedor ${cdRepresentante}` : 'Todos os dados'
    });

    // ============================================
    // ETAPA 1: Buscar dados dos dois períodos
    // ============================================

    const [vendasA, vendasB] = await Promise.all([
      buscarVendasPeriodo(
        config.periodos.periodoA.inicio,
        config.periodos.periodoA.fim,
        cdRepresentante
      ),
      buscarVendasPeriodo(
        config.periodos.periodoB.inicio,
        config.periodos.periodoB.fim,
        cdRepresentante
      )
    ]);

    console.log('📊 Dados brutos:', {
      vendasA: vendasA.length,
      vendasB: vendasB.length
    });

    // ============================================
    // ETAPA 2: Aplicar filtros
    // ============================================
    
    const vendasFiltradas_A = aplicarFiltros(vendasA, config.filtros);
    const vendasFiltradas_B = aplicarFiltros(vendasB, config.filtros);

    console.log('🔧 Após filtros:', {
      vendasA: vendasFiltradas_A.length,
      vendasB: vendasFiltradas_B.length
    });

    // ============================================
    // ETAPA 3: Calcular totais gerais
    // ============================================
    
    const totaisA = calcularTotaisGerais(vendasFiltradas_A);
    const totaisB = calcularTotaisGerais(vendasFiltradas_B);

    const resumo: ResumoComparacao = {
      faturamentoA: totaisA.faturamentoTotal,
      faturamentoB: totaisB.faturamentoTotal,
      quantidadeA: totaisA.quantidadeTotal,
      quantidadeB: totaisB.quantidadeTotal,
      ticketMedioA: totaisA.ticketMedio,
      ticketMedioB: totaisB.ticketMedio,
      clientesA: totaisA.clientesUnicos,
      clientesB: totaisB.clientesUnicos
    };

    // ============================================
    // ETAPA 4: Agregar por dimensão escolhida
    // ============================================
    
    const dadosAgregados_A = agregarVendas(vendasFiltradas_A, config.agrupamento);
    const dadosAgregados_B = agregarVendas(vendasFiltradas_B, config.agrupamento);

    // ============================================
    // ETAPA 5: Mesclar períodos e calcular variações
    // ============================================
    
    const detalhamento = mesclarPeriodos(dadosAgregados_A, dadosAgregados_B);

    console.log('✅ Comparação concluída:', {
      itensDetalhados: detalhamento.length,
      faturamentoA: resumo.faturamentoA.toFixed(2),
      faturamentoB: resumo.faturamentoB.toFixed(2)
    });

    // ============================================
    // ETAPA 6: Retornar resultado
    // (Insights serão gerados em outro arquivo)
    // ============================================
    
    return {
      resumo,
      detalhamento,
      insights: [] // Será preenchido pelo insights-generator
    };

  } catch (error) {
    console.error('❌ Erro ao executar comparação:', error);
    throw error;
  }
};

// ============================================
// FUNÇÃO: Validar Configuração
// ============================================

/**
 * Valida se a configuração está correta antes de executar
 */
export const validarConfiguracao = (config: ConfigComparacao): {
  valido: boolean;
  erros: string[];
} => {
  const erros: string[] = [];

  // Validar períodos
  if (!config.periodos.periodoA.inicio || !config.periodos.periodoA.fim) {
    erros.push('Período A incompleto');
  }
  if (!config.periodos.periodoB.inicio || !config.periodos.periodoB.fim) {
    erros.push('Período B incompleto');
  }

  // Validar datas
  if (config.periodos.periodoA.inicio >= config.periodos.periodoA.fim) {
    erros.push('Data inicial do Período A deve ser anterior à data final');
  }
  if (config.periodos.periodoB.inicio >= config.periodos.periodoB.fim) {
    erros.push('Data inicial do Período B deve ser anterior à data final');
  }

  // Validar agrupamento
  if (!config.agrupamento) {
    erros.push('Agrupamento não selecionado');
  }

  // Validar métrica
  if (!config.metrica) {
    erros.push('Métrica não selecionada');
  }

  return {
    valido: erros.length === 0,
    erros
  };
};