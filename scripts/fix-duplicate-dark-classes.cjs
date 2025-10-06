const fs = require('fs');
const path = require('path');

// Função para remover duplicatas de classes dark mode dentro de uma className
function removeDuplicateDarkClasses(content) {
  // Pattern para encontrar className com múltiplas classes
  const classNamePattern = /className="([^"]+)"/g;

  return content.replace(classNamePattern, (match, classes) => {
    // Separar as classes
    const classArray = classes.split(/\s+/).filter(Boolean);

    // Objeto para rastrear classes dark já vistas
    const seenClasses = new Set();
    const cleanedClasses = [];

    for (const cls of classArray) {
      // Se é uma classe dark:
      if (cls.startsWith('dark:')) {
        // Extrair a propriedade base (ex: dark:text-gray-400 -> text-gray)
        const baseProperty = cls.replace(/^dark:/, '').replace(/-\d+.*$/, '');

        // Se já vimos essa propriedade dark, pular (manter apenas a primeira)
        if (seenClasses.has(baseProperty)) {
          continue;
        }
        seenClasses.add(baseProperty);
      }

      cleanedClasses.push(cls);
    }

    return `className="${cleanedClasses.join(' ')}"`;
  });
}

// Função para processar um arquivo
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = removeDuplicateDarkClasses(content);

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Cleaned: ${filePath}`);
    return true;
  }

  return false;
}

// Função para processar diretório recursivamente
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalCleaned = 0;

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      totalCleaned += processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(fullPath)) {
        totalCleaned++;
      }
    }
  });

  return totalCleaned;
}

// Executar
const srcPath = path.join(__dirname, '..', 'src');
console.log('🧹 Limpando classes dark mode duplicadas...\n');
const cleaned = processDirectory(srcPath);
console.log(`\n✨ Concluído! ${cleaned} arquivo(s) limpo(s).`);
