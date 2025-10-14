// src/pages/ComparativoPeriodosPage.tsx

/**
 * Página principal do Comparativo de Períodos
 * Orquestra todos os componentes e gerencia o estado global da comparação
 */

import { useState } from 'react';
import {
  type ConfigComparacao,
  type ResultadoComparacao,
  type PeriodoComparacao,
  type FiltroComparacao,
  type AgrupamentoPor,
  type MetricaVisualizada,
  AGRUPAMENTOS
} from '../types/comparativo';
import { executarComparacao, validarConfiguracao } from '../utils/comparativo-engine';
import { gerarInsights } from '../utils/insights-generator';
import { useUserAccess } from '../hooks/useUserAccess';
import SeletorPeriodos from '../components/Comparativo/SeletorPeriodos';
import FiltrosComparacao from '../components/Comparativo/FiltrosComparacao';
import ControlesVisualizacao from '../components/Comparativo/ControlesVisualizacao';
import CardsResumo from '../components/Comparativo/CardsResumo';
import TabelaDetalhada from '../components/Comparativo/TabelaDetalhada';
import GraficosComparacao from '../components/Comparativo/GraficosComparacao';
import ModalEditarPeriodos from '../components/Comparativo/ModalEditarPeriodos';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ComparativoPeriodosPage() {
  // ============================================
  // CONTROLE DE ACESSO
  // ============================================

  // Obter dados do usuário
  const { user, isVendedor } = useUserAccess();

  // ============================================
  // ESTADOS
  // ============================================

  // Configuração da comparação
  const [periodos, setPeriodos] = useState<PeriodoComparacao | null>(null);
  const [filtros, setFiltros] = useState<FiltroComparacao[]>([]);
  const [agrupamento, setAgrupamento] = useState<AgrupamentoPor>('marca');
  const [metrica, setMetrica] = useState<MetricaVisualizada>('faturamento');

  // Resultados
  const [resultado, setResultado] = useState<ResultadoComparacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Controles de UI
  const [etapaAtual, setEtapaAtual] = useState<'periodos' | 'filtros' | 'resultados'>('periodos');
  const [mostrarModalEdicao, setMostrarModalEdicao] = useState(false);

  // ============================================
  // FUNÇÃO: Executar Comparação
  // ============================================

  const handleExecutarComparacao = async () => {
    // Validar se períodos estão definidos
    if (!periodos) {
      setErro('Selecione os períodos para comparar');
      return;
    }

    // Montar configuração
    const config: ConfigComparacao = {
      periodos,
      filtros,
      agrupamento,
      metrica
    };

    // Validar configuração
    const validacao = validarConfiguracao(config);
    if (!validacao.valido) {
      setErro(validacao.erros.join(', '));
      return;
    }

    // Executar comparação
    setCarregando(true);
    setErro(null);

    try {
      console.log('🚀 Iniciando comparação com config:', config);

      // Se for vendedor, passar o cd_representante
      const cdRepresentante = isVendedor ? user?.cd_representante : null;

      // Executar engine COM filtro de vendedor
      const resultadoComparacao = await executarComparacao(config, cdRepresentante);

      // Gerar insights
      const insights = gerarInsights(resultadoComparacao);
      resultadoComparacao.insights = insights;

      // Atualizar estado
      setResultado(resultadoComparacao);
      setEtapaAtual('resultados');

      console.log('✅ Comparação concluída!', resultadoComparacao);
    } catch (error) {
      console.error('❌ Erro ao executar comparação:', error);
      setErro('Erro ao executar comparação. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // ============================================
  // FUNÇÃO: Limpar Comparação
  // ============================================

  const handleLimparComparacao = () => {
    setResultado(null);
    setEtapaAtual('periodos');
  };

  // ============================================
  // FUNÇÃO: Adicionar Filtro
  // ============================================

  const handleAdicionarFiltro = (novoFiltro: FiltroComparacao) => {
    setFiltros(prev => [...prev, { ...novoFiltro, id: Date.now() }]);
  };

  // ============================================
  // FUNÇÃO: Remover Filtro
  // ============================================

  const handleRemoverFiltro = (id: number) => {
    setFiltros(prev => prev.filter(f => f.id !== id));
  };

  // ============================================
  // FUNÇÃO: Reaplicar Comparação com Novos Períodos
  // ============================================

  const handleReaplicarComparacao = async (novosPeriodos: PeriodoComparacao) => {
    setPeriodos(novosPeriodos);
    setMostrarModalEdicao(false);

    // Executar comparação automaticamente
    const config: ConfigComparacao = {
      periodos: novosPeriodos,
      filtros,
      agrupamento,
      metrica
    };

    const validacao = validarConfiguracao(config);
    if (!validacao.valido) {
      setErro(validacao.erros.join(', '));
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const cdRepresentante = isVendedor ? user?.cd_representante : null;
      const resultadoComparacao = await executarComparacao(config, cdRepresentante);
      const insights = gerarInsights(resultadoComparacao);
      resultadoComparacao.insights = insights;
      setResultado(resultadoComparacao);
    } catch (error) {
      console.error('❌ Erro ao executar comparação:', error);
      setErro('Erro ao executar comparação. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                📊 Comparativo de Períodos
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Análise temporal avançada com filtros e métricas customizadas
              </p>
            </div>

            {/* Botão de Nova Comparação (aparece apenas quando há resultado) */}
            {resultado && (
              <button
                onClick={handleLimparComparacao}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Comparação
              </button>
            )}
          </div>

          {/* Indicador de Etapas */}
          <div className="mt-6 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${etapaAtual === 'periodos' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                etapaAtual === 'periodos' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                1
              </div>
              <span className="font-medium">Períodos</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700"></div>

            <div className={`flex items-center gap-2 ${etapaAtual === 'filtros' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                etapaAtual === 'filtros' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                2
              </div>
              <span className="font-medium">Filtros</span>
            </div>

            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700"></div>

            <div className={`flex items-center gap-2 ${etapaAtual === 'resultados' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                etapaAtual === 'resultados' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                3
              </div>
              <span className="font-medium">Resultados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mensagem de Erro */}
        {erro && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 dark:text-red-200 font-medium">{erro}</span>
            </div>
          </div>
        )}

        {/* ETAPA 1: Seleção de Períodos */}
{etapaAtual === 'periodos' && (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Selecione os períodos para comparar
    </h2>
    
    {/* Componente SeletorPeriodos */}
    <SeletorPeriodos
      onPeriodosSelecionados={setPeriodos}
      periodosAtuais={periodos}
    />

            {/* Botão Avançar */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setEtapaAtual('filtros')}
                disabled={!periodos}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Avançar →
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: Filtros e Configurações */}
{etapaAtual === 'filtros' && (
  <div className="space-y-6">
    {/* Filtros - APENAS PARA ADMIN */}
    {!isVendedor ? (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filtros (opcional)
        </h2>

        <FiltrosComparacao
          filtros={filtros}
          onAdicionarFiltro={handleAdicionarFiltro}
          onRemoverFiltro={handleRemoverFiltro}
        />
      </div>
    ) : (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Visualizando apenas suas vendas
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Como vendedor, você está visualizando automaticamente apenas as vendas relacionadas ao seu código de representante ({user?.cd_representante}).
            </p>
          </div>
        </div>
      </div>
    )}

            {/* Controles de Visualização */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
    Como deseja visualizar?
  </h2>
  
  {/* Componente ControlesVisualizacao */}
  <ControlesVisualizacao
    agrupamento={agrupamento}
    metrica={metrica}
    onAgrupamentoChange={setAgrupamento}
    onMetricaChange={setMetrica}
    isVendedor={isVendedor}
  />
</div>

            {/* Botões de Navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setEtapaAtual('periodos')}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Voltar
              </button>
              
              <button
                onClick={handleExecutarComparacao}
                disabled={carregando}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Gerar Comparação
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Resultados */}
        {etapaAtual === 'resultados' && resultado && (
          <div className="space-y-6">
            {/* Resumo dos Períodos Comparados */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  📅 Comparando
                </h2>
                <button
                  onClick={() => setMostrarModalEdicao(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Editar Períodos
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Período A</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{periodos?.periodoA.label}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {periodos?.periodoA.inicio.toLocaleDateString('pt-BR')} até {periodos?.periodoA.fim.toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Período B</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{periodos?.periodoB.label}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {periodos?.periodoB.inicio.toLocaleDateString('pt-BR')} até {periodos?.periodoB.fim.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Info sobre manter filtros */}
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ao alterar os períodos, seus filtros e configurações serão mantidos
                </p>
              </div>
            </div>

            {/* Cards de Resumo */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    Resumo da Comparação
  </h2>
  
  <CardsResumo
    resumo={resultado.resumo}
    labelPeriodoA={periodos?.periodoA.label || 'Período A'}
    labelPeriodoB={periodos?.periodoB.label || 'Período B'}
  />
</div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Insights Automáticos
              </h2>
              <div className="space-y-2">
                {resultado.insights.map((insight, index) => (
                  <div key={index} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                    <p className="text-sm text-purple-900 dark:text-purple-100">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
    Gráficos Comparativos
  </h2>
  
  <GraficosComparacao
    dados={resultado.detalhamento}
    metrica={metrica}
    labelPeriodoA={periodos?.periodoA.label || 'Período A'}
    labelPeriodoB={periodos?.periodoB.label || 'Período B'}
    tituloEixo={AGRUPAMENTOS[agrupamento].label}
  />
</div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
    Detalhamento {AGRUPAMENTOS[agrupamento].label}
  </h2>
  
  <TabelaDetalhada
    dados={resultado.detalhamento}
    metrica={metrica}
    labelPeriodoA={periodos?.periodoA.label || 'Período A'}
    labelPeriodoB={periodos?.periodoB.label || 'Período B'}
    tituloColuna={AGRUPAMENTOS[agrupamento].label}
  />
</div>
          </div>
        )}
      </div>

      {/* Modal de Edição de Períodos */}
      {mostrarModalEdicao && periodos && (
        <ModalEditarPeriodos
          periodosAtuais={periodos}
          onSalvar={handleReaplicarComparacao}
          onFechar={() => setMostrarModalEdicao(false)}
          carregando={carregando}
        />
      )}
    </div>
  );
}