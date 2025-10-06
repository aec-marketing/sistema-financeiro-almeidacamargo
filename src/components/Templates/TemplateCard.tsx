// src/components/Templates/TemplateCard.tsx
import { useState } from 'react';
import { 
  Star, 
  Play, 
  Copy, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  Filter,
  BarChart3,
  Calendar,
  X,
  Check
} from 'lucide-react';
import type { TemplateRelatorio } from '../../hooks/useTemplates';

interface TemplateCardProps {
  template: TemplateRelatorio;
  onAplicar: () => void;
  onExcluir: () => void;
  onDuplicar: (novoNome?: string) => void;
  onAlternarFavorito: () => void;
  onAtualizar: (dados: { nome?: string; descricao?: string }) => void;
}

export default function TemplateCard({
  template,
  onAplicar,
  onExcluir,
  onDuplicar,
  onAlternarFavorito,
  onAtualizar
}: TemplateCardProps) {
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nomeEditado, setNomeEditado] = useState(template.nome);
  const [descricaoEditada, setDescricaoEditada] = useState(template.descricao || '');

  // Formatar data
  const formatarData = (dataIso: string) => {
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Salvar edição
  const salvarEdicao = () => {
    if (nomeEditado.trim() && nomeEditado !== template.nome || descricaoEditada !== template.descricao) {
      onAtualizar({
        nome: nomeEditado.trim(),
        descricao: descricaoEditada.trim()
      });
    }
    setEditando(false);
  };

  // Cancelar edição
  const cancelarEdicao = () => {
    setNomeEditado(template.nome);
    setDescricaoEditada(template.descricao || '');
    setEditando(false);
  };

  // Confirmar exclusão
  const confirmarExclusao = () => {
    if (window.confirm(`Tem certeza que deseja excluir o template "${template.nome}"?`)) {
      onExcluir();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md dark:shadow-gray-900/50 transition-shadow relative">
      {/* Header do card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {editando ? (
            <input
              type="text"
              value={nomeEditado}
              onChange={(e) => setNomeEditado(e.target.value)}
              className="w-full font-semibold text-lg text-gray-900 dark:text-white border-b border-blue-300 focus:outline-none focus:border-blue-500 bg-transparent"
              maxLength={255}
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
              {template.nome}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Botão favorito */}
          <button
            onClick={onAlternarFavorito}
            className={`p-1 rounded transition-colors ${ template.favorito ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500' }`}
            title={template.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star className={`w-5 h-5 ${template.favorito ? 'fill-current' : ''}`} />
          </button>

          {/* Menu de ações */}
          <div className="relative">
            <button
              onClick={() => setMostrarMenu(!mostrarMenu)}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-600 rounded transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {mostrarMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 py-1 z-10">
                <button
                  onClick={() => {
                    setEditando(true);
                    setMostrarMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 w-full text-left"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    onDuplicar();
                    setMostrarMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 w-full text-left"
                >
                  <Copy className="w-4 h-4" />
                  Duplicar
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    confirmarExclusao();
                    setMostrarMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div className="mb-4">
        {editando ? (
          <textarea
            value={descricaoEditada}
            onChange={(e) => setDescricaoEditada(e.target.value)}
            placeholder="Adicione uma descrição..."
            className="w-full text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            maxLength={500}
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {template.descricao || 'Sem descrição'}
          </p>
        )}
      </div>

      {/* Configurações do template */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {template.filtros.length} filtros
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {template.graficos_config.length} gráficos
          </span>
        </div>
      </div>

      {/* Data de criação */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-600 dark:text-gray-300">
        <Calendar className="w-3 h-3" />
        Criado em {formatarData(template.created_at)}
      </div>

      {/* Ações principais */}
      {editando ? (
        <div className="flex gap-2">
          <button
            onClick={salvarEdicao}
            disabled={!nomeEditado.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
          <button
            onClick={cancelarEdicao}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onAplicar}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            Usar Template
          </button>
        </div>
      )}

      {/* Overlay para fechar menu quando clicar fora */}
      {mostrarMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setMostrarMenu(false)}
        />
      )}
    </div>
  );
}