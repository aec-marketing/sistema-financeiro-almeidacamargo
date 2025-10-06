// =====================================================
// CONTROLES DE NAVEGAÇÃO DO SLIDESHOW
// =====================================================

interface ControlesSlideshowProps {
  slideAtual: number;
  totalSlides: number;
  isPausado: boolean;
  tempoRestante: number;
  onProximo: () => void;
  onAnterior: () => void;
  onIrPara: (index: number) => void;
  onPausar: () => void;
  onRetomar: () => void;
}

/**
 * Componente de controles do slideshow
 * Navegação manual, play/pause e indicadores visuais
 */
export function ControlesSlideshow({
  slideAtual,
  totalSlides,
  isPausado,
  tempoRestante,
  onProximo,
  onAnterior,
  onIrPara,
  onPausar,
  onRetomar,
}: ControlesSlideshowProps) {

  // Converte tempo restante para segundos
  const segundosRestantes = Math.ceil(tempoRestante / 1000);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-gray-800 text-white py-4 px-8 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Botão Anterior */}
        <button
          onClick={onAnterior}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={totalSlides <= 1}
          aria-label="Slide anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Anterior</span>
        </button>

        {/* Centro: Indicadores de Slides */}
        <div className="flex items-center gap-6">
          
          {/* Indicadores (bolinhas) */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                onClick={() => onIrPara(i)}
                className={`transition-all duration-300 ${i === slideAtual ? 'w-5 h-5 bg-blue-500 rounded-full' : 'w-3 h-3 bg-gray-500 rounded-full hover:bg-gray-400'}`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Contador de Slides */}
          <div className="text-sm font-medium bg-gray-700 px-4 py-2 rounded-lg">
            <span className="text-blue-400 font-bold">{slideAtual + 1}</span>
            <span className="text-gray-600 dark:text-gray-300 mx-1">/</span>
            <span className="text-gray-300">{totalSlides}</span>
          </div>

          {/* Timer */}
          {!isPausado && (
            <div className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg">
              <svg className="w-4 h-4 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono text-gray-300">
                {segundosRestantes}s
              </span>
            </div>
          )}
        </div>

        {/* Botões Direita: Play/Pause e Próximo */}
        <div className="flex items-center gap-3">
          
          {/* Botão Play/Pause */}
          <button
            onClick={isPausado ? onRetomar : onPausar}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${isPausado ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500' }`}
            aria-label={isPausado ? 'Retomar slideshow' : 'Pausar slideshow'}
          >
            {isPausado ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>RETOMAR</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>PAUSAR</span>
              </>
            )}
          </button>

          {/* Botão Próximo */}
          <button
            onClick={onProximo}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={totalSlides <= 1}
            aria-label="Próximo slide"
          >
            <span className="font-medium">Próximo</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Barra de Progresso do Timer */}
      {!isPausado && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div
            className="h-1 bg-blue-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${((30000 - tempoRestante) / 30000) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
}