# 🗺️ Teste do Sistema de Rastreamento de Rota

Este guia explica como testar o sistema completo de rastreamento de entregas com visualização da rota em tempo real.

## 🚀 Pré-requisitos

1. **Sistema rodando**: Certifique-se de que o Docker Compose está rodando:
   ```bash
   docker-compose up -d
   ```

2. **Acessos disponíveis**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Kafka UI: http://localhost:8080

## 📋 Passos para Testar

### 1. Criar uma Entrega de Teste

Execute o script para criar uma entrega:
```bash
python criar_entrega_teste.py
```

Este script irá:
- Fazer login como cliente
- Criar uma entrega de teste
- Salvar o ID da entrega em `entrega_id.txt`
- Mostrar a URL para acompanhar a entrega

### 2. Abrir a Página da Entrega

Abra a URL mostrada pelo script (exemplo):
```
http://localhost:3000/deliveries/[ID_DA_ENTREGA]
```

Você verá:
- Detalhes da entrega
- Mapa com o destino marcado
- Área para acompanhar o entregador

### 3. Executar o Simulador de Entregador

Em outro terminal, execute:
```bash
python simulador_entregador.py
```

Este script irá:
- Fazer login como entregador
- Enviar 10 posições diferentes
- Cada posição será enviada a cada 3 segundos

### 4. Observar a Rota Sendo Desenhada

No mapa, você verá:
- 🔵 **Ponto azul**: Posição atual do entregador
- 🟢 **Ponto verde**: Destino da entrega
- 🔵 **Linha azul tracejada**: Rota percorrida
- 🔘 **Pontos cinzas numerados**: Pontos intermediários

## 🎯 O que Você Deve Ver

### No Frontend (Mapa)
1. **Ponto inicial**: Apenas o destino marcado
2. **Primeira atualização**: Ponto azul do entregador aparece
3. **Segunda atualização**: Linha azul começa a ser desenhada
4. **Atualizações subsequentes**: Linha continua sendo desenhada
5. **Pontos intermediários**: Marcadores numerados aparecem

### No Console do Navegador
- `📍 Localizações carregadas: [...]`
- `📡 WebSocket recebeu: {...}`
- `🗺️ Atualizando mapa com X localizações: [...]`

### No Kafka UI (http://localhost:8080)
- Tópico `location.updated` com mensagens
- Dados JSON das localizações
- Timestamps das atualizações

## 🔧 Debug e Solução de Problemas

### Se a rota não aparecer:

1. **Verifique o console do navegador**:
   - Abra F12 → Console
   - Procure por mensagens de erro
   - Verifique se as localizações estão chegando

2. **Verifique o WebSocket**:
   - Console deve mostrar `📡 WebSocket recebeu: {...}`
   - Se não aparecer, verifique a conexão

3. **Verifique o backend**:
   ```bash
   docker-compose logs backend
   ```

4. **Verifique o Kafka**:
   - Acesse http://localhost:8080
   - Veja se as mensagens estão chegando

### Se o entregador não se mover:

1. **Verifique o script Python**:
   - Certifique-se de que está usando o ID correto
   - Verifique se o login está funcionando

2. **Verifique as permissões**:
   - O entregador deve estar atribuído à entrega
   - Verifique se o status da entrega é "ASSIGNED"

## 📊 Dados de Teste

### Usuários Disponíveis:
- **Cliente**: `cliente1@exemplo.com` / `123456`
- **Entregador**: `burns@email.com` / `123456`

### Trajeto Simulado:
O script simula um movimento de São Paulo, SP:
- Ponto inicial: (-23.5605, -46.6433)
- Ponto final: (-23.5410, -46.6240)
- 10 pontos intermediários

## 🎉 Resultado Esperado

Ao final do teste, você deve ver:
- ✅ Mapa com rota completa desenhada
- ✅ 10 pontos de localização
- ✅ Linha azul tracejada conectando todos os pontos
- ✅ Marcadores numerados nos pontos intermediários
- ✅ Entregador na posição final
- ✅ Destino marcado no final do trajeto

## 🔄 Para Testar Novamente

1. **Limpar dados** (opcional):
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Criar nova entrega**:
   ```bash
   python criar_entrega_teste.py
   ```

3. **Executar simulador**:
   ```bash
   python simulador_entregador.py
   ```

---

**🎯 Dica**: Mantenha o console do navegador aberto para ver as mensagens de debug em tempo real! 