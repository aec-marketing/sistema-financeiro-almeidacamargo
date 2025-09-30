// =====================================================
// CARD DE VENDEDOR COM PERFORMANCE
// =====================================================

// =====================================================
// CARD DE VENDEDOR COM PERFORMANCE
// =====================================================
import type { VendedorPerformance } from '../../types/observador';
import { BarraProgressoMeta } from './BarraProgressoMeta';
import { 
  formatarMoeda, 
  formatarPercentual,
  gerarIniciais 
} from '../../utils/observador-helpers';

interface CardVendedorProps {
  vendedor: VendedorPerformance;
  destacarTop3?: boolean;
}

/**
 * Card individual exibindo performance de um vendedor
 * Mostra metas mensal/anual e top 3 marcas
 */
export function CardVendedor({ 
  vendedor}: CardVendedorProps) {
  
  const iniciais = gerarIniciais(vendedor.nome);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-blue-300 transition-all">
      
      {/* Header do Card - Avatar e Nome */}
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {vendedor.avatar ? (
            <img 
              src={vendedor.avatar} 
              alt={vendedor.nome}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{iniciais}</span>
          )}
        </div>

        {/* Nome e Email */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate">
            {vendedor.nome}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {vendedor.email}
          </p>
        </div>
      </div>

      {/* Meta Anual (Compacta) */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <BarraProgressoMeta
          valorRealizado={vendedor.vendasAnoAtual}
          valorMeta={vendedor.metaAnual}
          percentual={vendedor.progressoAnual}
          label="Meta Anual"
          altura="pequena"
          mostrarValores={false}
          mostrarPercentual={true}
        />
      </div>

      {/* Meta Mensal (Destaque Principal) */}
      <div className="mb-5">
        <BarraProgressoMeta
          valorRealizado={vendedor.vendasMesAtual}
          valorMeta={vendedor.metaMensal}
          percentual={vendedor.progressoMensal}
          label="Meta Mensal"
          altura="grande"
          mostrarValores={true}
          mostrarPercentual={true}
        />
      </div>

      {/* Top 3 Marcas */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Top 3 Marcas
        </h4>
        
        <div className="space-y-2">
          {vendedor.top3Marcas.map((marca, index) => (
            <div 
              key={marca.nome}
              className="flex items-center justify-between"
            >
              {/* Posição e Nome da Marca */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`
                  text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                  ${index === 0 ? 'bg-yellow-400 text-yellow-900' : ''}
                  ${index === 1 ? 'bg-gray-300 text-gray-700' : ''}
                  ${index === 2 ? 'bg-orange-400 text-orange-900' : ''}
                `}>
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700 truncate">
                  {marca.nome}
                </span>
              </div>

              {/* Valor e Percentual */}
              <div className="text-right">
                <div className="text-sm font-bold text-gray-800">
                  {formatarMoeda(marca.total)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatarPercentual(marca.percentual, 0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem se não houver marcas */}
        {vendedor.top3Marcas.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Sem vendas de marcas registradas
          </p>
        )}
      </div>

    </div>
  );
}