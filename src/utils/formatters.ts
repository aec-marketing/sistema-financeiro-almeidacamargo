// src/utils/formatters.ts
/**
 * Utilitários para formatação de dados - Sistema Almeida&Camargo
 */

/**
 * Formatar data brasileira (DD/MM/YYYY)
 */
export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return 'Data não informada'

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data
    
    if (isNaN(dataObj.getTime())) {
      return 'Data inválida'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    }).format(dataObj)
  } catch (error) {
    console.error('Erro ao formatar data:', error)
    return 'Data inválida'
  }
}

/**
 * Formatar data e hora brasileira (DD/MM/YYYY HH:MM)
 */
export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return 'Data não informada'

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data
    
    if (isNaN(dataObj.getTime())) {
      return 'Data inválida'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(dataObj)
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error)
    return 'Data inválida'
  }
}

/**
 * Formatar valores monetários em Real brasileiro
 */
export function formatarMoeda(valor: number | string | null | undefined): string {
  const numero = typeof valor === 'string' ? converterValor(valor) : (valor || 0)
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numero)
}

/**
 * Formatar números para exibição brasileira (com pontos e vírgulas)
 */
export function formatarNumero(valor: number | string | null | undefined, decimais: number = 2): string {
  const numero = typeof valor === 'string' ? converterValor(valor) : (valor || 0)
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais
  }).format(numero)
}

/**
 * Converter strings brasileiras para números
 * Exemplos: "1.234,56" → 1234.56, "R$ 500,00" → 500
 */
export function converterValor(valor: string | number | null | undefined): number {
  if (typeof valor === 'number') return valor
  if (!valor) return 0

  try {
    // Converter para string se não for
    const str = valor.toString()
    
    // Remover símbolos de moeda, espaços e caracteres especiais
    let limpo = str
      .replace(/[R$\s€$£¥₹]/g, '') // Remover símbolos de moeda
      .replace(/[^\d,.-]/g, '')    // Manter apenas dígitos, vírgula, ponto e hífen
      .trim()

    // Se está vazio após limpeza
    if (!limpo) return 0

    // Detectar formato brasileiro (vírgula como decimal)
    // Ex: 1.234,56 ou 1234,56
    if (limpo.includes(',') && limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
      // Formato brasileiro: remover pontos (milhares) e trocar vírgula por ponto
      limpo = limpo
        .replace(/\./g, '')     // Remove pontos de milhar
        .replace(',', '.')      // Troca vírgula decimal por ponto
    }
    // Senão, assumir formato americano (ponto como decimal)

    const numero = parseFloat(limpo)
    return isNaN(numero) ? 0 : numero
  } catch (error) {
    console.error('Erro ao converter valor:', error, 'Valor original:', valor)
    return 0
  }
}

/**
 * Formatar percentual brasileiro
 */
export function formatarPercentual(valor: number | string | null | undefined, decimais: number = 1): string {
  const numero = typeof valor === 'string' ? converterValor(valor) : (valor || 0)
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais
  }).format(numero / 100) // Dividir por 100 porque o Intl.NumberFormat multiplica por 100
}

/**
 * Formatar CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export function formatarCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return 'CNPJ não informado'

  // Remover caracteres não numéricos
  const apenasNumeros = cnpj.replace(/\D/g, '')
  
  if (apenasNumeros.length !== 14) {
    return cnpj // Retornar original se não tiver 14 dígitos
  }

  return apenasNumeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

/**
 * Formatar CPF (XXX.XXX.XXX-XX)
 */
export function formatarCPF(cpf: string | null | undefined): string {
  if (!cpf) return 'CPF não informado'

  const apenasNumeros = cpf.replace(/\D/g, '')
  
  if (apenasNumeros.length !== 11) {
    return cpf
  }

  return apenasNumeros.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  )
}

/**
 * Formatar CEP (XXXXX-XXX)
 */
export function formatarCEP(cep: string | null | undefined): string {
  if (!cep) return 'CEP não informado'

  const apenasNumeros = cep.replace(/\D/g, '')
  
  if (apenasNumeros.length !== 8) {
    return cep
  }

  return apenasNumeros.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

/**
 * Formatar telefone brasileiro
 */
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return 'Telefone não informado'

  const apenasNumeros = telefone.replace(/\D/g, '')
  
  // Celular (11 dígitos): (XX) XXXXX-XXXX
  if (apenasNumeros.length === 11) {
    return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  
  // Fixo (10 dígitos): (XX) XXXX-XXXX
  if (apenasNumeros.length === 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  
  return telefone // Retornar original se formato não reconhecido
}

/**
 * Capitalizar primeira letra de cada palavra
 */
export function capitalizarPalavras(texto: string | null | undefined): string {
  if (!texto) return ''

  return texto
    .toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ')
}

/**
 * Truncar texto com reticências
 */
export function truncarTexto(texto: string | null | undefined, limite: number = 50): string {
  if (!texto) return ''
  
  if (texto.length <= limite) return texto
  
  return texto.substring(0, limite) + '...'
}

/**
 * Formatar números grandes (K, M, B)
 */
export function formatarNumeroGrande(valor: number | string | null | undefined): string {
  const numero = typeof valor === 'string' ? converterValor(valor) : (valor || 0)
  
  if (numero >= 1000000000) {
    return formatarNumero(numero / 1000000000, 1) + 'B'
  }
  
  if (numero >= 1000000) {
    return formatarNumero(numero / 1000000, 1) + 'M'
  }
  
  if (numero >= 1000) {
    return formatarNumero(numero / 1000, 1) + 'K'
  }
  
  return formatarNumero(numero, 0)
}

/**
 * Validar e formatar data para input HTML (YYYY-MM-DD)
 */
export function formatarDataParaInput(data: string | Date | null | undefined): string {
  if (!data) return ''

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data
    
    if (isNaN(dataObj.getTime())) {
      return ''
    }

    return dataObj.toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return ''
  }
}

/**
 * Obter saudação baseada no horário
 */
export function obterSaudacao(): string {
  const agora = new Date()
  const hora = agora.getHours()

  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Calcular diferença em dias entre duas datas
 */
export function calcularDiferencaDias(
  dataInicio: string | Date, 
  dataFim: string | Date
): number {
  try {
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
    const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
    
    const diferenca = fim.getTime() - inicio.getTime()
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 0
  }
}

/**
 * Obter nome do mês por extenso
 */
export function obterNomeMes(numeroMes: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  return meses[numeroMes - 1] || 'Mês inválido'
}

/**
 * Verificar se uma string é um email válido
 */
export function validarEmail(email: string | null | undefined): boolean {
  if (!email) return false
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Gerar iniciais do nome (ex: "João Silva" → "JS")
 */
export function gerarIniciais(nome: string | null | undefined): string {
  if (!nome) return '??'
  
  return nome
    .split(' ')
    .filter(palavra => palavra.length > 0)
    .slice(0, 2) // Pegar apenas as 2 primeiras palavras
    .map(palavra => palavra.charAt(0).toUpperCase())
    .join('')
}