import { useToastContext } from '../contexts/ToastContext';

export function useClipboard() {
  const toast = useToastContext();

  const copyToClipboard = async (text: string, successMessage?: string) => {
    try {
      // Verificar se a API Clipboard está disponível
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage || 'Copiado para a área de transferência!');
        return true;
      }

      // Fallback: usar método antigo com textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          toast.success(successMessage || 'Copiado para a área de transferência!');
          return true;
        } else {
          throw new Error('execCommand falhou');
        }
      } catch (err) {
        document.body.removeChild(textarea);
        throw err;
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar. Tente copiar manualmente.');
      return false;
    }
  };

  return { copyToClipboard };
}
