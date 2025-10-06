import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import {
  analisarCSV,
  detectarTabelaDestino,
  mapearColunasAutomaticamente,
  transformarDadosParaInsercao,
  detectarDuplicatas,
  importarDadosEmLotes,
  validarLinha,
  type TabelaDestino,
    CAMPOS_TABELAS  // <-- ADICIONAR ESTA LINHA  
} from '../utils/importacao-inteligente';
import { supabase } from '../lib/supabase';

type Etapa = 'upload' | 'mapeamento' | 'preview' | 'importacao' | 'concluido';

export default function ImportacaoPage() {
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Dados do CSV
  const [headers, setHeaders] = useState<string[]>([]);
  const [dados, setDados] = useState<Record<string, string>[]>([]);
  const [amostra, setAmostra] = useState<Record<string, string>[]>([]);

  // Mapeamento
  const [tabelaDestino, setTabelaDestino] = useState<TabelaDestino>('vendas');
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});

  // Validação e preview
  const [dadosTransformados, setDadosTransformados] = useState<Record<string, string | number | null>[]>([]);
  const [duplicatas, setDuplicatas] = useState<Array<{ linha: number; motivo: string; registro: Record<string, string | number | null> }>>([]);
  const [errosValidacao, setErrosValidacao] = useState<Array<{ linha: number; erros: string[] }>>([]);

  // Importação
  const [progresso, setProgresso] = useState(0);
  const [mensagemProgresso, setMensagemProgresso] = useState('');
  const [resultado, setResultado] = useState<{ sucesso: number; erros: Array<{ linha: number; erro: string }> } | null>(null);

  // Etapa 1: Upload do arquivo
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setLoading(true);

    try {
      // Analisa o CSV
      console.log('Analisando arquivo:', arquivo?.name || file.name);
      const analise = await analisarCSV(file);
      setHeaders(analise.headers);
      setDados(analise.dados);
      setAmostra(analise.amostra);
      
      // Detecta tabela destino automaticamente
      const deteccao = detectarTabelaDestino(analise.headers);
      setTabelaDestino(deteccao.tabela);
      
      // Mapeia colunas automaticamente
      const mapeamentoAuto = mapearColunasAutomaticamente(
        analise.headers,
        analise.amostra[0],
        deteccao.tabela
      );
      setMapeamento(mapeamentoAuto);
      
      setEtapa('mapeamento');
    } catch (error) {
      alert('Erro ao analisar arquivo: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Etapa 2: Confirmar mapeamento
  const handleConfirmarMapeamento = async () => {
    setLoading(true);

    try {
      // Transforma dados
      const transformados = transformarDadosParaInsercao(dados, mapeamento);
      setDadosTransformados(transformados);

      // Valida linhas - converte de volta para Record<string, string> para validação
      const erros: Array<{ linha: number; erros: string[] }> = [];
      transformados.forEach((linha, index) => {
        const linhaParaValidacao: Record<string, string> = {};
        Object.entries(linha).forEach(([key, value]) => {
          linhaParaValidacao[key] = String(value ?? '');
        });
        const validacao = validarLinha(linhaParaValidacao, mapeamento, tabelaDestino);
        if (!validacao.valido) {
          erros.push({ linha: index + 1, erros: validacao.erros });
        }
      });
      setErrosValidacao(erros);
      
      // Detecta duplicatas
      const deteccaoDuplicatas = await detectarDuplicatas(transformados, tabelaDestino, supabase);
      setDuplicatas(deteccaoDuplicatas.duplicatas);
      
      setEtapa('preview');
    } catch (error) {
      alert('Erro ao processar dados: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Etapa 3: Importar dados
  const handleImportar = async () => {
    setLoading(true);
    setEtapa('importacao');
    
    try {
      // Remove duplicatas e linhas com erro
      const linhasParaImportar = dadosTransformados.filter((_, index) => {
        const temErro = errosValidacao.some(e => e.linha === index + 1);
        const ehDuplicata = duplicatas.some(d => d.linha === index + 1);
        return !temErro && !ehDuplicata;
      });
      
      const resultado = await importarDadosEmLotes(
        linhasParaImportar,
        tabelaDestino,
        supabase,
        (prog, msg) => {
          setProgresso(prog);
          setMensagemProgresso(msg);
        }
      );
      
      setResultado(resultado);
      setEtapa('concluido');
    } catch (error) {
      alert('Erro ao importar dados: ' + (error as Error).message);
      setEtapa('preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Upload className="h-6 w-6 sm:h-8 text-blue-600 dark:text-blue-400" />
              Importação Inteligente de Dados
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Importe CSV automaticamente com mapeamento inteligente
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${etapa === 'upload' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'upload' ? 'bg-blue-100' : 'bg-gray-100'}`}>1</div>
            <span className="hidden sm:inline text-sm">Upload</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2" />
          <div className={`flex items-center gap-2 ${etapa === 'mapeamento' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'mapeamento' ? 'bg-blue-100' : 'bg-gray-100'}`}>2</div>
            <span className="hidden sm:inline text-sm">Mapeamento</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2" />
          <div className={`flex items-center gap-2 ${etapa === 'preview' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etapa === 'preview' ? 'bg-blue-100' : 'bg-gray-100'}`}>3</div>
            <span className="hidden sm:inline text-sm">Preview</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2" />
          <div className={`flex items-center gap-2 ${['importacao', 'concluido'].includes(etapa) ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['importacao', 'concluido'].includes(etapa) ? 'bg-blue-100' : 'bg-gray-100'}`}>4</div>
            <span className="hidden sm:inline text-sm">Importar</span>
          </div>
        </div>
      </div>

      {/* Etapa 1: Upload */}
      {etapa === 'upload' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
          <div className="text-center py-12">
            <FileSpreadsheet className="h-16 w-16 text-gray-600 dark:text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Selecione um arquivo CSV
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              O sistema irá analisar automaticamente e sugerir o mapeamento
            </p>
            
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors">
              <Upload className="h-5 w-5" />
              Escolher Arquivo CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
            
            {loading && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                Analisando arquivo...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Etapa 2: Mapeamento */}
      {etapa === 'mapeamento' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Confirmar Mapeamento de Colunas
          </h3>
          
          {/* Seleção de tabela destino */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tabela de Destino
            </label>
            <select
  value={tabelaDestino}
  onChange={(e) => {
    const novaTabela = e.target.value as TabelaDestino;
    setTabelaDestino(novaTabela);
    // Remapeia automaticamente para a nova tabela
    const novoMapeamento = mapearColunasAutomaticamente(headers, amostra[0], novaTabela);
    setMapeamento(novoMapeamento);
  }}
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
>
  <option value="vendas">Vendas</option>
  <option value="clientes">Clientes</option>
  <option value="itens">Produtos</option>
</select>
          </div>
{/* Antes da tabela, adicionar: */}
<div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-blue-900">
        {Object.values(mapeamento).filter(v => v).length} de {headers.length} colunas mapeadas
      </p>
      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
        Arquivo: {arquivo?.name} ({dados.length} linhas)
      </p>
    </div>
    <button
      onClick={() => {
        // Remapeia automaticamente
        const novoMapeamento = mapearColunasAutomaticamente(headers, amostra[0], tabelaDestino);
        setMapeamento(novoMapeamento);
      }}
      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium underline"
    >
      Remapear Automaticamente
    </button>
  </div>
</div>
          {/* Tabela de mapeamento */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                    Coluna no CSV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                    Campo no Sistema
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                    Exemplo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                {headers.map(header => (
                  <tr key={header} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
    {header}
    {mapeamento[header] && (
      <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 text-xs rounded-full">
        ✓ Mapeado
      </span>
    )}
  </td>
  <td className="px-4 py-3">
    <select
      value={mapeamento[header] || ''}
      onChange={(e) => setMapeamento({ ...mapeamento, [header]: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Não importar</option>
      {CAMPOS_TABELAS[tabelaDestino].map(campo => (
        <option key={campo.campo} value={campo.campo}>
          {campo.campo}
        </option>
      ))}
    </select>
  </td>
  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs" title={amostra[0]?.[header]}>
    {amostra[0]?.[header] || '-'}
  </td>
</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setEtapa('upload')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
            >
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Voltar
            </button>
            <button
              onClick={handleConfirmarMapeamento}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400"
            >
              Continuar
              <ArrowRight className="h-4 w-4 inline ml-2" />
            </button>
          </div>
        </div>
      )}

{/* Etapa 3: Preview */}
{etapa === 'preview' && (
  <div className="space-y-4">
    {/* Avisos */}
    {(duplicatas.length > 0 || errosValidacao.length > 0) && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Atenção
        </h4>
        {duplicatas.length > 0 && (
          <p className="text-sm text-yellow-800 mb-1">
            • {duplicatas.length} duplicatas detectadas (serão ignoradas)
          </p>
        )}
        {errosValidacao.length > 0 && (
          <p className="text-sm text-yellow-800">
            • {errosValidacao.length} linhas com erros de validação (serão ignoradas)
          </p>
        )}
      </div>
    )}

    {/* Resumo */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
      <h3 className="text-lg font-semibold mb-4">Resumo da Importação</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dados.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Total de linhas</p>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {dados.length - duplicatas.length - errosValidacao.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Serão importadas</p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{duplicatas.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Duplicatas</p>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{errosValidacao.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Com erros</p>
        </div>
      </div>
    </div>

    {/* Preview dos Dados Transformados */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Preview dos Dados (primeiras 10 linhas)
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Destino: <span className="font-medium text-blue-600 dark:text-blue-400">{tabelaDestino}</span>
        </span>
      </div>

      {/* Tabela de Preview */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-12">
                #
              </th>
              {Object.keys(dadosTransformados[0] || {}).map(campo => (
                <th key={campo} className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">
                  {campo}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-20">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
            {dadosTransformados.slice(0, 10).map((linha, index) => {
              const linhaNum = index + 1;
              const temErro = errosValidacao.some(e => e.linha === linhaNum);
              const ehDuplicata = duplicatas.some(d => d.linha === linhaNum);
              const statusBg = temErro ? 'bg-red-50' : ehDuplicata ? 'bg-yellow-50' : 'bg-white';
              
              return (
                <tr key={index} className={`${statusBg} hover:bg-gray-50`}>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {linhaNum}
                  </td>
                  {Object.values(linha).map((valor: any, i) => (
                    <td key={i} className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate" title={String(valor || '')}>
                        {valor !== null && valor !== undefined && valor !== '' 
                          ? String(valor) 
                          : <span className="text-gray-600 dark:text-gray-300 italic">vazio</span>
                        }
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {temErro ? (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 rounded-full">
                        Erro
                      </span>
                    ) : ehDuplicata ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Duplicata
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 rounded-full">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dadosTransformados.length > 10 && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 text-center">
          Mostrando 10 de {dadosTransformados.length} registros. Todos serão processados na importação.
        </p>
      )}
    </div>

    {/* Lista de Erros Detalhados (se houver) */}
    {errosValidacao.length > 0 && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Erros de Validação
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {errosValidacao.slice(0, 20).map((erro, index) => (
            <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">
                Linha {erro.linha}:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside ml-2">
                {erro.erros.map((msg: string, i: number) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          ))}
          {errosValidacao.length > 20 && (
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center pt-2">
              ... e mais {errosValidacao.length - 20} erros
            </p>
          )}
        </div>
      </div>
    )}

    {/* Lista de Duplicatas Detalhadas (se houver) */}
    {duplicatas.length > 0 && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Duplicatas Detectadas
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {duplicatas.slice(0, 20).map((dup, index) => (
            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                Linha {dup.linha}: {dup.motivo}
              </p>
            </div>
          ))}
          {duplicatas.length > 20 && (
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center pt-2">
              ... e mais {duplicatas.length - 20} duplicatas
            </p>
          )}
        </div>
      </div>
    )}

    {/* Botões de Ação */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
      <div className="flex gap-3">
        <button
          onClick={() => setEtapa('mapeamento')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Mapeamento
        </button>
        <button
          onClick={handleImportar}
          disabled={loading || (dados.length - duplicatas.length - errosValidacao.length) === 0}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          Importar {dados.length - duplicatas.length - errosValidacao.length} registros
        </button>
      </div>
    </div>
  </div>
)}
      {/* Etapa 4: Importando */}
      {etapa === 'importacao' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Importando dados...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{mensagemProgresso}</p>
            
            {/* Barra de progresso */}
            <div className="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-4 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{progresso}%</p>
          </div>
        </div>
      )}

      {/* Etapa 5: Concluído */}
      {etapa === 'concluido' && resultado && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border p-6">
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Importação Concluída!
            </h3>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resultado.sucesso}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Importados com sucesso</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{resultado.erros.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Erros</p>
              </div>
            </div>

            <button
              onClick={() => window.location.href = `/${tabelaDestino}`}
              className="mt-6 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Ver Registros Importados
            </button>
          </div>
        </div>
      )}

    </div>
  );
}