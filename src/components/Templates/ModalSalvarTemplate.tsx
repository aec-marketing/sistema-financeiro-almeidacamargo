import { useState } from 'react';
import { X, Save, Star, FileText } from 'lucide-react';

interface ModalSalvarTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nome: string, descricao: string, favorito: boolean) => Promise<void>;
  filtrosAtivos: number;
  graficosAtivos: number;
  nomeRelatorioAtual: string;
  loading: boolean;
}

export default function ModalSalvarTemplate({
  isOpen,
  onClose,
  onSave,
  filtrosAtivos,
  graficosAtivos,
  nomeRelatorioAtual}: ModalSalvarTemplateProps) {
  const [nome, setNome] = useState(nomeRelatorioAtual || '');
  const [descricao, setDescricao] = useState('');
  const [favorito, setFavorito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!nome.trim()) return;

    try {
      setSalvando(true);
      await onSave(nome.trim(), descricao.trim(), favorito);

      // Limpar formulário e fechar modal
      setNome('');
      setDescricao('');
      setFavorito(false);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleClose = () => {
    setNome('');
    setDescricao('');
    setFavorito(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Salvar Template
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-600"
            disabled={salvando}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Resumo do que será salvo */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">O que será salvo:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• {filtrosAtivos} filtros ativos</li>
              <li>• {graficosAtivos} gráficos configurados</li>
            </ul>
          </div>

          {/* Nome do template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Nome do Template *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Análise de Vendas Q1 2024"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={salvando}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva quando usar este template..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={salvando}
            />
          </div>

          {/* Favorito */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="favorito"
              checked={favorito}
              onChange={(e) => setFavorito(e.target.checked)}
              className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              disabled={salvando}
            />
            <label htmlFor="favorito" className="ml-2 block text-sm text-gray-700 dark:text-gray-200 items-center gap-1">
              <Star className="w-4 h-4" />
              Marcar como favorito
            </label>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nome.trim() || salvando}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar Template'}
          </button>
        </div>
      </div>
    </div>
  );
}