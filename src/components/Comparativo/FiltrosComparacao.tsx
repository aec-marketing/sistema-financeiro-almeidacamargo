// src/components/Comparativo/FiltrosComparacao.tsx

/**
 * Componente para gerenciar filtros de inclusão e exclusão
 * Baseado na lógica intuitiva da página de Relatórios
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { FiltroComparacao, LogicaFiltro } from '../../types/comparativo';

// ============================================
// INTERFACES
// ============================================

interface FiltrosComparacaoProps {
  filtros: FiltroComparacao[];
  onAdicionarFiltro: (filtro: FiltroComparacao) => void;
  onRemoverFiltro: (id: number) => void;
}

// ============================================
// CONFIGURAÇÕES DE CAMPOS
// ============================================

const CAMPOS_DISPONIVEIS = [
  { 
    valor: 'MARCA', 
    label: 'Marca',
    tabela: 'vendas',
    icone: '🏢'
  },
  { 
    valor: 'Descr. Produto', 
    label: 'Produto',
    tabela: 'vendas',
    icone: '📦'
  },
  { 
    valor: 'NomeRepr', 
    label: 'Vendedor',
    tabela: 'vendas',
    icone: '👤'
  },
  { 
    valor: 'NomeCli', 
    label: 'Cliente',
    tabela: 'vendas',
    icone: '🏬'
  },
  { 
    valor: 'CIDADE', 
    label: 'Cidade',
    tabela: 'vendas',
    icone: '📍'
  },
  { 
    valor: 'GRUPO', 
    label: 'Grupo de Produto',
    tabela: 'vendas',
    icone: '📂'
  }
];

// Operadores disponíveis
const OPERADORES = [
  { valor: 'incluir', label: 'É', descricao: 'Incluir apenas estes valores' },
  { valor: 'excluir', label: 'NÃO É', descricao: 'Excluir estes valores' }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function FiltrosComparacao({
  filtros,
  onAdicionarFiltro,
  onRemoverFiltro
}: FiltrosComparacaoProps) {
  
  // ============================================
  // ESTADOS
  // ============================================

  const [mostrarModal, setMostrarModal] = useState(false);
  const [campoSelecionado, setCampoSelecionado] = useState('');
  const [operadorSelecionado, setOperadorSelecionado] = useState('incluir');
  const [logicaSelecionada, setLogicaSelecionada] = useState<LogicaFiltro>('AND');
  const [valoresSelecionados, setValoresSelecionados] = useState<string[]>([]);
  
  // Lista de valores disponíveis para o campo selecionado
  const [valoresDisponiveis, setValoresDisponiveis] = useState<string[]>([]);
  const [carregandoValores, setCarregandoValores] = useState(false);
  const [buscaValor, setBuscaValor] = useState('');

  // ============================================
  // BUSCAR VALORES ÚNICOS DO BANCO
  // ============================================

  useEffect(() => {
    if (campoSelecionado) {
      buscarValoresUnicos(campoSelecionado);
    }
  }, [campoSelecionado]);

  const buscarValoresUnicos = async (campo: string) => {
    setCarregandoValores(true);
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select(campo)
        .not(campo, 'is', null)
        .limit(1000);

      if (error) throw error;

      // Extrair valores únicos e ordenar
      const valoresUnicos = [...new Set(data.map(item => String(item[campo])))]
        .filter(v => v && v.trim() !== '')
        .sort();

      setValoresDisponiveis(valoresUnicos);
    } catch (error) {
      console.error('Erro ao buscar valores:', error);
      setValoresDisponiveis([]);
    } finally {
      setCarregandoValores(false);
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const obterIconeCampo = (campo: string): string => {
    return CAMPOS_DISPONIVEIS.find(c => c.valor === campo)?.icone || '📋';
  };

  const obterLabelCampo = (campo: string): string => {
    return CAMPOS_DISPONIVEIS.find(c => c.valor === campo)?.label || campo;
  };

  const obterCorTag = (filtro: FiltroComparacao): string => {
    if (filtro.logica === 'EXCEPT') {
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
    }
    if (filtro.logica === 'OR') {
      return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200';
    }
    return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
  };

  const obterTextoLogica = (logica: LogicaFiltro): string => {
    switch (logica) {
      case 'AND': return 'E';
      case 'OR': return 'OU';
      case 'EXCEPT': return 'EXCETO';
      default: return logica;
    }
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleAbrirModal = () => {
    setMostrarModal(true);
    setCampoSelecionado('');
    setOperadorSelecionado('incluir');
    setLogicaSelecionada('AND');
    setValoresSelecionados([]);
    setValoresDisponiveis([]);
    setBuscaValor('');
  };

  const handleToggleValor = (valor: string) => {
    setValoresSelecionados(prev => {
      if (prev.includes(valor)) {
        return prev.filter(v => v !== valor);
      } else {
        return [...prev, valor];
      }
    });
  };

  const handleConfirmarFiltro = () => {
    if (!campoSelecionado) {
      alert('Selecione um campo');
      return;
    }
    if (valoresSelecionados.length === 0) {
      alert('Selecione pelo menos um valor');
      return;
    }

    const logicaFinal: LogicaFiltro = operadorSelecionado === 'excluir' ? 'EXCEPT' : logicaSelecionada;

    const novoFiltro: FiltroComparacao = {
      campo: campoSelecionado,
      operador: operadorSelecionado as 'incluir' | 'excluir',
      valores: valoresSelecionados,
      logica: logicaFinal
    };

    onAdicionarFiltro(novoFiltro);
    setMostrarModal(false);
  };

  // Filtrar valores disponíveis baseado na busca
  const valoresFiltrados = valoresDisponiveis.filter(v =>
    v.toLowerCase().includes(buscaValor.toLowerCase())
  );

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-4">
      
      {/* Botão Adicionar Filtro */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filtros.length === 0 
              ? 'Nenhum filtro aplicado. Os dados serão comparados sem restrições.'
              : `${filtros.length} filtro(s) aplicado(s)`
            }
          </p>
        </div>
        <button
          onClick={handleAbrirModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Filtro
        </button>
      </div>

      {/* Lista de Filtros Aplicados */}
      {filtros.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mostrando dados onde:
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            {filtros.map((filtro, index) => (
              <div key={filtro.id || index} className="flex items-center gap-2">
                {/* Badge de Lógica */}
                {index > 0 && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    filtro.logica === 'EXCEPT' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      : filtro.logica === 'OR'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {obterTextoLogica(filtro.logica)}
                  </span>
                )}

                {/* Tag do Filtro */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${obterCorTag(filtro)}`}>
                  <span className="text-sm">
                    <span className="font-medium">
                      {obterIconeCampo(filtro.campo)} {obterLabelCampo(filtro.campo)}
                    </span>
                    <span className="mx-1">{filtro.operador === 'excluir' ? 'NÃO É' : 'É'}</span>
                    <span className="font-semibold">
                      {filtro.valores.length === 1 
                        ? filtro.valores[0]
                        : `${filtro.valores.length} valores`
                      }
                    </span>
                  </span>
                  
                  <button
                    onClick={() => onRemoverFiltro(filtro.id!)}
                    className="ml-2 text-current hover:opacity-70 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Adicionar Filtro */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adicionar Filtro
                </h2>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Frase de leitura natural */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Eu gostaria de ver as <strong>VENDAS</strong> {campoSelecionado && (
                    <>
                      do campo <strong className="text-blue-600 dark:text-blue-400">{obterLabelCampo(campoSelecionado)}</strong>
                    </>
                  )} {operadorSelecionado && campoSelecionado && (
                    <>
                      que <strong className={operadorSelecionado === 'excluir' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                        {operadorSelecionado === 'excluir' ? 'NÃO É' : 'É'}
                      </strong>
                    </>
                  )} {valoresSelecionados.length > 0 && (
                    <>
                      <strong className="text-purple-600 dark:text-purple-400">
                        {valoresSelecionados.join(', ')}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              
              {/* 1. Selecionar Campo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  1. Selecione o campo
                </label>
                <select
                  value={campoSelecionado}
                  onChange={(e) => {
                    setCampoSelecionado(e.target.value);
                    setValoresSelecionados([]);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um campo...</option>
                  {CAMPOS_DISPONIVEIS.map(campo => (
                    <option key={campo.valor} value={campo.valor}>
                      {campo.icone} {campo.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Selecionar Operador */}
              {campoSelecionado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    2. O valor deve ser...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {OPERADORES.map(op => (
                      <button
                        key={op.valor}
                        onClick={() => {
                          setOperadorSelecionado(op.valor);
                          setValoresSelecionados([]);
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          operadorSelecionado === op.valor
                            ? op.valor === 'excluir'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          {op.valor === 'excluir' ? '❌' : '✅'} {op.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {op.descricao}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Lógica (apenas para inclusão) */}
              {campoSelecionado && operadorSelecionado === 'incluir' && filtros.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    3. Como combinar com outros filtros?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLogicaSelecionada('AND')}
                      className={`p-4 rounded-lg border-2 text-left ${
                        logicaSelecionada === 'AND'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        E (AND)
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Deve atender este E os outros
                      </div>
                    </button>

                    <button
                      onClick={() => setLogicaSelecionada('OR')}
                      className={`p-4 rounded-lg border-2 text-left ${
                        logicaSelecionada === 'OR'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        OU (OR)
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Pode ser este OU os outros
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Selecionar Valores */}
              {campoSelecionado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {operadorSelecionado === 'incluir' && filtros.length > 0 ? '4' : '3'}. Selecione os valores
                  </label>

                  {/* Campo de busca */}
                  <input
                    type="text"
                    value={buscaValor}
                    onChange={(e) => setBuscaValor(e.target.value)}
                    placeholder="Buscar valores..."
                    className="w-full px-4 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Lista de valores */}
                  {carregandoValores ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Carregando valores...</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      {valoresFiltrados.length === 0 ? (
                        <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nenhum valor encontrado
                        </p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {valoresFiltrados.map(valor => (
                            <label
                              key={valor}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                valoresSelecionados.includes(valor)
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={valoresSelecionados.includes(valor)}
                                onChange={() => handleToggleValor(valor)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-900 dark:text-white flex-1">
                                {valor}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contador de selecionados */}
                  {valoresSelecionados.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {valoresSelecionados.length} valor(es) selecionado(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarFiltro}
                disabled={!campoSelecionado || valoresSelecionados.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Adicionar Filtro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}