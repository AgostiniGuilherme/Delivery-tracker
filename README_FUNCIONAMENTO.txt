# Guia de Funcionamento e Teste - Delivery Track

## 1. Visão Geral do Sistema
O Delivery Track é um sistema de rastreamento de entregas em tempo real, composto por:
- **Frontend (Next.js + React):** Interface para clientes acompanharem suas entregas em um mapa.
- **Backend (Fastify + Prisma):** API REST, autenticação JWT, WebSocket para atualizações em tempo real e integração com Kafka.
- **Kafka:** Fila de eventos para simulação de atribuição e rastreamento de entregas.
- **Simulador Python:** Script que simula o deslocamento de entregadores, enviando localizações para o backend.

---

## 2. Como Rodar o Sistema Completo

### Opção Recomendada: Docker Compose

1. **Pré-requisitos:** Docker e Docker Compose instalados
2. **Na raiz do projeto, execute:**
   ```bash
   docker-compose up --build
   ```
3. **Acesse:**
   - Frontend: http://localhost:3000
   - Backend (API): http://localhost:3001

> Para detalhes, consulte também o arquivo `README_DOCKER.txt`.

### (Opcional) Execução Manual
Se preferir rodar sem Docker, siga os passos abaixo:

#### 2.1. Rodar o Backend
```bash
cd backend
npm install
npm run dev
```
O backend roda por padrão em `http://localhost:3001`.

#### 2.2. Rodar o Frontend
```bash
cd frontend
npm install
npm run dev
```
O frontend roda por padrão em `http://localhost:3000`.

#### 2.3. Rodar o Kafka (usando Docker Compose)
Se você não tem Kafka local, use:
```bash
docker run -d --name zookeeper -p 2181:2181 zookeeper:3.4.9

docker run -d --name kafka -p 9092:9092 --env KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 --env KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 --env KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 wurstmeister/kafka:2.12-2.2.1
```
No backend, defina `ENABLE_KAFKA=true` nas variáveis de ambiente para ativar a integração.

#### 2.4. Rodar o Simulador Python
```bash
pip install requests
python simulador_entregador.py
```
Edite o arquivo para colocar o ID da entrega que deseja simular.

---

## 3. Fluxo de Dados do Sistema

1. **Usuário (cliente) faz login no frontend** e visualiza suas entregas.
2. **Frontend consome a API do backend** para buscar entregas e detalhes.
3. **Ao abrir uma entrega, o frontend conecta via WebSocket** para receber localizações em tempo real.
4. **O simulador Python faz login como entregador** e envia localizações para o backend via API REST.
5. **O backend salva a localização e faz broadcast via WebSocket** para todos os clientes conectados àquela entrega.
6. **O frontend recebe as localizações e atualiza o mapa** em tempo real, desenhando o trajeto do entregador até o destino.
7. **Kafka:** O backend publica eventos no Kafka (opcional, para integração futura de automação/atribuição de entregas).

---

## 4. Como Testar e Criar Casos de Teste

### Teste Manual
1. **Faça login como cliente** (ex: `cliente@exemplo.com` / senha: `123456`).
2. **Abra uma entrega existente** (veja o ID na URL ou na lista).
3. **No simulador Python, coloque o ID da entrega** e rode o script.
4. **Veja o mapa sendo atualizado em tempo real** conforme o script envia localizações.
5. **Teste diferentes entregas** e simule múltiplos scripts para testar concorrência.

### Casos de Teste Sugeridos
- **Login inválido:** Tente logar com credenciais erradas.
- **Acesso não autorizado:** Tente acessar uma entrega de outro usuário.
- **Simulação de entrega:** Rode o simulador e veja o trajeto no frontend.
- **WebSocket desconectado:** Feche o frontend e veja se o backend remove a conexão.
- **Kafka ativado:** Ative o Kafka e veja logs de publicação de eventos.
- **Criar nova entrega:** (Opcional) Implemente e teste a criação de novas entregas pelo frontend.

---

## 5. Observações
- O sistema já desenha o mapa e o trajeto do entregador em tempo real.
- O backend aceita apenas localizações autenticadas como entregador (use o simulador para isso).
- O Kafka é opcional para o funcionamento básico, mas pode ser usado para automação e integração futura.
- O Docker Compose é a forma mais fácil e recomendada de rodar todo o sistema.

---

**Dúvidas ou problemas?**
- Verifique os logs do backend e frontend.
- Certifique-se de que as portas não estão em uso.
- Confira as variáveis de ambiente e dependências instaladas. 