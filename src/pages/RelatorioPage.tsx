import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Search, Download, Save, BarChart3, Table, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

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
  
  // Estados dos dados
  const [dadosClientes, setDadosClientes] = useState<Cliente[]>([]);
  const [dadosItens, setDadosItens] = useState<Item[]>([]);
  const [dadosVendas, setDadosVendas] = useState<Venda[]>([]);
  const [dadosFiltrados, setDadosFiltrados] = useState<Venda[]>([]);
  
  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para converter valores brasileiros para número
  const converterValor = useCallback((valor: string): number => {
    if (!valor) return 0;
    const valorLimpo = valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(valorLimpo) || 0;
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
  }, [filtros, dadosClientes, dadosItens, dadosVendas, aplicarFiltro]);

  // Métricas calculadas em tempo real
  const metricas = useMemo(() => {
    const dados = dadosFiltrados;
    const faturamentoTotal = dados.reduce((sum, venda) => {
      return sum + converterValor(venda.total);
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

  // Função para exportar dados (placeholder)
  const exportarDados = useCallback(() => {
    console.log('📊 Exportando dados...', dadosFiltrados);
    alert('Funcionalidade de exportação será implementada na próxima versão!');
  }, [dadosFiltrados]);

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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Excel
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
              onClick={() => setVisualizacao('barras')}
              className={`p-2 rounded transition-colors ${visualizacao === 'barras' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
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
        ) : (
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
                {dadosFiltrados.slice(0, 100).map((venda) => (
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
            
            {dadosFiltrados.length > 100 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Exibindo primeiras 100 vendas de {dadosFiltrados.length} encontradas.</strong>
                  <br />Use o botão "Baixar Excel" para ver todos os resultados.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer informativo com stats dos dados carregados */}
      <div className="mt-6 p-4 bg-gray-800 text-gray-300 rounded-lg text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p><strong className="text-white">💡 Dica:</strong></p>
            <p>Use "E também" para somar condições, "OU então" para alternativas e "Mas sem" para excluir.</p>
          </div>
          <div>
            <p><strong className="text-white">🔍 Filtros Ativos:</strong> {filtros.length}</p>
            <p><strong className="text-white">📊 Dados Carregados:</strong> {dadosVendas.length} vendas, {dadosClientes.length} clientes, {dadosItens.length} produtos</p>
          </div>
          <div>
            <p><strong className="text-white">✅ Resultado:</strong> {dadosFiltrados.length} vendas encontradas</p>
            <p><strong className="text-white">💰 Total:</strong> {formatarMoeda(metricas.faturamentoTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}