# Delivery Track Backend - SQLite

Backend para sistema de rastreamento de entregas usando Fastify, Prisma e SQLite.

## 🚀 Tecnologias

- **Fastify** - Framework web rápido e eficiente
- **Prisma** - ORM moderno para TypeScript
- **SQLite** - Banco de dados local (para desenvolvimento)
- **TypeScript** - Tipagem estática
- **JWT** - Autenticação
- **WebSocket** - Atualizações em tempo real
- **Kafka** - Sistema de filas (opcional)
- **Zod** - Validação de schemas

## 📁 Estrutura do Projeto

\`\`\`
src/
├── routes/           # Rotas da API
│   ├── auth.ts      # Autenticação
│   ├── deliveries.ts # Entregas
│   ├── locations.ts  # Localizações
│   └── users.ts     # Usuários
├── services/        # Serviços
│   ├── kafka.ts     # Kafka (opcional)
│   └── delivery-queue.ts # Sistema de filas
├── plugins/         # Plugins do Fastify
├── prisma/          # Schema e seed do banco
├── types/           # Tipos TypeScript
└── server.ts        # Servidor principal

prisma/
├── schema.prisma    # Schema do banco
└── dev.db          # Banco SQLite (criado automaticamente)
\`\`\`

## 🛠️ Configuração Rápida

### 1. Instalar dependências
```bash
npm install