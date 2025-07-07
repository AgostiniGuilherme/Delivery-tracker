import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'

// Routes
import authRoutes from './routes/auth'
import deliveryRoutes from './routes/deliveries'
import locationRoutes from './routes/locations'
import userRoutes from './routes/users'

// Plugins
import { authenticatePlugin } from './plugins/authenticate'

// Services
import { kafkaService } from './services/kafka'
import { deliveryQueueService } from './services/delivery-queue'

const prisma = new PrismaClient()

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
})

// Registrar plugins
server.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : true,
  credentials: true
})

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret-key'
})

server.register(websocket)
server.register(authenticatePlugin)

// Adicionar Prisma ao contexto do Fastify
server.decorate('prisma', prisma)

// Registrar rotas
server.register(authRoutes, { prefix: '/api/auth' })
server.register(deliveryRoutes, { prefix: '/api/deliveries' })
server.register(locationRoutes, { prefix: '/api/locations' })
server.register(userRoutes, { prefix: '/api/users' })

// Health check
server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'sqlite',
    kafka: process.env.ENABLE_KAFKA === 'true' ? 'enabled' : 'disabled'
  }
})

// Inicializar Kafka (se habilitado)
const initializeKafka = async () => {
  if (process.env.ENABLE_KAFKA === 'true') {
    try {
      await kafkaService.connect()
      await deliveryQueueService.initialize()
      console.log('✅ Kafka inicializado')
    } catch (error) {
      if (error instanceof Error) {
        console.log('⚠️ Kafka não disponível, continuando sem ele:', error.message)
      } else {
        console.log('⚠️ Kafka não disponível, continuando sem ele:', error)
      }
    }
  } else {
    console.log('ℹ️ Kafka desabilitado')
  }
}

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001
    const host = process.env.HOST || '0.0.0.0'
    
    // Inicializar Kafka
    await initializeKafka()
    
    await server.listen({ port, host })
    console.log(`🚀 Servidor rodando em http://${host}:${port}`)
    console.log(`📊 Prisma Studio: npx prisma studio`)
    console.log(`🗄️ Banco SQLite: ${process.cwd()}/prisma/dev.db`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...')
  
  if (process.env.ENABLE_KAFKA === 'true') {
    await kafkaService.disconnect()
  }
  
  await prisma.$disconnect()
  await server.close()
  process.exit(0)
})

start()