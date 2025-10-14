// src/components/Comparativo/ModalEditarPeriodos.tsx

/**
 * Modal para editar períodos sem sair da página atual
 * Reaplica a comparação automaticamente ao salvar
 */

import { useState, useEffect } from 'react';
import type { PeriodoComparacao } from '../../types/comparativo';

interface ModalEditarPeriodosProps {
  periodosAtuais: PeriodoComparacao;
  onSalvar: (novosPeriodos: PeriodoComparacao) => void;
  onFechar: () => void;
  carregando?: boolean;
}

export default function ModalEditarPeriodos({
  periodosAtuais,
  onSalvar,
  onFechar,
  carregando = false
}: ModalEditarPeriodosProps) {

  // Estados locais do modal
  const [dataInicioA, setDataInicioA] = useState('');
  const [dataFimA, setDataFimA] = useState('');
  const [dataInicioB, setDataInicioB] = useState('');
  const [dataFimB, setDataFimB] = useState('');
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');

  // Preencher com valores atuais ao abrir
  useEffect(() => {
    setDataInicioA(formatarDataInput(periodosAtuais.periodoA.inicio));
    setDataFimA(formatarDataInput(periodosAtuais.periodoA.fim));
    setDataInicioB(formatarDataInput(periodosAtuais.periodoB.inicio));
    setDataFimB(formatarDataInput(periodosAtuais.periodoB.fim));
    setLabelA(periodosAtuais.periodoA.label);
    setLabelB(periodosAtuais.periodoB.label);
  }, [periodosAtuais]);

  const formatarDataInput = (data: Date): string => {
    return data.toISOString().split('T')[0];
  };

  const formatarLabel = (inicio: Date, fim: Date): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    if (inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear()) {
      return `${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
    }
    
    if (inicio.getFullYear() === fim.getFullYear()) {
      return `${meses[inicio.getMonth()]} a ${meses[fim.getMonth()]} ${inicio.getFullYear()}`;
    }
    
    return `${meses[inicio.getMonth()]}/${inicio.getFullYear()} a ${meses[fim.getMonth()]}/${fim.getFullYear()}`;
  };

  const handleSalvar = () => {
    // Validações
    if (!dataInicioA || !dataFimA || !dataInicioB || !dataFimB) {
      alert('Preencha todas as datas');
      return;
    }

    const inicioA = new Date(dataInicioA);
    const fimA = new Date(dataFimA);
    const inicioB = new Date(dataInicioB);
    const fimB = new Date(dataFimB);

    if (inicioA >= fimA) {
      alert('Data inicial do Período A deve ser anterior à data final');
      return;
    }
    if (inicioB >= fimB) {
      alert('Data inicial do Período B deve ser anterior à data final');
      return;
    }

    // Montar objeto de períodos
    const novosPeriodos: PeriodoComparacao = {
      periodoA: {
        inicio: inicioA,
        fim: fimA,
        label: labelA || formatarLabel(inicioA, fimA)
      },
      periodoB: {
        inicio: inicioB,
        fim: fimB,
        label: labelB || formatarLabel(inicioB, fimB)
      }
    };

    // Chamar callback para reaplicar
    onSalvar(novosPeriodos);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Editar Períodos
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Altere as datas e a comparação será refeita automaticamente
              </p>
            </div>
            <button
              onClick={onFechar}
              disabled={carregando}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          
          {/* Período A */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Período A (Base)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Inicial
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataInicioA}
                    onChange={(e) => setDataInicioA(e.target.value)}
                    disabled={carregando}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataFimA}
                    onChange={(e) => setDataFimA(e.target.value)}
                    disabled={carregando}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Label (opcional)
              </label>
              <input
                type="text"
                value={labelA}
                onChange={(e) => setLabelA(e.target.value)}
                disabled={carregando}
                placeholder="Ex: Janeiro 2025"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          {/* VS */}
          <div className="flex justify-center">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full font-bold">
              VS
            </div>
          </div>

          {/* Período B */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
              Período B (Comparar)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Inicial
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataInicioB}
                    onChange={(e) => setDataInicioB(e.target.value)}
                    disabled={carregando}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataFimB}
                    onChange={(e) => setDataFimB(e.target.value)}
                    disabled={carregando}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Label (opcional)
              </label>
              <input
                type="text"
                value={labelB}
                onChange={(e) => setLabelB(e.target.value)}
                disabled={carregando}
                placeholder="Ex: Abril 2025"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {carregando ? 'Reaplicando comparação...' : 'Seus filtros serão mantidos'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onFechar}
              disabled={carregando}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={carregando}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aplicar e Comparar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}