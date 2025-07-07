import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { kafkaService, TOPICS } from '../services/kafka'

const createDeliverySchema = z.object({
  productName: z.string().min(1),
  productDescription: z.string().optional(),
  address: z.string().min(1),
  destinationLat: z.number(),
  destinationLng: z.number(),
  estimatedDelivery: z.string().datetime()
})

const updateDeliverySchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  courierId: z.string().optional()
})

const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/deliveries - Listar entregas do cliente
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      interface AuthUser {
        id: string
        role: 'CUSTOMER' | 'COURIER' | 'ADMIN'
        name?: string
        email?: string
      }
      const user = request.user as AuthUser
      
      const whereClause = user.role === 'CUSTOMER' 
        ? { customerId: user.id }
        : user.role === 'COURIER'
        ? { courierId: user.id }
        : {} // ADMIN vê todas

      const deliveries = await fastify.prisma.delivery.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          },
          courier: {
            select: { id: true, name: true, email: true }
          },
          locations: {
            orderBy: { timestamp: 'desc' },
            take: 1 // Apenas a localização mais recente
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Mapear para o formato esperado pelo frontend
      const formattedDeliveries = deliveries.map(delivery => ({
        id: delivery.id,
        productName: delivery.productName,
        address: delivery.address,
        status: delivery.status.toLowerCase(),
        statusText: getStatusText(delivery.status),
        createdAt: delivery.createdAt.toISOString(),
        estimatedDelivery: formatEstimatedDelivery(delivery.estimatedDelivery),
        courierName: delivery.courier?.name || 'Não atribuído',
        destinationLat: delivery.destinationLat,
        destinationLng: delivery.destinationLng
      }))

      return formattedDeliveries
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar entregas' })
    }
  })

  // GET /api/deliveries/:id - Ver detalhes de uma entrega
  fastify.get('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      interface AuthUser {
        id: string
        role: 'CUSTOMER' | 'COURIER' | 'ADMIN'
        name?: string
        email?: string
      }
      const user = request.user as AuthUser

      const delivery = await fastify.prisma.delivery.findUnique({
        where: { id },
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          },
          courier: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      if (!delivery) {
        return reply.status(404).send({ error: 'Entrega não encontrada' })
      }

      // Verificar permissões
      if (user.role === 'CUSTOMER' && delivery.customerId !== user.id) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      if (user.role === 'COURIER' && delivery.courierId !== user.id) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const formattedDelivery = {
        id: delivery.id,
        productName: delivery.productName,
        address: delivery.address,
        status: delivery.status.toLowerCase(),
        statusText: getStatusText(delivery.status),
        createdAt: delivery.createdAt.toISOString(),
        estimatedDelivery: formatEstimatedDelivery(delivery.estimatedDelivery),
        courierName: delivery.courier?.name || 'Não atribuído',
        destinationLat: delivery.destinationLat,
        destinationLng: delivery.destinationLng
      }

      return formattedDelivery
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar entrega' })
    }
  })

  // POST /api/deliveries - Criar entrega
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = createDeliverySchema.parse(request.body)
      interface AuthUser {
        id: string
        role: 'CUSTOMER' | 'COURIER' | 'ADMIN'
        name?: string
        email?: string
      }
      const user = request.user as AuthUser

      if (user.role !== 'CUSTOMER') {
        return reply.status(403).send({ error: 'Apenas clientes podem criar entregas' })
      }

      const delivery = await fastify.prisma.delivery.create({
        data: {
          ...data,
          customerId: user.id,
          estimatedDelivery: new Date(data.estimatedDelivery)
        },
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Publicar evento no Kafka (se habilitado)
      if (process.env.ENABLE_KAFKA === 'true') {
        try {
          await kafkaService.publish(TOPICS.DELIVERY_CREATED, {
            deliveryId: delivery.id,
            customerId: user.id,
            customerName: user.name
          })
        } catch (error) {
          if (error instanceof Error) {
              console.log('⚠️ Erro ao publicar no Kafka:', error.message)
          } else {
            console.log('⚠️ Erro ao publicar no Kafka:', error)
          }
        }
      }

      return reply.status(201).send({
        id: delivery.id,
        productName: delivery.productName,
        address: delivery.address,
        status: delivery.status.toLowerCase(),
        statusText: getStatusText(delivery.status),
        createdAt: delivery.createdAt.toISOString(),
        estimatedDelivery: formatEstimatedDelivery(delivery.estimatedDelivery),
        courierName: 'Não atribuído',
        destinationLat: delivery.destinationLat,
        destinationLng: delivery.destinationLng
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro ao criar entrega' })
    }
  })

  // PUT /api/deliveries/:id - Atualizar entrega
  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateDeliverySchema.parse(request.body)
      interface AuthUser {
        id: string
        role: 'CUSTOMER' | 'COURIER' | 'ADMIN'
        name?: string
        email?: string
      }
      const user = request.user as AuthUser

      const delivery = await fastify.prisma.delivery.findUnique({
        where: { id }
      })

      if (!delivery) {
        return reply.status(404).send({ error: 'Entrega não encontrada' })
      }

      // Verificar permissões
      if (user.role === 'CUSTOMER' && delivery.customerId !== user.id) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const updateData: any = {}
      
      if (data.status) {
        updateData.status = data.status
        if (data.status === 'DELIVERED') {
          updateData.deliveredAt = new Date()
        }
      }

      if (data.courierId && user.role === 'ADMIN') {
        updateData.courierId = data.courierId
        if (!delivery.courierId) {
          updateData.status = 'ASSIGNED'
        }
      }

      const updatedDelivery = await fastify.prisma.delivery.update({
        where: { id },
        data: updateData,
        include: {
          courier: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Publicar evento no Kafka (se habilitado)
      if (process.env.ENABLE_KAFKA === 'true' && data.status) {
        try {
          await kafkaService.publish(TOPICS.DELIVERY_STATUS_UPDATED, {
            deliveryId: id,
            status: data.status,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.log('⚠️ Erro ao publicar no Kafka:', error.message)
          } 
        }
      }

      return {
        id: updatedDelivery.id,
        productName: updatedDelivery.productName,
        address: updatedDelivery.address,
        status: updatedDelivery.status.toLowerCase(),
        statusText: getStatusText(updatedDelivery.status),
        createdAt: updatedDelivery.createdAt.toISOString(),
        estimatedDelivery: formatEstimatedDelivery(updatedDelivery.estimatedDelivery),
        courierName: updatedDelivery.courier?.name || 'Não atribuído',
        destinationLat: updatedDelivery.destinationLat,
        destinationLng: updatedDelivery.destinationLng
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro ao atualizar entrega' })
    }
  })

  // GET /api/deliveries/:id/locations - Obter trajeto em tempo real
  fastify.get('/:id/locations', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      interface AuthUser {
        id: string
        role: 'CUSTOMER' | 'COURIER' | 'ADMIN'
        name?: string
        email?: string
      }
      const user = request.user as AuthUser

      const delivery = await fastify.prisma.delivery.findUnique({
        where: { id }
      })

      if (!delivery) {
        return reply.status(404).send({ error: 'Entrega não encontrada' })
      }

      // Verificar permissões
      if (user.role === 'CUSTOMER' && delivery.customerId !== user.id) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      if (user.role === 'COURIER' && delivery.courierId !== user.id) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const locations = await fastify.prisma.location.findMany({
        where: { deliveryId: id },
        orderBy: { timestamp: 'asc' }
      })

      return locations.map(location => ({
        id: location.id,
        deliveryId: location.deliveryId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp.toISOString()
      }))
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar localizações' })
    }
  })
}

// Funções auxiliares
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pendente',
    'ASSIGNED': 'Atribuída',
    'IN_TRANSIT': 'Em trânsito',
    'DELIVERED': 'Entregue',
    'CANCELLED': 'Cancelada'
  }
  return statusMap[status] || status
}

function formatEstimatedDelivery(date: Date): string {
  const now = new Date()
  const delivery = new Date(date)
  
  if (delivery.toDateString() === now.toDateString()) {
    return `Hoje, até ${delivery.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (delivery.toDateString() === tomorrow.toDateString()) {
    return `Amanhã, até ${delivery.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  return delivery.toLocaleDateString('pt-BR')
}

export default deliveryRoutes