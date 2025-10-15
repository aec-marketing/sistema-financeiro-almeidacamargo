import Papa from 'papaparse';

// Tipos de dados suportados
export type TabelaDestino = 'vendas' | 'clientes' | 'itens';

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
  total: number;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const duplicatas: Array<{ linha: number; motivo: string; registro: any }> = [];

  if (tabelaDestino === 'vendas') {
    // Verifica duplicatas no BANCO DE DADOS
    const notasFiscais = dadosTransformados
      .map((d, index) => ({ nf: d['Número da Nota Fiscal'], index }))
      .filter(item => item.nf);

    if (notasFiscais.length > 0) {
      const nfsParaBuscar = [...new Set(notasFiscais.map(item => String(item.nf).trim()))]; // Remove duplicatas da busca

      try {
        const { data: existentes, error } = await supabase
          .from('vendas')
          .select('"Número da Nota Fiscal"')
          .in('"Número da Nota Fiscal"', nfsParaBuscar);

        if (error) {
          console.error('Erro ao verificar duplicatas no banco:', error);
          console.warn('Continuando sem verificação de duplicatas no banco de dados');
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nfsExistentes = new Set(existentes?.map((e: any) => String(e['Número da Nota Fiscal']).trim()) || []);

          notasFiscais.forEach(({ nf, index }) => {
            const nfStr = String(nf).trim();

            if (nfStr && nfsExistentes.has(nfStr)) {
              duplicatas.push({
                linha: index + 1,
                motivo: `NF ${nf} já existe no banco de dados`,
                registro: dadosTransformados[index]
              });
            }
          });
        }
      } catch (err) {
        console.error('Erro ao buscar duplicatas:', err);
      }
    }
  }

  else if (tabelaDestino === 'clientes') {
    // Verifica duplicatas no BANCO DE DADOS
    const cnpjs = dadosTransformados
      .map((d, index) => ({ cnpj: d.CNPJ, index }))
      .filter(item => item.cnpj);

    if (cnpjs.length > 0) {
      const cnpjsParaBuscar = [...new Set(cnpjs.map(item => String(item.cnpj).trim()))];

      try {
        const { data: existentes, error } = await supabase
          .from('clientes')
          .select('CNPJ')
          .in('CNPJ', cnpjsParaBuscar);

        if (error) {
          console.error('Erro ao verificar duplicatas no banco:', error);
          console.warn('Continuando sem verificação de duplicatas no banco de dados');
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cnpjsExistentes = new Set(existentes?.map((e: any) => String(e.CNPJ).trim()) || []);

          cnpjs.forEach(({ cnpj, index }) => {
            const cnpjStr = String(cnpj).trim();

            if (cnpjStr && cnpjsExistentes.has(cnpjStr)) {
              duplicatas.push({
                linha: index + 1,
                motivo: `CNPJ ${cnpj} já existe no banco de dados`,
                registro: dadosTransformados[index]
              });
            }
          });
        }
      } catch (err) {
        console.error('Erro ao buscar duplicatas:', err);
      }
    }
  }

  else if (tabelaDestino === 'itens') {
    // Verifica duplicatas no BANCO DE DADOS
    const codigos = dadosTransformados
      .map((d, index) => ({ codigo: d['Cód. Referência'], index }))
      .filter(item => item.codigo);

    if (codigos.length > 0) {
      const codigosParaBuscar = [...new Set(codigos.map(item => String(item.codigo).trim()))];

      try {
        const { data: existentes, error } = await supabase
          .from('itens')
          .select('"Cód. Referência"')
          .in('"Cód. Referência"', codigosParaBuscar);

        if (error) {
          console.error('Erro ao verificar duplicatas no banco:', error);
          console.warn('Continuando sem verificação de duplicatas no banco de dados');
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const codigosExistentes = new Set(existentes?.map((e: any) => String(e['Cód. Referência']).trim()) || []);

          codigos.forEach(({ codigo, index }) => {
            const codigoStr = String(codigo).trim();

            if (codigoStr && codigosExistentes.has(codigoStr)) {
              duplicatas.push({
                linha: index + 1,
                motivo: `Produto com código ${codigo} já existe no banco de dados`,
                registro: dadosTransformados[index]
              });
            }
          });
        }
      } catch (err) {
        console.error('Erro ao buscar duplicatas:', err);
      }
    }
  }

  return {
    duplicatas,
    total: duplicatas.length
  };
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
  
  for (let i = 0; i < totalLotes; i++) {
    const inicio = i * TAMANHO_LOTE;
    const fim = Math.min((i + 1) * TAMANHO_LOTE, dados.length);
    const lote = dados.slice(inicio, fim);
    
    try {
      const { error } = await supabase
        .from(tabelaDestino)
        .insert(lote);

      if (error) {
        lote.forEach((_, index) => {
          erros.push({
            linha: inicio + index + 1,
            erro: error.message
          });
        });
      } else {
        sucesso += lote.length;
      }
      
      // Callback de progresso
      if (onProgresso) {
        const progresso = Math.round(((i + 1) / totalLotes) * 100);
        onProgresso(progresso, `Importando lote ${i + 1} de ${totalLotes}`);
      }
      
    } catch (err) {
      lote.forEach((_, index) => {
        erros.push({
          linha: inicio + index + 1,
          erro: err instanceof Error ? err.message : 'Erro desconhecido'
        });
      });
    }
  }
  
  return { sucesso, erros };
}