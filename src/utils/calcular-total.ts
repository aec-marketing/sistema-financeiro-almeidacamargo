// Na função calcularTotalVenda, adicione logging
export function calcularTotalVenda(
  totalExistente: string | number | null | undefined,
  quantidade: string | number | null | undefined,
  precoUnitario: string | number | null | undefined
): number {
  const converterValor = (valor: string | number | null | undefined): number => {
    if (!valor) return 0
    if (typeof valor === 'number') return valor
    return parseFloat(valor.toString().replace(',', '.')) || 0
  }

  const total = converterValor(totalExistente)
  const qtd = converterValor(quantidade)
  const preco = converterValor(precoUnitario)

  if (total > 0) {
    return total // Usa valor original
  }

  if (qtd > 0 && preco > 0) {
    const calculado = qtd * preco
    return calculado
  }

  return 0
}