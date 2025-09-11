import { type Cliente } from '../lib/supabase'
import { buscarMesclagem, obterTodosIdsMesclados } from './mesclagem-storage'

/**
 * Filtra a lista de clientes removendo duplicatas mescladas
 * Mantém apenas o cliente principal de cada grupo mesclado
 */
export function filtrarClientesVirtuais(clientes: Cliente[]): Cliente[] {
  const todosMesclados = obterTodosIdsMesclados()
  const clientesParaOcultar = new Set<number>()
  
  // Para cada cliente principal mesclado, ocultar os clientes secundários
  todosMesclados.forEach(clientePrincipalId => {
    const infoMescla = buscarMesclagem(clientePrincipalId)
    
    if (infoMescla?.clientesOriginais) {
      infoMescla.clientesOriginais.forEach(clienteOriginal => {
        // Ocultar todos os clientes originais EXCETO o principal
        if (clienteOriginal.id !== clientePrincipalId) {
          clientesParaOcultar.add(clienteOriginal.id)
        }
      })
    }
  })
  
  // Retornar apenas clientes que não estão na lista para ocultar
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