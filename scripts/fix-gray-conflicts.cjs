const fs = require('fs');
const path = require('path');

// Substituições específicas para resolver conflitos de contraste
const replacements = [
  // text-gray-500 com dark:text-gray-400 -> melhorar contraste (com espaços flexíveis)
  {
    from: /text-gray-500\s+dark:text-gray-400/g,
    to: 'text-gray-600 dark:text-gray-300'
  },
  // text-gray-400 com dark:text-gray-500 -> melhorar contraste
  {
    from: /text-gray-400\s+dark:text-gray-500/g,
    to: 'text-gray-500 dark:text-gray-400'
  },
  // Casos invertidos
  {
    from: /dark:text-gray-400\s+text-gray-500/g,
    to: 'dark:text-gray-300 text-gray-600'
  },
  {
    from: /dark:text-gray-500\s+text-gray-400/g,
    to: 'dark:text-gray-400 text-gray-500'
  }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      modified = true;
      content = newContent;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalFixed = 0;

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      totalFixed += processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(fullPath)) {
        totalFixed++;
      }
    }
  });

  return totalFixed;
}

// Executar
const srcPath = path.join(__dirname, '..', 'src');
console.log('🎨 Corrigindo conflitos de contraste gray...\n');
const fixed = processDirectory(srcPath);
console.log(`\n✨ Concluído! ${fixed} arquivo(s) corrigido(s).`);
