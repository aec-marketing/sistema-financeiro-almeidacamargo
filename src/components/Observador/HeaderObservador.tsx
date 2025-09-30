// =====================================================
// HEADER DO DASHBOARD OBSERVADOR
// =====================================================

import { useEffect, useState } from 'react';
import { formatarData, formatarTimestamp } from '../../utils/observador-helpers';

interface HeaderObservadorProps {
  ultimaAtualizacao?: Date;
  mostrarLogo?: boolean;
  onLogout?: () => void;
}

/**
 * Cabeçalho do Dashboard Observador
 * Exibe logo da empresa, data/hora atual e timestamp da última atualização
 */
export function HeaderObservador({
  ultimaAtualizacao,
  mostrarLogo = true,
  onLogout
}: HeaderObservadorProps) {
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());

  // Atualiza relógio a cada minuto
  useEffect(() => {
    const intervalo = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 60000); // 1 minuto

    return () => clearInterval(intervalo);
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-8 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        
        {/* Logo e Título */}
        <div className="flex items-center gap-4">
          {mostrarLogo && (
            <div className="bg-white rounded-lg p-2">
              <div className="w-16 h-16 flex items-center justify-center">
                {/* Substitua por sua logo real */}
                <span className="text-blue-900 font-bold text-2xl">A&C</span>
              </div>
            </div>
          )}
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard Observador
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Almeida&Camargo - Performance em Tempo Real
            </p>
          </div>
        </div>

        {/* Data/Hora e Última Atualização */}
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="text-2xl font-semibold">
              {formatarData(dataHoraAtual, 'dd/MM/yyyy')}
            </div>
            <div className="text-lg text-blue-200 mt-1">
              {formatarData(dataHoraAtual, 'HH:mm')}
            </div>

            {ultimaAtualizacao && (
              <div className="text-xs text-blue-300 mt-2 flex items-center justify-end gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Atualizado: {formatarTimestamp(ultimaAtualizacao)}</span>
              </div>
            )}
          </div>

          {/* Botão de Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}