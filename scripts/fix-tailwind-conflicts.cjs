const fs = require('fs');
const path = require('path');

// Função para detectar e remover conflitos de classes Tailwind
function fixTailwindConflicts(content) {
  // Pattern para encontrar className (incluindo template strings)
  const patterns = [
    /className="([^"]+)"/g,
    /className={`([^`]+)`}/g,
    /className=\{["'`]([^"'`]+)["'`]\}/g
  ];

  let modified = content;

  patterns.forEach(pattern => {
    modified = modified.replace(pattern, (match, classes) => {
      // Separar as classes
      const classArray = classes.split(/\s+/).filter(Boolean);

      // Mapa para rastrear classes conflitantes
      const classMap = new Map();
      const result = [];

      classArray.forEach(cls => {
        // Identificar a propriedade CSS (ex: text-gray-400 -> text-gray)
        let property = cls;

        // Para classes dark:
        if (cls.startsWith('dark:')) {
          property = cls.substring(5); // Remove 'dark:'
        }

        // Extrair a base da propriedade (remover valores numéricos)
        // Ex: text-gray-400 -> text-gray
        const baseProperty = property.replace(/-[\d]+(?:\/[\d]+)?$/, '');

        // Criar chave única (prefixo:base)
        const prefix = cls.startsWith('dark:') ? 'dark:' : 'light:';
        const key = `${prefix}${baseProperty}`;

        // Se já existe essa propriedade, substituir pela mais recente
        // (isso mantém a última ocorrência)
        if (classMap.has(key)) {
          // Remover a classe antiga
          const oldClass = classMap.get(key);
          const oldIndex = result.indexOf(oldClass);
          if (oldIndex > -1) {
            result.splice(oldIndex, 1);
          }
        }

        // Adicionar a classe atual
        classMap.set(key, cls);
        result.push(cls);
      });

      // Reconstruir o match original
      if (match.includes('className="')) {
        return `className="${result.join(' ')}"`;
      } else if (match.includes('className={`')) {
        return `className={\`${result.join(' ')}\`}`;
      } else {
        return match; // Manter formato original
      }
    });
  });

  return modified;
}

// Função para processar um arquivo
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = fixTailwindConflicts(content);

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// Função para processar diretório recursivamente
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
console.log('🔧 Corrigindo conflitos Tailwind CSS...\n');
const fixed = processDirectory(srcPath);
console.log(`\n✨ Concluído! ${fixed} arquivo(s) corrigido(s).`);
