import { PrismaClient } from '@prisma/client'
import { kafkaService, TOPICS } from './kafka'
import { ZodError } from 'zod'
import { broadcastToDeliveryClients } from '../routes/locations'

const prisma = new PrismaClient()

export class DeliveryQueueService {
  async initialize() {
    if (process.env.ENABLE_KAFKA !== 'true') {
      console.log('ℹ️ Sistema de filas desabilitado (Kafka off)')
      return
    }

    try {
      // Consumir eventos de entrega criada
      await kafkaService.subscribe(
        TOPICS.DELIVERY_CREATED,
        'delivery-assignment-service',
        this.handleDeliveryCreated.bind(this)
      )

      // Consumir eventos de entregador disponível
      await kafkaService.subscribe(
        TOPICS.COURIER_AVAILABLE,
        'delivery-assignment-service',
        this.handleCourierAvailable.bind(this)
      )

      // Consumir atualizações de localização
      await kafkaService.subscribe(
        TOPICS.LOCATION_UPDATED,
        'location-processor',
        this.handleLocationUpdate.bind(this)
      )

      console.log('✅ Sistema de filas inicializado')
    } catch (error) {
      if (error instanceof ZodError){
        console.log('⚠️ Erro ao inicializar sistema de filas:', error.message)
      }      
    }
  }

  // Quando uma entrega é criada, tenta atribuir a um entregador
  private async handleDeliveryCreated(data: { deliveryId: string }) {
    try {
      console.log(`🚚 Processando nova entrega: ${data.deliveryId}`)
      
      // Buscar entregadores disponíveis
      const availableCouriers = await prisma.user.findMany({
        where: {
          role: 'COURIER',
          courierDeliveries: {
            none: {
              status: {
                in: ['ASSIGNED', 'IN_TRANSIT']
              }
            }
          }
        }
      })

      if (availableCouriers.length > 0) {
        // Atribuir ao primeiro entregador disponível
        const courier = availableCouriers[0]
        
        await prisma.delivery.update({
          where: { id: data.deliveryId },
          data: {
            courierId: courier.id,
            status: 'ASSIGNED'
          }
        })

        // Notificar que a entrega foi atribuída
        await kafkaService.publish(TOPICS.DELIVERY_ASSIGNED, {
          deliveryId: data.deliveryId,
          courierId: courier.id,
          courierName: courier.name
        })

        console.log(`✅ Entrega ${data.deliveryId} atribuída ao entregador ${courier.name}`)
      } else {
        console.log(`⏳ Nenhum entregador disponível para a entrega ${data.deliveryId}`)
      }
    } catch (error) {
      console.error('❌ Erro ao processar entrega criada:', error)
    }
  }

  // Quando um entregador fica disponível
  private async handleCourierAvailable(data: { courierId: string, courierName: string }) {
    try {
      console.log(`👤 Entregador disponível: ${data.courierName}`)
      
      // Buscar entregas pendentes
      const pendingDelivery = await prisma.delivery.findFirst({
        where: {
          status: 'PENDING',
          courierId: null
        },
        orderBy: { createdAt: 'asc' }
      })

      if (pendingDelivery) {
        await prisma.delivery.update({
          where: { id: pendingDelivery.id },
          data: {
            courierId: data.courierId,
            status: 'ASSIGNED'
          }
        })

        await kafkaService.publish(TOPICS.DELIVERY_ASSIGNED, {
          deliveryId: pendingDelivery.id,
          courierId: data.courierId,
          courierName: data.courierName
        })

        console.log(`✅ Entrega ${pendingDelivery.id} atribuída ao entregador ${data.courierName}`)
      }
    } catch (error) {
      console.error('❌ Erro ao processar entregador disponível:', error)
    }
  }

  // Processar atualizações de localização
  private async handleLocationUpdate(data: any) {
    try {
      // Verificar se chegou ao destino
      const delivery = await prisma.delivery.findUnique({
        where: { id: data.deliveryId }
      })

      if (delivery) {
        const distance = this.calculateDistance(
          data.latitude,
          data.longitude,
          delivery.destinationLat,
          delivery.destinationLng
        )

        // Se chegou próximo ao destino (menos de 100 metros)
        if (distance < 0.1 && delivery.status === 'IN_TRANSIT') {
          // Atualizar status para DELIVERED
          const updatedDelivery = await prisma.delivery.update({
            where: { id: data.deliveryId },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date()
            },
            include: {
              courier: {
                select: { id: true, name: true, email: true }
              }
            }
          })

          await kafkaService.publish(TOPICS.DELIVERY_STATUS_UPDATED, {
            deliveryId: data.deliveryId,
            status: 'DELIVERED',
            timestamp: new Date().toISOString()
          })

          // Entregador fica disponível novamente
          await kafkaService.publish(TOPICS.COURIER_AVAILABLE, {
            courierId: delivery.courierId,
            courierName: data.courierName || 'Entregador'
          })

          // Enviar notificação WebSocket para atualizar o frontend
          broadcastToDeliveryClients(data.deliveryId, {
            type: 'delivery_status_update',
            delivery: {
              id: updatedDelivery.id,
              status: updatedDelivery.status,
              statusText: 'Entregue',
              deliveredAt: updatedDelivery.deliveredAt?.toISOString(),
              courierName: updatedDelivery.courier?.name || 'Entregador'
            }
          })

          console.log(`🎉 Entrega ${data.deliveryId} foi concluída!`)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar atualização de localização:', error)
    }
  }

  // Calcular distância entre dois pontos (em km)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}

export const deliveryQueueService = new DeliveryQueueService()