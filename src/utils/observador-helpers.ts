// =====================================================
// FUNÇÕES AUXILIARES PARA DASHBOARD OBSERVADOR
// =====================================================

import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CorProgresso } from '../types/observador';

/**
 * Formata valor monetário para exibição
 * @param valor - Valor numérico
 * @returns String formatada (ex: "R$ 150.000,00")
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata valor monetário de forma compacta
 * @param valor - Valor numérico
 * @returns String compacta (ex: "R$ 150K", "R$ 1,5M")
 */
export function formatarMoedaCompacta(valor: number): string {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  }
  if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(0)}K`;
  }
  return formatarMoeda(valor);
}

/**
 * Formata número com separadores de milhar
 * @param valor - Valor numérico
 * @returns String formatada (ex: "1.500")
 */
export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/**
 * Formata percentual para exibição
 * @param valor - Valor percentual (0-100)
 * @param casasDecimais - Número de casas decimais (padrão: 1)
 * @returns String formatada (ex: "85,5%")
 */
export function formatarPercentual(
  valor: number,
  casasDecimais: number = 1
): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Formata data para exibição
 * @param data - Data como string ou Date
 * @param formato - Formato desejado (padrão: 'dd/MM/yyyy')
 * @returns String formatada ou string vazia se inválida
 */
export function formatarData(
  data: string | Date,
  formato: string = 'dd/MM/yyyy'
): string {
  try {
    const dataObj = typeof data === 'string' ? parseISO(data) : data;
    if (!isValid(dataObj)) return '';
    return format(dataObj, formato, { locale: ptBR });
  } catch {
    return '';
  }
}

/**
 * Formata data e hora para timestamp
 * @param data - Data como string ou Date
 * @returns String formatada (ex: "29/09/2025 14:30")
 */
export function formatarTimestamp(data: string | Date): string {
  return formatarData(data, 'dd/MM/yyyy HH:mm');
}

/**
 * Retorna nome do mês abreviado
 * @param mes - Número do mês (1-12)
 * @returns String abreviada (ex: "Jan", "Fev")
 */
export function obterNomeMesAbreviado(mes: number): string {
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  return meses[mes - 1] || '';
}

/**
 * Retorna nome do mês completo
 * @param mes - Número do mês (1-12)
 * @returns String completa (ex: "Janeiro", "Fevereiro")
 */
export function obterNomeMesCompleto(mes: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[mes - 1] || '';
}

/**
 * Determina cor da barra de progresso baseada no percentual
 * @param percentual - Valor de 0 a 100
 * @returns Cor apropriada para o progresso
 */
export function obterCorProgresso(percentual: number): CorProgresso {
  if (percentual >= 91) return 'verde';
  if (percentual >= 76) return 'azul';
  if (percentual >= 51) return 'amarelo';
  return 'vermelho';
}

/**
 * Retorna classes Tailwind para a cor do progresso
 * @param cor - Cor do progresso
 * @returns String com classes CSS
 */
export function obterClassesCorProgresso(cor: CorProgresso): string {
  const classes: Record<CorProgresso, string> = {
    verde: 'bg-green-500',
    azul: 'bg-blue-500',
    amarelo: 'bg-yellow-500',
    vermelho: 'bg-red-500',
  };
  return classes[cor];
}

/**
 * Retorna classes Tailwind para texto da cor do progresso
 * @param cor - Cor do progresso
 * @returns String com classes CSS
 */
export function obterClassesTextoCorProgresso(cor: CorProgresso): string {
  const classes: Record<CorProgresso, string> = {
    verde: 'text-green-600',
    azul: 'text-blue-600',
    amarelo: 'text-yellow-600',
    vermelho: 'text-red-600',
  };
  return classes[cor];
}

/**
 * Trunca texto se exceder tamanho máximo
 * @param texto - Texto a ser truncado
 * @param tamanhoMaximo - Tamanho máximo (padrão: 50)
 * @returns Texto truncado com "..."
 */
export function truncarTexto(texto: string, tamanhoMaximo: number = 50): string {
  if (texto.length <= tamanhoMaximo) return texto;
  return `${texto.substring(0, tamanhoMaximo)}...`;
}

/**
 * Valida se um valor numérico é válido
 * @param valor - Valor a ser validado
 * @returns true se válido, false caso contrário
 */
export function isNumeroValido(valor: unknown): valor is number {
  return typeof valor === 'number' && !isNaN(valor) && isFinite(valor);
}

/**
 * Gera iniciais do nome para avatar
 * @param nome - Nome completo
 * @returns Iniciais (ex: "JS" para "João Silva")
 */
export function gerarIniciais(nome: string): string {
  const partes = nome.trim().split(' ');
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Calcula tempo restante até data futura
 * @param dataFutura - Data alvo
 * @returns Objeto com dias, horas, minutos restantes
 */
export function calcularTempoRestante(dataFutura: Date) {
  const agora = new Date();
  const diferenca = dataFutura.getTime() - agora.getTime();
  
  if (diferenca <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }
  
  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
  
  return { dias, horas, minutos, segundos };
}

/**
 * Agrupa array de objetos por uma chave
 * @param array - Array a ser agrupado
 * @param chave - Chave para agrupamento
 * @returns Objeto com arrays agrupados
 */
export function agruparPor<T>(
  array: T[],
  chave: keyof T
): Record<string, T[]> {
  return array.reduce((resultado, item) => {
    const valorChave = String(item[chave]);
    if (!resultado[valorChave]) {
      resultado[valorChave] = [];
    }
    resultado[valorChave].push(item);
    return resultado;
  }, {} as Record<string, T[]>);
}

/**
 * Ordena array por uma propriedade
 * @param array - Array a ser ordenado
 * @param propriedade - Propriedade para ordenação
 * @param ordem - 'asc' ou 'desc'
 * @returns Array ordenado
 */
export function ordenarPor<T>(
  array: T[],
  propriedade: keyof T,
  ordem: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const valorA = a[propriedade];
    const valorB = b[propriedade];
    
    if (valorA < valorB) return ordem === 'asc' ? -1 : 1;
    if (valorA > valorB) return ordem === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Debounce para otimizar performance
 * @param funcao - Função a ser executada
 * @param delay - Atraso em ms
 * @returns Função com debounce aplicado
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  funcao: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => funcao(...args), delay);
  };
}