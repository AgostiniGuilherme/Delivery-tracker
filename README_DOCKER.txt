# Como rodar o Delivery Track com Docker

## 1. Pré-requisitos
- Docker e Docker Compose instalados

## 2. Como rodar tudo

Na raiz do projeto, execute:

```
docker-compose up --build
```

Isso irá:
- Subir o backend (porta 3001)
- Subir o frontend (porta 3000)
- Subir o Kafka e Zookeeper

## 3. Como acessar
- Frontend: http://localhost:3000
- Backend (API): http://localhost:3001
- Kafka: localhost:9092 (interno para containers)

## 4. Observações
- O código do backend e frontend está montado como volume, então alterações no código são refletidas nos containers (hot reload).
- O banco de dados SQLite é persistido apenas no container do backend.
- Para rodar o simulador Python, use normalmente no host (fora do Docker).

## 5. Parar tudo
```
docker-compose down
```

## 6. Dicas
- Se precisar rodar comandos dentro do container backend:
  ```
  docker-compose exec backend sh
  ```
- Para rodar migrations ou seed:
  ```
  docker-compose exec backend npx prisma migrate dev
  docker-compose exec backend npx ts-node src/prisma/seed.ts
  ``` 