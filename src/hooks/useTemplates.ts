// src/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

// Interfaces para Templates
export interface TemplateRelatorio {
  id: string;
  nome: string;
  descricao: string | null;
  user_id: string;
  filtros: any[]; // Array de filtros salvos
  graficos_config: any[]; // Array de configurações de gráficos
  favorito: boolean;
  created_at: string;
  updated_at: string;
}

export interface NovoTemplate {
  nome: string;
  descricao?: string;
  filtros: any[];
  graficos_config: any[];
  favorito?: boolean;
}

export interface TemplateParaAplicar {
  filtros: any[];
  graficos_config: any[];
  nome: string;
}

export const useTemplates = (user?: UserProfile) => {
  const [templates, setTemplates] = useState<TemplateRelatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar templates do usuário
  const carregarTemplates = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('templates_relatorios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar templates na inicialização
  useEffect(() => {
    carregarTemplates();
  }, [carregarTemplates]);

  // Salvar novo template
  const salvarTemplate = useCallback(async (novoTemplate: NovoTemplate): Promise<string | null> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const templateParaSalvar = {
        ...novoTemplate,
        user_id: user.id,
        filtros: novoTemplate.filtros || [],
        graficos_config: novoTemplate.graficos_config || [],
        favorito: novoTemplate.favorito || false
      };

      const { data, error: supabaseError } = await supabase
        .from('templates_relatorios')
        .insert([templateParaSalvar])
        .select('id')
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      // Recarregar lista de templates
      await carregarTemplates();

      console.log('Template salvo com sucesso:', data.id);
      return data.id;
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, carregarTemplates]);

  // Buscar template específico para aplicar
  const buscarTemplatePorId = useCallback(async (templateId: string): Promise<TemplateParaAplicar | null> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('templates_relatorios')
        .select('nome, filtros, graficos_config')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      return {
        nome: data.nome,
        filtros: data.filtros || [],
        graficos_config: data.graficos_config || []
      };
    } catch (err) {
      console.error('Erro ao buscar template:', err);
      setError(err instanceof Error ? err.message : 'Template não encontrado');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Atualizar template existente
  const atualizarTemplate = useCallback(async (templateId: string, dadosAtualizados: Partial<NovoTemplate>): Promise<boolean> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('templates_relatorios')
        .update(dadosAtualizados)
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (supabaseError) {
        throw supabaseError;
      }

      // Recarregar lista de templates
      await carregarTemplates();

      console.log('Template atualizado com sucesso:', templateId);
      return true;
    } catch (err) {
      console.error('Erro ao atualizar template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar template');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, carregarTemplates]);

  // Excluir template
  const excluirTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('templates_relatorios')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (supabaseError) {
        throw supabaseError;
      }

      // Recarregar lista de templates
      await carregarTemplates();

      console.log('Template excluído com sucesso:', templateId);
      return true;
    } catch (err) {
      console.error('Erro ao excluir template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir template');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, carregarTemplates]);

  // Duplicar template
  const duplicarTemplate = useCallback(async (templateId: string, novoNome?: string): Promise<string | null> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar template original
      const { data: templateOriginal, error: fetchError } = await supabase
        .from('templates_relatorios')
        .select('nome, descricao, filtros, graficos_config')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Criar template duplicado
      const templateDuplicado = {
        nome: novoNome || `${templateOriginal.nome} (Cópia)`,
        descricao: templateOriginal.descricao,
        filtros: templateOriginal.filtros,
        graficos_config: templateOriginal.graficos_config,
        user_id: user.id,
        favorito: false
      };

      const { data, error: insertError } = await supabase
        .from('templates_relatorios')
        .insert([templateDuplicado])
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Recarregar lista de templates
      await carregarTemplates();

      console.log('Template duplicado com sucesso:', data.id);
      return data.id;
    } catch (err) {
      console.error('Erro ao duplicar template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao duplicar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, carregarTemplates]);

  // Alternar favorito
  const alternarFavorito = useCallback(async (templateId: string): Promise<boolean> => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;

    return await atualizarTemplate(templateId, {
      favorito: !template.favorito
    });
  }, [templates, atualizarTemplate]);

  // Funções auxiliares
  const templatesFavoritos = templates.filter(t => t.favorito);
  const templatesRecentes = templates.slice(0, 5);

  return {
    // Estados
    templates,
    templatesFavoritos,
    templatesRecentes,
    loading,
    error,
    
    // Ações
    carregarTemplates,
    salvarTemplate,
    buscarTemplatePorId,
    atualizarTemplate,
    excluirTemplate,
    duplicarTemplate,
    alternarFavorito,
    
    // Utilitários
    limparError: () => setError(null)
  };
};