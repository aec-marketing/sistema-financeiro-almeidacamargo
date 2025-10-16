
// src/utils/data-aggregator.ts
/**
 * Funções para agregação e processamento de dados
 * Converte dados brutos em estruturas agregadas por dimensão
 */
import type { AgrupamentoPor, ItemDetalhado } from '../types/comparativo';
import { calcularTotalVenda } from './formatacao-monetaria';

// Definição local do tipo Venda (reutilizando do comparativo-engine)
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
  'Descr. Produto'?: string;
}

// ============================================
// HELPER: Converter valores para número
// ============================================

/**
 * Converte string de valor brasileiro (R$ 1.234,56) para número
 */
export const converterValor = (valor: string | number | undefined): number => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  
  const valorStr = String(valor);
  // Remove R$, pontos de milhar e substitui vírgula por ponto
  const valorLimpo = valorStr
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(valorLimpo) || 0;
};

/**
 * Converte quantidade para número
 */
export const converterQuantidade = (qtd: string | number | undefined): number => {
  if (typeof qtd === 'number') return qtd;
  if (!qtd) return 0;
  
  const qtdStr = String(qtd);
  const qtdLimpa = qtdStr.replace(/\./g, '').replace(',', '.');
  
  return parseFloat(qtdLimpa) || 0;
};

// ============================================
// HELPER: Obter chave de agrupamento
// ============================================

/**
 * Retorna o valor correto do campo de agrupamento de uma venda
 */
export const obterChaveAgrupamento = (
  venda: Venda,
  agrupamento: AgrupamentoPor
): string => {
  switch (agrupamento) {
    case 'marca':
      return venda.MARCA || 'Sem Marca';
    case 'produto':
      return venda['Descr. Produto'] || 'Sem Produto';
    case 'vendedor':
      return venda.NomeRepr || 'Sem Vendedor';
    case 'cliente':
      return venda.NomeCli || 'Sem Cliente';
    case 'cidade':
      return venda.CIDADE || 'Sem Cidade';
    default:
      return 'Desconhecido';
  }
};

// ============================================
// FUNÇÃO PRINCIPAL: Agregar Dados
// ============================================

interface DadosAgregados {
  [chave: string]: {
    quantidade: number;
    valor: number;
    clientesUnicos: Set<string>; // Para calcular clientes únicos
  };
}

/**
 * Agrega vendas por dimensão escolhida
 * Retorna objeto com totais por chave (marca/produto/vendedor/etc)
 */
export const agregarVendas = (
  vendas: Venda[],
  agrupamento: AgrupamentoPor
): DadosAgregados => {
  const agregado: DadosAgregados = {};

  vendas.forEach(venda => {
    // Obter chave de agrupamento (nome da marca/produto/vendedor/etc)
    const chave = obterChaveAgrupamento(venda, agrupamento);

    // Inicializar objeto se não existir
    if (!agregado[chave]) {
      agregado[chave] = {
        quantidade: 0,
        valor: 0,
        clientesUnicos: new Set<string>()
      };
    }

    // Calcular valor da venda usando a função corrigida
    const valorVenda = calcularTotalVenda(
      venda.total,
      venda.Quantidade,
      venda["Preço Unitário"]
    );

    // Somar quantidades e valores usando arredondamento para evitar erros de float
    agregado[chave].quantidade += converterQuantidade(venda.Quantidade);
    agregado[chave].valor = Math.round((agregado[chave].valor + valorVenda) * 100) / 100;
    
    // Adicionar cliente único
    if (venda.NomeCli) {
      agregado[chave].clientesUnicos.add(venda.NomeCli);
    }
  });

  return agregado;
};

// ============================================
// FUNÇÃO: Calcular Totais Gerais
// ============================================

interface TotaisGerais {
  faturamentoTotal: number;
  quantidadeTotal: number;
  ticketMedio: number;
  clientesUnicos: number;
}

/**
 * Calcula totais gerais de um conjunto de vendas
 */
export const calcularTotaisGerais = (vendas: Venda[]): TotaisGerais => {
  const clientesSet = new Set<string>();
  let faturamentoTotalCents = 0;
  let quantidadeTotal = 0;

  vendas.forEach(venda => {
    // Calcular valor da venda usando a função corrigida
    const valorVenda = calcularTotalVenda(
      venda.total,
      venda.Quantidade,
      venda["Preço Unitário"]
    );

    // Somar em centavos para evitar erros de float
    faturamentoTotalCents += Math.round(valorVenda * 100);
    quantidadeTotal += converterQuantidade(venda.Quantidade);

    if (venda.NomeCli) {
      clientesSet.add(venda.NomeCli);
    }
  });

  const faturamentoTotal = faturamentoTotalCents / 100;

  return {
    faturamentoTotal,
    quantidadeTotal,
    ticketMedio: vendas.length > 0 ? faturamentoTotal / vendas.length : 0,
    clientesUnicos: clientesSet.size
  };
};

// ============================================
// FUNÇÃO: Calcular Variação Percentual
// ============================================

/**
 * Calcula variação percentual entre dois valores
 * Retorna: ((B - A) / A) * 100
 */
export const calcularVariacao = (valorA: number, valorB: number): number => {
  if (valorA === 0) {
    return valorB > 0 ? 100 : 0;
  }
  return ((valorB - valorA) / valorA) * 100;
};

// ============================================
// FUNÇÃO: Mesclar Dados de Dois Períodos
// ============================================

/**
 * Combina dados agregados de dois períodos em um array de ItemDetalhado
 */
export const mesclarPeriodos = (
  dadosA: DadosAgregados,
  dadosB: DadosAgregados
): ItemDetalhado[] => {
  // Obter todas as chaves únicas (união dos dois períodos)
  const todasChaves = new Set([
    ...Object.keys(dadosA),
    ...Object.keys(dadosB)
  ]);

  const resultado: ItemDetalhado[] = [];

  todasChaves.forEach(chave => {
    const itemA = dadosA[chave] || { quantidade: 0, valor: 0 };
    const itemB = dadosB[chave] || { quantidade: 0, valor: 0 };

    resultado.push({
      chave,
      periodoA: {
        quantidade: itemA.quantidade,
        valor: itemA.valor
      },
      periodoB: {
        quantidade: itemB.quantidade,
        valor: itemB.valor
      },
      variacaoQtd: calcularVariacao(itemA.quantidade, itemB.quantidade),
      variacaoValor: calcularVariacao(itemA.valor, itemB.valor)
    });
  });

  return resultado;
};