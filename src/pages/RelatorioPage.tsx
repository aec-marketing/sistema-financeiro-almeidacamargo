import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Search, Download, Save, BarChart3, Table, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { gerarRelatorioPDF } from '../utils/exportPDF';
import html2canvas from 'html2canvas';
import { useUserAccess } from '../hooks/useUserAccess';
import { cache, CACHE_KEYS, CACHE_EXPIRATION } from '../utils/cache';

// Extensão da interface Window para propriedades customizadas
declare global {
  interface Window {
    graficoEditandoId?: string;
  }
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
  'Cód. Referência'?: string;
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

interface DadosGrafico {
  nome: string;
  faturamento_total?: number;
  frequencia_vendas?: number;
  ticket_medio?: number;
}

interface Grafico {
  id: string;
  config: GraficoConfig;
  dados: DadosGrafico[];
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

export default function RelatoriosPage() {
  const { user } = useUserAccess()
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
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

// Estados para paginação
const [paginaAtual, setPaginaAtual] = useState(1);
const [itensPorPagina] = useState(50); // 50 itens por página

// Estados para gráficos
const [mostrarModalGrafico, setMostrarModalGrafico] = useState(false);
const [graficos, setGraficos] = useState<Grafico[]>([]);
const [proximoId, setProximoId] = useState(1);

// Estados para configurações avançadas
const [mostrarModalConfig, setMostrarModalConfig] = useState(false);
const [configTemporaria, setConfigTemporaria] = useState<GraficoConfig | null>(null);
const [processandoGrafico, setProcessandoGrafico] = useState(false);

// Debounce para otimizar performance
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

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

  // Função para limpar cache e recarregar
  const limparCacheERecarregar = useCallback(() => {
    cache.clearAll();
    window.location.reload();
  }, []);

  // Carregar todos os dados com UX aprimorada + CACHE
  useEffect(() => {
    // Só carrega se tiver usuário autenticado
    if (!user?.id) {
      console.log('⏳ Aguardando autenticação...');
      return;
    }

    const carregarDados = async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        setLoadingProgress(0);
        setLoadingMessage('Verificando cache...');

        const userId = user.id;

        console.log('🔄 Iniciando carregamento de dados...', { userId, role: user.role });

        // Limpa caches expirados no início
        cache.clearExpiredCaches();

        // Verificar se há dados em cache (apenas clientes e itens)
        // NOTA: Vendas não são cacheadas pois são muito grandes
        if (!forceRefresh) {
          const clientesCache = cache.get<Cliente[]>(CACHE_KEYS.CLIENTES, userId);
          const itensCache = cache.get<Item[]>(CACHE_KEYS.ITENS, userId);

          // Se clientes E itens estão em cache, usa cache parcial
          if (clientesCache && itensCache) {
            console.log('✅ Clientes e itens recuperados do cache!');
            setLoadingMessage('Carregando do cache...');
            setLoadingProgress(40);

            setDadosClientes(clientesCache);
            setDadosItens(itensCache);

            console.log('📡 Carregando apenas vendas do banco...');
            // Continua para carregar vendas do banco
          }
        }

        // Helper para carregar todas as páginas com paginação
        const fetchAll = async <T,>(table: string, columns: string, additionalFilters?: Record<string, unknown>) => {
          let allData: T[] = [];
          let start = 0;
          const limit = 1000;
          let hasMoreData = true;

          while (hasMoreData) {
            let query = supabase
              .from(table)
              .select(columns)
              .range(start, start + limit - 1);

            // Aplicar filtros adicionais se fornecidos
            if (additionalFilters) {
              Object.entries(additionalFilters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  query = query.eq(key, value);
                }
              });
            }

            const { data, error} = await query;

            if (error) throw error;

            if (data && data.length > 0) {
              allData = [...allData, ...(data as T[])];
              start += limit;
              if (data.length < limit) hasMoreData = false;
            } else {
              hasMoreData = false;
            }
          }

          return allData;
        };

        // Etapa 1: Carregar clientes (20% do progresso) - SE NÃO ESTIVER EM CACHE
        let clientes = dadosClientes;
        if (clientes.length === 0) {
          setLoadingMessage('Carregando dados de clientes...');
          setLoadingProgress(10);

          clientes = await fetchAll<Cliente>('clientes', `
            id,
            "Nome",
            "Município",
            "Sigla Estado",
            "CNPJ",
            "Entidade"
          `);

          // Salva clientes no cache
          cache.set(CACHE_KEYS.CLIENTES, clientes, {
            expiresIn: CACHE_EXPIRATION.CLIENTES,
            userId
          });

          setDadosClientes(clientes);
          console.log(`✅ ${clientes.length} clientes carregados e salvos em cache`);
        } else {
          console.log(`✅ ${clientes.length} clientes já estavam em cache`);
        }
        setLoadingProgress(20);

        // Etapa 2: Carregar itens (40% do progresso) - SE NÃO ESTIVER EM CACHE
        let itens = dadosItens;
        if (itens.length === 0) {
          setLoadingMessage('Carregando catálogo de produtos...');
          setLoadingProgress(30);

          itens = await fetchAll<Item>('itens', `
            id,
            "Descr. Marca Produto",
            "Descr. Grupo Produto",
            "Desc. Subgrupo de Produto",
            "Cód. Referência",
            "Cód. do Produto",
            "Descr. Produto"
          `);

          // Salva itens no cache
          cache.set(CACHE_KEYS.ITENS, itens, {
            expiresIn: CACHE_EXPIRATION.ITENS,
            userId
          });

          setDadosItens(itens);
          console.log(`✅ ${itens.length} itens carregados e salvos em cache`);
        } else {
          console.log(`✅ ${itens.length} itens já estavam em cache`);
        }
        setLoadingProgress(40);

        // Etapa 3: Carregar vendas (80% do progresso)
        setLoadingMessage('Carregando histórico de vendas...');
        setLoadingProgress(50);

        // Garante que o ID do representante esteja no formato correto
        const repId = user?.cd_representante
          ? (typeof user.cd_representante === 'string'
              ? parseFloat(user.cd_representante)
              : user.cd_representante)
          : null;

        const vendas = await fetchAll<Venda>('vendas', `
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
          "Cód. Referência",
          cdRepr
        `,
        // Aplicar filtro por representante se for consultor de vendas
        user?.role === 'consultor_vendas' && repId
          ? { cdRepr: repId }
          : undefined
        );

        setLoadingProgress(70);
        console.log(`✅ ${vendas.length} vendas carregadas (filtradas por usuário)`);

        // Etapa 4: Enriquecer vendas com dados de itens e clientes (95% do progresso)
        setLoadingMessage('Processando e enriquecendo dados...');
        setLoadingProgress(80);

        const vendasEnriquecidas = vendas.map(venda => {
          const itemCorrespondente = itens.find(item =>
            item["Cód. Referência"] === venda["Cód. Referência"]
          );

          const clienteCorrespondente = clientes.find(cliente =>
            cliente.Nome === venda.NomeCli
          );

          return {
            ...venda,
            MARCA: itemCorrespondente?.["Descr. Marca Produto"] || venda.MARCA || 'Marca não encontrada',
            GRUPO: itemCorrespondente?.["Descr. Grupo Produto"] || venda.GRUPO,
            "Descr. Produto": itemCorrespondente?.["Descr. Produto"] || venda["Descr. Produto"],
            CIDADE: clienteCorrespondente?.Município || venda.CIDADE
          };
        });

        setLoadingProgress(90);

        // Etapa 5: Finalizar (100% do progresso)
        setLoadingMessage('Finalizando...');
        setLoadingProgress(95);

        const cacheSize = cache.getTotalSize();
        console.log('✅ Dados carregados, processados e salvos em cache:', {
          clientes: clientes.length,
          itens: itens.length,
          vendas: vendasEnriquecidas.length,
          cacheSize: `${cacheSize} KB`
        });

        setDadosVendas(vendasEnriquecidas);
        setDadosFiltrados(vendasEnriquecidas);
        setLoadingProgress(100);
        setLoadingMessage('Concluído!');

      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados');
        setLoadingMessage('Erro ao carregar dados');
      } finally {
        setTimeout(() => {
          setLoading(false);
          setLoadingMessage('');
          setLoadingProgress(0);
        }, 500); // Pequeno delay para mostrar 100%
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
const processarDadosGrafico = useCallback((config: GraficoConfig): DadosGrafico[] => {
  // Validação de dados mínimos
  if (dadosFiltrados.length < 2) {
    console.log('Poucos dados para gerar gráfico:', dadosFiltrados.length);
    return [];
  }

  interface DadosAgrupados {
    nome: string;
    faturamento_total: number;
    frequencia_vendas: number;
    ticket_medio: number;
    valores: number[];
  }

  const dados = dadosFiltrados.reduce((acc, venda) => {
    const chave = String(venda[config.campoAgrupamento as keyof Venda] || 'Não informado');

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
  }, {} as Record<string, DadosAgrupados>);

  // Calcular ticket médio
  Object.keys(dados).forEach(chave => {
    const item = dados[chave];
    item.ticket_medio = item.frequencia_vendas > 0 ? item.faturamento_total / item.frequencia_vendas : 0;
  });

  // Converter para array e ordenar, removendo a propriedade 'valores'
  const dadosArray: DadosGrafico[] = Object.values(dados)
    .sort((a, b) => (b[config.metrica] ?? 0) - (a[config.metrica] ?? 0))
    .slice(0, config.topN)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ valores: _, ...rest }) => rest);

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
    config: GraficoConfig;
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
        config: graficoConfig.config,
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
                             config.tipoGrafico === 'rosca';

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
        titulo: config.titulo,
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
                               config.tipoGrafico === 'rosca';

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
          titulo: config.titulo,
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            {/* Ícone animado */}
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Carregando Relatório
            </h3>

            {/* Mensagem de status */}
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6 min-h-[24px]">
              {loadingMessage || 'Preparando...'}
            </p>

            {/* Barra de progresso */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            {/* Percentual */}
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-4">
              {loadingProgress}%
            </p>

            {/* Mensagem informativa */}
            <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                <span className="font-medium">💡 Dica:</span> Este processo pode demorar alguns instantes, mas garante a precisão total dos dados financeiros.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-6 m-6">
        <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-red-600 dark:text-red-400">{error}</p>
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
      {/* Header - REDESENHADO PARA MOBILE */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-4 sm:p-6">
        <div className="space-y-4">
          {/* Título e Descrição */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Relatórios Personalizados
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Crie consultas flexíveis com filtros inteligentes
            </p>
          </div>

          {/* Input Nome + Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Dê um nome para este relatório..."
              value={nomeRelatorio}
              onChange={(e) => setNomeRelatorio(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={limparFiltros}
                className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="hidden sm:inline">Limpar Tudo</span>
                <span className="sm:hidden">Limpar</span>
              </button>

              <button
                onClick={salvarRelatorio}
                className="sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Salvar Relatório</span>
                <span className="sm:hidden">Salvar</span>
              </button>

              <button
                onClick={exportarDados}
                className="sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Gerar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>

              <button
                onClick={limparCacheERecarregar}
                className="sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                title="Limpar cache e recarregar dados do banco"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar Cache</span>
                <span className="sm:hidden">Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros do Relatório */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros do Relatório
        </h2>

        {/* Filtros Existentes */}
        {filtros.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
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
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <span className="text-sm">
                      <span className="font-medium text-blue-600 dark:text-blue-400">{getNomeTabela(filtro.tabela)}</span>
                      <span className="mx-1 text-gray-600 dark:text-gray-300">→</span>
                      <span className="font-medium">{getFieldConfigSafe(filtro.tabela, filtro.campo).label}</span>
                      <span className="mx-1 text-gray-600 dark:text-gray-300 italic">
                        {getOperatorsForField(filtro.tabela, filtro.campo).find((op: { value: string; label: string }) => op.value === filtro.operador)?.label}
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">"{filtro.valor}"</span>
                    </span>
                    <button
                      onClick={() => setFiltroEditando(filtro)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-300 ml-2"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              <option value="AND">E também</option>
              <option value="OR">OU então</option>
              <option value="EXCEPT">Mas sem</option>
            </select>
          )}

          <select
            value={novoFiltro.tabela}
            onChange={(e) => setNovoFiltro({...novoFiltro, tabela: e.target.value as TabelaKey, campo: '', operador: '', valor: ''})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          >
            <option value="">Escolha os dados...</option>
            <option value="clientes">Clientes</option>
            <option value="itens">Produtos</option>
            <option value="vendas">Vendas</option>
          </select>

          <select
            value={novoFiltro.campo}
            onChange={(e) => setNovoFiltro({...novoFiltro, campo: e.target.value, operador: '', valor: ''})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
              disabled={!novoFiltro.operador}
            />
          )}

          <button
            onClick={adicionarFiltro}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!novoFiltro.tabela || !novoFiltro.campo || !novoFiltro.operador || !novoFiltro.valor}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border">
          <h3 className="text-sm text-gray-600 dark:text-gray-300">Vendas Encontradas</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metricas.totalVendas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border">
          <h3 className="text-sm text-gray-600 dark:text-gray-300">Faturamento Total</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatarMoeda(metricas.faturamentoTotal)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border">
          <h3 className="text-sm text-gray-600 dark:text-gray-300">Valor Médio</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatarMoeda(metricas.ticketMedio)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border">
          <h3 className="text-sm text-gray-600 dark:text-gray-300">Clientes Únicos</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metricas.clientesUnicos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-gray-900/50 border">
          <h3 className="text-sm text-gray-600 dark:text-gray-300">Quantidade Total</h3>
          <p className="text-2xl font-bold text-cyan-600">{metricas.quantidadeTotal}</p>
        </div>

      </div>

      {/* Resultado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-4 sm:p-6">
        {/* Header Responsivo */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Título + Badge */}
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Resultados da Consulta
              </h2>
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 text-xs sm:text-sm font-medium rounded-full">
                {dadosFiltrados.length} vendas
              </span>
            </div>

            {/* Botões de Visualização */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setVisualizacao('tabela')}
                className={`sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium ${ visualizacao === 'tabela' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
                title="Ver como tabela"
              >
                <Table className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm">Tabela</span>
              </button>
              <button
                onClick={() => setVisualizacao('graficos')}
                className={`sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium ${ visualizacao === 'graficos' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}
                title="Ver como gráfico"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm">Gráficos</span>
              </button>
            </div>
          </div>
        </div>

        {dadosFiltrados.length === 0 ? (
  <div className="text-center py-12 text-gray-600 dark:text-gray-300">
    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
    <p className="text-lg font-medium mb-2">Nenhuma venda encontrada</p>
    <p className="text-sm">Tente ajustar os filtros ou remover algumas condições.</p>
  </div>
) : visualizacao === 'tabela' ? (
  <>
    {/* Versão Desktop - Tabela */}
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50 dark:bg-gray-900">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Data</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Produto</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Marca</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Cidade</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Qtd</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Valor Total</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Vendedor</th>
          </tr>
        </thead>
        <tbody>
          {dadosPaginados.map((venda) => (
            <tr key={venda.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda['Data de Emissao da NF']}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda.NomeCli}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white truncate max-w-xs" title={venda['Descr. Produto'] || 'N/A'}>
                {venda['Descr. Produto'] || 'Produto não especificado'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda.MARCA}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda.CIDADE}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda.Quantidade}</td>
              <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                {formatarMoeda(
                  converterValor(venda["Preço Unitário"]) * parseInt(venda.Quantidade || '1')
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{venda.NomeRepr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Versão Mobile - Cards */}
    <div className="lg:hidden space-y-4">
      {dadosPaginados.map((venda) => (
        <div key={venda.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm dark:shadow-gray-900/50">
          {/* Header do Card */}
          <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {venda.NomeCli}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                📅 {venda['Data de Emissao da NF']}
              </p>
            </div>
            <div className="ml-3 text-right flex-shrink-0">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatarMoeda(
                  converterValor(venda["Preço Unitário"]) * parseInt(venda.Quantidade || '1')
                )}
              </p>
            </div>
          </div>

          {/* Detalhes */}
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300">Produto</p>
              <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                {venda['Descr. Produto'] || 'Produto não especificado'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Marca</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {venda.MARCA}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Cidade</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {venda.CIDADE}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Quantidade</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {venda.Quantidade}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Vendedor</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {venda.NomeRepr}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
) : (
  /* Nova seção de gráficos */
  <div className="space-y-6">
    {graficos.length === 0 ? (
      <div className="text-center py-12">
        <button
          onClick={() => setMostrarModalGrafico(true)}
          className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-lg font-medium"
        >
          <BarChart3 className="w-6 h-6" />
          Adicionar Primeiro Gráfico
        </button>
        <p className="text-gray-600 dark:text-gray-300 mt-4">
          Clique para escolher como visualizar seus dados em gráficos
        </p>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Botão para adicionar mais gráficos */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gráficos Ativos ({graficos.length})
          </h3>
          <button
            onClick={() => setMostrarModalGrafico(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Adicionar Gráfico
          </button>
        </div>

        {/* Lista de gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {graficos.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border" data-grafico-id={item.id}>
              {/* Cabeçalho do gráfico */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
  <h4 className="font-semibold text-gray-900 dark:text-white">{item.config.titulo}</h4>
  <p className="text-sm text-gray-600 dark:text-gray-300">
    Top {item.config.topN} • {item.config.metrica.replace('_', ' ')}
  </p>
  {item.config.filtrosAplicados.length > 0 && (
    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
      Filtros aplicados: {item.config.filtrosAplicados.map(f => `${getFieldConfigSafe(f.tabela, f.campo).label}="${f.valor}"`).join(', ')}
    </p>
  )}
  {item.config.filtrosAplicados.length === 0 && (
    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Todos os dados</p>
  )}
</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfigTemporaria({...item.config});
                      setMostrarModalConfig(true);
                      // Armazenar ID do gráfico sendo editado
                      window.graficoEditandoId = item.id;
                    }}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => {
                      setGraficos(prev => prev.filter(g => g.id !== item.id));
                    }}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:bg-red-900/20"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Renderização do gráfico - MOBILE OTIMIZADO */}
              <div className="p-4">
  {item.config.tipoGrafico === 'rosca' ? (
    <div className="flex flex-col md:flex-row">
      {/* Gráfico */}
      <div className="w-full md:w-3/5 h-[300px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={item.dados}
              cx="50%"
              cy="50%"
              innerRadius={window.innerWidth < 768 ? 50 : 60}
              outerRadius={window.innerWidth < 768 ? 90 : 110}
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
                    <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 border rounded-lg shadow-lg dark:shadow-gray-900/50 text-xs sm:text-sm max-w-[200px] sm:max-w-xs">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 truncate">{nome}</p>

                      {item.config.metrica === 'faturamento_total' && (
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                            Faturamento: {formatarMoeda(valor)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {data.frequencia_vendas} vendas
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Ticket: {formatarMoeda(data.ticket_medio)}
                          </p>
                        </div>
                      )}

                      {item.config.metrica === 'frequencia_vendas' && (
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {valor} vendas
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Total: {formatarMoeda(data.faturamento_total)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Ticket: {formatarMoeda(data.ticket_medio)}
                          </p>
                        </div>
                      )}

                      {item.config.metrica === 'ticket_medio' && (
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                            Ticket: {formatarMoeda(valor)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {data.frequencia_vendas} vendas
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Total: {formatarMoeda(data.faturamento_total)}
                          </p>
                        </div>
                      )}

                      <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {((valor / item.dados.reduce((sum, d) => sum + (d[item.config.metrica] ?? 0), 0)) * 100).toFixed(1)}% do total
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

      {/* Legenda lateral/inferior */}
      <div className="w-full md:w-2/5 md:pl-4 mt-4 md:mt-0">
        <h5 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">Legenda</h5>
        <div className="space-y-1.5 sm:space-y-2 max-h-60 md:max-h-72 overflow-y-auto">
          {item.dados.map((entrada, index) => {
            const total = item.dados.reduce((sum, d) => sum + (d[item.config.metrica] ?? 0), 0);
            const valor = entrada[item.config.metrica] ?? 0;
            const percentual = total > 0 ? ((valor / total) * 100) : 0;

            return (
              <div key={index} className="flex items-center text-xs">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: `hsl(${index * 45}, 70%, 60%)` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium" title={entrada.nome}>
                    {entrada.nome}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs">
                    {item.config.metrica.includes('faturamento') || item.config.metrica.includes('ticket')
                      ? formatarMoeda(valor)
                      : valor.toLocaleString('pt-BR')
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
    /* Gráfico de barras - MOBILE OTIMIZADO */
    <div className="h-[400px] sm:h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={item.dados}
          margin={{
            top: 20,
            right: window.innerWidth < 640 ? 10 : 30,
            left: window.innerWidth < 640 ? 10 : 60,
            bottom: window.innerWidth < 640 ? 80 : 60
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="nome"
            angle={-45}
            textAnchor="end"
            height={window.innerWidth < 640 ? 100 : 80}
            interval={0}
            tick={{ fontSize: window.innerWidth < 640 ? 9 : 11 }}
            tickFormatter={(nome) => {
              const maxLength = window.innerWidth < 640 ? 8 : 12;
              if (nome.length > maxLength) {
                const primeiroNome = nome.split(' ')[0];
                return primeiroNome.length > maxLength ? `${primeiroNome.substring(0, maxLength)}...` : primeiroNome;
              }
              return nome;
            }}
          />
          <YAxis
            width={window.innerWidth < 640 ? 50 : 80}
            tick={{ fontSize: window.innerWidth < 640 ? 9 : 11 }}
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
            contentStyle={{ fontSize: window.innerWidth < 640 ? '11px' : '13px' }}
          />
          <Bar
            dataKey={item.config.metrica}
            fill="hsl(210, 70%, 60%)"
            maxBarSize={window.innerWidth < 640 ? 30 : 50}
          />
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
        <div className="mt-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="justify-between flex-1 sm:hidden">
            {/* Versão mobile */}
            <button
              onClick={() => irParaPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Anterior
            </button>
            <button
              onClick={() => irParaPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Próxima
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Mostrando <span className="font-medium">{indiceInicio + 1}</span> até{' '}
                <span className="font-medium">{Math.min(indiceFim, dadosFiltrados.length)}</span> de{' '}
                <span className="font-medium">{dadosFiltrados.length}</span> resultados
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => irParaPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-700 disabled:text-gray-300"
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
        className={`px-3 py-2 text-sm rounded-md ${ pagina === paginaAtual ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100' }`}
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
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-700 disabled:text-gray-300"
              >
                Próxima →
              </button>
            </div>
          </div>

{/* Modal de Configurações Avançadas */}
{mostrarModalConfig && configTemporaria && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações do Gráfico</h2>
        <button
          onClick={() => setMostrarModalConfig(false)}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Tipo de Gráfico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Tipo de Visualização
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, tipoGrafico: 'rosca'})}
              className={`p-3 border rounded-lg text-left ${ configTemporaria.tipoGrafico === 'rosca' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50' }`}
            >
              <div className="font-medium">🍩 Rosca</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Proporções e percentuais</div>
            </button>
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, tipoGrafico: 'colunas'})}
              className={`p-3 border rounded-lg text-left ${ configTemporaria.tipoGrafico === 'colunas' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50' }`}
            >
              <div className="font-medium">📊 Colunas</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Comparação de valores</div>
            </button>
          </div>
        </div>

        {/* Métrica */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Métrica de Análise
          </label>
          <select
            value={configTemporaria.metrica}
            onChange={(e) => setConfigTemporaria({
              ...configTemporaria, 
              metrica: e.target.value as 'faturamento_total' | 'frequencia_vendas' | 'ticket_medio'
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="faturamento_total">💰 Faturamento Total</option>
            <option value="frequencia_vendas">📈 Quantidade de Vendas</option>
            <option value="ticket_medio">🎯 Ticket Médio</option>
          </select>
        </div>

        {/* Top N */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Quantidade de Itens
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, topN: 5})}
              className={`p-2 border rounded-lg text-center ${ configTemporaria.topN === 5 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50' }`}
            >
              Top 5
            </button>
            <button
              onClick={() => setConfigTemporaria({...configTemporaria, topN: 10})}
              className={`p-2 border rounded-lg text-center ${ configTemporaria.topN === 10 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50' }`}
            >
              Top 10
            </button>
          </div>
        </div>

        {/* Preview da Configuração */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Preview:</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{configTemporaria.titulo}</strong> - 
            {configTemporaria.tipoGrafico === 'rosca' ? ' Gráfico de Rosca' : ' Gráfico de Colunas'} - 
            Top {configTemporaria.topN} por {configTemporaria.metrica.replace('_', ' ')}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => setMostrarModalConfig(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (configTemporaria) {
                const dados = processarDadosGrafico(configTemporaria);
                const graficoId = window.graficoEditandoId;

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
                  window.graficoEditandoId = undefined;
                }

                setMostrarModalConfig(false);
              }
            }}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">

            {/* Loading Overlay */}
            {processandoGrafico && (
              <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Processando gráfico...</p>
                </div>
              </div>
            )}

            {/* Header Fixo */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Sugestões de Gráficos
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    Escolha um gráfico para visualizar seus dados
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalGrafico(false)}
                  className="flex-shrink-0 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Análise dos Filtros - Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">
                  Análise dos Filtros Aplicados:
                </h3>
                <div className="text-xs sm:text-sm text-blue-800">
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

              {/* Grid de Sugestões */}
              <div className="space-y-3 sm:space-y-4">
                {gerarSugestoes().map((sugestao) => (
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
                          filtrosAplicados: [...filtros]
                        };

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
                    className="w-full text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:border-blue-500 hover:shadow-md dark:shadow-gray-900/50 transition-all group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Ícone */}
                      <div className="flex-shrink-0 text-2xl sm:text-3xl">
                        {sugestao.icone}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1 line-clamp-1">
                          {sugestao.titulo}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                          {sugestao.descricao}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded">
                            Métrica: {sugestao.metrica}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            Tipo: {sugestao.tipoGrafico}
                          </span>
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex-shrink-0 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mensagem se não houver sugestões */}
              {gerarSugestoes().length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📊</div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    Todas as opções de gráficos relevantes já estão sendo filtradas.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Remova alguns filtros para ver mais sugestões.
                  </p>
                </div>
              ) : dadosFiltrados.length < 10 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mt-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 text-yellow-600 text-lg sm:text-xl">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-yellow-800">
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

            {/* Footer Fixo */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setMostrarModalGrafico(false)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Edição de Filtro */}
      {filtroEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Filtro</h2>
              <button
                onClick={() => setFiltroEditando(null)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tabela (desabilitada) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Tabela (não editável)
                </label>
                <input
                  type="text"
                  value={getNomeTabela(filtroEditando.tabela)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                />
              </div>

              {/* Campo (desabilitado) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Campo (não editável)
                </label>
                <input
                  type="text"
                  value={getFieldConfigSafe(filtroEditando.tabela, filtroEditando.campo).label}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                />
              </div>

              {/* Operador (editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Operador
                </label>
                <select
                  value={filtroEditando.operador}
                  onChange={(e) => setFiltroEditando({...filtroEditando, operador: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {getOperatorsForField(filtroEditando.tabela, filtroEditando.campo).map((op: { value: string; label: string }) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Valor (editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Valor
                </label>
                {getFieldConfigSafe(filtroEditando.tabela, filtroEditando.campo).tipo === 'select' ? (
                  <select
                    value={filtroEditando.valor}
                    onChange={(e) => setFiltroEditando({...filtroEditando, valor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-6 border-t mt-6">
              <button
                onClick={() => setFiltroEditando(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
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
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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