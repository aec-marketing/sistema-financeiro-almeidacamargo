// Sistema de mesclagem não-destrutiva (virtual)

// Defina a interface para os clientes originais primeiro
interface ClienteOriginal {
  id: number
  nome: string
  telefone?: string
  endereco?: string
  entidade?: string
}

export interface ClienteMesclado {
  clientePrincipalId: number
  dataUnificacao: string
  clientesOriginais: ClienteOriginal[]
  totalVendasTransferidas: number
  telefonesUnificados: string[]
  virtual: boolean
}

export function salvarMesclagem(info: ClienteMesclado) {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  mesclagens[info.clientePrincipalId] = {
    ...info,
    virtual: true
  }
  localStorage.setItem('clientes_mesclados', JSON.stringify(mesclagens))
}

export function buscarMesclagem(clienteId: number): ClienteMesclado | null {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  return mesclagens[clienteId] || null
}

export function removerMesclagem(clienteId: number) {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  delete mesclagens[clienteId]
  localStorage.setItem('clientes_mesclados', JSON.stringify(mesclagens))
}

// Nova função para obter todos os IDs mesclados
export function obterTodosIdsMesclados(): number[] {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  return Object.keys(mesclagens).map(Number)
}

// Nova função para verificar se um ID está em algum grupo de mesclagem
export function estaEmMesclagem(clienteId: number): boolean {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  return Object.values(mesclagens).some((mesclagem) => 
    (mesclagem as ClienteMesclado).clientesOriginais.some((cliente) => cliente.id === clienteId)
  )
}