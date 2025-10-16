// Substitua todo o conteúdo do arquivo calcular-total.ts por este:
import { normalizarValorMonetario, calcularTotalVenda, formatarMoeda } from './formatacao-monetaria';

// Re-exporta as funções para manter compatibilidade com código existente
export { normalizarValorMonetario, calcularTotalVenda, formatarMoeda };

// Esta função é mantida para compatibilidade com código existente
export const converterValor = (valor: any): number => {
  return normalizarValorMonetario(valor);
};
