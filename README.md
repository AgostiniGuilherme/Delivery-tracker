# DeliveryTrack 📈
Este é um sistema de software funcional rastreador de entregas para delivery, que permite que clientes acompanhem o status do pedido e entregadores atualizem o progresso da entrega.

## Tecnologias 💻
- Front-end: Next.js (React)
- Back-end: Node.js + Fastify + JWT
- Banco de Dados: PostgreSQL + Prisma
- Mensageria: Kafka
- Containerização: Docker + Docker Compose

## Estrutura Inicial 📜
- /frontend: Aplicação Next.js
- /backend: API com Fastify
- /infra: Docker, banco de dados, configurações
- /docs: Documentação

## Rodando localmente 📌
> ⚠️ Em breve: instruções completas

Por enquanto, siga os passos abaixo para rodar o projeto localmente:

```bash
# Clone o repositório
git clone https://github.com/Gustavohmmagalhaes/DeliveryTrack.git

# Acesse a pasta do projeto
cd DeliveryTrack/frontend ou cd DeliveryTrack/backend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

# 🌐 Front-end (Next.js)

### 📁 Estrutura

```
app/
├── layout.tsx              # Layout raiz
├── page.tsx                # Página de login
└── deliveries/
    ├── page.tsx            # Lista de entregas
    └── [id]/
        └── page.tsx        # Detalhes de entrega
components/
├── auth/                   # Autenticação
├── deliveries/             # Componentes de entrega
├── layouts/                # Layouts reutilizáveis
└── ui-custom/              # Componentes de UI personalizados
hooks/
└── use-auth.tsx            # Hook de autenticação
lib/
├── api.ts                  # Funções de API
├── types.ts                # Tipos
└── constants.ts            # Constantes
```

### 🔄 Fluxo de Funcionamento

#### 1. 🔐 Login

- Tela de login (`/`)
- Simulação de autenticação com delay de 1s
- Armazenamento no `localStorage`
- Redirecionamento para `/deliveries`

#### 2. 📦 Listagem de Entregas

- Autenticação via `useAuth`
- Busca de entregas via `fetchDeliveries()`
- Renderização em grid responsivo
- Botão de detalhes redireciona para `/deliveries/[id]`

#### 3. 📍 Detalhes da Entrega

- Requisições paralelas:
  - `fetchDeliveryById()`
  - `fetchDeliveryLocations()`
- Atualização automática a cada 10s
- Renderização dos dados e mapa com trajeto

---

### 🗺️ Mapa com Leaflet

#### Inicialização e Atualização

- O mapa é renderizado apenas após o carregamento do Leaflet.
- Atualizações do mapa a cada 10 segundos com nova rota ou localização.

---

# 🚀 Back-end (Node.js + Fastify)

### 📁 Estrutura

```
/backend
├── src/
│   ├── routes/            # Rotas da API (entregas, autenticação, etc)
│   ├── services/          # Lógica de negócios
│   ├── prisma/            # ORM Prisma com migrations
│   ├── events/            # Kafka ou RabbitMQ
│   └── index.ts           # Inicialização do servidor
├── tests/                 # Testes automatizados
├── .env                   # Variáveis de ambiente
└── docker-compose.yml     # Configuração com banco e mensageria
```

### 🔧 Funcionalidades

#### ✅ Autenticação

- Token JWT validado no cabeçalho

#### 📦 API de Entregas

- **GET `/deliveries`**: Lista entregas do usuário autenticado
- **GET `/deliveries/:id`**: Detalhes da entrega
- **GET `/deliveries/:id/locations`**: Coordenadas da entrega
- **POST `/deliveries/:id/location`**: Atualiza localização (via app entregador)

