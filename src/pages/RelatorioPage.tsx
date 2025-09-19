import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Search, Download, Save, BarChart3, Table, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { gerarRelatorioPDF } from '../utils/exportPDF';
import html2canvas from 'html2canvas'; // <-- Adicionar esta linha
interface RelatoriosPageProps {
  user: UserProfile;
}

// Interfaces corrigidas para os dados reais do Supabase
interface Cliente {
  id: number;
  Nome: string;
  Município: string;
  'Sigla Estado': string;
  CNPJ: string;
  Entidade: string;
}

interface Item {
  id: number;
  'Descr. Marca Produto': string;
  'Descr. Grupo Produto': string;
  'Desc. Subgrupo de Produto': string;
  'Cód. Referência': string;
  'Cód. do Produto': string;
  'Descr. Produto': string;
}

interface Venda {
  id: number;
  'Data de Emissao da NF': string;
  total: string;
  Quantidade: string;
  'Preço Unitário': string;
  MARCA: string;
  GRUPO: string;
  CIDADE: string;
  NomeCli: string;
  NomeRepr: string;
  cdCli: string;
  'Descr. Produto'?: string;
}
// Interfaces para gráficos (adicionar após as interfaces existentes)
interface SugestaoGrafico {
  id: string;
  titulo: string;
  descricao: string;
  campo: string;
  metrica: 'faturamento_total' | 'frequencia_vendas' | 'ticket_medio';
  tipoGrafico: 'rosca' | 'colunas' | 'linhas';
  cor: string;
  icone: string;
}

interface GraficoConfig {
  campoAgrupamento: string;
  metrica: 'faturamento_total' | 'frequencia_vendas' | 'ticket_medio';
  tipoGrafico: 'rosca' | 'colunas' | 'linhas';
  topN: 5 | 10;
  titulo: string;
  filtrosAplicados: Filtro[]; // Adicionar esta linha
}
// Tipos auxiliares para garantir type safety
type FilterConfig = {
  label: string;
  tipo: 'texto' | 'select' | 'numero' | 'data';
};

type TiposFiltroType = {
  clientes: Record<string, FilterConfig>;
  itens: Record<string, FilterConfig>;
  vendas: Record<string, FilterConfig>;
};

type DataRecordWithStringIndex = Record<string, unknown>;
type TabelaKey = 'clientes' | 'itens' | 'vendas';
type DataRecord = Cliente | Item | Venda;

// Configuração dos filtros com colunas reais do Supabase
const TIPOS_FILTRO: TiposFiltroType = {
  clientes: {
    "Nome": { label: "Nome do Cliente", tipo: "texto" },
    "Município": { label: "Cidade", tipo: "select" },
    "Sigla Estado": { label: "Estado", tipo: "select" },
    "CNPJ": { label: "CNPJ", tipo: "texto" }
  },
  itens: {
    "Descr. Marca Produto": { label: "Marca", tipo: "select" },
    "Descr. Grupo Produto": { label: "Categoria", tipo: "select" },
    "Desc. Subgrupo de Produto": { label: "Subcategoria", tipo: "select" },
    "Cód. Referência": { label: "Cód. Referência", tipo: "texto" },
    "Cód. do Produto": { label: "Código do Produto", tipo: "texto" },
    "Descr. Produto": { label: "Descrição do Produto", tipo: "texto" }
  },
  vendas: {
    "Data de Emissao da NF": { label: "Data da Venda", tipo: "data" },
    "total": { label: "Valor Total", tipo: "numero" },
    "Quantidade": { label: "Quantidade", tipo: "numero" },
    "Preço Unitário": { label: "Preço Unitário", tipo: "numero" },
    "MARCA": { label: "Marca", tipo: "select" },
    "GRUPO": { label: "Categoria", tipo: "select" },
    "CIDADE": { label: "Cidade", tipo: "select" },
    "NomeCli": { label: "Cliente", tipo: "texto" },
    "NomeRepr": { label: "Vendedor", tipo: "select" }
  }
};

// Operadores com linguagem casual
type OperadoresType = {
  texto: { value: string; label: string }[];
  select: { value: string; label: string }[];
  numero: { value: string; label: string }[];
  data: { value: string; label: string }[];
};

const OPERADORES: OperadoresType = {
  texto: [
    { value: "contem", label: "contém" },
    { value: "nao_contem", label: "não contém" },
    { value: "igual", label: "é exatamente" },
    { value: "diferente", label: "não é" }
  ],
  select: [
    { value: "igual", label: "é" },
    { value: "diferente", label: "não é" }
  ],
  numero: [
    { value: "maior", label: "maior que" },
    { value: "menor", label: "menor que" },
    { value: "igual", label: "igual a" },
    { value: "entre", label: "está entre" }
  ],
  data: [
    { value: "maior", label: "depois de" },
    { value: "menor", label: "antes de" },
    { value: "entre", label: "entre as datas" }
  ]
};

// Operadores lógicos com linguagem casual
const OPERADORES_LOGICOS = {
  "AND": { label: "E também", cor: "bg-green-100 text-green-800 border-green-300" },
  "OR": { label: "OU então", cor: "bg-blue-100 text-blue-800 border-blue-300" },
  "EXCEPT": { label: "Mas sem", cor: "bg-red-100 text-red-800 border-red-300" }
};

// Interface para filtros
interface Filtro {
  id: number;
  tabela: TabelaKey;
  campo: string;
  operador: string;
  valor: string;
  logica: keyof typeof OPERADORES_LOGICOS;
}

// Helper functions type-safe
const getFieldConfig = (tabela: TabelaKey, campo: string): FilterConfig | undefined => {
  return TIPOS_FILTRO[tabela]?.[campo];
};

const getFieldConfigSafe = (tabela: string, campo: string): FilterConfig => {
  const tabelaTyped = tabela as TabelaKey;
  const config = TIPOS_FILTRO[tabelaTyped]?.[campo];
  return config || { label: campo, tipo: 'texto' };
};

const getOperatorsForField = (tabela: string, campo: string) => {
  const config = getFieldConfigSafe(tabela, campo);
  return OPERADORES[config.tipo] || OPERADORES.texto;
};

export default function RelatoriosPage({ user }: RelatoriosPageProps) {
  // Estados principais
  const [filtros, setFiltros] = useState<Filtro[]>([]);
  const [novoFiltro, setNovoFiltro] = useState({
    tabela: '' as TabelaKey | '',
    campo: '',
    operador: '',
    valor: '',
    logica: 'AND' as keyof typeof OPERADORES_LOGICOS
  });
  const [visualizacao, setVisualizacao] = useState('tabela');
  const [nomeRelatorio, setNomeRelatorio] = useState('');
  const [filtroEditando, setFiltroEditando] = useState<Filtro | null>(null);
  
  // Estados dos dados
  const [dadosClientes, setDadosClientes] = useState<Cliente[]>([]);
  const [dadosItens, setDadosItens] = useState<Item[]>([]);
  const [dadosVendas, setDadosVendas] = useState<Venda[]>([]);
  const [dadosFiltrados, setDadosFiltrados] = useState<Venda[]>([]);
  
  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
// Estados para paginação
const [paginaAtual, setPaginaAtual] = useState(1);
const [itensPorPagina] = useState(50); // 50 itens por página
// Estados para gráficos
const [mostrarModalGrafico, setMostrarModalGrafico] = useState(false);
const [graficos, setGraficos] = useState<Array<{id: string, config: GraficoConfig, dados: any[]}>>([]);
const [proximoId, setProximoId] = useState(1);
// Estados para configurações avançadas
const [mostrarModalConfig, setMostrarModalConfig] = useState(false);
const [configTemporaria, setConfigTemporaria] = useState<GraficoConfig | null>(null);
const [processandoGrafico, setProcessandoGrafico] = useState(false);

// Debounce para otimizar performance
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Usar debounce nos filtros
const debouncedFiltros = useDebounce(filtros, 300);

// Função para converter valores brasileiros para número
const converterValor = useCallback((valor: string | number | null | undefined): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  
  // Remove símbolos de moeda e espaços, trata vírgula como decimal
  const valorLimpo = valor.toString()
    .replace(/[R$\s]/g, '') // Remove R$ e espaços
    .replace(/\./g, '') // Remove pontos de milhares
    .replace(',', '.'); // Converte vírgula para ponto decimal
  
  const resultado = parseFloat(valorLimpo) || 0;
  return resultado;
}, []);

  // Função para formatar moeda brasileira
  const formatarMoeda = useCallback((valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }, []);

  // Carregar dados iniciais do Supabase
  useEffect(() => {
const carregarDados = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('🔄 Iniciando carregamento com paginação...');

    // Helper function for paginated fetching
    const fetchWithPagination = async (table: string, columns: string, additionalFilters?: any) => {
      let allData: any[] = [];
      let start = 0;
      const limit = 1000; // Supabase's default limit per page
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from(table)
          .select(columns)
          .range(start, start + limit - 1);

        // Apply additional filters if provided
        if (additionalFilters) {
          Object.entries(additionalFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Erro ao buscar ${table}:`, error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          start += limit;
          
          // If we got less than the limit, we've reached the end
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ ${table} carregados:`, allData.length);
      return allData;
    };

    // Fetch all data with pagination in parallel
    const [clientes, itens, vendas] = await Promise.all([
      fetchWithPagination('clientes', `
        id,
        "Nome",
        "Município", 
        "Sigla Estado",
        "CNPJ",
        "Entidade"
      `),
      
      fetchWithPagination('itens', `
        id,
        "Descr. Marca Produto",
        "Descr. Grupo Produto", 
        "Desc. Subgrupo de Produto",
        "Cód. Referência",
        "Cód. do Produto",
        "Descr. Produto"
      `),
      
      fetchWithPagination('vendas', `
        id,
        "Data de Emissao da NF",
        total,
        Quantidade,
        "Preço Unitário",
        MARCA,
        GRUPO,
        CIDADE,
        NomeCli,
        NomeRepr,
        cdCli,
        "Descr. Produto",
        "Cód. Referência"
      `, 
      // Additional filters for vendas based on user role
      user.role === 'consultor_vendas' && user.cd_representante 
        ? { cdRepr: user.cd_representante } 
        : undefined
      )
    ]);

    // Enriquecer vendas com dados da tabela itens e clientes
    const vendasEnriquecidas = vendas.map(venda => {
      const itemCorrespondente = itens.find(item => 
        item["Cód. Referência"] === venda["Cód. Referência"]
      );
      
      const clienteCorrespondente = clientes.find(cliente =>
        cliente.Nome === venda.NomeCli
      );
      
      return {
        ...venda,
        // Usar marca do item se disponível, senão usar da venda
        MARCA: itemCorrespondente?.["Descr. Marca Produto"] || venda.MARCA || 'Marca não encontrada',
        GRUPO: itemCorrespondente?.["Descr. Grupo Produto"] || venda.GRUPO,
        "Descr. Produto": itemCorrespondente?.["Descr. Produto"] || venda["Descr. Produto"],
        // Usar cidade do cliente se disponível, senão usar da venda
        CIDADE: clienteCorrespondente?.Município || venda.CIDADE
      };
    });

    console.log('✅ Dados carregados com sucesso:', {
      clientes: clientes.length,
      itens: itens.length,
      vendas: vendas.length,
      vendasEnriquecidas: vendasEnriquecidas.length
    });

    // Definir estados
    setDadosClientes(clientes);
    setDadosItens(itens);
    setDadosVendas(vendasEnriquecidas);
    setDadosFiltrados(vendasEnriquecidas);

  } catch (err) {
    console.error('❌ Erro ao carregar dados:', err);
    setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados');
  } finally {
    setLoading(false);
  }
};

    carregarDados();
  }, [user]);

  // Função para obter valores únicos de um campo (para selects)
  const obterValoresUnicos = useCallback((tabela: TabelaKey, campo: string): string[] => {
    let dados: DataRecord[] = [];
    
    switch (tabela) {
      case 'clientes':
        dados = dadosClientes;
        break;
      case 'itens':
        dados = dadosItens;
        break;
      case 'vendas':
        dados = dadosVendas;
        break;
    }

    const valores = dados
      .map(item => {
        // Safe type assertion through unknown
        const record = item as unknown as DataRecordWithStringIndex;
        const value = record[campo];
        return value;
      })
      .filter(valor => valor != null && valor !== '')
      .map(valor => String(valor));

    // Remover duplicatas e ordenar
    return [...new Set(valores)].sort();
  }, [dadosClientes, dadosItens, dadosVendas]);

  // Função para aplicar um filtro específico nos dados
  const aplicarFiltro = useCallback((dados: DataRecord[], filtro: Filtro): DataRecord[] => {
    return dados.filter(item => {
      // Safe type assertion through unknown
      const record = item as unknown as DataRecordWithStringIndex;
      const valor = record[filtro.campo];
      const valorFiltro = filtro.valor;

      if (valor == null || valor === undefined) return false;

      switch (filtro.operador) {
        case 'contem':
          return String(valor).toLowerCase().includes(valorFiltro.toLowerCase());
        case 'nao_contem':
          return !String(valor).toLowerCase().includes(valorFiltro.toLowerCase());
        case 'igual':
          return String(valor) === valorFiltro;
        case 'diferente':
          return String(valor) !== valorFiltro;
        case 'maior':
          if (filtro.campo === 'total' || filtro.campo === 'Preço Unitário') {
            return converterValor(String(valor)) > parseFloat(valorFiltro);
          }
          return parseFloat(String(valor)) > parseFloat(valorFiltro);
        case 'menor':
          if (filtro.campo === 'total' || filtro.campo === 'Preço Unitário') {
            return converterValor(String(valor)) < parseFloat(valorFiltro);
          }
          return parseFloat(String(valor)) < parseFloat(valorFiltro);
        default:
          return true;
      }
    });
  }, [converterValor]);

  // Função principal para executar todos os filtros
  useEffect(() => {
    if (filtros.length === 0) {
      setDadosFiltrados(dadosVendas);
      return;
    }

    try {
      let resultadoClientes = [...dadosClientes];
      let resultadoItens = [...dadosItens];
      let resultadoVendas = [...dadosVendas];

      // Aplicar filtros por tabela com lógica AND/OR/EXCEPT
      filtros.forEach(filtro => {
        switch (filtro.tabela) {
          case 'clientes':
            if (filtro.logica === 'EXCEPT') {
              const dadosFiltrados = aplicarFiltro(resultadoClientes, filtro);
              resultadoClientes = resultadoClientes.filter(item => !dadosFiltrados.includes(item));
            } else {
              resultadoClientes = aplicarFiltro(resultadoClientes, filtro) as Cliente[];
            }
            break;
          case 'itens':
            if (filtro.logica === 'EXCEPT') {
              const dadosFiltrados = aplicarFiltro(resultadoItens, filtro);
              resultadoItens = resultadoItens.filter(item => !dadosFiltrados.includes(item));
            } else {
              resultadoItens = aplicarFiltro(resultadoItens, filtro) as Item[];
            }
            break;
          case 'vendas':
            if (filtro.logica === 'EXCEPT') {
              const dadosFiltrados = aplicarFiltro(resultadoVendas, filtro);
              resultadoVendas = resultadoVendas.filter(item => !dadosFiltrados.includes(item));
            } else {
              resultadoVendas = aplicarFiltro(resultadoVendas, filtro) as Venda[];
            }
            break;
        }
      });

      // Fazer join das tabelas filtradas
      const resultado = resultadoVendas.filter(venda => {
        // Verificar se cliente está nos resultados filtrados (por nome)
        const clienteExiste = resultadoClientes.some(cliente => 
          cliente.Nome === venda.NomeCli
        );
        
        // Como não temos relação direta produto-venda, usar MARCA/GRUPO para filtrar
        const produtoExiste = filtros.some(f => f.tabela === 'itens') ? 
          resultadoItens.some(item => 
            item['Descr. Marca Produto'] === venda.MARCA
          ) : true;

        return clienteExiste && produtoExiste;
      });

      setDadosFiltrados(resultado);
      
    } catch (err) {
      console.error('Erro ao aplicar filtros:', err);
      setDadosFiltrados(dadosVendas);
    }
}, [debouncedFiltros, dadosClientes, dadosItens, dadosVendas, aplicarFiltro, filtros]);
// Reset da paginação quando filtros ou dados mudarem
useEffect(() => {
  resetarPaginacao();
}, [filtros, dadosFiltrados]);
  // Métricas calculadas em tempo real
  const metricas = useMemo(() => {
    const dados = dadosFiltrados;
    const faturamentoTotal = dadosFiltrados.reduce((acc, venda) => {
  // Primeiro tenta usar o campo 'total', senão calcula
  const totalExistente = converterValor(venda.total);
  if (totalExistente > 0) {
    return acc + totalExistente;
  }
  
  // Calcula: preço × quantidade
  const preco = converterValor(venda["Preço Unitário"]);
  const qtd = converterValor(venda.Quantidade);
  const totalCalculado = preco * qtd;
  
  return acc + totalCalculado;
}, 0);
    
    return {
      totalVendas: dados.length,
      faturamentoTotal,
      ticketMedio: dados.length > 0 ? faturamentoTotal / dados.length : 0,
      clientesUnicos: new Set(dados.map(venda => venda.NomeCli)).size,
      quantidadeTotal: dados.reduce((sum, venda) => {
        return sum + parseInt(venda.Quantidade || '0');
      }, 0)
    };
  }, [dadosFiltrados, converterValor]);

  // Funções de controle dos filtros
  const adicionarFiltro = useCallback(() => {
    if (novoFiltro.tabela && novoFiltro.campo && novoFiltro.operador && novoFiltro.valor) {
      const filtro: Filtro = {
        ...novoFiltro,
        id: Date.now(),
        tabela: novoFiltro.tabela as TabelaKey
      };
      setFiltros(prev => [...prev, filtro]);
      setNovoFiltro({
        tabela: '',
        campo: '',
        operador: '',
        valor: '',
        logica: 'AND'
      });
    }
  }, [novoFiltro]);

  const removerFiltro = useCallback((id: number) => {
    setFiltros(prev => prev.filter(f => f.id !== id));
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros([]);
    setNovoFiltro({
      tabela: '',
      campo: '',
      operador: '',
      valor: '',
      logica: 'AND'
    });
  }, []);

  // Função para obter nome amigável das tabelas
  const getNomeTabela = useCallback((tabela: string) => {
    switch (tabela) {
      case 'clientes': return 'Clientes';
      case 'itens': return 'Produtos';
      case 'vendas': return 'Vendas';
      default: return tabela;
    }
  }, []);
// Função para gerar sugestões inteligentes baseadas no contexto
const gerarSugestoes = useCallback((): SugestaoGrafico[] => {
  // CORREÇÃO: Só considerar campos com filtros INCLUSIVOS (AND/OR), não EXCLUSIVOS (EXCEPT)
  const camposComFiltrosInclusivos = filtros
    .filter(f => f.logica === 'AND' || f.logica === 'OR')
    .map(f => f.campo);
  const sugestoesBase: SugestaoGrafico[] = [
    {
      id: 'vendedor',
      titulo: 'Faturamento por Vendedor',
      descricao: 'Ranking dos vendedores que mais geraram receita',
      campo: 'NomeRepr',
      metrica: 'faturamento_total',
      tipoGrafico: 'colunas',
      cor: 'text-green-600',
      icone: '👤'
    },
    {
      id: 'marca',
      titulo: 'Vendas por Marca',
      descricao: 'Distribuição de vendas entre as marcas',
      campo: 'MARCA',
      metrica: 'frequencia_vendas',
      tipoGrafico: 'rosca',
      cor: 'text-blue-600',
      icone: '🏢'
    },
    {
      id: 'cidade',
      titulo: 'Performance por Cidade',
      descricao: 'Análise geográfica das vendas',
      campo: 'CIDADE',
      metrica: 'faturamento_total',
      tipoGrafico: 'colunas',
      cor: 'text-purple-600',
      icone: '📍'
    },
    {
      id: 'cliente',
      titulo: 'Top Clientes',
      descricao: 'Principais clientes por faturamento',
      campo: 'NomeCli',
      metrica: 'faturamento_total',
      tipoGrafico: 'colunas',
      cor: 'text-orange-600',
      icone: '🏬'
    },
    {
      id: 'grupo',
      titulo: 'Categoria de Produtos',
      descricao: 'Vendas por categoria de produto',
      campo: 'GRUPO',
      metrica: 'frequencia_vendas',
      tipoGrafico: 'rosca',
      cor: 'text-indigo-600',
      icone: '📦'
    }
  ];

// Aplicar exclusões inteligentes
const sugestoesFiltradas = sugestoesBase.filter(sugestao => {
  // Se já filtrou por este campo com filtro INCLUSIVO, não sugerir
  if (camposComFiltrosInclusivos.includes(sugestao.campo)) {
    return false;
  }
  

// Mapeamento de campos para verificação de filtros
const fieldMapping: Record<string, Array<{tabela: string, campo: string}>> = {
  'CIDADE': [
    { tabela: 'clientes', campo: 'Município' },
    { tabela: 'vendas', campo: 'CIDADE' }
  ],
  'MARCA': [
    { tabela: 'itens', campo: 'Descr. Marca Produto' },
    { tabela: 'vendas', campo: 'MARCA' }
  ],
  'NomeRepr': [
    { tabela: 'vendas', campo: 'NomeRepr' }
  ],
  'NomeCli': [
    { tabela: 'clientes', campo: 'Nome' },
    { tabela: 'vendas', campo: 'NomeCli' }
  ],
  'GRUPO': [
    { tabela: 'itens', campo: 'Descr. Grupo Produto' },
    { tabela: 'vendas', campo: 'GRUPO' }
  ]
};

// Função para verificar se há filtros inclusivos (AND/OR) em um campo
const temFiltroInclusivo = (campoSugestao: string): boolean => {
  const camposRelacionados = fieldMapping[campoSugestao] || [];

  return filtros.some(filtro => {
    // Filtros inclusivos são AND e OR (não EXCEPT)
    const ehInclusivo = filtro.logica === 'AND' || filtro.logica === 'OR';

    // Verificar se o filtro se aplica a algum dos campos relacionados
    const campoRelacionado = camposRelacionados.some(campo =>
      filtro.tabela === campo.tabela && filtro.campo === campo.campo
    );

    return ehInclusivo && campoRelacionado;
  });
};

// Função para verificar se há apenas filtros exclusivos (EXCEPT) em um campo

if (temFiltroInclusivo(sugestao.campo)) {
  return false;
}

// Se chegou aqui, o campo não tem filtros inclusivos
// Mesmo com filtros exclusivos, ainda vale a pena mostrar o gráfico
  return true;
});

  return sugestoesFiltradas.slice(0, 4); // Máximo 4 sugestões
}, [filtros]);

// Função para processar dados para gráficos
// Função para processar dados para gráficos
const processarDadosGrafico = useCallback((config: GraficoConfig) => {
  // Validação de dados mínimos
  if (dadosFiltrados.length < 2) {
    console.log('Poucos dados para gerar gráfico:', dadosFiltrados.length);
    return [];
  }

  const dados = dadosFiltrados.reduce((acc, venda) => {
    const chave = venda[config.campoAgrupamento as keyof Venda] || 'Não informado';
    
    if (!acc[chave]) {
      acc[chave] = {
        nome: chave,
        faturamento_total: 0,
        frequencia_vendas: 0,
        ticket_medio: 0,
        valores: []
      };
    }
    
    // Calcular valor da venda
    const valorVenda = converterValor(venda.total) > 0 
      ? converterValor(venda.total)
      : converterValor(venda["Preço Unitário"]) * converterValor(venda.Quantidade);
    
    acc[chave].faturamento_total += valorVenda;
    acc[chave].frequencia_vendas += 1;
    acc[chave].valores.push(valorVenda);
    
    return acc;
  }, {} as Record<string, any>);
  
  // Calcular ticket médio
  Object.keys(dados).forEach(chave => {
    const item = dados[chave];
    item.ticket_medio = item.frequencia_vendas > 0 ? item.faturamento_total / item.frequencia_vendas : 0;
  });
  
  // Converter para array e ordenar
  const dadosArray = Object.values(dados)
    .sort((a: any, b: any) => b[config.metrica] - a[config.metrica])
    .slice(0, config.topN);
    
  return dadosArray;
}, [dadosFiltrados, converterValor]);

// Função para capturar gráficos no contexto atual (versão com referências estáveis)
const capturarGraficosLocal = useCallback(async (): Promise<Array<{imagem: string, titulo: string, aspectRatio: number}>> => {
  const imagensCapturadas: Array<{imagem: string, titulo: string, aspectRatio: number}> = [];

  console.log('=== CAPTURA COM REFERÊNCIAS ESTÁVEIS ===');

  // PRIMEIRO: Capturar TODAS as referências antes de iniciar qualquer processo
  const containers = document.querySelectorAll('[data-grafico-id]');
  console.log(`Containers encontrados: ${containers.length}`);

  // Criar array de referências estáveis ANTES de começar a capturar
  const graficosParaCapturar: Array<{
    elemento: HTMLElement;
    id: string;
    config: any;
    rect: DOMRect;
  }> = [];

  containers.forEach((container) => {
    const elemento = container as HTMLElement;
    const graficoId = elemento.getAttribute('data-grafico-id');
    const graficoConfig = graficos.find(g => g.id === graficoId);
    const rect = elemento.getBoundingClientRect();

    if (graficoConfig && rect.width > 0 && rect.height > 0) {
      graficosParaCapturar.push({
        elemento,
        id: graficoId!,
        config: graficoConfig,
        rect
      });

      console.log(`Referência capturada: ${graficoId} (${rect.width}x${rect.height})`);
    } else {
      console.warn(`Gráfico ignorado: ${graficoId} - sem config ou dimensões inválidas`);
    }
  });

  console.log(`Total de gráficos válidos para captura: ${graficosParaCapturar.length}`);

  // SEGUNDO: Processar cada gráfico usando as referências estáveis
  for (let i = 0; i < graficosParaCapturar.length; i++) {
    const { elemento, id, config, rect } = graficosParaCapturar[i];

    // Aguardar entre capturas
    if (i > 0) {
      console.log(`Aguardando antes de capturar gráfico ${i + 1}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      console.log(`Capturando gráfico ${id} (${i + 1}/${graficosParaCapturar.length})...`);

      // Verificar se o elemento ainda existe e tem dimensões válidas
      const rectAtual = elemento.getBoundingClientRect();
      console.log(`Dimensões atuais de ${id}: ${rectAtual.width}x${rectAtual.height}`);

      if (rectAtual.width === 0 || rectAtual.height === 0) {
        console.warn(`Elemento ${id} perdeu dimensões, tentando restaurar...`);
        console.log(`Dimensões originais: ${rect.width}x${rect.height}`);
        console.log(`Estado atual do elemento:`, {
          display: elemento.style.display,
          visibility: elemento.style.visibility,
          opacity: elemento.style.opacity,
          classList: elemento.classList.toString(),
          parentElement: elemento.parentElement?.tagName
        });

        // Método 1: Forçar re-rendering
        elemento.style.display = 'none';
        await new Promise(resolve => requestAnimationFrame(resolve));
        elemento.style.display = '';
        await new Promise(resolve => setTimeout(resolve, 500));

        let rectRestaurado = elemento.getBoundingClientRect();
        console.log(`Após método 1: ${rectRestaurado.width}x${rectRestaurado.height}`);

        // Método 2: Restaurar dimensões explicitamente se ainda zero
        if (rectRestaurado.width === 0 || rectRestaurado.height === 0) {
          console.log(`Tentando método 2 - forçar dimensões...`);

          // Salvar estilos originais
          const estilosOriginais = {
            width: elemento.style.width,
            height: elemento.style.height,
            minWidth: elemento.style.minWidth,
            minHeight: elemento.style.minHeight
          };

          // Forçar dimensões baseadas na referência original
          elemento.style.width = rect.width + 'px';
          elemento.style.height = rect.height + 'px';
          elemento.style.minWidth = rect.width + 'px';
          elemento.style.minHeight = rect.height + 'px';

          await new Promise(resolve => setTimeout(resolve, 800));
          rectRestaurado = elemento.getBoundingClientRect();
          console.log(`Após método 2: ${rectRestaurado.width}x${rectRestaurado.height}`);

          // Método 3: Verificar e restaurar container pai
          if (rectRestaurado.width === 0 || rectRestaurado.height === 0) {
            console.log(`Tentando método 3 - verificar container pai...`);

            const containerPai = elemento.closest('[data-grafico-id]')?.parentElement;
            if (containerPai) {
              const rectPai = containerPai.getBoundingClientRect();
              console.log(`Dimensões do container pai: ${rectPai.width}x${rectPai.height}`);

              if (rectPai.width > 0 && rectPai.height > 0) {
                containerPai.style.display = 'none';
                await new Promise(resolve => requestAnimationFrame(resolve));
                containerPai.style.display = '';
                await new Promise(resolve => setTimeout(resolve, 500));

                rectRestaurado = elemento.getBoundingClientRect();
                console.log(`Após método 3: ${rectRestaurado.width}x${rectRestaurado.height}`);
              }
            }
          }

          // Se ainda não funcionou, usar dimensões originais como fallback
          if (rectRestaurado.width === 0 || rectRestaurado.height === 0) {
            console.warn(`Usando dimensões originais como fallback para ${id}`);
            // Não fazer continue, tentar capturar mesmo assim usando rect original
            rectRestaurado = rect;
          }

          // Restaurar estilos originais após tentativa
          Object.assign(elemento.style, estilosOriginais);
        }

        if (rectRestaurado.width === 0 || rectRestaurado.height === 0) {
          console.error(`Não foi possível restaurar dimensões de ${id}, tentando captura de emergência...`);
          // Não fazer continue aqui - ir direto para método de emergência
          throw new Error(`Dimensões inválidas: ${rectRestaurado.width}x${rectRestaurado.height}`);
        }
      }

      // Verificar se precisamos capturar um container maior que inclua a legenda
      let elementoParaCapturar = elemento;
      let rectParaCapturar = rect;

      // Para gráficos de rosca, verificar se há legenda lateral
      const isGraficoRosca = elemento.querySelector('.recharts-pie-chart') ||
                             elemento.innerHTML.includes('PieChart') ||
                             config.config.tipoGrafico === 'rosca';

      if (isGraficoRosca) {
        // Tentar encontrar o container pai que inclui tanto o gráfico quanto a legenda
        const containerComLegenda = elemento.closest('.bg-white.rounded-lg.border') as HTMLElement;
        if (containerComLegenda) {
          const rectCompleto = containerComLegenda.getBoundingClientRect();
          if (rectCompleto.width > rect.width) {
            console.log(`📊 Detectado gráfico de rosca com legenda - capturando container completo`);
            console.log(`Dimensões expandidas: ${rectCompleto.width}x${rectCompleto.height} (era ${rect.width}x${rect.height})`);
            elementoParaCapturar = containerComLegenda;
            rectParaCapturar = rectCompleto;
          }
        }
      }

      // Capturar com configurações otimizadas
      const canvas = await html2canvas(elementoParaCapturar, {
        background: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        // Usar dimensões fixas baseadas na referência (original ou expandida)
        width: Math.floor(rectParaCapturar.width),
        height: Math.floor(rectParaCapturar.height)
      });

      imagensCapturadas.push({
        imagem: canvas.toDataURL('image/png'),
        titulo: config.config.titulo,
        aspectRatio: canvas.width / canvas.height
      });

      console.log(`✅ Gráfico ${id} capturado: ${canvas.width}x${canvas.height}`);

    } catch (error) {
      console.error(`❌ Erro ao capturar gráfico ${id}:`, error);

      // Método de emergência: clonar elemento
      try {
        console.log(`Tentando captura de emergência para ${id}...`);

        // Verificar se é gráfico de rosca para capturar com legenda no método de emergência
        const isGraficoRosca = elemento.querySelector('.recharts-pie-chart') ||
                               elemento.innerHTML.includes('PieChart') ||
                               config.config.tipoGrafico === 'rosca';

        let elementoEmergencia = elemento;
        let dimensoesEmergencia = rect;

        if (isGraficoRosca) {
          const containerComLegenda = elemento.closest('.bg-white.rounded-lg.border') as HTMLElement;
          if (containerComLegenda) {
            const rectCompleto = containerComLegenda.getBoundingClientRect();
            if (rectCompleto.width > rect.width) {
              console.log(`🔄 Emergência: capturando gráfico de rosca com legenda`);
              elementoEmergencia = containerComLegenda;
              dimensoesEmergencia = rectCompleto;
            }
          }
        }

        // Criar um container isolado
        const containerEmergencia = document.createElement('div');
        containerEmergencia.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: ${dimensoesEmergencia.width}px;
          height: ${dimensoesEmergencia.height}px;
          background: white;
          overflow: hidden;
        `;

        // Clonar o elemento completo (incluindo legenda se aplicável)
        const cloneCompleto = elementoEmergencia.cloneNode(true) as HTMLElement;
        cloneCompleto.style.width = dimensoesEmergencia.width + 'px';
        cloneCompleto.style.height = dimensoesEmergencia.height + 'px';

        containerEmergencia.appendChild(cloneCompleto);
        document.body.appendChild(containerEmergencia);

        await new Promise(resolve => setTimeout(resolve, 500));

        const canvasEmergencia = await html2canvas(containerEmergencia, {
          background: '#ffffff',
          logging: false
        });

        document.body.removeChild(containerEmergencia);

        imagensCapturadas.push({
          imagem: canvasEmergencia.toDataURL('image/png'),
          titulo: config.config.titulo,
          aspectRatio: canvasEmergencia.width / canvasEmergencia.height
        });

        console.log(`🔄 Gráfico ${id} capturado via método de emergência`);

      } catch (emergencyError) {
        console.error(`❌ Método de emergência falhou para ${id}:`, emergencyError);
      }
    }
  }

  console.log(`📊 Resultado final: ${imagensCapturadas.length}/${graficosParaCapturar.length} gráficos capturados`);
  return imagensCapturadas;
}, [graficos]);

  // Função para exportar dados (placeholder)
const exportarDados = useCallback(async () => {
  try {
    setLoading(true);
    console.log('=== NOVA ABORDAGEM - CAPTURA LOCAL ===');

    // 1. Garantir que estamos na visualização de gráficos
    if (visualizacao !== 'graficos') {
      console.log('Mudando para visualização de gráficos...');
      setVisualizacao('graficos');
      
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 1000);
          });
        });
      });
    }

    // 2. Capturar gráficos PRIMEIRO (usando nossa função que funciona)
    let graficosCapturados: Array<{imagem: string, titulo: string, aspectRatio: number}> = [];
    
    if (graficos.length > 0) {
      console.log('Iniciando captura local de gráficos...');
      graficosCapturados = await capturarGraficosLocal();
      console.log(`Capturados localmente: ${graficosCapturados.length} gráficos`);
    }

    // 3. Gerar PDF com gráficos já capturados
    await gerarRelatorioPDF({
      nomeRelatorio,
      filtros,
      metricas,
      dadosFiltrados,
      limitePaginacao: 1000,
      graficos: graficos.map(g => ({ id: g.id, config: { titulo: g.config.titulo } })),
      graficosCapturados // NOVA propriedade com imagens prontas
    });

    alert('PDF gerado com sucesso! O download iniciou automaticamente.');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF. Tente novamente.');
  } finally {
    setLoading(false);
  }
}, [nomeRelatorio, filtros, metricas, dadosFiltrados, graficos, visualizacao, capturarGraficosLocal]);

// Memoizar dados pesados
const dadosProcessados = useMemo(() => {
  return {
    clientesCount: dadosClientes.length,
    itensCount: dadosItens.length,
    vendasCount: dadosVendas.length,
    ultimaAtualizacao: new Date().toLocaleString('pt-BR')
  };
}, [dadosClientes.length, dadosItens.length, dadosVendas.length]);

  // Função para salvar relatório (placeholder)
  const salvarRelatorio = useCallback(() => {
    const relatorio = {
      nome: nomeRelatorio || 'Relatório sem nome',
      filtros,
      metricas,
      dataCriacao: new Date().toLocaleString('pt-BR')
    };

    console.log('💾 Salvando relatório...', relatorio);
    alert('Funcionalidade de salvar relatórios será implementada na próxima versão!');
  }, [nomeRelatorio, filtros, metricas]);


// Cálculos de paginação
const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina);
const indiceInicio = (paginaAtual - 1) * itensPorPagina;
const indiceFim = indiceInicio + itensPorPagina;
const dadosPaginados = dadosFiltrados.slice(indiceInicio, indiceFim);

// Funções de navegação da paginação
const irParaPagina = (pagina: number) => {
  setPaginaAtual(Math.max(1, Math.min(pagina, totalPaginas)));
};

const resetarPaginacao = () => {
  setPaginaAtual(1);
};
  
  // Estados de loading e erro
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando dados para relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
        <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios Personalizados</h1>
            <p className="text-gray-600">Crie consultas flexíveis com filtros inteligentes</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={limparFiltros}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar Tudo
            </button>
            <button 
              onClick={salvarRelatorio}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar Relatório
            </button>
            <button 
  onClick={exportarDados}
  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
>
  <Download className="w-4 h-4" />
  Gerar PDF
</button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Dê um nome para este relatório..."
          value={nomeRelatorio}
          onChange={(e) => setNomeRelatorio(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Query Builder */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros do Relatório
        </h2>

        {/* Filtros Existentes */}
        {filtros.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Mostrando dados onde:
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {filtros.map((filtro, index) => (
                <div key={filtro.id} className="flex items-center gap-1">
                  {index > 0 && (
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${OPERADORES_LOGICOS[filtro.logica].cor}`}>
                      {OPERADORES_LOGICOS[filtro.logica].label}
                    </span>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-sm">
                      <span className="font-medium text-blue-600">{getNomeTabela(filtro.tabela)}</span>
                      <span className="mx-1 text-gray-500">→</span>
                      <span className="font-medium">{getFieldConfigSafe(filtro.tabela, filtro.campo).label}</span>
                      <span className="mx-1 text-gray-600 italic">
                        {getOperatorsForField(filtro.tabela, filtro.campo).find((op: { value: string; label: string }) => op.value === filtro.operador)?.label}
                      </span>
                      <span className="font-bold text-purple-600">"{filtro.valor}"</span>
                    </span>
                    <button
                      onClick={() => setFiltroEditando(filtro)}
                      className="text-blue-500 hover:text-blue-700 ml-2"
                      title="Editar filtro"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removerFiltro(filtro.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar Novo Filtro */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
          {filtros.length > 0 && (
            <select
              value={novoFiltro.logica}
              onChange={(e) => setNovoFiltro({...novoFiltro, logica: e.target.value as keyof typeof OPERADORES_LOGICOS})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="AND">E também</option>
              <option value="OR">OU então</option>
              <option value="EXCEPT">Mas sem</option>
            </select>
          )}

          <select
            value={novoFiltro.tabela}
            onChange={(e) => setNovoFiltro({...novoFiltro, tabela: e.target.value as TabelaKey, campo: '', operador: '', valor: ''})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Escolha os dados...</option>
            <option value="clientes">Clientes</option>
            <option value="itens">Produtos</option>
            <option value="vendas">Vendas</option>
          </select>

          <select
            value={novoFiltro.campo}
            onChange={(e) => setNovoFiltro({...novoFiltro, campo: e.target.value, operador: '', valor: ''})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={!novoFiltro.tabela}
          >
            <option value="">Qual informação?</option>
            {novoFiltro.tabela && Object.entries(TIPOS_FILTRO[novoFiltro.tabela]).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={novoFiltro.operador}
            onChange={(e) => setNovoFiltro({...novoFiltro, operador: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={!novoFiltro.campo}
          >
            <option value="">Como filtrar?</option>
            {novoFiltro.campo && novoFiltro.tabela && 
              getOperatorsForField(novoFiltro.tabela, novoFiltro.campo).map((op: { value: string; label: string }) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))
            }
          </select>

          {/* Campo de valor dinâmico */}
          {novoFiltro.tabela && novoFiltro.campo && 
            getFieldConfigSafe(novoFiltro.tabela, novoFiltro.campo).tipo === 'select' ? (
            <select
              value={novoFiltro.valor}
              onChange={(e) => setNovoFiltro({...novoFiltro, valor: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={!novoFiltro.operador}
            >
              <option value="">Qual valor?</option>
              {obterValoresUnicos(novoFiltro.tabela, novoFiltro.campo).map(valor => (
                <option key={valor} value={valor}>{valor}</option>
              ))}
            </select>
          ) : (
            <input
              type={novoFiltro.tabela && novoFiltro.campo && getFieldConfig(novoFiltro.tabela, novoFiltro.campo)?.tipo === 'numero' ? 'number' : 'text'}
              placeholder="Digite o valor..."
              value={novoFiltro.valor}
              onChange={(e) => setNovoFiltro({...novoFiltro, valor: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={!novoFiltro.operador}
            />
          )}

          <button
            onClick={adicionarFiltro}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!novoFiltro.tabela || !novoFiltro.campo || !novoFiltro.operador || !novoFiltro.valor}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-600">Vendas Encontradas</h3>
          <p className="text-2xl font-bold text-blue-600">{metricas.totalVendas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-600">Faturamento Total</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatarMoeda(metricas.faturamentoTotal)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-600">Valor Médio</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatarMoeda(metricas.ticketMedio)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-600">Clientes Únicos</h3>
          <p className="text-2xl font-bold text-orange-600">{metricas.clientesUnicos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm text-gray-600">Quantidade Total</h3>
          <p className="text-2xl font-bold text-cyan-600">{metricas.quantidadeTotal}</p>
        </div>

      </div>

      {/* Resultado */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Resultados da Consulta 
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {dadosFiltrados.length} vendas
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setVisualizacao('tabela')}
              className={`p-2 rounded transition-colors ${visualizacao === 'tabela' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Ver como tabela"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
  onClick={() => setVisualizacao('graficos')}
  className={`p-2 rounded transition-colors ${visualizacao === 'graficos' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
  title="Ver como gráfico"
>
  <BarChart3 className="w-4 h-4" />
</button>
          </div>
        </div>

        {dadosFiltrados.length === 0 ? (
  <div className="text-center py-12 text-gray-500">
    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
    <p className="text-lg font-medium mb-2">Nenhuma venda encontrada</p>
    <p className="text-sm">Tente ajustar os filtros ou remover algumas condições.</p>
  </div>
) : visualizacao === 'tabela' ? (
  /* Toda a seção da tabela existente fica aqui */
  <div className="overflow-x-auto">
    <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Produto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Marca</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cidade</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Qtd</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Valor Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Vendedor</th>
                </tr>
              </thead>
              <tbody>
                {dadosPaginados.map((venda) => (
                  <tr key={venda.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{venda['Data de Emissao da NF']}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{venda.NomeCli}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs" title={venda['Descr. Produto'] || 'N/A'}>
                      {venda['Descr. Produto'] || 'Produto não especificado'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{venda.MARCA}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{venda.CIDADE}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{venda.Quantidade}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
  {formatarMoeda(
    converterValor(venda["Preço Unitário"]) * parseInt(venda.Quantidade || '1')
  )}
</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{venda.NomeRepr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
   {/* Sistema de Paginação permanece igual */}
  </div>
) : (
  /* Nova seção de gráficos */
  <div className="space-y-6">
    {graficos.length === 0 ? (
      <div className="text-center py-12">
        <button
          onClick={() => setMostrarModalGrafico(true)}
          className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
        >
          <BarChart3 className="w-6 h-6" />
          Adicionar Primeiro Gráfico
        </button>
        <p className="text-gray-500 mt-4">
          Clique para escolher como visualizar seus dados em gráficos
        </p>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Botão para adicionar mais gráficos */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Gráficos Ativos ({graficos.length})
          </h3>
          <button
            onClick={() => setMostrarModalGrafico(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Gráfico
          </button>
        </div>

        {/* Lista de gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {graficos.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border" data-grafico-id={item.id}>
              {/* Cabeçalho do gráfico */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
  <h4 className="font-semibold text-gray-900">{item.config.titulo}</h4>
  <p className="text-sm text-gray-600">
    Top {item.config.topN} • {item.config.metrica.replace('_', ' ')}
  </p>
  {item.config.filtrosAplicados.length > 0 && (
    <p className="text-xs text-blue-600 mt-1">
      Filtros aplicados: {item.config.filtrosAplicados.map(f => `${getFieldConfigSafe(f.tabela, f.campo).label}="${f.valor}"`).join(', ')}
    </p>
  )}
  {item.config.filtrosAplicados.length === 0 && (
    <p className="text-xs text-gray-500 mt-1">Todos os dados</p>
  )}
</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfigTemporaria({...item.config});
                      setMostrarModalConfig(true);
                      // Armazenar ID do gráfico sendo editado
                      (window as any).graficoEditandoId = item.id;
                    }}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => {
                      setGraficos(prev => prev.filter(g => g.id !== item.id));
                    }}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Renderização do gráfico */}
              <div className="p-4">
  {item.config.tipoGrafico === 'rosca' ? (
    <div className="flex">
      {/* Gráfico */}
      <div style={{ width: '60%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={item.dados}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={100}
              paddingAngle={3}
              dataKey={item.config.metrica}
              nameKey="nome"
            >
              {item.dados.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const valor = payload[0].value as number;
                  const nome = data.nome;
                  
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{nome}</p>
                      
                      {item.config.metrica === 'faturamento_total' && (
                        <div className="space-y-1">
                          <p className="text-sm text-green-600 font-medium">
                            Faturamento: {formatarMoeda(valor)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {data.frequencia_vendas} vendas realizadas
                          </p>
                          <p className="text-sm text-gray-600">
                            Ticket médio: {formatarMoeda(data.ticket_medio)}
                          </p>
                        </div>
                      )}
                      
                      {item.config.metrica === 'frequencia_vendas' && (
                        <div className="space-y-1">
                          <p className="text-sm text-blue-600 font-medium">
                            {valor} vendas realizadas
                          </p>
                          <p className="text-sm text-gray-600">
                            Faturamento total: {formatarMoeda(data.faturamento_total)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Ticket médio: {formatarMoeda(data.ticket_medio)}
                          </p>
                        </div>
                      )}
                      
                      {item.config.metrica === 'ticket_medio' && (
                        <div className="space-y-1">
                          <p className="text-sm text-purple-600 font-medium">
                            Ticket médio: {formatarMoeda(valor)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {data.frequencia_vendas} vendas
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: {formatarMoeda(data.faturamento_total)}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Representa {((valor / item.dados.reduce((sum, d) => sum + d[item.config.metrica], 0)) * 100).toFixed(1)}% do total
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legenda lateral */}
      <div style={{ width: '40%' }} className="pl-4">
        <h5 className="text-sm font-medium text-gray-900 mb-3">Legenda</h5>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {item.dados.map((entrada, index) => {
            const total = item.dados.reduce((sum, d) => sum + d[item.config.metrica], 0);
            const percentual = ((entrada[item.config.metrica] / total) * 100);
            
            return (
              <div key={index} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: `hsl(${index * 45}, 70%, 60%)` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium" title={entrada.nome}>
                    {entrada.nome}
                  </div>
                  <div className="text-gray-500">
                    {item.config.metrica.includes('faturamento') || item.config.metrica.includes('ticket') 
                      ? formatarMoeda(entrada[item.config.metrica])
                      : entrada[item.config.metrica].toLocaleString('pt-BR')
                    } ({percentual.toFixed(1)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : (
    /* Gráfico de barras permanece igual */
    <div style={{ height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={item.dados} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="nome"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tickFormatter={(nome) => {
              if (nome.length > 12) {
                const primeiroNome = nome.split(' ')[0];
                return primeiroNome.length > 10 ? `${primeiroNome.substring(0, 10)}...` : primeiroNome;
              }
              return nome;
            }}
          />
          <YAxis 
            width={80}
            tickFormatter={(value) => {
              if (item.config.metrica.includes('faturamento') || item.config.metrica.includes('ticket')) {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return `${value.toFixed(0)}`;
              }
              return value.toString();
            }}
          />
          <Tooltip 
            formatter={(value: number) => [
              item.config.metrica.includes('faturamento') || item.config.metrica.includes('ticket')
                ? formatarMoeda(value)
                : value,
              item.config.metrica.replace('_', ' ')
            ]}
            labelFormatter={(nome) => `${nome}`}
          />
          <Bar dataKey={item.config.metrica} fill="hsl(210, 70%, 60%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
      </div>
{/* Sistema de Paginação */}
      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between flex-1 sm:hidden">
            {/* Versão mobile */}
            <button
              onClick={() => irParaPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Anterior
            </button>
            <button
              onClick={() => irParaPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Próxima
            </button>
          </div>
          
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{indiceInicio + 1}</span> até{' '}
                <span className="font-medium">{Math.min(indiceFim, dadosFiltrados.length)}</span> de{' '}
                <span className="font-medium">{dadosFiltrados.length}</span> resultados
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => irParaPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300"
              >
                ← Anterior
              </button>
              
              {(() => {
  const botoesPagina = [];
  const inicio = Math.max(1, paginaAtual - 2);
  const fim = Math.min(totalPaginas, paginaAtual + 2);
  
  for (let pagina = inicio; pagina <= fim; pagina++) {
    botoesPagina.push(
      <button
        key={pagina}
        onClick={() => irParaPagina(pagina)}
        className={`px-3 py-2 text-sm rounded-md ${
          pagina === paginaAtual
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {pagina}
      </button>
    );
  }
  
  return botoesPagina;
})()}
              
              <button
                onClick={() => irParaPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300"
              >
                Próxima →
              </button>
            </div>
          </div>
{/* Modal de Configurações Avançadas */}
{mostrarModalConfig && configTemporaria && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Configurações do Gráfico</h2>
        <button
          onClick={() => setMostrarModalConfig(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Tipo de Gráfico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Visualização
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, tipoGrafico: 'rosca'})}
              className={`p-3 border rounded-lg text-left ${
                configTemporaria.tipoGrafico === 'rosca' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">🍩 Rosca</div>
              <div className="text-xs text-gray-600">Proporções e percentuais</div>
            </button>
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, tipoGrafico: 'colunas'})}
              className={`p-3 border rounded-lg text-left ${
                configTemporaria.tipoGrafico === 'colunas' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">📊 Colunas</div>
              <div className="text-xs text-gray-600">Comparação de valores</div>
            </button>
          </div>
        </div>

        {/* Métrica */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Métrica de Análise
          </label>
          <select
            value={configTemporaria.metrica}
            onChange={(e) => setConfigTemporaria({
              ...configTemporaria, 
              metrica: e.target.value as 'faturamento_total' | 'frequencia_vendas' | 'ticket_medio'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="faturamento_total">💰 Faturamento Total</option>
            <option value="frequencia_vendas">📈 Quantidade de Vendas</option>
            <option value="ticket_medio">🎯 Ticket Médio</option>
          </select>
        </div>

        {/* Top N */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantidade de Itens
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, topN: 5})}
              className={`p-2 border rounded-lg text-center ${
                configTemporaria.topN === 5 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              Top 5
            </button>
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, topN: 10})}
              className={`p-2 border rounded-lg text-center ${
                configTemporaria.topN === 10 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              Top 10
            </button>
          </div>
        </div>

        {/* Preview da Configuração */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Preview:</h4>
          <p className="text-sm text-gray-600">
            <strong>{configTemporaria.titulo}</strong> - 
            {configTemporaria.tipoGrafico === 'rosca' ? ' Gráfico de Rosca' : ' Gráfico de Colunas'} - 
            Top {configTemporaria.topN} por {configTemporaria.metrica.replace('_', ' ')}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => setMostrarModalConfig(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (configTemporaria) {
                const dados = processarDadosGrafico(configTemporaria);
                const graficoId = (window as any).graficoEditandoId;

                if (graficoId) {
                  // Editando gráfico existente
                  setGraficos(prev => prev.map(g =>
                    g.id === graficoId
                      ? {
                          ...g,
                          config: {
                            ...configTemporaria,
                            filtrosAplicados: g.config.filtrosAplicados // Manter filtros originais
                          },
                          dados
                        }
                      : g
                  ));
                  (window as any).graficoEditandoId = null;
                }

                setMostrarModalConfig(false);
              }
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aplicar Mudanças
          </button>
        </div>
      </div>
    </div>
  </div>
)}
        </div>

      )}
      {/* Footer informativo com stats dos dados carregados */}
      <div className="mt-6 p-4 bg-gray-800 text-gray-300 rounded-lg text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p><strong className="text-white">💡 Dica:</strong></p>
            <p>Use "E também" para somar condições, "OU então" para alternativas e "Mas sem" para excluir.</p>
          </div>
          <div>
            <p><strong className="text-white">🔍 Filtros Ativos:</strong> {filtros.length}</p>
            <p><strong className="text-white">📊 Dados Carregados:</strong> {dadosProcessados.vendasCount} vendas, {dadosProcessados.clientesCount} clientes, {dadosProcessados.itensCount} produtos</p>
            <p><strong className="text-white">🕐 Última Atualização:</strong> {dadosProcessados.ultimaAtualizacao}</p>
          </div>
          <div>
            <p><strong className="text-white">✅ Resultado:</strong> {dadosFiltrados.length} vendas encontradas</p>
            <p><strong className="text-white">💰 Total:</strong> {formatarMoeda(metricas.faturamentoTotal)}</p>
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Gráficos */}
      {mostrarModalGrafico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
            {processandoGrafico && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Processando gráfico...</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Configurar Gráfico</h2>
              <button
                onClick={() => setMostrarModalGrafico(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Análise de Contexto */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Análise dos Filtros Aplicados:</h3>
                <div className="text-blue-700 text-sm">
                  {filtros.length === 0 ? (
                    <p>Nenhum filtro aplicado - visualizando todos os dados</p>
                  ) : (
                    <div>
                      <p className="font-medium mb-2">{filtros.length} filtros ativos:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {filtros.map(f => (
                          <li key={f.id}>
                            <strong>{getNomeTabela(f.tabela)}</strong> → {getFieldConfigSafe(f.tabela, f.campo).label} = "{f.valor}"
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs">
                        Gráficos relacionados aos campos filtrados são ocultados automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sugestões Inteligentes */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Sugestões de Gráficos:</h3>
                <div className="space-y-2">
                  {gerarSugestoes().map(sugestao => (
                    <button
                      key={sugestao.id}
                      onClick={async () => {
                        setProcessandoGrafico(true);

                        try {
                          const config: GraficoConfig = {
                            campoAgrupamento: sugestao.campo,
                            metrica: sugestao.metrica,
                            tipoGrafico: sugestao.tipoGrafico,
                            topN: 10,
                            titulo: sugestao.titulo,
                            filtrosAplicados: [...filtros] // Salvar cópia dos filtros atuais
                          };

                          // Pequeno delay para mostrar o loading
                          await new Promise(resolve => setTimeout(resolve, 100));

                          const dados = processarDadosGrafico(config);

                          if (dados.length === 0) {
                            alert('Não foi possível gerar o gráfico. Dados insuficientes ou filtros muito restritivos.');
                            return;
                          }

                          const novoGrafico = {
                            id: `grafico-${proximoId}`,
                            config,
                            dados
                          };

                          setGraficos(prev => [...prev, novoGrafico]);
                          setProximoId(prev => prev + 1);
                          setMostrarModalGrafico(false);
                        } finally {
                          setProcessandoGrafico(false);
                        }
                      }}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`font-medium ${sugestao.cor}`}>
                        {sugestao.icone} {sugestao.titulo}
                      </div>
                      <div className="text-sm text-gray-600">{sugestao.descricao}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Métrica: {sugestao.metrica.replace('_', ' ')} • Tipo: {sugestao.tipoGrafico}
                      </div>
                    </button>
                  ))}
                </div>

                {gerarSugestoes().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Todas as opções de gráficos relevantes já estão sendo filtradas.</p>
                    <p className="text-sm mt-2">Remova alguns filtros para ver mais sugestões.</p>
                  </div>
                ) : dadosFiltrados.length < 10 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="text-yellow-600 mr-3">⚠️</div>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Poucos dados detectados ({dadosFiltrados.length} registros)
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Gráficos com menos de 10 registros podem não ser muito informativos.
                          Considere remover alguns filtros para obter mais dados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setMostrarModalGrafico(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Implementar geração do gráfico
                    console.log('Gerar gráfico...');
                    setMostrarModalGrafico(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Gerar Gráfico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Filtro */}
      {filtroEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Filtro</h2>
              <button
                onClick={() => setFiltroEditando(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tabela (desabilitada) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tabela (não editável)
                </label>
                <input
                  type="text"
                  value={getNomeTabela(filtroEditando.tabela)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              {/* Campo (desabilitado) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campo (não editável)
                </label>
                <input
                  type="text"
                  value={getFieldConfigSafe(filtroEditando.tabela, filtroEditando.campo).label}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              {/* Operador (editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operador
                </label>
                <select
                  value={filtroEditando.operador}
                  onChange={(e) => setFiltroEditando({...filtroEditando, operador: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {getOperatorsForField(filtroEditando.tabela, filtroEditando.campo).map((op: { value: string; label: string }) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Valor (editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor
                </label>
                {getFieldConfigSafe(filtroEditando.tabela, filtroEditando.campo).tipo === 'select' ? (
                  <select
                    value={filtroEditando.valor}
                    onChange={(e) => setFiltroEditando({...filtroEditando, valor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {obterValoresUnicos(filtroEditando.tabela, filtroEditando.campo).map(valor => (
                      <option key={valor} value={valor}>{valor}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filtroEditando.valor}
                    onChange={(e) => setFiltroEditando({...filtroEditando, valor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-6 border-t mt-6">
              <button
                onClick={() => setFiltroEditando(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Atualizar o filtro existente
                  setFiltros(prev => prev.map(f =>
                    f.id === filtroEditando.id ? filtroEditando : f
                  ));
                  setFiltroEditando(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}