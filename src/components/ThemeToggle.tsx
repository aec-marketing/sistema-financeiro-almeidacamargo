import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${className}`}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
          {showLabel && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Escuro</span>}
        </>
      ) : (
        <>
          <Sun className="h-5 w-5 text-yellow-500" />
          {showLabel && <span className="text-sm font-medium text-gray-300">Claro</span>}
        </>
      )}
    </button>
  );
}