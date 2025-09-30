// =====================================================
// SLIDE 2: MÉTRICAS GLOBAIS DA EMPRESA
// =====================================================

// =====================================================
// SLIDE 2: MÉTRICAS GLOBAIS DA EMPRESA
// =====================================================
import type { MetricasGlobais, ProdutoVenda, ClienteCompra } from '../../types/observador';
import { 
  formatarMoeda, 
  formatarMoedaCompacta,
  formatarNumero,
  formatarPercentual,
  obterNomeMesCompleto 
} from '../../utils/observador-helpers';

interface SlideMetricasGlobaisProps {
  metricas: MetricasGlobais;
  topProdutos: ProdutoVenda[];
  topClientes: ClienteCompra[];
  mesAtual: number;
  anoAtual: number;
}

/**
 * Slide exibindo métricas gerais da empresa
 * KPIs principais + rankings de produtos e clientes
 */
export function SlideMetricasGlobais({
  metricas,
  topProdutos,
  topClientes,
  mesAtual,
  anoAtual,
}: SlideMetricasGlobaisProps) {

  // Função auxiliar para ícone de tendência
  const IconeTendencia = ({ valor }: { valor: number }) => {
    if (valor > 0) {
      return (
        <span className="text-green-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          {formatarPercentual(Math.abs(valor), 1)}
        </span>
      );
    } else if (valor < 0) {
      return (
        <span className="text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
          </svg>
          {formatarPercentual(Math.abs(valor), 1)}
        </span>
      );
    }
    return <span className="text-gray-500">0%</span>;
  };

  return (
    <div className="h-full bg-gradient-to-br from-purple-50 to-pink-50 p-8 flex flex-col">
      
      {/* Título do Slide */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Métricas Globais
        </h2>
        <p className="text-xl text-gray-600">
          {obterNomeMesCompleto(mesAtual)} de {anoAtual}
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        
        {/* Faturamento Total */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-2">Faturamento Total</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {formatarMoedaCompacta(metricas.faturamentoTotal)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">vs mês anterior:</span>
            <IconeTendencia valor={metricas.comparativoMesAnterior.faturamento} />
          </div>
        </div>

        {/* Total de Vendas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-2">Total de Vendas</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {formatarNumero(metricas.totalVendas)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">vs mês anterior:</span>
            <IconeTendencia valor={metricas.comparativoMesAnterior.vendas} />
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-2">Clientes Ativos</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {formatarNumero(metricas.clientesAtivos)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">vs mês anterior:</span>
            <IconeTendencia valor={metricas.comparativoMesAnterior.clientes} />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-2">Ticket Médio</div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {formatarMoeda(metricas.ticketMedio)}
          </div>
          <div className="text-sm text-gray-500">
            por venda
          </div>
        </div>
      </div>

      {/* Seção de Rankings */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        
        {/* Top 5 Produtos */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            Top 5 Produtos Mais Vendidos
          </h3>
          
          <div className="space-y-3">
            {topProdutos.map((produto, index) => (
              <div key={produto.codigoReferencia} className="flex items-center gap-3">
                {/* Posição */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${index === 0 ? 'bg-yellow-400 text-yellow-900' : ''}
                  ${index === 1 ? 'bg-gray-300 text-gray-700' : ''}
                  ${index === 2 ? 'bg-orange-400 text-orange-900' : ''}
                  ${index > 2 ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  {index + 1}
                </div>

                {/* Barra e Informações */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {produto.descricao}
                    </span>
                    <span className="text-sm font-bold text-gray-800 ml-2">
                      {formatarMoeda(produto.faturamento)}
                    </span>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${produto.percentualTotal}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {formatarPercentual(produto.percentualTotal, 1)} do total • {produto.numeroVendas} vendas
                  </div>
                </div>
              </div>
            ))}
          </div>

          {topProdutos.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              Nenhum produto vendido neste período
            </p>
          )}
        </div>

        {/* Top 5 Clientes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            Top 5 Clientes do Mês
          </h3>
          
          <div className="space-y-4">
            {topClientes.map((cliente, index) => (
              <div key={cliente.nomeCliente} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Posição */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                      ${index === 0 ? 'bg-yellow-400 text-yellow-900' : ''}
                      ${index === 1 ? 'bg-gray-300 text-gray-700' : ''}
                      ${index === 2 ? 'bg-orange-400 text-orange-900' : ''}
                      ${index > 2 ? 'bg-purple-100 text-purple-700' : ''}
                    `}>
                      {index + 1}
                    </div>

                    {/* Nome e Cidade */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {cliente.nomeCliente}
                      </div>
                      <div className="text-xs text-gray-500">
                        {cliente.cidade}
                      </div>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="text-right ml-2">
                    <div className="text-lg font-bold text-gray-800">
                      {formatarMoeda(cliente.faturamento)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {cliente.numeroCompras} compras
                    </div>
                  </div>
                </div>

                {/* Ticket Médio */}
                <div className="text-xs text-gray-600 ml-11">
                  Ticket médio: {formatarMoeda(cliente.ticketMedio)}
                </div>
              </div>
            ))}
          </div>

          {topClientes.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              Nenhum cliente encontrado neste período
            </p>
          )}
        </div>
      </div>
    </div>
  );
}