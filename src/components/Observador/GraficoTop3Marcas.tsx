// =====================================================
// GRÁFICO HORIZONTAL - TOP 3 MARCAS
// =====================================================

// =====================================================
// GRÁFICO HORIZONTAL - TOP 3 MARCAS
// =====================================================
import type { MarcaPerformance } from '../../types/observador';
import { formatarMoeda, formatarPercentual } from '../../utils/observador-helpers';

interface GraficoTop3MarcasProps {
  marcas: MarcaPerformance[];
  altura?: 'pequena' | 'media' | 'grande';
  mostrarValores?: boolean;
  className?: string;
}

/**
 * Gráfico de barras horizontais para exibir top 3 marcas
 * Usado em cards de vendedores ou análises de marca
 */
export function GraficoTop3Marcas({
  marcas,
  altura = 'media',
  mostrarValores = true,
  className = '',
}: GraficoTop3MarcasProps) {

  // Classes de altura das barras
  const classesAltura = {
    pequena: 'h-4',
    media: 'h-6',
    grande: 'h-8',
  };

  // Cores para as medalhas (top 3)
  const coresMedalhas = [
    'from-yellow-400 to-yellow-600', // Ouro
    'from-gray-300 to-gray-500',     // Prata
    'from-orange-400 to-orange-600', // Bronze
  ];

  // Se não houver marcas
  if (marcas.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-400 text-sm ${className}`}>
        Sem dados de marcas
      </div>
    );
  }

  // Encontrar valor máximo para escala
  const valorMaximo = Math.max(...marcas.map(m => m.total), 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {marcas.map((marca, index) => {
        const larguraBarra = (marca.total / valorMaximo) * 100;
        const corMedalha = coresMedalhas[index] || 'from-blue-400 to-blue-600';

        return (
          <div key={marca.nome} className="group">
            
            {/* Nome e Valor */}
            <div className="flex items-center justify-between mb-1">
              
              {/* Posição e Nome */}
              <div className="items-center gap-2 flex-1 min-w-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-gradient-to-br ${corMedalha} shadow-sm`}>
                  {index + 1}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm truncate">
                  {marca.nome}
                </span>
              </div>

              {/* Valor e Percentual */}
              {mostrarValores && (
                <div className="text-right ml-2">
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {formatarMoeda(marca.total)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {formatarPercentual(marca.percentual, 0)}
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Progresso */}
            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`${classesAltura[altura]} bg-gradient-to-r ${corMedalha} rounded-full transition-all duration-700 ease-out group-hover:opacity-90`}
                style={{ width: `${larguraBarra}%` }}
              >
                {/* Brilho animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
              </div>
            </div>

            {/* Percentual abaixo da barra (alternativa) */}
            {!mostrarValores && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 text-right">
                {formatarPercentual(marca.percentual, 1)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}