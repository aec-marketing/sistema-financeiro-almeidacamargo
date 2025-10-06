import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useClipboard } from '../hooks/useClipboard';

interface CopyButtonProps {
  text: string;
  successMessage?: string;
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export default function CopyButton({
  text,
  successMessage,
  className = '',
  iconSize = 16,
  showLabel = false
}: CopyButtonProps) {
  const { copyToClipboard } = useClipboard();
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text, successMessage);
    if (success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-colors ${className}`}
      title="Copiar"
    >
      {justCopied ? (
        <Check className="text-green-600 dark:text-green-400" style={{ width: iconSize, height: iconSize }} />
      ) : (
        <Copy style={{ width: iconSize, height: iconSize }} />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {justCopied ? 'Copiado!' : 'Copiar'}
        </span>
      )}
    </button>
  );
}