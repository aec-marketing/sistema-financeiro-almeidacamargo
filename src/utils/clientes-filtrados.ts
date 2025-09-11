import { type Cliente } from '../lib/supabase'
import { buscarMesclagem } from './mesclagem-storage'

/**
 * Filtra a lista de clientes removendo duplicatas mescladas
 * Mantém apenas o cliente principal de cada grupo mesclado
 */
export function filtrarClientesVirtuais(clientes: Cliente[]): Cliente[] {
  const mesclagens = JSON.parse(localStorage.getItem('clientes_mesclados') || '{}')
  
  if (Object.keys(mesclagens).length === 0) {
    return clientes // Sem mesclagens, retorna todos
  }
  
  const clientesParaOcultar = new Set<number>()
  
  // Coletar todos os IDs dos clientes que devem ser ocultados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.values(mesclagens).forEach((mesclagem: any) => {
    if (mesclagem.clientesOriginais && mesclagem.clientePrincipalId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mesclagem.clientesOriginais.forEach((clienteOriginal: any) => {
        // Ocultar apenas os clientes secundários
        if (clienteOriginal.id !== mesclagem.clientePrincipalId) {
          clientesParaOcultar.add(clienteOriginal.id)
        }
      })
    }
  })
  
  return clientes.filter(cliente => !clientesParaOcultar.has(cliente.id))
}

/**
 * Enriquece um cliente com informações de mesclagem se aplicável
 */
export function enriquecerClienteComMesclagem(cliente: Cliente) {
  const infoMescla = buscarMesclagem(cliente.id)
  
  if (infoMescla) {
    return {
      ...cliente,
      _isMesclado: true,
      _infoMescla: infoMescla
    }
  }
  
  return cliente
}