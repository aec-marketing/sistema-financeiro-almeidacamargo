/**
 * Utilitário para normalização e formatação de valores monetários
 * Resolve problemas de formatação inconsistente nos dados importados
 */

/**
 * Normaliza um valor monetário independente do formato de entrada
 * @param valor O valor a ser normalizado (pode ser string, number, etc.)
 * @returns Valor numérico normalizado
 */
export const normalizarValorMonetario = (valor: any): number => {
  // Se já for um número, apenas retorna
  if (typeof valor === 'number') return valor;
  
  // Se for null, undefined ou vazio
  if (!valor) return 0;
  
  // Converte para string e faz trim
  let valorStr = String(valor).trim();
  
  // Remove símbolo de moeda e espaços
  valorStr = valorStr.replace(/R\$|\$|\s/g, '');
  
  // Verifica formato brasileiro (123.456,78) vs formato americano (123,456.78)
  const isBrazilianFormat = valorStr.indexOf(',') > valorStr.indexOf('.') && valorStr.indexOf(',') !== -1;
  
  if (isBrazilianFormat) {
    // Formato brasileiro: remove pontos de milhar e converte vírgula para ponto
    valorStr = valorStr.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano ou sem formatação: remove vírgulas de milhar
    valorStr = valorStr.replace(/,/g, '');
  }
  
  // Tenta converter para número
  const numero = parseFloat(valorStr);
  
  // Verifica se é um número válido
  if (isNaN(numero)) return 0;
  
  // Aplica sanity check - Se o valor parece absurdo (100x maior do que deveria)
  // consideramos que pode haver um erro de formatação
  // Isso é uma heurística e deve ser ajustada conforme seus dados
  const MAX_EXPECTED_VALUE = 100000; // 100 mil é um valor razoável para seus produtos?
  
  if (numero > MAX_EXPECTED_VALUE) {
    // Tenta corrigir dividindo por potências de 10 até obter um valor razoável
    for (let i = 1; i <= 5; i++) {
      const potentialValue = numero / Math.pow(10, i);
      if (potentialValue < MAX_EXPECTED_VALUE) {
        console.warn(`Valor potencialmente incorreto corrigido: ${numero} → ${potentialValue}`);
        return potentialValue;
      }
    }
  }
  
  return numero;
};

/**
 * Calcula o valor total da venda com base na quantidade e preço unitário
 * Prioriza sempre o cálculo manual para evitar erros de formatação
 */
export const calcularTotalVenda = (total: any, quantidade: any, precoUnitario: any): number => {
  // Normaliza os valores
  const qtd = normalizarValorMonetario(quantidade);
  const preco = normalizarValorMonetario(precoUnitario);
  const valorTotal = normalizarValorMonetario(total);
  
  // Prioridade 1: Calcula manualmente (quantidade * preço)
  if (qtd > 0 && preco > 0) {
    return qtd * preco;
  }
  
  // Prioridade 2: Usa o valor total informado, após normalização
  if (valorTotal > 0) {
    return valorTotal;
  }
  
  // Se não há dados suficientes
  return 0;
};

/**
 * Formata um valor numérico para exibição em formato brasileiro
 * @param valor Valor numérico a ser formatado
 * @returns String formatada (ex: R$ 1.234,56)
 */
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};