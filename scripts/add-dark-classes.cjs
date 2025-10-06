const fs = require('fs');
const path = require('path');

// Padrões de substituição para Dark Mode
const patterns = [
  // Backgrounds
  { from: /className="([^"]*)\bbg-white\b([^"]*)"/g, to: 'className="$1bg-white dark:bg-gray-800$2"' },
  { from: /className="([^"]*)\bbg-gray-50\b([^"]*)"/g, to: 'className="$1bg-gray-50 dark:bg-gray-900$2"' },
  { from: /className="([^"]*)\bbg-gray-100\b([^"]*)"/g, to: 'className="$1bg-gray-100 dark:bg-gray-800$2"' },
  { from: /className="([^"]*)\bbg-gray-200\b([^"]*)"/g, to: 'className="$1bg-gray-200 dark:bg-gray-700$2"' },

  // Text colors
  { from: /className="([^"]*)\btext-gray-900\b([^"]*)"/g, to: 'className="$1text-gray-900 dark:text-white$2"' },
  { from: /className="([^"]*)\btext-gray-800\b([^"]*)"/g, to: 'className="$1text-gray-800 dark:text-gray-100$2"' },
  { from: /className="([^"]*)\btext-gray-700\b([^"]*)"/g, to: 'className="$1text-gray-700 dark:text-gray-200$2"' },
  { from: /className="([^"]*)\btext-gray-600\b([^"]*)"/g, to: 'className="$1text-gray-600 dark:text-gray-300$2"' },
  { from: /className="([^"]*)\btext-gray-500\b([^"]*)"/g, to: 'className="$1text-gray-500 dark:text-gray-400$2"' },
  { from: /className="([^"]*)\btext-gray-400\b([^"]*)"/g, to: 'className="$1text-gray-400 dark:text-gray-500$2"' },

  // Borders
  { from: /className="([^"]*)\bborder-gray-200\b([^"]*)"/g, to: 'className="$1border-gray-200 dark:border-gray-700$2"' },
  { from: /className="([^"]*)\bborder-gray-300\b([^"]*)"/g, to: 'className="$1border-gray-300 dark:border-gray-600$2"' },

  // Shadows
  { from: /className="([^"]*)\bshadow-sm\b([^"]*)"/g, to: 'className="$1shadow-sm dark:shadow-gray-900\/50$2"' },
  { from: /className="([^"]*)\bshadow-md\b([^"]*)"/g, to: 'className="$1shadow-md dark:shadow-gray-900\/50$2"' },
  { from: /className="([^"]*)\bshadow-lg\b([^"]*)"/g, to: 'className="$1shadow-lg dark:shadow-gray-900\/50$2"' },

  // Blue accents
  { from: /className="([^"]*)\btext-blue-600\b([^"]*)"/g, to: 'className="$1text-blue-600 dark:text-blue-400$2"' },
  { from: /className="([^"]*)\btext-blue-700\b([^"]*)"/g, to: 'className="$1text-blue-700 dark:text-blue-300$2"' },
  { from: /className="([^"]*)\bbg-blue-50\b([^"]*)"/g, to: 'className="$1bg-blue-50 dark:bg-blue-900\/20$2"' },
  { from: /className="([^"]*)\bbg-blue-100\b([^"]*)"/g, to: 'className="$1bg-blue-100 dark:bg-blue-900\/30$2"' },
  { from: /className="([^"]*)\bbg-blue-600\b([^"]*)"/g, to: 'className="$1bg-blue-600 dark:bg-blue-500$2"' },

  // Green accents
  { from: /className="([^"]*)\btext-green-600\b([^"]*)"/g, to: 'className="$1text-green-600 dark:text-green-400$2"' },
  { from: /className="([^"]*)\bbg-green-50\b([^"]*)"/g, to: 'className="$1bg-green-50 dark:bg-green-900\/20$2"' },
  { from: /className="([^"]*)\bbg-green-100\b([^"]*)"/g, to: 'className="$1bg-green-100 dark:bg-green-900\/30$2"' },

  // Red accents
  { from: /className="([^"]*)\btext-red-600\b([^"]*)"/g, to: 'className="$1text-red-600 dark:text-red-400$2"' },
  { from: /className="([^"]*)\bbg-red-50\b([^"]*)"/g, to: 'className="$1bg-red-50 dark:bg-red-900\/20$2"' },
  { from: /className="([^"]*)\bbg-red-100\b([^"]*)"/g, to: 'className="$1bg-red-100 dark:bg-red-900\/30$2"' },

  // Orange accents
  { from: /className="([^"]*)\btext-orange-600\b([^"]*)"/g, to: 'className="$1text-orange-600 dark:text-orange-400$2"' },
  { from: /className="([^"]*)\bbg-orange-50\b([^"]*)"/g, to: 'className="$1bg-orange-50 dark:bg-orange-900\/20$2"' },

  // Purple accents
  { from: /className="([^"]*)\btext-purple-600\b([^"]*)"/g, to: 'className="$1text-purple-600 dark:text-purple-400$2"' },
  { from: /className="([^"]*)\bbg-purple-50\b([^"]*)"/g, to: 'className="$1bg-purple-50 dark:bg-purple-900\/20$2"' },

  // Hover states
  { from: /className="([^"]*)\bhover:bg-gray-50\b([^"]*)"/g, to: 'className="$1hover:bg-gray-50 dark:hover:bg-gray-700$2"' },
  { from: /className="([^"]*)\bhover:bg-gray-100\b([^"]*)"/g, to: 'className="$1hover:bg-gray-100 dark:hover:bg-gray-700$2"' },
  { from: /className="([^"]*)\bhover:bg-blue-700\b([^"]*)"/g, to: 'className="$1hover:bg-blue-700 dark:hover:bg-blue-600$2"' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  patterns.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      modified = true;
      content = newContent;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }

  return false;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalUpdated = 0;

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      totalUpdated += processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(fullPath)) {
        totalUpdated++;
      }
    }
  });

  return totalUpdated;
}

// Executar
const srcPath = path.join(__dirname, '..', 'src');
console.log('🌙 Adicionando classes dark mode...\n');
const updated = processDirectory(srcPath);
console.log(`\n✨ Concluído! ${updated} arquivo(s) atualizado(s).`);
