// =====================================================
// PÁGINA PRINCIPAL - DASHBOARD OBSERVADOR
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderObservador } from '../components/Observador/HeaderObservador';
import { ControlesSlideshow } from '../components/Observador/ControlesSlideshow';
import { SlideVendedores } from '../components/Observador/SlideVendedores';
import { SlideMetricasGlobais } from '../components/Observador/SlideMetricasGlobais';
import { SlideAnaliseRegional } from '../components/Observador/SlideAnaliseRegional';
import { useSlideshow } from '../hooks/useSlideshow';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useVendedoresPerformance } from '../hooks/useVendedoresPerformance';
import { useMetricasGlobais } from '../hooks/useMetricasGlobais';
import { useAnaliseRegional } from '../hooks/useAnaliseRegional';
import { supabase } from '../lib/supabase';

/**
 * Página principal do Dashboard Observador
 * Exibe slides rotativos com métricas e performance
 */
export function DashboardObservador() {
  const navigate = useNavigate();

  // Data atual para filtros
  const [dataAtual] = useState(new Date());
  const mesAtual = dataAtual.getMonth() + 1; // 1-12
  const anoAtual = dataAtual.getFullYear();

  // Função de logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Hook de auto-refresh (30 minutos)
  const { 
    ultimaAtualizacao, 
    contadorRefresh 
  } = useAutoRefresh(1800000); // 30 min em ms

  // Buscar dados dos vendedores
  const {
    vendedores,
    isLoading: isLoadingVendedores,
    error: errorVendedores,
  } = useVendedoresPerformance(mesAtual, anoAtual, contadorRefresh);

  // Buscar métricas globais
  const {
    metricas,
    topProdutos,
    topClientes,
    isLoading: isLoadingMetricas,
    error: errorMetricas,
  } = useMetricasGlobais(mesAtual, anoAtual, contadorRefresh);

  // Buscar análise regional
  const {
    cidadesVenda,
    crescimentoCidades,
    isLoading: isLoadingRegional,
    error: errorRegional,
  } = useAnaliseRegional(mesAtual, anoAtual, contadorRefresh);

  // Calcular número de slides (vendedores podem ter múltiplas páginas)
  const vendedoresPorPagina = 6;
  const paginasVendedores = Math.ceil(vendedores.length / vendedoresPorPagina);
  const totalSlides = paginasVendedores + 2; // +2 para métricas e regional

  // Hook de slideshow
  const {
    slideAtual,
    isPausado,
    tempoRestante,
    proximoSlide,
    slideAnterior,
    irParaSlide,
    pausar,
    retomar,
  } = useSlideshow(totalSlides, 30000); // 30 segundos por slide

  // Calcular qual página de vendedores estamos (se aplicável)
  const paginaVendedoresAtual = slideAtual < paginasVendedores ? slideAtual : 0;

  // Estados de carregamento e erro
  const isLoading = isLoadingVendedores || isLoadingMetricas || isLoadingRegional;
  const hasError = errorVendedores || errorMetricas || errorRegional;

  // Entrar em modo tela cheia ao montar (opcional)
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Erro ao entrar em tela cheia:', err);
        });
      }
    };

    // Tentar entrar em tela cheia após 1 segundo
    const timer = setTimeout(enterFullscreen, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Renderizar slide atual
  const renderSlideAtual = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-xl text-gray-600 font-medium">Carregando dados...</p>
          </div>
        </div>
      );
    }

    // Error state
    if (hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Erro ao Carregar Dados
            </h2>
            <p className="text-gray-600 mb-4">
              {errorVendedores?.message || errorMetricas?.message || errorRegional?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    // Slides de vendedores (pode ter múltiplas páginas)
    if (slideAtual < paginasVendedores) {
      return (
        <SlideVendedores
          vendedores={vendedores}
          mesAtual={mesAtual}
          anoAtual={anoAtual}
          paginaAtual={paginaVendedoresAtual}
          vendedoresPorPagina={vendedoresPorPagina}
        />
      );
    }

    // Slide de métricas globais
    if (slideAtual === paginasVendedores && metricas) {
      return (
        <SlideMetricasGlobais
          metricas={metricas}
          topProdutos={topProdutos}
          topClientes={topClientes}
          mesAtual={mesAtual}
          anoAtual={anoAtual}
        />
      );
    }

    // Slide de análise regional
    if (slideAtual === paginasVendedores + 1) {
      return (
        <SlideAnaliseRegional
          cidadesVenda={cidadesVenda}
          crescimentoCidades={crescimentoCidades}
          mesAtual={mesAtual}
          anoAtual={anoAtual}
        />
      );
    }

    // Fallback (não deveria chegar aqui)
    return null;
  };

  return (
  <div className="min-h-screen w-full overflow-auto flex flex-col bg-gray-900">
      
      {/* Header Fixo */}
      <HeaderObservador
        ultimaAtualizacao={ultimaAtualizacao}
        mostrarLogo={true}
        onLogout={handleLogout}
      />

      {/* Área de Conteúdo (Slides) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full transition-opacity duration-500">
          {renderSlideAtual()}
        </div>
      </div>

      {/* Controles Fixos no Rodapé */}
      <ControlesSlideshow
        slideAtual={slideAtual}
        totalSlides={totalSlides}
        isPausado={isPausado}
        tempoRestante={tempoRestante}
        onProximo={proximoSlide}
        onAnterior={slideAnterior}
        onIrPara={irParaSlide}
        onPausar={pausar}
        onRetomar={retomar}
      />

      {/* Dica de Tela Cheia (aparece brevemente no início) */}
      <div className="fixed top-20 right-8 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm opacity-0 animate-fade-in-out pointer-events-none">
        💡 Pressione <kbd className="px-2 py-1 bg-gray-700 rounded">F11</kbd> para tela cheia
      </div>
    </div>
  );
}

// Adicionar animação CSS (pode adicionar no arquivo global ou aqui via style tag)
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in-out {
    0%, 100% { opacity: 0; }
    10%, 90% { opacity: 1; }
  }
  
  .animate-fade-in-out {
    animation: fade-in-out 5s ease-in-out;
  }
`;
document.head.appendChild(style);