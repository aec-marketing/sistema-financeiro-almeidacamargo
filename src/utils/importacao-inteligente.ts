import Papa from 'papaparse';

// Tipos de dados suportados
export type TabelaDestino = 'vendas' | 'clientes' | 'itens';

// Função auxiliar para limpar telefone e comparar
function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, ''); // Remove tudo que não é número
}

// Função para verificar se dois telefones são muito parecidos
function telefonesSaoParecidos(tel1: string, tel2: string): boolean {
  const limpo1 = limparTelefone(tel1);
  const limpo2 = limparTelefone(tel2);

  // Se são exatamente iguais
  if (limpo1 === limpo2) return true;

  // Se um contém o outro (ex: "11 4136-4532" contém "41364532")
  if (limpo1.includes(limpo2) || limpo2.includes(limpo1)) return true;

  return false;
}

// Função para mesclar telefones únicos
function mesclarTelefones(telefoneAtual: string, telefoneNovo: string): string {
  if (!telefoneAtual) return telefoneNovo;
  if (!telefoneNovo) return telefoneAtual;

  // Separar múltiplos telefones existentes
  const telefonesAtuais = telefoneAtual.split('/').map(t => t.trim());
  const telefonesNovos = telefoneNovo.split('/').map(t => t.trim());

  // Adicionar apenas telefones realmente diferentes
  const todosUnicos = [...telefonesAtuais];

  for (const novoTel of telefonesNovos) {
    let jaExiste = false;
    for (const atualTel of telefonesAtuais) {
      if (telefonesSaoParecidos(novoTel, atualTel)) {
        jaExiste = true;
        break;
      }
    }
    if (!jaExiste && novoTel.trim()) {
      todosUnicos.push(novoTel);
    }
  }

  return todosUnicos.join('/');
}

// Mapeamento de campos por tabela
export const CAMPOS_TABELAS = {
  vendas: [
  { campo: 'Número da Nota Fiscal', tipos: ['texto', 'numero'], palavrasChave: ['numero', 'nota', 'nf', 'fiscal'] },
  { campo: 'Data de Emissao da NF', tipos: ['data'], palavrasChave: ['data', 'emissao', 'nf', 'nota'] },
  { campo: 'Quantidade', tipos: ['numero'], palavrasChave: ['quantidade', 'qtd', 'qtde'] },
  { campo: 'Preço Unitário', tipos: ['numero', 'moeda'], palavrasChave: ['preco', 'unitario', 'valor', 'unit'] },
  { campo: 'total', tipos: ['numero', 'moeda'], palavrasChave: ['total', 'valor', 'soma'] },
  { campo: 'Cód. Referência', tipos: ['texto'], palavrasChave: ['codigo', 'referencia', 'sku'] },
  { campo: 'Descr. Produto', tipos: ['texto'], palavrasChave: ['produto', 'descricao', 'item'] },
  { campo: 'Cod de Natureza de Operação', tipos: ['texto'], palavrasChave: ['codigo', 'natureza', 'operacao', 'cfop'] },
  { campo: 'Código Fiscal da Operação', tipos: ['texto'], palavrasChave: ['codigo', 'fiscal', 'operacao', 'cfop'] },
  { campo: 'TIPO', tipos: ['texto'], palavrasChave: ['tipo'] },
  { campo: 'Descr de Natureza de Operação', tipos: ['texto'], palavrasChave: ['descricao', 'natureza', 'operacao'] },
  { campo: 'Cód. Subgrupo de Produto', tipos: ['texto'], palavrasChave: ['codigo', 'subgrupo', 'produto'] },
  { campo: 'Desc. Subgrupo de Produto', tipos: ['texto'], palavrasChave: ['descricao', 'subgrupo', 'produto'] },
  { campo: 'cdEmpresa', tipos: ['numero'], palavrasChave: ['codigo', 'empresa', 'id'] },
  { campo: 'NomeEmpresa', tipos: ['texto'], palavrasChave: ['nome', 'empresa', 'razao'] },
  { campo: 'Valor Icms Total', tipos: ['numero', 'moeda'], palavrasChave: ['valor', 'icms', 'total', 'imposto'] },
  { campo: 'Valor do IPI', tipos: ['numero', 'moeda'], palavrasChave: ['valor', 'ipi', 'imposto'] },
  { campo: 'cdCli', tipos: ['numero', 'texto'], palavrasChave: ['codigo', 'cliente', 'id'] },
  { campo: 'NomeCli', tipos: ['texto'], palavrasChave: ['nome', 'cliente', 'comprador'] },
  { campo: 'cdRepr', tipos: ['numero'], palavrasChave: ['codigo', 'representante', 'vendedor'] },
  { campo: 'NomeRepr', tipos: ['texto'], palavrasChave: ['nome', 'representante', 'vendedor'] },
  { campo: 'Base de Calc Icms', tipos: ['numero', 'moeda'], palavrasChave: ['base', 'calculo', 'icms'] },
  { campo: 'VlrBaseICMSTotItem', tipos: ['numero', 'moeda'], palavrasChave: ['valor', 'base', 'icms', 'total', 'item'] },
  { campo: 'VlrIpiTotItem', tipos: ['numero', 'moeda'], palavrasChave: ['valor', 'ipi', 'total', 'item'] },
  { campo: 'MARCA', tipos: ['texto'], palavrasChave: ['marca', 'fabricante'] },
  { campo: 'GRUPO', tipos: ['texto'], palavrasChave: ['grupo', 'categoria'] },
  { campo: 'CLIENTE + CIDADE', tipos: ['texto'], palavrasChave: ['cliente', 'cidade'] },
  { campo: 'CIDADE', tipos: ['texto'], palavrasChave: ['cidade', 'municipio', 'local'] },
  { campo: 'cod. Referência + Descrição produto', tipos: ['texto'], palavrasChave: ['codigo', 'referencia', 'descricao', 'produto'] },
],
  clientes: [
  { campo: 'Entidade', tipos: ['numero', 'texto'], palavrasChave: ['entidade', 'codigo', 'id'] },
  { campo: 'Nome', tipos: ['texto'], palavrasChave: ['nome', 'razao', 'social', 'cliente'] },
  { campo: 'CEP', tipos: ['texto'], palavrasChave: ['cep', 'postal'] },
  { campo: 'Município', tipos: ['texto'], palavrasChave: ['cidade', 'municipio'] },
  { campo: 'Sigla Estado', tipos: ['texto'], palavrasChave: ['estado', 'uf', 'sigla'] },
  { campo: 'endereco', tipos: ['texto'], palavrasChave: ['endereco', 'rua', 'avenida', 'logradouro'] },
  { campo: 'Telefone', tipos: ['texto'], palavrasChave: ['telefone', 'fone', 'contato', 'celular'] },
  { campo: 'CNPJ', tipos: ['texto'], palavrasChave: ['cnpj', 'cpf', 'documento'] },
  { campo: 'InscrEst', tipos: ['texto'], palavrasChave: ['inscricao', 'estadual', 'ie'] },
  { campo: 'C.N.A.E.', tipos: ['texto'], palavrasChave: ['cnae', 'atividade', 'classificacao'] },
],
  itens: [
  { campo: 'Descr. Produto', tipos: ['texto'], palavrasChave: ['produto', 'descricao', 'nome', 'item'] },
  { campo: 'Cód. Referência', tipos: ['texto'], palavrasChave: ['codigo', 'referencia', 'sku', 'ref'] },
  { campo: 'Descr. Marca Produto', tipos: ['texto'], palavrasChave: ['marca', 'fabricante'] },
  { campo: 'Descr. Grupo Produto', tipos: ['texto'], palavrasChave: ['grupo', 'categoria'] },
  { campo: 'Desc. Subgrupo de Produto', tipos: ['texto'], palavrasChave: ['subgrupo', 'subcategoria'] },
  { campo: 'Descr. Resumo Produto', tipos: ['texto'], palavrasChave: ['resumo', 'breve'] },
  { campo: 'Cód. do Produto', tipos: ['texto'], palavrasChave: ['codigo', 'produto', 'id'] },
  { campo: 'Compl. Cód. do Produto', tipos: ['texto'], palavrasChave: ['complemento', 'codigo'] },
  { campo: 'Faixa do ICMS', tipos: ['texto'], palavrasChave: ['icms', 'faixa', 'imposto'] },
  { campo: 'Peso Bruto Kg', tipos: ['numero'], palavrasChave: ['peso', 'bruto', 'kg'] },
  { campo: 'Peso Liquido Kg', tipos: ['numero'], palavrasChave: ['peso', 'liquido', 'kg'] },
  { campo: 'Status Importado/Nacional', tipos: ['texto'], palavrasChave: ['importado', 'nacional', 'origem'] },
  { campo: 'Status de Tipo de Produto', tipos: ['texto'], palavrasChave: ['status', 'tipo'] },
  { campo: 'Cód. Categoria de Grupo', tipos: ['texto'], palavrasChave: ['codigo', 'categoria', 'grupo'] },
  { campo: 'Descr. Categoria de Grupo', tipos: ['texto'], palavrasChave: ['descricao', 'categoria'] },
  { campo: 'Cód. Subgrupo de Produto', tipos: ['texto'], palavrasChave: ['codigo', 'subgrupo'] },
  { campo: 'Cód. Grupo Produto', tipos: ['texto'], palavrasChave: ['codigo', 'grupo'] },
  { campo: 'Código Cat Prod', tipos: ['texto'], palavrasChave: ['codigo', 'categoria', 'prod'] },
  { campo: 'Descr. Categoria de Prod', tipos: ['texto'], palavrasChave: ['descricao', 'categoria', 'prod'] },
  { campo: 'N.B.M.', tipos: ['texto'], palavrasChave: ['nbm', 'ncm', 'mercosul'] },
  { campo: 'Aliquota de IPI', tipos: ['texto', 'numero'], palavrasChave: ['aliquota', 'ipi'] },
  { campo: 'Cód. Marca Produtos', tipos: ['texto'], palavrasChave: ['codigo', 'marca'] },
  { campo: 'Cód. Conta Contábil Reduzida', tipos: ['texto'], palavrasChave: ['codigo', 'conta', 'contabil'] },
  { campo: 'Descr. Conta Contabil', tipos: ['texto'], palavrasChave: ['descricao', 'conta', 'contabil'] },
  { campo: 'cd_ctcResult', tipos: ['texto'], palavrasChave: ['codigo', 'resultado'] },
  { campo: 'ds_ctcResult', tipos: ['texto'], palavrasChave: ['descricao', 'resultado'] },
  { campo: 'Cód. Unidade de Medida', tipos: ['texto'], palavrasChave: ['codigo', 'unidade', 'medida'] },
  { campo: 'Descr. Unidade de Medida', tipos: ['texto'], palavrasChave: ['descricao', 'unidade', 'medida', 'un'] },
  { campo: 'Código EAN 13', tipos: ['texto'], palavrasChave: ['ean', 'codigo', 'barras'] },
  { campo: 'Largura', tipos: ['numero'], palavrasChave: ['largura', 'dimensao'] },
  { campo: 'Altura', tipos: ['numero'], palavrasChave: ['altura', 'dimensao'] },
  { campo: 'Comprimento', tipos: ['numero'], palavrasChave: ['comprimento', 'dimensao'] },
  { campo: 'Detalhamento Técnico', tipos: ['texto'], palavrasChave: ['detalhamento', 'tecnico', 'especificacao'] },
]
};

// Função para detectar tipo de dado em uma coluna
export function detectarTipoDado(valores: string[]): string {
  const amostra = valores.filter(v => v != null && v !== '').slice(0, 100);
  
  if (amostra.length === 0) return 'texto';
  
  // Testa se é data
  const datas = amostra.filter(v => {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v);
  });
  if (datas.length / amostra.length > 0.8) return 'data';
  
  // Testa se é moeda
  const moedas = amostra.filter(v => {
    return /^R?\$?\s?\d{1,3}(\.\d{3})*(,\d{2})?$/.test(v.replace(/\s/g, ''));
  });
  if (moedas.length / amostra.length > 0.8) return 'moeda';
  
  // Testa se é número
  const numeros = amostra.filter(v => {
    const num = parseFloat(v.replace(',', '.'));
    return !isNaN(num);
  });
  if (numeros.length / amostra.length > 0.8) return 'numero';
  
  return 'texto';
}

// Função para calcular similaridade entre strings
// Função para calcular similaridade entre strings - MELHORADA
function similaridade(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Match exato (100% de confiança)
  if (s1 === s2) return 10;
  
  // Calcula palavras únicas de cada string
  const palavras1 = s1.split(/\s+/).filter(p => p.length > 2); // Ignora palavras muito curtas
  const palavras2 = s2.split(/\s+/).filter(p => p.length > 2);
  
  if (palavras1.length === 0 || palavras2.length === 0) return 0;
  
  // Conta quantas palavras de s2 aparecem em s1
  let matches = 0;
  let matchesExatos = 0;
  
  palavras2.forEach(p2 => {
    palavras1.forEach(p1 => {
      // Match exato de palavra
      if (p1 === p2) {
        matchesExatos++;
        matches++;
      }
      // Match parcial (contém)
      else if (p1.includes(p2) || p2.includes(p1)) {
        matches += 0.5;
      }
    });
  });
  
  // Score baseado em matches exatos (peso maior) + matches parciais
  const scoreExato = matchesExatos / palavras2.length;
  const scoreParcial = matches / palavras2.length;
  
  // Prioriza matches exatos
  return scoreExato * 5 + scoreParcial * 2;
}

// Função principal: mapear colunas automaticamente
// Função principal: mapear colunas automaticamente - MELHORADA
export function mapearColunasAutomaticamente(
  headers: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primeiraLinha: any,
  tabelaDestino: TabelaDestino
): Record<string, string> {
  const mapeamento: Record<string, string> = {};
  const camposTabela = CAMPOS_TABELAS[tabelaDestino];
  const camposJaMapeados = new Set<string>(); // Evita mapear o mesmo campo 2x
  
  headers.forEach(header => {
    let melhorMatch: { campo: string; score: number; tipo: 'exato' | 'palavras' | 'tipo' } = { 
      campo: '', 
      score: 0,
      tipo: 'tipo'
    };
    
    // Detecta tipo do dado nesta coluna
    const tipoDado = detectarTipoDado([primeiraLinha[header]]);
    
    // Procura o melhor campo correspondente
    camposTabela.forEach(campoInfo => {
      // Pula se esse campo já foi mapeado para outra coluna
      if (camposJaMapeados.has(campoInfo.campo)) return;
      
      let score = 0;
      let tipoMatch: 'exato' | 'palavras' | 'tipo' = 'tipo';
      
      // PRIORIDADE 1: Match exato no nome (altíssima confiança)
      const headerLimpo = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const campoLimpo = campoInfo.campo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      
      if (headerLimpo === campoLimpo) {
        score = 100; // Score muito alto para match exato
        tipoMatch = 'exato';
      }
      
      // PRIORIDADE 2: Similaridade com o nome do campo
      else {
        const simNome = similaridade(header, campoInfo.campo);
        if (simNome > 5) { // Match muito forte
          score += simNome * 10;
          tipoMatch = 'palavras';
        } else if (simNome > 2) { // Match moderado
          score += simNome * 5;
          tipoMatch = 'palavras';
        }
      }
      
      // PRIORIDADE 3: Palavras-chave (peso menor)
      let maxPalavraScore = 0;
      campoInfo.palavrasChave.forEach(palavra => {
        const sim = similaridade(header, palavra);
        if (sim > maxPalavraScore) maxPalavraScore = sim;
      });
      score += maxPalavraScore * 2;
      
      // PRIORIDADE 4: Tipo de dado (peso bem menor)
      if (campoInfo.tipos.includes(tipoDado)) {
        score += 1;
      }
      
      // Atualiza melhor match se esse é melhor
      if (score > melhorMatch.score) {
        melhorMatch = { campo: campoInfo.campo, score, tipo: tipoMatch };
      }
    });
    
    // Só mapeia se tiver confiança mínima
    // Score > 10 para match exato/forte, > 5 para match moderado
    if (melhorMatch.score > 5) {
      mapeamento[header] = melhorMatch.campo;
      camposJaMapeados.add(melhorMatch.campo); // Marca como já mapeado
    }
  });
  
  return mapeamento;
}

// Função para analisar CSV e retornar estrutura
export async function analisarCSV(arquivo: File): Promise<{
  headers: string[];
  dados: Record<string, string>[];
  totalLinhas: number;
  amostra: Record<string, string>[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(arquivo, {
      header: true,
      dynamicTyping: false, // Mantém como string para análise
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          dados: results.data as Record<string, string>[],
          totalLinhas: results.data.length,
          amostra: (results.data as Record<string, string>[]).slice(0, 10) // Primeiras 10 linhas
        });
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

// Função para validar linha de dados
export function validarLinha(
  linha: Record<string, string>,
  mapeamento: Record<string, string>,
  tabelaDestino: TabelaDestino
): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  
  // Campos obrigatórios por tabela
  const camposObrigatorios: Record<TabelaDestino, string[]> = {
    vendas: ['Data de Emissao da NF', 'NomeCli', 'Descr. Produto'],
    clientes: ['Nome'],
    itens: ['Descr. Produto', 'Cód. Referência']
  };
  
  // Verifica campos obrigatórios
  camposObrigatorios[tabelaDestino].forEach(campoObrigatorio => {
    const colunaOriginal = Object.keys(mapeamento).find(
      k => mapeamento[k] === campoObrigatorio
    );
    
    if (!colunaOriginal || !linha[colunaOriginal]) {
      erros.push(`Campo obrigatório "${campoObrigatorio}" está vazio`);
    }
  });
  
  return {
    valido: erros.length === 0,
    erros
  };
}

// Função para limpar e transformar dados antes de inserir
export function transformarDadosParaInsercao(
  dados: Record<string, string>[],
  mapeamento: Record<string, string>
): Record<string, string | number | null>[] {
  return dados.map(linha => {
    const linhaTransformada: Record<string, string | number | null> = {};

    Object.entries(mapeamento).forEach(([colunaOriginal, campoDestino]) => {
      let valor: string | number | null = linha[colunaOriginal];

      // Transformações específicas por tipo
      if (valor != null && valor !== '') {
        // Limpar e converter datas
        if (campoDestino.toLowerCase().includes('data')) {
          valor = converterData(valor);
        }

        // Limpar e converter valores monetários
        else if (['total', 'Preço Unitário', 'Valor'].some(v => campoDestino.includes(v))) {
          valor = converterMoeda(valor);
        }

        // Limpar e converter números
        else if (['Quantidade', 'cdCli', 'cdRepr', 'Entidade'].includes(campoDestino)) {
          valor = converterNumero(valor);
        }

        // Limpar CNPJ
        else if (campoDestino === 'CNPJ') {
          valor = limparCNPJ(valor);
        }

        // Trim em textos
        else if (typeof valor === 'string') {
          valor = valor.trim();
        }
      }

      linhaTransformada[campoDestino] = valor;
    });

    return linhaTransformada;
  });
}

// Conversores específicos
function converterData(valor: string): string | null {
  if (!valor) return null;

  // DD/MM/YYYY - converter para ISO YYYY-MM-DD
  const match1 = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match1) {
    const dia = match1[1];
    const mes = match1[2];
    const ano = match1[3];
    return `${ano}-${mes}-${dia}`; // YYYY-MM-DD formato ISO
  }

  // DD-MM-YYYY - converter para ISO YYYY-MM-DD
  const match2 = valor.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match2) {
    const dia = match2[1];
    const mes = match2[2];
    const ano = match2[3];
    return `${ano}-${mes}-${dia}`; // YYYY-MM-DD formato ISO
  }

  // YYYY-MM-DD (já está correto no formato ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }

  return null;
}

function converterMoeda(valor: string): number {
  if (typeof valor === 'number') return valor;
  
  // Remove R$, espaços, pontos de milhar
  const limpo = valor
    .replace(/R\$?\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

function converterNumero(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  
  const limpo = valor.replace(',', '.');
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

function limparCNPJ(valor: string): string {
  // Remove tudo que não é número
  return valor.replace(/\D/g, '');
}

// Analisa o CSV e sugere qual tabela deve ser o destino - MELHORADO
export function detectarTabelaDestino(
  headers: string[]): {
  tabela: TabelaDestino;
  confianca: number;
  scores: Record<TabelaDestino, number>;
} {
  const scores: Record<TabelaDestino, number> = {
    vendas: 0,
    clientes: 0,
    itens: 0
  };

  // Analisa cada header e soma pontos para cada tabela
  headers.forEach(header => {
    const headerLower = header.toLowerCase();

    // Tenta mapear para cada tabela
    Object.keys(CAMPOS_TABELAS).forEach(tabelaKey => {
      const tabela = tabelaKey as TabelaDestino;
      const campos = CAMPOS_TABELAS[tabela];

      // Verifica se algum campo dessa tabela é similar ao header
      campos.forEach(campo => {
        // Match exato vale muito
        const campoLimpo = campo.campo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const headerLimpo = headerLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (campoLimpo === headerLimpo) {
          scores[tabela] += 10;
        }
        // Similaridade forte vale menos
        else {
          const sim = similaridade(header, campo.campo);
          if (sim > 5) {
            scores[tabela] += 5;
          } else if (sim > 2) {
            scores[tabela] += 2;
          }
        }
      });
    });
  });

  // Determina vencedor
  const maxScore = Math.max(scores.vendas, scores.clientes, scores.itens);
  const tabela = (Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || 'vendas') as TabelaDestino;

  // Confiança baseada na diferença entre 1º e 2º lugar
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const confianca = maxScore > 0 ? Math.min((maxScore - sortedScores[1]) / maxScore, 1) : 0;

  return { tabela, confianca, scores };
}

// Verifica se há registros duplicados comparando com o banco de dados
export async function detectarDuplicatas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dadosTransformados: any[],
  tabelaDestino: TabelaDestino,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  duplicatas: Array<{ linha: number; motivo: string; registro: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atualizacoes?: Array<{ id: number; clienteNome: string; telefoneAntigo: string; telefoneNovo: string; registro: any }>;
  total: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const duplicatas: Array<{ linha: number; motivo: string; registro: any }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atualizacoes: Array<{ id: number; clienteNome: string; telefoneAntigo: string; telefoneNovo: string; registro: any }> = [];

  if (tabelaDestino === 'vendas') {
    // Verifica duplicatas no BANCO DE DADOS e DENTRO DO ARQUIVO
    try {
      const notasFiscais = dadosTransformados
        .map((d, index) => ({ nf: d['Número da Nota Fiscal'], index }))
        .filter(item => item.nf);

      if (notasFiscais.length === 0) return { duplicatas, total: dadosTransformados.length };

      const nfsParaBuscar = [...new Set(notasFiscais.map(item => String(item.nf).trim()))];

      const nfsExistentes = new Set<string>();
      const TAMANHO_LOTE = 100;

      // Buscar em lotes no banco de dados
      for (let i = 0; i < nfsParaBuscar.length; i += TAMANHO_LOTE) {
        const lote = nfsParaBuscar.slice(i, Math.min(i + TAMANHO_LOTE, nfsParaBuscar.length));

        const { data: existentes, error } = await supabase
          .from('vendas')
          .select('"Número da Nota Fiscal"')
          .in('"Número da Nota Fiscal"', lote);

        if (error) {
          console.error('Erro ao verificar duplicatas no banco (lote):', error);
        } else {
          existentes?.forEach((e: { 'Número da Nota Fiscal': string }) => {
            nfsExistentes.add(String(e['Número da Nota Fiscal']).trim());
          });
        }

        // Pequeno delay para não sobrecarregar
        if (i + TAMANHO_LOTE < nfsParaBuscar.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('🔍 [VENDAS] Verificação de duplicatas:', {
        totalRegistros: dadosTransformados.length,
        nfsNoBanco: nfsExistentes.size
      });

      // Rastrear NFs já vistas no arquivo para detectar duplicatas internas
      const nfsNoArquivo = new Set<string>();

      // Marcar duplicatas (banco + internas do arquivo)
      dadosTransformados.forEach((registro, index) => {
        const nf = registro['Número da Nota Fiscal'];
        if (!nf) return;

        const nfStr = String(nf).trim();
        let motivoDuplicata = '';

        // Verificar se existe no banco
        if (nfsExistentes.has(nfStr)) {
          motivoDuplicata = `NF ${nf} já existe no banco de dados`;
        }
        // Verificar se é duplicata INTERNA do arquivo
        else if (nfsNoArquivo.has(nfStr)) {
          motivoDuplicata = `NF ${nf} duplicada dentro do arquivo (aparece mais de uma vez)`;
        }

        if (motivoDuplicata) {
          duplicatas.push({
            linha: index + 1,
            motivo: motivoDuplicata,
            registro
          });
        } else {
          // Adicionar ao rastreamento de NFs do arquivo
          nfsNoArquivo.add(nfStr);
        }
      });

      console.log('📊 [VENDAS] Resultado:', {
        duplicatasEncontradas: duplicatas.length,
        nfsUnicasNoArquivo: nfsNoArquivo.size
      });

    } catch (err) {
      console.error('Erro ao buscar duplicatas de vendas:', err);
    }
  }

  else if (tabelaDestino === 'clientes') {
    // Verifica duplicatas no BANCO DE DADOS e MESCLA TELEFONES
    try {
      // IMPORTANTE: Buscar TODOS os clientes sem limite de paginação
      // Por padrão Supabase limita a 1000 registros, precisamos buscar todos
      let clientesExistentes: Array<{
        id?: number;
        Entidade: string | number;
        Nome: string;
        CNPJ: string;
        Telefone?: string;
      }> = []
      let hasMore = true
      let offset = 0
      const PAGE_SIZE = 1000

      // Buscar em páginas até pegar todos os registros
      while (hasMore) {
        const { data, error, count } = await supabase
          .from('clientes')
          .select('id, Entidade, Nome, CNPJ, Telefone', { count: 'exact' })
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) {
          console.error('Erro ao verificar duplicatas no banco:', error)
          console.warn('Continuando sem verificação de duplicatas no banco de dados')
          break
        }

        if (data && data.length > 0) {
          clientesExistentes = [...clientesExistentes, ...data]

          console.log(`🔍 [CLIENTES] Carregados ${clientesExistentes.length} de ${count || '?'} clientes...`)

          // Se retornou menos que PAGE_SIZE, chegamos ao fim
          if (data.length < PAGE_SIZE) {
            hasMore = false
          } else {
            // Avançar para próxima página
            offset += PAGE_SIZE
          }
        } else {
          hasMore = false
        }
      }

      console.log('🔍 [CLIENTES] Total de clientes carregados do banco:', clientesExistentes.length);

      // Criar índices de busca rápida com mapeamento completo
      const clientesPorEntidade = new Map<string, typeof clientesExistentes[0]>();
      const clientesPorCNPJ = new Map<string, typeof clientesExistentes[0]>();
      const clientesPorNome = new Map<string, typeof clientesExistentes[0]>();

      clientesExistentes.forEach(cliente => {
        if (cliente.Entidade) {
          clientesPorEntidade.set(cliente.Entidade.toString().trim().toLowerCase(), cliente);
        }
        if (cliente.CNPJ) {
          const cnpjLimpo = cliente.CNPJ.toString().trim().replace(/\D/g, '');
          if (cnpjLimpo) clientesPorCNPJ.set(cnpjLimpo, cliente);
        }
        if (cliente.Nome) {
          clientesPorNome.set(cliente.Nome.toString().trim().toLowerCase(), cliente);
        }
      });

      console.log('📊 [CLIENTES] Índices criados:', {
        entidades: clientesPorEntidade.size,
        cnpjs: clientesPorCNPJ.size,
        nomes: clientesPorNome.size
      });

      // FASE 1: Agrupar todos os registros por cliente (incluindo duplicatas)
      const gruposPorCliente = new Map<string, {
        clienteExistente: typeof clientesExistentes[0] | null;
        registros: Array<{ registro: any; index: number }>;
        chaveIdentificacao: string;
      }>();

      // Agrupar todos os registros
      dadosTransformados.forEach((registro, index) => {
        let clienteExistente: typeof clientesExistentes[0] | null = null;
        let chaveIdentificacao = '';

        // Buscar cliente existente (prioridade: Entidade > CNPJ > Nome)
        if (registro.Entidade) {
          const entidadeStr = registro.Entidade.toString().trim().toLowerCase();
          clienteExistente = clientesPorEntidade.get(entidadeStr) || null;
          chaveIdentificacao = `entidade:${entidadeStr}`;
        }

        if (!clienteExistente && registro.CNPJ) {
          const cnpjLimpo = registro.CNPJ.toString().trim().replace(/\D/g, '');
          if (cnpjLimpo) {
            clienteExistente = clientesPorCNPJ.get(cnpjLimpo) || null;
            chaveIdentificacao = `cnpj:${cnpjLimpo}`;
          }
        }

        if (!clienteExistente && registro.Nome) {
          const nomeStr = registro.Nome.toString().trim().toLowerCase();
          clienteExistente = clientesPorNome.get(nomeStr) || null;
          chaveIdentificacao = `nome:${nomeStr}`;
        }

        // Adicionar ao grupo
        if (!gruposPorCliente.has(chaveIdentificacao)) {
          gruposPorCliente.set(chaveIdentificacao, {
            clienteExistente,
            registros: [],
            chaveIdentificacao
          });
        }

        gruposPorCliente.get(chaveIdentificacao)!.registros.push({ registro, index });
      });

      // FASE 2: Processar cada grupo e mesclar TODOS os telefones
      gruposPorCliente.forEach((grupo) => {
        const { clienteExistente, registros } = grupo;

        if (registros.length === 0) return;

        // Pegar o primeiro registro como base
        const primeiroRegistro = registros[0];

        // Se existe no banco - processar atualização
        if (clienteExistente) {
          // Coletar TODOS os telefones únicos do arquivo para este cliente
          let telefoneAcumulado = clienteExistente.Telefone || '';

          let temTelefoneNovo = false;

          registros.forEach(({ registro, index }) => {
            const telefoneNovo = registro.Telefone?.toString() || '';

            if (telefoneNovo && !telefonesSaoParecidos(telefoneAcumulado, telefoneNovo)) {
              telefoneAcumulado = mesclarTelefones(telefoneAcumulado, telefoneNovo);
              temTelefoneNovo = true;
            }

            // Marcar como duplicata
            duplicatas.push({
              linha: index + 1,
              motivo: temTelefoneNovo
                ? `Cliente já existe - atualização de telefone disponível`
                : `Cliente já existe no banco de dados`,
              registro
            });
          });

          // Se houve telefone novo, adicionar UMA ÚNICA atualização com TODOS os telefones
          if (temTelefoneNovo && clienteExistente.id) {
            console.log(`📞 [CLIENTES] Atualização disponível para cliente ${clienteExistente.Entidade}:`, {
              antigo: clienteExistente.Telefone,
              novoMesclado: telefoneAcumulado,
              quantidadeRegistrosAgrupados: registros.length
            });

            atualizacoes.push({
              id: clienteExistente.id,
              clienteNome: primeiroRegistro.registro.Nome?.toString() || 'Cliente',
              telefoneAntigo: clienteExistente.Telefone || '',
              telefoneNovo: telefoneAcumulado,
              registro: primeiroRegistro.registro
            });
          }
        }
        // Se é duplicata interna (múltiplas vezes no arquivo, mas não está no banco)
        else if (registros.length > 1) {
          // Mesclar telefones de todas as ocorrências
          let telefoneAcumulado = '';

          registros.forEach(({ registro, index }, idx) => {
            const telefoneNovo = registro.Telefone?.toString() || '';

            if (idx === 0) {
              telefoneAcumulado = telefoneNovo;
              // Primeiro mantém como válido (será importado)
            } else {
              // Demais são marcados como duplicata
              if (telefoneNovo && !telefonesSaoParecidos(telefoneAcumulado, telefoneNovo)) {
                telefoneAcumulado = mesclarTelefones(telefoneAcumulado, telefoneNovo);
              }

              duplicatas.push({
                linha: index + 1,
                motivo: `Cliente duplicado no arquivo - telefones mesclados no primeiro registro`,
                registro
              });
            }
          });

          // Atualizar o primeiro registro com todos os telefones mesclados
          registros[0].registro.Telefone = telefoneAcumulado;

          console.log(`📞 [CLIENTES] Mesclando ${registros.length} telefones internos para ${primeiroRegistro.registro.Nome}:`, {
            telefoneFinal: telefoneAcumulado
          });
        }
      });

      console.log('\n📊 [CLIENTES] RESUMO:');
      console.log(`   Total de registros: ${dadosTransformados.length}`);
      console.log(`   Grupos únicos de clientes: ${gruposPorCliente.size}`);
      console.log(`   Duplicatas encontradas: ${duplicatas.length}`);
      console.log(`   Atualizações disponíveis: ${atualizacoes.length}`);
    } catch (err) {
      console.error('Erro ao processar clientes:', err);
    }
  }

  else if (tabelaDestino === 'itens') {
    // Verifica duplicatas no BANCO DE DADOS e DENTRO DO ARQUIVO
    try {
      const codigos = dadosTransformados
        .map((d, index) => ({ codigo: d['Cód. Referência'], index }))
        .filter(item => item.codigo);

      if (codigos.length === 0) return { duplicatas, total: dadosTransformados.length };

      const codigosParaBuscar = [...new Set(codigos.map(item => String(item.codigo).trim()))];

      const codigosExistentes = new Set<string>();
      const TAMANHO_LOTE = 100;

      // Buscar em lotes no banco de dados
      for (let i = 0; i < codigosParaBuscar.length; i += TAMANHO_LOTE) {
        const lote = codigosParaBuscar.slice(i, Math.min(i + TAMANHO_LOTE, codigosParaBuscar.length));

        const { data: existentes, error } = await supabase
          .from('itens')
          .select('"Cód. Referência"')
          .in('"Cód. Referência"', lote);

        if (error) {
          console.error('Erro ao verificar duplicatas no banco (lote):', error);
        } else {
          existentes?.forEach((e: { 'Cód. Referência': string }) => {
            codigosExistentes.add(String(e['Cód. Referência']).trim());
          });
        }

        // Pequeno delay para não sobrecarregar
        if (i + TAMANHO_LOTE < codigosParaBuscar.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('🔍 [ITENS] Verificação de duplicatas:', {
        totalRegistros: dadosTransformados.length,
        codigosNoBanco: codigosExistentes.size
      });

      // Rastrear códigos já vistos no arquivo para detectar duplicatas internas
      const codigosNoArquivo = new Set<string>();

      // Marcar duplicatas (banco + internas do arquivo)
      dadosTransformados.forEach((registro, index) => {
        const codigo = registro['Cód. Referência'];
        if (!codigo) return;

        const codigoStr = String(codigo).trim();
        let motivoDuplicata = '';

        // Verificar se existe no banco
        if (codigosExistentes.has(codigoStr)) {
          motivoDuplicata = `Produto com código ${codigo} já existe no banco de dados`;
        }
        // Verificar se é duplicata INTERNA do arquivo
        else if (codigosNoArquivo.has(codigoStr)) {
          motivoDuplicata = `Produto com código ${codigo} duplicado dentro do arquivo (aparece mais de uma vez)`;
        }

        if (motivoDuplicata) {
          duplicatas.push({
            linha: index + 1,
            motivo: motivoDuplicata,
            registro
          });
        } else {
          // Adicionar ao rastreamento de códigos do arquivo
          codigosNoArquivo.add(codigoStr);
        }
      });

      console.log('📊 [ITENS] Resultado:', {
        duplicatasEncontradas: duplicatas.length,
        codigosUnicosNoArquivo: codigosNoArquivo.size
      });

    } catch (err) {
      console.error('Erro ao buscar duplicatas de itens:', err);
    }
  }

  return {
    duplicatas,
    atualizacoes: tabelaDestino === 'clientes' ? atualizacoes : undefined,
    total: dadosTransformados.length
  };
}

// Aplica atualizações de telefone para clientes existentes
export async function aplicarAtualizacoesTelefone(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atualizacoes: Array<{ id: number; clienteNome: string; telefoneAntigo: string; telefoneNovo: string; registro: any }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  onProgresso?: (progresso: number, mensagem: string) => void
): Promise<{
  sucesso: number;
  erros: Array<{ id: number; nome: string; erro: string }>;
}> {
  const erros: Array<{ id: number; nome: string; erro: string }> = [];
  let sucesso = 0;

  console.log(`\n🔄 [ATUALIZAÇÕES] Aplicando ${atualizacoes.length} atualizações de telefone...`);

  for (let i = 0; i < atualizacoes.length; i++) {
    const atualizacao = atualizacoes[i];
    const progresso = Math.round(((i + 1) / atualizacoes.length) * 100);

    if (onProgresso) {
      onProgresso(progresso, `Atualizando ${atualizacao.clienteNome}... (${i + 1}/${atualizacoes.length})`);
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ Telefone: atualizacao.telefoneNovo })
        .eq('id', atualizacao.id);

      if (error) {
        console.error(`❌ Erro ao atualizar telefone do cliente ${atualizacao.id}:`, error);
        erros.push({
          id: atualizacao.id,
          nome: atualizacao.clienteNome,
          erro: error.message
        });
      } else {
        console.log(`✅ Telefone atualizado para cliente ${atualizacao.clienteNome}`);
        sucesso++;
      }
    } catch (err) {
      erros.push({
        id: atualizacao.id,
        nome: atualizacao.clienteNome,
        erro: (err as Error).message
      });
    }
  }

  console.log(`\n✅ [ATUALIZAÇÕES] Concluído: ${sucesso} sucesso, ${erros.length} erros`);

  return { sucesso, erros };
}

// Importa dados em lotes para não sobrecarregar o banco
export async function importarDadosEmLotes(
  dados: Record<string, string | number | null>[],
  tabelaDestino: TabelaDestino,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  onProgresso?: (progresso: number, mensagem: string) => void
): Promise<{
  sucesso: number;
  erros: Array<{ linha: number; erro: string }>;
}> {
  const TAMANHO_LOTE = 100;
  const totalLotes = Math.ceil(dados.length / TAMANHO_LOTE);

  let sucesso = 0;
  const erros: Array<{ linha: number; erro: string }> = [];

  console.log(`\n🚀 [IMPORTACAO-INTELIGENTE] Iniciando importação de ${dados.length} registros em ${totalLotes} lotes`);

  for (let i = 0; i < totalLotes; i++) {
    const inicio = i * TAMANHO_LOTE;
    const fim = Math.min((i + 1) * TAMANHO_LOTE, dados.length);
    const lote = dados.slice(inicio, fim);

    console.log(`\n📦 [IMPORTACAO-INTELIGENTE] Processando lote ${i + 1}/${totalLotes} (${lote.length} registros)`);

    try {
      const { data: insertedData, error } = await supabase
        .from(tabelaDestino)
        .insert(lote)
        .select();

      if (error) {
        console.error(`❌ [IMPORTACAO-INTELIGENTE] Erro no lote ${i + 1}:`, error);
        console.error(`   Código do erro: ${error.code}`);
        console.error(`   Mensagem: ${error.message}`);
        console.error(`   Detalhes:`, error.details);
        console.error(`   Hint:`, error.hint);

        // Tentar inserir um por um para identificar qual registro específico está falhando
        console.log(`   🔍 Tentando inserir registros individualmente para identificar o problema...`);
        for (let j = 0; j < lote.length; j++) {
          const registro = lote[j];
          const linhaGlobal = inicio + j + 1;

          try {
            const { error: erroIndividual } = await supabase
              .from(tabelaDestino)
              .insert([registro])
              .select();

            if (erroIndividual) {
              console.error(`   ❌ Linha ${linhaGlobal} falhou:`, erroIndividual.message);
              console.error(`      Dados do registro:`, registro);
              erros.push({
                linha: linhaGlobal,
                erro: `${erroIndividual.code}: ${erroIndividual.message}`
              });
            } else {
              console.log(`   ✅ Linha ${linhaGlobal} inserida com sucesso`);
              sucesso++;
            }
          } catch (errIndividual) {
            const mensagemErro = errIndividual instanceof Error ? errIndividual.message : 'Erro desconhecido';
            console.error(`   ❌ Linha ${linhaGlobal} falhou (exceção):`, mensagemErro);
            console.error(`      Dados do registro:`, registro);
            erros.push({
              linha: linhaGlobal,
              erro: mensagemErro
            });
          }
        }
      } else {
        console.log(`✅ [IMPORTACAO-INTELIGENTE] Lote ${i + 1} inserido com sucesso (${lote.length} registros)`);
        console.log(`   Dados retornados pelo Supabase:`, insertedData);
        console.log(`   Quantidade de registros confirmados: ${insertedData?.length || 0}`);

        if (insertedData && insertedData.length !== lote.length) {
          console.warn(`⚠️ AVISO: Esperava inserir ${lote.length} registros, mas Supabase confirmou apenas ${insertedData.length}`);
        }

        sucesso += lote.length;
      }

      // Callback de progresso
      if (onProgresso) {
        const progresso = Math.round(((i + 1) / totalLotes) * 100);
        onProgresso(progresso, `Importando lote ${i + 1} de ${totalLotes}`);
      }

    } catch (err) {
      console.error(`❌ [IMPORTACAO-INTELIGENTE] Exceção no lote ${i + 1}:`, err);
      lote.forEach((_, index) => {
        erros.push({
          linha: inicio + index + 1,
          erro: err instanceof Error ? err.message : 'Erro desconhecido'
        });
      });
    }
  }

  console.log(`\n📊 [IMPORTACAO-INTELIGENTE] RESULTADO DA IMPORTAÇÃO:`);
  console.log(`   ✅ Sucesso: ${sucesso} registros`);
  console.log(`   ❌ Erros: ${erros.length} registros`);
  if (erros.length > 0) {
    console.log(`   Primeiros erros:`, erros.slice(0, 5));
  }

  return { sucesso, erros };
}