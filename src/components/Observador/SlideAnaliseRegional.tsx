// =====================================================
// SLIDE 3: ANÁLISE REGIONAL DE VENDAS
// =====================================================

// =====================================================
// SLIDE 3: ANÁLISE REGIONAL DE VENDAS
// =====================================================
import type { CidadeVenda, CrescimentoCidade } from '../../types/observador';
import { 
  formatarMoeda, 
  formatarMoedaCompacta,
  formatarPercentual,
  obterNomeMesCompleto 
} from '../../utils/observador-helpers';

interface SlideAnaliseRegionalProps {
  cidadesVenda: CidadeVenda[];
  crescimentoCidades: CrescimentoCidade[];
  mesAtual: number;
  anoAtual: number;
}

/**
 * Slide exibindo análise de vendas por região/cidade
 * Top 10 cidades + indicadores de crescimento
 */
export function SlideAnaliseRegional({
  cidadesVenda,
  crescimentoCidades,
  mesAtual,
  anoAtual,
}: SlideAnaliseRegionalProps) {

  // Pegar as 5 cidades com maior crescimento positivo
  const top5Crescimento = crescimentoCidades
    .filter(c => c.crescimentoPercentual > 0)
    .slice(0, 5);

  // Pegar as 5 cidades com maior queda
  const top5Queda = crescimentoCidades
    .filter(c => c.crescimentoPercentual < 0)
    .sort((a, b) => a.crescimentoPercentual - b.crescimentoPercentual)
    .slice(0, 5);

  // Calcular valor máximo para escala do gráfico de barras
  const valorMaximo = Math.max(...cidadesVenda.map(c => c.faturamento), 1);

  // Ícone de tendência
  const IconeTendencia = ({ tendencia }: { tendencia: 'subindo' | 'descendo' | 'estavel' }) => {
    if (tendencia === 'subindo') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        </svg>
      );
    } else if (tendencia === 'descendo') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-green-50 to-teal-50 p-8 flex flex-col">
      
      {/* Título do Slide */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Análise Regional
        </h2>
        <p className="text-xl text-gray-600">
          Vendas por Cidade • {obterNomeMesCompleto(mesAtual)} de {anoAtual}
        </p>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        
        {/* Coluna Esquerda: Top 10 Cidades */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">🗺️</span>
            Top 10 Cidades
          </h3>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {cidadesVenda.map((cidade, index) => {
              const larguraBarra = (cidade.faturamento / valorMaximo) * 100;
              const crescimento = crescimentoCidades.find(c => c.cidade === cidade.cidade);

              return (
                <div key={cidade.cidade} className="group">
                  <div className="flex items-center justify-between mb-1">
                    {/* Posição e Nome */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`
                        w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                        ${index < 3 ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-700'}
                      `}>
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-800 truncate">
                        {cidade.cidade}
                      </span>
                    </div>

                    {/* Valor */}
                    <span className="font-bold text-gray-800 text-lg ml-2">
                      {formatarMoedaCompacta(cidade.faturamento)}
                    </span>
                  </div>

                  {/* Barra Horizontal */}
                  <div className="relative w-full bg-gray-200 rounded-full h-3 mb-1">
                    <div
                      className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 group-hover:from-blue-600 group-hover:to-blue-700"
                      style={{ width: `${larguraBarra}%` }}
                    />
                  </div>

                  {/* Informações Adicionais */}
                  <div className="flex items-center justify-between text-xs text-gray-500 ml-10">
                    <span>{cidade.numeroVendas} vendas</span>
                    {crescimento && (
                      <span className={`font-semibold flex items-center gap-1 ${
                        crescimento.crescimentoPercentual > 0 ? 'text-green-600' : 
                        crescimento.crescimentoPercentual < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {crescimento.crescimentoPercentual > 0 ? '▲' : crescimento.crescimentoPercentual < 0 ? '▼' : '−'}
                        {formatarPercentual(Math.abs(crescimento.crescimentoPercentual), 1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {cidadesVenda.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-center text-gray-400">
                Nenhuma cidade com vendas neste período
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita: Indicadores de Crescimento */}
        <div className="flex flex-col gap-6">
          
          {/* Maiores Crescimentos */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Maiores Crescimentos
            </h3>

            {top5Crescimento.length > 0 ? (
              <div className="space-y-3">
                {top5Crescimento.map((cidade) => (
                  <div key={cidade.cidade} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <IconeTendencia tendencia={cidade.tendencia} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {cidade.cidade}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatarMoeda(cidade.mesAtual)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        +{formatarPercentual(cidade.crescimentoPercentual, 1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        vs mês anterior
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                Nenhuma cidade com crescimento positivo
              </p>
            )}
          </div>

          {/* Maiores Quedas */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📉</span>
              Maiores Quedas
            </h3>

            {top5Queda.length > 0 ? (
              <div className="space-y-3">
                {top5Queda.map((cidade) => (
                  <div key={cidade.cidade} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <IconeTendencia tendencia={cidade.tendencia} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {cidade.cidade}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatarMoeda(cidade.mesAtual)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatarPercentual(cidade.crescimentoPercentual, 1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        vs mês anterior
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                Nenhuma cidade com queda
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé com Resumo */}
      
    </div>
  );
}