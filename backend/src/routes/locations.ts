import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { kafkaService, TOPICS } from '../services/kafka'

const createLocationSchema = z.object({
  deliveryId: z.string(),
  latitude: z.number(),
  longitude: z.number()
})

type AuthUser = {
  id: string
  name: string
  role: string
}

// Mapa de conexões WebSocket: deliveryId -> Set de conexões
const deliveryWebSocketClients: Record<string, Set<any>> = {}

const locationRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/locations - Enviar posição do entregador
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { deliveryId, latitude, longitude } = createLocationSchema.parse(request.body)
      const user = request.user as AuthUser

      if (user.role !== 'COURIER') {
        return reply.status(403).send({ error: 'Apenas entregadores podem enviar localizações' })
      }

      // Verificar se a entrega pertence ao entregador
      const delivery = await fastify.prisma.delivery.findUnique({
        where: { id: deliveryId }
      })

      if (!delivery) {
        return reply.status(404).send({ error: 'Entrega não encontrada' })
      }

      if (delivery.courierId !== user.id) {
        return reply.status(403).send({ error: 'Você não está atribuído a esta entrega' })
      }

      // Criar nova localização
      const location = await fastify.prisma.location.create({
        data: {
          deliveryId,
          latitude,
          longitude
        }
      })

      // Atualizar status da entrega para IN_TRANSIT se ainda estiver ASSIGNED
      if (delivery.status === 'ASSIGNED') {
        await fastify.prisma.delivery.update({
          where: { id: deliveryId },
          data: { status: 'IN_TRANSIT' }
        })
      }

      // Publicar evento no Kafka (se habilitado)
      if (process.env.ENABLE_KAFKA === 'true') {
        try {
          await kafkaService.publish(TOPICS.LOCATION_UPDATED, {
            deliveryId,
            courierId: user.id,
            courierName: user.name,
            latitude,
            longitude,
            timestamp: location.timestamp.toISOString()
          })
        } catch (error) {
          if (error instanceof Error) {
            console.log('⚠️ Erro ao publicar no Kafka:', error.message)
          } else {
            console.log('⚠️ Erro ao publicar no Kafka:', error)
          }
        }
      }

      // Broadcast via WebSocket para todos os clientes conectados ao deliveryId
      const wsClients = deliveryWebSocketClients[deliveryId]
      if (wsClients && wsClients.size > 0) {
        const payload = JSON.stringify({
          id: location.id,
          deliveryId: location.deliveryId,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: location.timestamp.toISOString()
        })
        wsClients.forEach((client) => {
          try {
            client.send(payload)
          } catch (e) {
            // Se falhar, remove do set
            wsClients.delete(client)
          }
        })
      }

      return reply.status(201).send({
        id: location.id,
        deliveryId: location.deliveryId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp.toISOString()
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro ao salvar localização' })
    }
  })

  // WebSocket para atualizações em tempo real
  fastify.register(async function (fastify) {
    fastify.get('/ws/:deliveryId', { websocket: true }, (connection, request) => {
      const { deliveryId } = request.params as { deliveryId: string }
      if (!deliveryWebSocketClients[deliveryId]) {
        deliveryWebSocketClients[deliveryId] = new Set()
      }
      deliveryWebSocketClients[deliveryId].add(connection.socket)

      connection.socket.on('close', () => {
        deliveryWebSocketClients[deliveryId].delete(connection.socket)
        if (deliveryWebSocketClients[deliveryId].size === 0) {
          delete deliveryWebSocketClients[deliveryId]
        }
      })
    })
  })
}

export default locationRoutes