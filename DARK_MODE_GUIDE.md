# 🌙 Guia de Dark Mode - Sistema Financeiro Almeida&Camargo

## ✅ Status da Implementação

O Dark Mode foi implementado com sucesso em **33 componentes e páginas**!

### Arquivos Atualizados:

#### Componentes Core
- ✅ `App.tsx` - Tela de carregamento e conta desativada
- ✅ `Layout.tsx` - Sidebar mobile e desktop completa
- ✅ `ThemeToggle.tsx` - Botão de alternância de tema

#### Autenticação
- ✅ `LoginForm.tsx` - Tela de login

#### Dashboard
- ✅ `Dashboard.tsx`
- ✅ `DashboardAdmin.tsx`
- ✅ `VendedorDashboard.tsx`

#### Páginas
- ✅ `VendasPage.tsx` - Lista e cards de vendas
- ✅ `ClientesPage.tsx` - Lista e modal de clientes
- ✅ `RelatorioPage.tsx` / `RelatoriosPage.tsx`
- ✅ `TemplatesPage.tsx`
- ✅ `ImportacaoPage.tsx` / `ImportacaoDados.tsx`
- ✅ `GestaoUsuarios.tsx`
- ✅ `AdminDuplicatas.tsx`
- ✅ `DashboardObservador.tsx`

#### Componentes Auxiliares
- ✅ `CopyButton.tsx`
- ✅ `ClienteBadgeMesclado.tsx`
- ✅ `BotaoDuplicatas.tsx`
- ✅ `ModalVenda.tsx`
- ✅ `ModalSalvarTemplate.tsx`
- ✅ `TemplateCard.tsx`
- ✅ Componentes do Observador (8 arquivos)

---

## 🎨 Paleta de Cores Dark Mode

### Backgrounds
```css
bg-white → bg-white dark:bg-gray-800
bg-gray-50 → bg-gray-50 dark:bg-gray-900
bg-gray-100 → bg-gray-100 dark:bg-gray-800
bg-gray-200 → bg-gray-200 dark:bg-gray-700
```

### Textos
```css
text-gray-900 → text-gray-900 dark:text-white
text-gray-800 → text-gray-800 dark:text-gray-100
text-gray-700 → text-gray-700 dark:text-gray-200
text-gray-600 → text-gray-600 dark:text-gray-300
text-gray-500 → text-gray-500 dark:text-gray-400
text-gray-400 → text-gray-400 dark:text-gray-500
```

### Bordas
```css
border-gray-200 → border-gray-200 dark:border-gray-700
border-gray-300 → border-gray-300 dark:border-gray-600
```

### Sombras
```css
shadow-sm → shadow-sm dark:shadow-gray-900/50
shadow-md → shadow-md dark:shadow-gray-900/50
shadow-lg → shadow-lg dark:shadow-gray-900/50
```

### Cores de Acento

#### Azul (Primary)
```css
text-blue-600 → text-blue-600 dark:text-blue-400
bg-blue-50 → bg-blue-50 dark:bg-blue-900/20
bg-blue-100 → bg-blue-100 dark:bg-blue-900/30
bg-blue-600 → bg-blue-600 dark:bg-blue-500
hover:bg-blue-700 → hover:bg-blue-700 dark:hover:bg-blue-600
```

#### Verde (Success)
```css
text-green-600 → text-green-600 dark:text-green-400
bg-green-50 → bg-green-50 dark:bg-green-900/20
bg-green-100 → bg-green-100 dark:bg-green-900/30
```

#### Vermelho (Error)
```css
text-red-600 → text-red-600 dark:text-red-400
bg-red-50 → bg-red-50 dark:bg-red-900/20
bg-red-100 → bg-red-100 dark:bg-red-900/30
```

#### Laranja (Warning)
```css
text-orange-600 → text-orange-600 dark:text-orange-400
bg-orange-50 → bg-orange-50 dark:bg-orange-900/20
```

#### Roxo
```css
text-purple-600 → text-purple-600 dark:text-purple-400
bg-purple-50 → bg-purple-50 dark:bg-purple-900/20
```

### Estados Hover
```css
hover:bg-gray-50 → hover:bg-gray-50 dark:hover:bg-gray-700
hover:bg-gray-100 → hover:bg-gray-100 dark:hover:bg-gray-700
```

---

## 🔧 Como Usar

### 1. Alternância de Tema

O botão de tema está disponível em:
- **Sidebar Mobile**: No rodapé, antes do botão de logout
- **Sidebar Desktop**: Separado em uma seção própria

### 2. Preferência Persistente

O tema é salvo automaticamente no `localStorage`:
- Key: `theme`
- Values: `'light'` | `'dark'`

### 3. Detecção Automática

Se o usuário ainda não escolheu um tema, o sistema detecta a preferência do sistema operacional:
```typescript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

---

## 🛠️ Script de Conversão

O script `scripts/add-dark-classes.cjs` foi usado para aplicar dark mode automaticamente.

### Para Executar Novamente:
```bash
node scripts/add-dark-classes.cjs
```

### Para Adicionar Novos Padrões:
Edite o array `patterns` em `scripts/add-dark-classes.cjs`:

```javascript
const patterns = [
  { from: /className="([^"]*)\bbg-white\b([^"]*)"/g, to: 'className="$1bg-white dark:bg-gray-800$2"' },
  // Adicione mais padrões aqui...
];
```

---

## 📝 Boas Práticas

### ✅ Faça:
- Use sempre cores semânticas (`text-gray-900 dark:text-white`)
- Mantenha contraste adequado em ambos os temas
- Teste ambos os temas antes de fazer commit
- Use opacidade para overlays (`dark:bg-blue-900/20`)

### ❌ Não Faça:
- Não use cores hardcoded (ex: `#000000`)
- Não esqueça de adicionar dark mode em novos componentes
- Não misture estilos inline com classes Tailwind
- Não use apenas `dark:` sem a classe light equivalente

---

## 🎯 Exemplo de Card com Dark Mode

```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border-l-4 border-blue-500">
  {/* Header com ícone */}
  <div className="flex items-center justify-between mb-4">
    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
      <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
    </div>
  </div>

  {/* Título */}
  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
    Total de Vendas
  </p>

  {/* Valor principal */}
  <p className="text-3xl font-bold text-gray-900 dark:text-white">
    {kpis.totalVendas.toLocaleString('pt-BR')}
  </p>

  {/* Subtítulo */}
  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
    Últimos registros
  </p>
</div>
```

---

## 🐛 Troubleshooting

### Problema: Classes duplicadas
**Solução**: Execute o script novamente, ele irá adicionar apenas as classes que faltam.

### Problema: Contraste ruim no dark mode
**Solução**: Ajuste as cores manualmente usando a paleta acima.

### Problema: Tema não persiste
**Solução**: Verifique se o `ThemeProvider` está envolvendo o `<App />` no `main.tsx`.

### Problema: Flash de tema errado ao carregar
**Solução**: Adicione no `index.html`:
```html
<script>
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
</script>
```

---

## 🚀 Próximos Passos

- [ ] Adicionar animação de transição entre temas
- [ ] Criar temas customizados (ex: high contrast)
- [ ] Adicionar preferência por página/seção
- [ ] Implementar theme switcher com mais opções

---

**Desenvolvido com ❤️ para Almeida&Camargo**
