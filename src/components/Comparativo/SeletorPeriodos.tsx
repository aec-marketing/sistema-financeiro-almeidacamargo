// src/components/Comparativo/SeletorPeriodos.tsx

/**
 * Componente para seleção de períodos de comparação
 * Oferece botões rápidos e seleção customizada de datas
 */

import { useState } from 'react';
import type { PeriodoComparacao, TipoPeriodo } from '../../types/comparativo';
import { TIPOS_PERIODO } from '../../types/comparativo';

// ============================================
// INTERFACES
// ============================================

interface SeletorPeriodosProps {
  onPeriodosSelecionados: (periodos: PeriodoComparacao) => void;
  periodosAtuais?: PeriodoComparacao | null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SeletorPeriodos({
  onPeriodosSelecionados,
  periodosAtuais
}: SeletorPeriodosProps) {
  
  // ============================================
  // ESTADOS
  // ============================================

  const [modoSelecao, setModoSelecao] = useState<'rapido' | 'custom'>('rapido');
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPeriodo | null>(null);

  // Estados para seleção customizada
  const [dataInicioA, setDataInicioA] = useState('');
  const [dataFimA, setDataFimA] = useState('');
  const [dataInicioB, setDataInicioB] = useState('');
  const [dataFimB, setDataFimB] = useState('');
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');

  // ============================================
  // FUNÇÕES AUXILIARES DE DATA
  // ============================================

  /**
   * Retorna o primeiro e último dia do mês atual
   */
  const obterMesAtual = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: primeiroDia, fim: ultimoDia };
  };

  /**
   * Retorna o primeiro e último dia do mês anterior
   */
  const obterMesAnterior = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: primeiroDia, fim: ultimoDia };
  };

  /**
   * Retorna o mesmo mês do ano anterior
   */
  const obterMesmoMesAnoPassado = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear() - 1, hoje.getMonth() + 1, 0);
    return { inicio: primeiroDia, fim: ultimoDia };
  };

  /**
   * Retorna o trimestre atual
   */
  const obterTrimestreAtual = () => {
    const hoje = new Date();
    const trimestreAtual = Math.floor(hoje.getMonth() / 3);
    const primeiroDia = new Date(hoje.getFullYear(), trimestreAtual * 3, 1);
    const ultimoDia = new Date(hoje.getFullYear(), (trimestreAtual + 1) * 3, 0);
    return { inicio: primeiroDia, fim: ultimoDia };
  };

  /**
   * Retorna o trimestre anterior
   */
  const obterTrimestreAnterior = () => {
    const hoje = new Date();
    const trimestreAtual = Math.floor(hoje.getMonth() / 3);
    const trimestreAnterior = trimestreAtual - 1;
    
    let ano = hoje.getFullYear();
    let trimestre = trimestreAnterior;
    
    // Se o trimestre anterior for negativo, voltar para o último trimestre do ano anterior
    if (trimestre < 0) {
      ano -= 1;
      trimestre = 3;
    }
    
    const primeiroDia = new Date(ano, trimestre * 3, 1);
    const ultimoDia = new Date(ano, (trimestre + 1) * 3, 0);
    return { inicio: primeiroDia, fim: ultimoDia };
  };





  /**
   * Formata data para label legível (ex: "Janeiro 2025")
   */
  const formatarLabel = (inicio: Date, fim: Date): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Se for mesmo mês, mostrar "Mês Ano"
    if (inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear()) {
      return `${meses[inicio.getMonth()]} ${inicio.getFullYear()}`;
    }
    
    // Se for mesmo ano mas meses diferentes
    if (inicio.getFullYear() === fim.getFullYear()) {
      return `${meses[inicio.getMonth()]} a ${meses[fim.getMonth()]} ${inicio.getFullYear()}`;
    }
    
    // Anos diferentes
    return `${meses[inicio.getMonth()]}/${inicio.getFullYear()} a ${meses[fim.getMonth()]}/${fim.getFullYear()}`;
  };

  /**
   * Formata data para input (YYYY-MM-DD)
   */
  const formatarDataInput = (data: Date): string => {
    return data.toISOString().split('T')[0];
  };

  // ============================================
  // HANDLERS DOS BOTÕES RÁPIDOS
  // ============================================

  const handleSelecaoRapida = (tipo: TipoPeriodo) => {
    setTipoSelecionado(tipo);
    let periodoA, periodoB;

    switch (tipo) {
      case 'mom': // Mês vs Mês Anterior
        periodoA = obterMesAnterior();
        periodoB = obterMesAtual();
        break;
      
      case 'yoy': // Ano vs Ano Anterior (mesmo mês)
        periodoA = obterMesmoMesAnoPassado();
        periodoB = obterMesAtual();
        break;
      
      case 'qoq': // Trimestre vs Trimestre Anterior
        periodoA = obterTrimestreAnterior();
        periodoB = obterTrimestreAtual();
        break;
      
      default:
        return;
    }

    // Montar objeto de períodos
    const periodos: PeriodoComparacao = {
      periodoA: {
        inicio: periodoA.inicio,
        fim: periodoA.fim,
        label: formatarLabel(periodoA.inicio, periodoA.fim)
      },
      periodoB: {
        inicio: periodoB.inicio,
        fim: periodoB.fim,
        label: formatarLabel(periodoB.inicio, periodoB.fim)
      }
    };

    // Notificar componente pai
    onPeriodosSelecionados(periodos);
  };

  // ============================================
  // HANDLER DE SELEÇÃO CUSTOMIZADA
  // ============================================

  const handleSelecaoCustomizada = () => {
    // Validar se todas as datas foram preenchidas
    if (!dataInicioA || !dataFimA || !dataInicioB || !dataFimB) {
      alert('Preencha todas as datas');
      return;
    }

    // Converter strings para Date
    const inicioA = new Date(dataInicioA);
    const fimA = new Date(dataFimA);
    const inicioB = new Date(dataInicioB);
    const fimB = new Date(dataFimB);

    // Validar datas
    if (inicioA >= fimA) {
      alert('Data inicial do Período A deve ser anterior à data final');
      return;
    }
    if (inicioB >= fimB) {
      alert('Data inicial do Período B deve ser anterior à data final');
      return;
    }

    // Montar objeto de períodos
    const periodos: PeriodoComparacao = {
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

    // Notificar componente pai
    onPeriodosSelecionados(periodos);
    setTipoSelecionado('custom');
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      
      {/* Abas: Rápido vs Customizado */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setModoSelecao('rapido')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            modoSelecao === 'rapido'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          ⚡ Seleção Rápida
        </button>
        <button
          onClick={() => setModoSelecao('custom')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            modoSelecao === 'custom'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          📅 Período Customizado
        </button>
      </div>

      {/* MODO: Seleção Rápida */}
      {modoSelecao === 'rapido' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Escolha uma das comparações pré-definidas:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Botão: Mês vs Mês Anterior */}
            <button
              onClick={() => handleSelecaoRapida('mom')}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                tipoSelecionado === 'mom'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                📊 Este mês vs Mês anterior
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {TIPOS_PERIODO.mom.descricao}
              </div>
            </button>

            {/* Botão: Ano vs Ano Anterior */}
            <button
              onClick={() => handleSelecaoRapida('yoy')}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                tipoSelecionado === 'yoy'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                📈 Este mês vs Mesmo mês ano passado
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {TIPOS_PERIODO.yoy.descricao}
              </div>
            </button>

            {/* Botão: Trimestre vs Trimestre Anterior */}
            <button
              onClick={() => handleSelecaoRapida('qoq')}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                tipoSelecionado === 'qoq'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                📅 Este trimestre vs Trimestre anterior
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {TIPOS_PERIODO.qoq.descricao}
              </div>
            </button>

            {/* Botão: Customizado */}
            <button
              onClick={() => setModoSelecao('custom')}
              className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-left transition-all hover:border-blue-400 dark:hover:border-blue-600"
            >
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                🎯 Período Customizado
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Defina datas específicas para comparar
              </div>
            </button>
          </div>
        </div>
      )}

      {/* MODO: Seleção Customizada */}
      {modoSelecao === 'custom' && (
        <div className="space-y-6">
          
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
                <input
                  type="date"
                  value={dataInicioA}
                  onChange={(e) => setDataInicioA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dataFimA}
                  onChange={(e) => setDataFimA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                placeholder="Ex: Janeiro 2025"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <input
                  type="date"
                  value={dataInicioB}
                  onChange={(e) => setDataInicioB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dataFimB}
                  onChange={(e) => setDataFimB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
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
                placeholder="Ex: Abril 2025"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botão de Aplicar */}
          <div className="flex justify-end">
            <button
              onClick={handleSelecaoCustomizada}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Aplicar Períodos
            </button>
          </div>
        </div>
      )}

      {/* Preview dos Períodos Selecionados */}
      {periodosAtuais && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            ✅ Períodos Selecionados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Período A</p>
              <p className="font-bold text-gray-900 dark:text-white">{periodosAtuais.periodoA.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatarDataInput(periodosAtuais.periodoA.inicio)} até {formatarDataInput(periodosAtuais.periodoA.fim)}
              </p>
            </div>
            
            <div className="text-center text-2xl font-bold text-gray-400">VS</div>
            
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Período B</p>
              <p className="font-bold text-gray-900 dark:text-white">{periodosAtuais.periodoB.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {formatarDataInput(periodosAtuais.periodoB.inicio)} até {formatarDataInput(periodosAtuais.periodoB.fim)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}