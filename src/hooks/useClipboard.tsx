import { useState, useCallback } from 'react';
import { useToastContext } from '../contexts/ToastContext';

export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false);
  const toast = useToastContext();

  const copyToClipboard = useCallback(async (
    text: string,
    successMessage?: string
  ): Promise<boolean> => {
    if (!text) {
      toast.warning('Nada para copiar');
      return false;
    }

    setIsCopying(true);

    try {
      // Tenta usar a API moderna do navegador
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (!successful) {
          throw new Error('Comando de cópia falhou');
        }
      }

      toast.success(successMessage || 'Copiado para a área de transferência!');
      return true;
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar para área de transferência');
      return false;
    } finally {
      setIsCopying(false);
    }
  }, [toast]);

  return { copyToClipboard, isCopying };
}