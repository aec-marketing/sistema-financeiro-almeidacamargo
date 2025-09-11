import { supabase, type Cliente } from '../lib/supabase'
import { salvarMesclagem } from './mesclagem-storage'

// Tipos específicos para duplicatas
export interface GrupoDuplicata {
  chave: string
  clientes: Cliente[]
  criterio: 'cnpj_cidade' | 'nome_cidade' | 'similar'
  confianca: number // 0-100, quanto maior mais certeza de que é duplicata
}

export interface SugestaoDuplicata {
  grupo: GrupoDuplicata
  clientePrincipal: Cliente
  clientesParaRemover: Cliente[]
  telefonesMesclados: string[]
  totalVendas: number
}
// Função para limpar grupos com chaves duplicadas
function limparGruposDuplicados(grupos: GrupoDuplicata[]): GrupoDuplicata[] {
  const gruposUnicos = new Map<string, GrupoDuplicata>()
  
  grupos.forEach(grupo => {
    const chaveExistente = gruposUnicos.get(grupo.chave)
    
    if (chaveExistente) {
      // Mesclar clientes se a chave já existe
      const clientesUnicos = [...chaveExistente.clientes]
      grupo.clientes.forEach(cliente => {
        if (!clientesUnicos.some(c => c.id === cliente.id)) {
          clientesUnicos.push(cliente)
        }
      })
      
      gruposUnicos.set(grupo.chave, {
        ...chaveExistente,
        clientes: clientesUnicos,
        confianca: Math.max(chaveExistente.confianca, grupo.confianca)
      })
    } else {
      gruposUnicos.set(grupo.chave, grupo)
    }
  })
  
  return Array.from(gruposUnicos.values())
}

// Função para normalizar strings para comparação
function normalizar(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
}

// Função para calcular similaridade entre strings usando Levenshtein simplificado
function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = normalizar(str1)
  const s2 = normalizar(str2)
  
  if (s1 === s2) return 1.0
  
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1.0
  
  let matches = 0
  const minLen = Math.min(s1.length, s2.length)
  
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matches++
  }
  
  return matches / maxLen
}

// Função principal para detectar duplicatas
export async function detectarDuplicatas(): Promise<GrupoDuplicata[]> {
  try {
    // Buscar todos os clientes
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .order('Nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar clientes:', error)
      return []
    }

    if (!clientes) return []

    const grupos = new Map<string, Cliente[]>()
    const gruposDetectados: GrupoDuplicata[] = []

    // 1. DETECÇÃO POR CNPJ + CIDADE (mais confiável - 95%)
    clientes.forEach(cliente => {
  if (cliente.CNPJ && cliente['Município']) {
    const cnpjLimpo = cliente.CNPJ.replace(/[^\d]/g, '')
    const chave = `cnpj_${cnpjLimpo}_${normalizar(cliente['Município'])}`
    
    if (grupos.has(chave)) {
      grupos.get(chave)!.push(cliente)
    } else {
      grupos.set(chave, [cliente])
    }
  }
})

    // Processar grupos por CNPJ
    grupos.forEach((clientesGrupo, chave) => {
      if (clientesGrupo.length > 1) {
        gruposDetectados.push({
          chave,
          clientes: clientesGrupo,
          criterio: 'cnpj_cidade',
          confianca: 95
        })
      }
    })

    // 2. DETECÇÃO POR NOME EXATO + CIDADE (confiável - 85%)
    grupos.clear()
    
    clientes.forEach(cliente => {
      const nomeNormalizado = normalizar(cliente.Nome || '')
      const cidadeNormalizada = normalizar(cliente.Município || '')
      
      if (nomeNormalizado && cidadeNormalizada) {
        const chave = `nome_${nomeNormalizado}_${cidadeNormalizada}`
        
        if (grupos.has(chave)) {
          grupos.get(chave)!.push(cliente)
        } else {
          grupos.set(chave, [cliente])
        }
      }
    })

    grupos.forEach((clientesGrupo, chave) => {
      if (clientesGrupo.length > 1) {
        // Verificar se já não foi detectado por CNPJ
        const jaDetectado = gruposDetectados.some(grupo => 
          grupo.clientes.some(c => clientesGrupo.some(c2 => c.id === c2.id))
        )
        
        if (!jaDetectado) {
          gruposDetectados.push({
            chave,
            clientes: clientesGrupo,
            criterio: 'nome_cidade',
            confianca: 85
          })
        }
      }
    })

    // 3. DETECÇÃO POR SIMILARIDADE DE NOME (menos confiável - 70%)
    const clientesRestantes = clientes.filter(cliente => 
      !gruposDetectados.some(grupo => 
        grupo.clientes.some(c => c.id === cliente.id)
      )
    )

// ✅ NOVA IMPLEMENTAÇÃO - Evitar chaves duplicadas
const gruposSimilaridade = new Map<string, Cliente[]>()

for (let i = 0; i < clientesRestantes.length; i++) {
  for (let j = i + 1; j < clientesRestantes.length; j++) {
    const cliente1 = clientesRestantes[i]
    const cliente2 = clientesRestantes[j]
    
    const similaridadeNome = calcularSimilaridade(cliente1.Nome || '', cliente2.Nome || '')
    const mesmaUF = cliente1['Sigla Estado'] === cliente2['Sigla Estado']
    
    // Se nome muito similar (>90%) e mesmo estado
    if (similaridadeNome > 0.9 && mesmaUF) {
      // Criar chave única incluindo os IDs dos clientes para evitar duplicatas
      const nomeNormalizado = normalizar(cliente1.Nome || '')
      const chave = `similar_${nomeNormalizado}_${cliente1['Sigla Estado'] || ''}_${Math.min(cliente1.id, cliente2.id)}_${Math.max(cliente1.id, cliente2.id)}`
      
      // Verificar se já existe um grupo para estes clientes
      let chaveExistente = null
      for (const [chaveGrupo, clientesGrupo] of gruposSimilaridade) {
        if (clientesGrupo.some(c => c.id === cliente1.id || c.id === cliente2.id)) {
          chaveExistente = chaveGrupo
          break
        }
      }
      
      if (chaveExistente) {
        // Adicionar ao grupo existente se não estiver já
        const clientesGrupo = gruposSimilaridade.get(chaveExistente)!
        if (!clientesGrupo.some(c => c.id === cliente1.id)) {
          clientesGrupo.push(cliente1)
        }
        if (!clientesGrupo.some(c => c.id === cliente2.id)) {
          clientesGrupo.push(cliente2)
        }
      } else {
        // Criar novo grupo
        gruposSimilaridade.set(chave, [cliente1, cliente2])
      }
    }
  }
}

// Adicionar grupos de similaridade aos grupos detectados
gruposSimilaridade.forEach((clientesGrupo, chave) => {
  if (clientesGrupo.length > 1) {
    const similaridadeMedia = clientesGrupo.reduce((acc, cliente, index) => {
      if (index === 0) return 0
      return acc + calcularSimilaridade(clientesGrupo[0].Nome || '', cliente.Nome || '')
    }, 0) / Math.max(clientesGrupo.length - 1, 1)
    
    gruposDetectados.push({
      chave,
      clientes: clientesGrupo,
      criterio: 'similar',
      confianca: Math.floor(similaridadeMedia * 70)
    })
  }
})

    const gruposLimpos = limparGruposDuplicados(gruposDetectados)

    console.log(`Detectadas ${gruposLimpos.length} grupos de duplicatas`)
    return gruposLimpos

  } catch (error) {
    console.error('Erro ao detectar duplicatas:', error)
    return []
  }
}

// Função para analisar um grupo e sugerir mesclagem
export async function analisarGrupo(grupo: GrupoDuplicata): Promise<SugestaoDuplicata> {
  // Escolher cliente principal (mais completo)
  const clientePrincipal = grupo.clientes.reduce((melhor, atual) => {
    let pontosMelhor = 0
    let pontosAtual = 0
    
    // Dar pontos por campos preenchidos
    if (melhor.CNPJ) pontosMelhor += 3
    if (melhor.Telefone) pontosMelhor += 2
    if (melhor.endereco) pontosMelhor += 2
    if (melhor.InscrEst) pontosMelhor += 1
    
    if (atual.CNPJ) pontosAtual += 3
    if (atual.Telefone) pontosAtual += 2
    if (atual.endereco) pontosAtual += 2
    if (atual.InscrEst) pontosAtual += 1
    
    return pontosAtual > pontosMelhor ? atual : melhor
  })

  const clientesParaRemover = grupo.clientes.filter(c => c.id !== clientePrincipal.id)

  // Mesclar telefones
  const telefones = grupo.clientes
    .map(c => c.Telefone)
    .filter(tel => tel && tel.trim())
    .filter((tel, index, arr) => arr.indexOf(tel) === index) // Remove duplicados

  // Contar vendas total do grupo
  let totalVendas = 0
  for (const cliente of grupo.clientes) {
  if (cliente.Entidade) { // Verificar se existe
    const { count } = await supabase
      .from('vendas')
      .select('id', { count: 'exact', head: true })
      .eq('cdCli', cliente.Entidade)
    
    totalVendas += count || 0
  }
}

  return {
    grupo,
    clientePrincipal,
    clientesParaRemover,
    telefonesMesclados: telefones,
    totalVendas
  }
}

// Função para executar mesclagem de duplicatas
export async function mesclarDuplicatas(sugestao: SugestaoDuplicata): Promise<boolean> {
  try {
    // MESCLAGEM VIRTUAL - NÃO MODIFICA O BANCO
    
    // Calcular total de vendas virtualmente
    let totalVendasVirtual = 0
    for (const cliente of sugestao.grupo.clientes) {
      const { count } = await supabase
        .from('vendas')
        .select('id', { count: 'exact', head: true })
        .eq('cdCli', cliente.Entidade)
      
      totalVendasVirtual += count || 0
    }

    // Salvar informação de mesclagem virtual
    salvarMesclagem({
      clientePrincipalId: sugestao.clientePrincipal.id,
      dataUnificacao: new Date().toLocaleDateString('pt-BR'),
      clientesOriginais: sugestao.grupo.clientes.map(cliente => ({
        id: cliente.id,
        nome: cliente.Nome || '',
        telefone: cliente.Telefone || '',
        endereco: cliente.endereco || '',
        entidade: cliente.Entidade
      })),
      totalVendasTransferidas: totalVendasVirtual,
      telefonesUnificados: sugestao.telefonesMesclados,
      virtual: true
    })

    console.log(`Mesclagem VIRTUAL concluída: ${sugestao.clientesParaRemover.length} duplicatas agrupadas`)
    return true

  } catch (error) {
    console.error('Erro ao mesclar duplicatas virtualmente:', error)
    return false
  }
}

// Função para gerar relatório de duplicatas
export function gerarRelatorio(grupos: GrupoDuplicata[]): {
  totalGrupos: number
  totalDuplicatas: number
  porCriterio: Record<string, number>
  alta_confianca: number
} {
  const porCriterio: Record<string, number> = {}
  let alta_confianca = 0
  let totalDuplicatas = 0

  grupos.forEach(grupo => {
    porCriterio[grupo.criterio] = (porCriterio[grupo.criterio] || 0) + 1
    totalDuplicatas += grupo.clientes.length - 1 // Subtrai 1 porque um vai ser mantido
    
    if (grupo.confianca >= 90) {
      alta_confianca++
    }
  })

  return {
    totalGrupos: grupos.length,
    totalDuplicatas,
    porCriterio,
    alta_confianca
  }
}