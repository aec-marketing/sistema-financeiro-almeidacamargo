// =====================================================
// SLIDE 1: PERFORMANCE INDIVIDUAL DOS VENDEDORES
// =====================================================

// =====================================================
// SLIDE 1: PERFORMANCE INDIVIDUAL DOS VENDEDORES
// =====================================================
import type { VendedorPerformance } from '../../types/observador';
import { CardVendedor } from './CardVendedor';
import { obterNomeMesCompleto } from '../../utils/observador-helpers';

interface SlideVendedoresProps {
  vendedores: VendedorPerformance[];
  mesAtual: number;
  anoAtual: number;
  paginaAtual?: number;
  vendedoresPorPagina?: number;
  modoPrivado?: boolean;
}

/**
 * Slide exibindo performance individual de vendedores
 * Layout adaptável: até 6 vendedores por página
 */
export function SlideVendedores({
  vendedores,
  mesAtual,
  anoAtual,
  paginaAtual = 0,
  vendedoresPorPagina = 6,
  modoPrivado = false,
}: SlideVendedoresProps) {
  
  // Calcular vendedores da página atual
  const inicio = paginaAtual * vendedoresPorPagina;
  const fim = inicio + vendedoresPorPagina;
  const vendedoresPagina = vendedores.slice(inicio, fim);

  // Calcular total de páginas
  const totalPaginas = Math.ceil(vendedores.length / vendedoresPorPagina);
  const temMultiplasPaginas = totalPaginas > 1;

  // Mensagem de fallback se não houver vendedores
  if (vendedores.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            Nenhum vendedor encontrado
          </h2>
          <p className="text-gray-500">
            Não há dados de vendedores para exibir no momento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex flex-col">
      
      {/* Título do Slide */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Performance dos Vendedores
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-xl text-gray-600">
            {obterNomeMesCompleto(mesAtual)} de {anoAtual}
          </p>
          
          {/* Indicador de página */}
          {temMultiplasPaginas && (
            <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow">
              Página {paginaAtual + 1} de {totalPaginas}
            </div>
          )}
        </div>
      </div>

      {/* Grid de Vendedores */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto p-2">
        {vendedoresPagina.map((vendedor) => (
          <CardVendedor
            key={vendedor.id}
            vendedor={vendedor}
            modoPrivado={modoPrivado}
          />
        ))}
      </div>

      
    </div>
  );
}