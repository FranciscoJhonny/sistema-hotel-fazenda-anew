# 🏨 Hotel Fazenda Anew - Sistema de Gestão Hoteleira

![Hotel Fazenda Anew](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![React](https://img.shields.io/badge/React-19.0.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue)
![Vite](https://img.shields.io/badge/Vite-6.2.3-purple)
![Supabase](https://img.shields.io/badge/Supabase-2.112.4-green)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.14-cyan)

Sistema completo de gestão hoteleira desenvolvido para o **Hotel Fazenda Anew**, localizado em Corguinho - Mato Grosso do Sul. O sistema oferece uma solução integrada para gerenciamento de quartos, reservas, check-in/check-out, hóspedes, vendas e controle financeiro.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Credenciais de Teste](#-credenciais-de-teste)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Banco de Dados](#-banco-de-dados)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **Hotel Fazenda Anew** é um sistema de gestão hoteleira desenvolvido para otimizar as operações diárias do hotel, oferecendo uma interface moderna, responsiva e intuitiva para recepcionistas, administradores e equipe de vendas.

### 🏠 O Hotel
- **Localização:** Corguinho - Mato Grosso do Sul - Brasil
- **Quartos:** 13 acomodações distribuídas nos Blocos B, C e D
- **Capacidade:** Quartos Standard, Superior Triplo e Luxo Quadruplo
- **Estrutura:** Piscina, restaurante, loja, passeios e atividades rurais

---

## ✨ Funcionalidades

### 🖥️ Dashboard
- Visão geral da ocupação dos quartos
- Métricas em tempo real (check-ins, check-outs, disponibilidade)
- Status atualizado dos 13 quartos
- Indicadores de performance (taxa de ocupação, hóspedes presentes)

### 🏠 Gestão de Quartos
- Visualização dos 13 quartos (B1-B4, C2-C4, D1-D6)
- Status: Disponível, Reservado, Ocupado, Aguardando Check-in, Manutenção
- Filtros por status
- Detalhes do quarto (categoria, capacidade, valor, comodidades)

### 📅 Gestão de Reservas
- Criação de novas reservas com validação de disponibilidade
- Verificação automática de conflitos de datas
- Geração de código único por reserva
- Status: Confirmada, Aguardando Check-in, Hospedado, Finalizada, Cancelada
- Atualização e cancelamento de reservas

### ✅ Check-in / Check-out
- Processo completo de entrada e saída de hóspedes
- Conferência de documentos
- Recebimento de saldo pendente
- Entrega de chaves
- Liberação automática do quarto

### 👤 Gestão de Hóspedes
- Cadastro completo de hóspedes
- Dados: Nome, CPF, Telefone, WhatsApp, Email, Cidade, Estado
- Histórico de reservas
- Edição e exclusão de cadastros

### 💰 Controle Financeiro
- Receitas de hospedagem
- Vendas da loja
- Controle de pagamentos (PIX, Cartão, Dinheiro)
- Saldos a receber
- Extrato de transações

### 🛍️ Vendas / Lojinha
- Produtos da fazenda (doces, mel, ovos, lembranças)
- Controle de estoque
- Vendas integradas ao sistema
- Consumo de quarto (frigobar)

### 🔐 Autenticação
- Login via Supabase
- Perfis: ADMIN, RECEPCAO, VENDAS
- Sessão persistente
- Logout seguro

### ⚙️ Configurações
- Horários de check-in/out
- Regras de desconto para crianças (0-5 grátis, 6-11 meia, 12+ integral)
- Capacidade máxima de quartos
- Formas de pagamento padrão
- Integração com Supabase

### 📦 Pacotes
- Final de Semana (2 dias) - R$ 550,00
- Final de Semana Estendido (3 dias) - R$ 750,00
- Feriado Prolongado (4 dias) - R$ 950,00
- Day Use - R$ 200,00

---

## 🛠️ Tecnologias

### Frontend
- **[React 19](https://react.dev/)** - Biblioteca para construção de interfaces
- **[TypeScript 5.8.2](https://www.typescriptlang.org/)** - Tipagem estática
- **[Vite 6.2.3](https://vitejs.dev/)** - Build tool e servidor de desenvolvimento
- **[Tailwind CSS 4.1.14](https://tailwindcss.com/)** - Framework de CSS utilitário
- **[Lucide React 0.546.0](https://lucide.dev/)** - Ícones
- **[Motion 12.23.24](https://motion.dev/)** - Animações

### Backend
- **[Supabase 2.112.4](https://supabase.com/)** - Backend como serviço (PostgreSQL)
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional

### Ferramentas
- **[Express 4.21.2](https://expressjs.com/)** - Servidor (opcional)
- **[ESBuild 0.25.0](https://esbuild.github.io/)** - Bundler

---

## 🏗️ Arquitetura

O sistema segue uma arquitetura modular com separação clara de responsabilidades:

src/
├── componentes/ # Componentes reutilizáveis
│ ├── comuns/ # Componentes compartilhados
│ ├── quartos/ # Componentes relacionados a quartos
│ └── reservas/ # Componentes relacionados a reservas
├── contextos/ # Contextos React (Estado global)
│ └── ContextoHotel.tsx
├── dados/ # Dados iniciais e fixtures
├── lib/ # Bibliotecas e configurações
│ └── supabaseClient.ts
├── paginas/ # Páginas da aplicação
│ ├── PaginaLogin.tsx
│ ├── PaginaDashboard.tsx
│ ├── PaginaCheckin.tsx
│ ├── PaginaCheckout.tsx
│ ├── PaginaReservas.tsx
│ ├── PaginaHospedes.tsx
│ ├── PaginaQuartos.tsx
│ ├── PaginaFinanceiro.tsx
│ ├── PaginaVendas.tsx
│ └── PaginaConfiguracoes.tsx
├── servicos/ # Serviços e integrações
│ ├── auth/ # Serviço de autenticação
│ ├── supabase/ # Serviços Supabase (CRUD)
│ └── conflitoReservas.ts
├── tipos/ # Interfaces e tipos TypeScript
├── utilitarios/ # Funções auxiliares
│ └── formatadores.ts
└── App.tsx # Componente principal


---

## 📦 Instalação

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Conta no Supabase (gratuita)

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/hotel-fazenda-anew.git
cd hotel-fazenda-anew

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 4. Executar o projeto
npm run dev
