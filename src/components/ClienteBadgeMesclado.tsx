import { useState } from 'react'
import { Merge, Info, X, Users, Calendar, Phone } from 'lucide-react'
import { buscarMesclagem, removerMesclagem } from '../utils/mesclagem-storage'
import { supabase } from '../lib/supabase'

interface ClienteMescladoInfo {
  dataUnificacao: string
  clientesOriginais: {
    id: number
    nome: string
    telefone?: string
    endereco?: string
  }[]
  totalVendasTransferidas: number
  telefonesUnificados: string[]
}

interface ClienteBadgeMescladoProps {
  clienteId: number
  informacoesMescla?: ClienteMescladoInfo
}

// Hook para verificar se cliente foi mesclado
function useClienteMesclado(clienteId: number) {
  const infoMescla = buscarMesclagem(clienteId)
  
  return {
    foiMesclado: infoMescla !== null,
    infoMescla
  }
}

export default function ClienteBadgeMesclado({ clienteId, informacoesMescla }: ClienteBadgeMescladoProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const { foiMesclado, infoMescla } = useClienteMesclado(clienteId)

  // Se cliente não foi mesclado, não mostrar badge
  if (!foiMesclado) return null

  const info = informacoesMescla || infoMescla

  const desmesclarCliente = async () => {
    if (!info || !confirm('Confirma desfazer a mesclagem? Isso criará novos registros separados.')) {
      return
    }

    try {
      // Recriar os clientes removidos
      for (const clienteOriginal of info.clientesOriginais) {
        if (clienteOriginal.id !== clienteId) {
          await supabase
            .from('clientes')
            .insert({
              Nome: clienteOriginal.nome,
              Telefone: clienteOriginal.telefone,
              Endereco: clienteOriginal.endereco,
              // Adicionar outros campos necessários baseados na estrutura original
              Entidade: Math.floor(Math.random() * 1000000), // Gerar nova entidade
              Ativo: true,
              DataCriacao: new Date().toISOString()
            })
        }
      }

      // Remover do tracking
      removerMesclagem(clienteId)
      
      alert('Cliente desmesclado com sucesso!')
      setModalAberto(false)
      window.location.reload() // Recarregar para mostrar mudanças
      
    } catch (error) {
      console.error('Erro ao desmesclar:', error)
      alert('Erro ao desmesclar cliente')
    }
  }

  const ModalDetalhes = () => {
    if (!modalAberto || !info) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 max-w-2xl w-full max-h-[100vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Merge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cliente Unificado</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Informações da mesclagem de duplicatas</p>
              </div>
            </div>
            <button
              onClick={() => setModalAberto(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Informações da Unificação */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900">
                  Unificado em: {info.dataUnificacao}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Registros mesclados:</span>
                  <span className="ml-2 text-blue-900">{info.clientesOriginais.length}</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Vendas transferidas:</span>
                  <span className="ml-2 text-blue-900">{info.totalVendasTransferidas}</span>
                </div>
              </div>
            </div>

            {/* Registros Originais */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Registros Originais Mesclados
              </h3>
              
              <div className="space-y-3">
                {info.clientesOriginais.map((cliente, index) => (
                  <div key={cliente.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">Registro {index + 1}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        ID: {cliente.id}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <strong>Nome:</strong> {cliente.nome}
                      </div>
                      {cliente.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <strong>Telefone:</strong> {cliente.telefone}
                        </div>
                      )}
                      {cliente.endereco && (
                        <div>
                          <strong>Endereço:</strong> {cliente.endereco}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Telefones Unificados */}
            {info.telefonesUnificados.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contatos Unificados
                </h4>
                <div className="text-sm text-green-800">
                  {info.telefonesUnificados.join(' / ')}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t flex justify-between items-center">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Esta unificação foi realizada automaticamente pelo sistema de detecção de duplicatas.
              Todas as vendas e histórico foram preservados.
            </p>
            <button
              onClick={desmesclarCliente}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Desmesclar Cliente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Badge */}
      <button
        onClick={() => setModalAberto(true)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 rounded-full hover:bg-blue-200 transition-colors"
        title="Cliente resultado de mesclagem de duplicatas - clique para detalhes"
      >
        <Merge className="w-3 h-3" />
        <span>Unificado</span>
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {/* Modal */}
      <ModalDetalhes />
    </>
  )
}