// =====================================================
// BARRA DE PROGRESSO COM CORES DINÂMICAS
// =====================================================

import { useMemo } from 'react';
import { 
  formatarMoeda, 
  formatarPercentual, 
  obterCorProgresso,
  obterClassesCorProgresso,
  obterClassesTextoCorProgresso
} from '../../utils/observador-helpers';
import type { CorProgresso } from '../../types/observador';

interface BarraProgressoMetaProps {
  valorRealizado: number;
  valorMeta: number;
  percentual: number;
  label?: string;
  altura?: 'pequena' | 'media' | 'grande';
  mostrarValores?: boolean;
  mostrarPercentual?: boolean;
  className?: string;
}

/**
 * Componente de barra de progresso para visualização de metas
 * Cores automáticas baseadas no percentual atingido
 */
export function BarraProgressoMeta({
  valorRealizado,
  valorMeta,
  percentual,
  label,
  altura = 'media',
  mostrarValores = true,
  mostrarPercentual = true,
  className = ''
}: BarraProgressoMetaProps) {
  
  // Determina cor baseada no percentual
  const cor: CorProgresso = useMemo(
    () => obterCorProgresso(percentual),
    [percentual]
  );

  // Classes de altura
  const classesAltura = {
    pequena: 'h-2',
    media: 'h-4',
    grande: 'h-6'
  };

  // Garante que o percentual não ultrapasse 100% visualmente
  const percentualVisual = Math.min(percentual, 100);

  return (
    <div className={`w-full ${className}`}>
      
      {/* Label e Percentual */}
      {(label || mostrarPercentual) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">
              {label}
            </span>
          )}
          {mostrarPercentual && (
            <span className={`text-sm font-bold ${obterClassesTextoCorProgresso(cor)}`}>
              {formatarPercentual(percentual)}
            </span>
          )}
        </div>
      )}

      {/* Barra de Progresso */}
      <div className="relative w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`${classesAltura[altura]} ${obterClassesCorProgresso(cor)} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentualVisual}%` }}
        >
          {/* Brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
        </div>
      </div>

      {/* Valores Realizado / Meta */}
      {mostrarValores && (
        <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
          <span className="font-medium">
            {formatarMoeda(valorRealizado)}
          </span>
          <span className="text-gray-400">
            Meta: {formatarMoeda(valorMeta)}
          </span>
        </div>
      )}

      {/* Indicador se passou da meta */}
      {percentual > 100 && (
        <div className="mt-1 text-xs text-green-600 font-semibold flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
          <span>Meta superada!</span>
        </div>
      )}
    </div>
  );
}