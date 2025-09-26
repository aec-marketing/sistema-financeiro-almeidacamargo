// src/pages/TemplatesPage.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookmarkPlus, Clock, Star, Grid3X3 } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import TemplateCard from '../components/Templates/TemplateCard';
import { useUserAccess } from '../hooks/useUserAccess';

type FiltroTemplate = 'todos' | 'favoritos' | 'recentes';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { user } = useUserAccess();
  const {
    templates,
    templatesFavoritos,
    templatesRecentes,
    loading,
    error,
    excluirTemplate,
    duplicarTemplate,
    alternarFavorito,
    atualizarTemplate
  } = useTemplates(user || undefined);

  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTemplate>('todos');
  const [busca, setBusca] = useState('');

  // Templates filtrados
  const templatesFiltrados = useMemo(() => {
    let lista = templates;

    // Aplicar filtro por categoria
    switch (filtroAtivo) {
      case 'favoritos':
        lista = templatesFavoritos;
        break;
      case 'recentes':
        lista = templatesRecentes;
        break;
      default:
        lista = templates;
    }

    // Aplicar filtro de busca
    if (busca.trim()) {
      lista = lista.filter(template => 
        template.nome.toLowerCase().includes(busca.toLowerCase().trim()) ||
        template.descricao?.toLowerCase().includes(busca.toLowerCase().trim())
      );
    }

    return lista;
  }, [templates, templatesFavoritos, templatesRecentes, filtroAtivo, busca]);

  // Aplicar template (redirecionar para relatórios)
  const aplicarTemplate = (templateId: string) => {
    navigate(`/relatorios?template=${templateId}`);
  };

  // Criar novo relatório
  const criarNovoRelatorio = () => {
    navigate('/relatorios');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-6">
        <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar templates</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BookmarkPlus className="w-8 h-8 text-blue-600" />
              Meus Templates
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie seus templates salvos de relatórios personalizados
            </p>
          </div>
          <button
            onClick={criarNovoRelatorio}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Relatório
          </button>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{templates.length}</p>
                <p className="text-blue-700 text-sm">Templates Salvos</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-900">{templatesFavoritos.length}</p>
                <p className="text-yellow-700 text-sm">Favoritos</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">{templatesRecentes.length}</p>
                <p className="text-green-700 text-sm">Recentes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Filtros */}
          <div className="flex gap-2">
            {[
              { key: 'todos' as FiltroTemplate, label: 'Todos', count: templates.length },
              { key: 'favoritos' as FiltroTemplate, label: 'Favoritos', count: templatesFavoritos.length },
              { key: 'recentes' as FiltroTemplate, label: 'Recentes', count: templatesRecentes.length }
            ].map(filtro => (
              <button
                key={filtro.key}
                onClick={() => setFiltroAtivo(filtro.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroAtivo === filtro.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filtro.label}
                {filtro.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white rounded-full text-xs">
                    {filtro.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de Templates */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {templatesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            {templates.length === 0 ? (
              // Nenhum template criado ainda
              <div>
                <BookmarkPlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum template salvo ainda
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Comece criando um relatório personalizado e salve como template 
                  para reutilizar suas configurações favoritas.
                </p>
                <button
                  onClick={criarNovoRelatorio}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Criar Primeiro Template
                </button>
              </div>
            ) : (
              // Filtros não retornaram resultados
              <div>
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum template encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Tente ajustar os filtros ou termos de busca.
                </p>
                <button
                  onClick={() => {
                    setBusca('');
                    setFiltroAtivo('todos');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesFiltrados.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onAplicar={() => aplicarTemplate(template.id)}
                onExcluir={() => excluirTemplate(template.id)}
                onDuplicar={(novoNome) => duplicarTemplate(template.id, novoNome)}
                onAlternarFavorito={() => alternarFavorito(template.id)}
                onAtualizar={(dados) => atualizarTemplate(template.id, dados)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer com resumo */}
      {templatesFiltrados.length > 0 && (
        <div className="text-center text-gray-600 text-sm">
          Mostrando {templatesFiltrados.length} de {templates.length} templates
        </div>
      )}
    </div>
  );
}