# 📊 Sistema de Gestão Financeira - Almeida&Camargo

> **Sistema web moderno para substituir controle financeiro em Excel com +63k registros**

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)](https://tailwindcss.com/)

## 🏢 **Sobre a Almeida&Camargo**

Empresa líder em **automação e segurança industrial** em Sorocaba/SP, especializada em:
- Automação industrial e integração robótica
- Painéis elétricos e pneumáticos
- Esteiras industriais
- Segurança conforme NR10/NR12
- Distribuição de marcas: SMC, Wago, Banner, Famatel, Pfannenberg

## 🎯 **Objetivo do Projeto**

Migrar sistema financeiro de planilhas Excel para aplicação web moderna com:
- ✅ **63k+ registros** de vendas, clientes e produtos
- ✅ **Multi-usuário** com diferentes permissões
- ✅ **Dashboards interativos** e relatórios dinâmicos
- ✅ **Interface responsiva** mobile-first
- ✅ **Backup automático** como fallback

## 🚀 **Stack Tecnológica**

### **Frontend**
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** para estilização
- **Recharts** para gráficos
- **React Hook Form** + **Zod** para validação
- **React Query** para cache e sincronização

### **Backend & Database**
- **Supabase** (PostgreSQL gerenciado)
- **Row Level Security** para permissões
- **APIs REST/GraphQL** auto-geradas
- **Edge Functions** para lógica customizada

### **Deploy & Hospedagem**
- **Vercel** para frontend
- **Supabase** para backend/database
- **GitHub** para controle de versão

## 📋 **Pré-requisitos**

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta Vercel (opcional)

## ⚙️ **Instalação e Setup**

### 1. **Clone e Instale**
```bash
git clone https://github.com/aec-marketing/almeida-camargo-sistema-financeiro.git
cd almeida-camargo-sistema-financeiro
npm install
```

### 2. **Configuração do Ambiente**
```bash
# Copie o template de variáveis
cp .env.local.example .env.local

# Configure suas credenciais do Supabase
# VITE_SUPABASE_URL=sua_url_aqui
# VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 3. **Configuração do Banco**
```bash
# Execute o schema SQL no Supabase
# Arquivo: docs/database-schema.sql
```

### 4. **Executar Desenvolvimento**
```bash
npm run dev
```

## 👥 **Perfis de Usuário**

### **👨‍💼 Admin Financeiro**
- CRUD completo em todas as tabelas
- Dashboard executivo com KPIs
- Relatórios avançados e exports
- Gestão de usuários e permissões

### **👨‍💻 Consultor de Vendas**
- Acesso somente leitura (próprias vendas)
- Dashboard pessoal
- Relatórios básicos
- Interface otimizada mobile

## 📊 **Funcionalidades Principais**

### **Dashboard & Analytics**
- KPIs de faturamento, vendas e clientes
- Gráficos interativos (Recharts)
- Filtros dinâmicos por período/cliente/vendedor
- Comparativos ano atual vs anterior

### **Gestão de Dados**
- **Clientes**: 3.285 registros
- **Vendas**: 22.121 registros  
- **Produtos**: 37.572 registros
- Busca inteligente e filtros avançados

### **Relatórios**
- Top 10 clientes por faturamento
- Produtos mais vendidos
- Performance por representante
- Análise geográfica e sazonalidade

## 🗄️ **Estrutura do Banco**

```sql
-- Principais tabelas
- clientes (3.285 registros)
- vendas (22.121 registros)
- produtos (37.572 registros)
- profiles (usuários e permissões)
```

## 📁 **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (botões, inputs)
│   ├── dashboard/      # Componentes do dashboard
│   ├── auth/           # Componentes de autenticação
│   └── reports/        # Componentes de relatórios
├── pages/              # Páginas principais
├── hooks/              # Custom hooks
├── utils/              # Funções utilitárias
├── types/              # Definições TypeScript
└── lib/                # Configurações (Supabase, etc)
```

## 🚀 **Scripts Disponíveis**

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview do build
npm run type-check   # Verificação TypeScript
npm run lint         # Linting com ESLint
```

## 📈 **Roadmap**

- [x] **MVP**: Setup, auth, CRUD básico
- [x] **V1.0**: Interface completa, dashboards, relatórios
- [ ] **V1.5**: Upload lote, notificações, audit log
- [ ] **V2.0**: Integrações ERP, IA insights, app nativo

## 🤝 **Contribuição**

Este é um projeto interno da **Almeida&Camargo**. Para dúvidas ou sugestões:

- **Desenvolvedor**: Cesar (Marketing AeC)
- **Empresa**: Almeida&Camargo Automação Industrial
- **Local**: Sorocaba/SP

## 📝 **Licença**

Projeto proprietário da **Almeida&Camargo**. Todos os direitos reservados.

---

**🏭 Impulsionando a produtividade industrial através da tecnologia!**

*Última atualização: Setembro 2025*