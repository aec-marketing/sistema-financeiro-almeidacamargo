// src/pages/RelatoriosPage.tsx
import { FileText, TrendingUp, Calendar, Users } from 'lucide-react';
import { useUserAccess } from '../hooks/useUserAccess';

export default function RelatoriosPage() {
  const { user, isAdmin } = useUserAccess();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {isAdmin
                ? 'Relatórios e análises completas'
                : `Seus relatórios - ${user?.nome}`
              }
            </p>
          </div>
          <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Tipos de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vendas</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Relatórios de performance de vendas e faturamento</p>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
            Gerar Relatório
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clientes</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Análise de carteira de clientes e comportamento</p>
          <button className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
            Gerar Relatório
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Período</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Relatórios comparativos por período</p>
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* Em Desenvolvimento */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Funcionalidade em Desenvolvimento
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Os relatórios estão sendo desenvolvidos. Em breve você poderá:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>Gerar relatórios personalizados</li>
                <li>Exportar dados em PDF e Excel</li>
                <li>Criar dashboards customizados</li>
                <li>Agendar relatórios automáticos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}