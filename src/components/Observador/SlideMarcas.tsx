// =====================================================
// SLIDE: PERFORMANCE POR MARCA
// =====================================================

import { useMarcasPerformance } from '../../hooks/useMarcasPerformance';
import { formatarMoeda } from '../../utils/formatters';

interface SlideMarcasProps {
  mes: number;
  ano: number;
  modoPrivado?: boolean;
}

export function SlideMarcas({ mes, ano, modoPrivado = false }: SlideMarcasProps) {
  const { marcas, isLoading } = useMarcasPerformance(mes, ano);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-2xl">Carregando dados...</div>
      </div>
    );
  }

  // Separar ALCAM das outras marcas
  const alcam = marcas.find(m => m.nome === 'ALCAM');
  const outrasMarcas = marcas.filter(m => m.nome !== 'ALCAM');

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-white mb-2">
          Performance por Marca
        </h2>
        <p className="text-blue-200 text-xl">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Card ALCAM (separado, largura total) */}
      {alcam && (
        <div className="mb-6">
          <div
            className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg p-6"
          >
            <div className="grid grid-cols-3 gap-6">
              {/* Coluna Principal ALCAM */}
              <div className="col-span-1">
                <div className="text-center mb-4">
                  <h3 className="text-3xl font-bold text-orange-600">
                    {alcam.nome}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Grupo Almeida & Camargo</p>
                </div>

                {/* Total Ano ALCAM */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Total Ano</span>
                  </div>

                  {!modoPrivado && (
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {formatarMoeda(alcam.totalAno)}
                    </div>
                  )}

                  <div className={`text-lg font-semibold mb-2 ${modoPrivado ? 'text-orange-600 text-2xl' : 'text-gray-600'}`}>
                    {alcam.percentualAno.toFixed(1)}% do total
                  </div>

                  <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(alcam.percentualAno, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Total Mês ALCAM */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Mês Atual</span>
                  </div>

                  {!modoPrivado && (
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatarMoeda(alcam.totalMes)}
                    </div>
                  )}

                  <div className={`text-lg font-semibold ${modoPrivado ? 'text-green-600 text-xl' : 'text-gray-600'}`}>
                    {alcam.percentualMes.toFixed(1)}% do ano
                  </div>
                </div>
              </div>

              {/* Detalhamento das Submarcas */}
              <div className="col-span-2 border-l-2 border-orange-300 pl-6">
                <h4 className="text-lg font-bold text-gray-700 mb-4">Composição do Grupo:</h4>
                <div className="grid grid-cols-2 gap-4">
                  {alcam.submarcas && alcam.submarcas.length > 0 ? (
                    alcam.submarcas.map(submarca => (
                      <div key={submarca.nome} className={`bg-white rounded-lg p-4 shadow-sm ${submarca.totalAno === 0 ? 'opacity-60' : ''}`}>
                        <div className="text-sm font-semibold text-orange-600 mb-2">
                          {submarca.nome}
                        </div>
                        {submarca.totalAno > 0 ? (
                          <>
                            {!modoPrivado && (
                              <>
                                <div className="text-lg font-bold text-gray-800 mb-1">
                                  {formatarMoeda(submarca.totalAno)}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  Total ano • {submarca.percentualDoGrupo.toFixed(1)}% do grupo
                                </div>
                              </>
                            )}
                            {modoPrivado && (
                              <div className="text-lg font-bold text-orange-600 mb-2">
                                {submarca.percentualDoGrupo.toFixed(1)}% do grupo
                              </div>
                            )}
                            <div className="w-full bg-orange-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-orange-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(submarca.percentualDoGrupo, 100)}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            Sem vendas neste período
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-500 py-4">
                      Nenhuma submarca cadastrada
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards - Outras Marcas */}
      <div className="flex-1 grid grid-cols-3 gap-6">
        {outrasMarcas.map((marca) => (
            <div
              key={marca.nome}
              className="bg-white rounded-xl shadow-lg p-6 flex flex-col"
            >
              {/* Nome da Marca */}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {marca.nome}
                </h3>
              </div>

              {/* Total Ano */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-600">Total Ano</span>
                </div>

                {!modoPrivado && (
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {formatarMoeda(marca.totalAno)}
                  </div>
                )}

                <div className={`text-lg font-semibold mb-2 ${modoPrivado ? 'text-blue-600 text-2xl' : 'text-gray-500'}`}>
                  {marca.percentualAno.toFixed(1)}% do total
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(marca.percentualAno, 100)}%` }}
                  />
                </div>
              </div>

              {/* Total Mês */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-600">Mês Atual</span>
                </div>

                {!modoPrivado && (
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatarMoeda(marca.totalMes)}
                  </div>
                )}

                <div className={`text-lg font-semibold ${modoPrivado ? 'text-green-600 text-xl' : 'text-gray-500'}`}>
                  {marca.percentualMes.toFixed(1)}% do ano
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-auto">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(marca.percentualMes, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}