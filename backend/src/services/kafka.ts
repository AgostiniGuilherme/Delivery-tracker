import { Kafka, Producer, Consumer } from 'kafkajs'

class KafkaService {
  private kafka: Kafka | null = null
  private producer: Producer | null = null
  private consumers: Map<string, Consumer> = new Map()
  private isEnabled: boolean

  constructor() {
    this.isEnabled = process.env.ENABLE_KAFKA === 'true'
    
    if (this.isEnabled) {
      this.kafka = new Kafka({
        clientId: 'delivery-track-backend',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      })
      
      this.producer = this.kafka.producer()
    }
  }

  async connect() {
    if (!this.isEnabled || !this.producer) {
      console.log('ℹ️ Kafka desabilitado')
      return
    }

    try {
      await this.producer.connect()
      console.log('✅ Kafka Producer conectado')
    } catch (error) {
      if (error instanceof Error) {
        console.log('⚠️ Erro ao conectar Kafka:', error.message)
      } else {
        console.log('⚠️ Erro ao conectar Kafka:', error)
      }
      throw error
    }
  }

  async disconnect() {
    if (!this.isEnabled) return

    try {
      if (this.producer) {
        await this.producer.disconnect()
      }
      
      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect()
      }
      
      console.log('🔌 Kafka desconectado')
    } catch (error) {
      if (error instanceof Error) {
        console.log('⚠️ Erro ao desconectar Kafka:', error.message)
      } else {
        console.log('⚠️ Erro ao desconectar Kafka:', error)
      }
    }
  }

  // Publicar mensagem
  async publish(topic: string, message: any) {
    if (!this.isEnabled || !this.producer) {
      console.log(`ℹ️ Kafka desabilitado - mensagem não enviada para ${topic}`)
      return
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      })
      console.log(`📤 Mensagem enviada para ${topic}:`, message)
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem para ${topic}:`, error)
      throw error
    }
  }

  // Consumir mensagens
  async subscribe(topic: string, groupId: string, handler: (message: any) => Promise<void>) {
    if (!this.isEnabled || !this.kafka) {
      console.log(`ℹ️ Kafka desabilitado - não consumindo ${topic}`)
      return
    }

    try {
      const consumer = this.kafka.consumer({ groupId })
      
      await consumer.connect()
      await consumer.subscribe({ topic, fromBeginning: false })
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const data = JSON.parse(message.value?.toString() || '{}')
            console.log(`📥 Mensagem recebida de ${topic}:`, data)
            await handler(data)
          } catch (error) {
            console.error(`❌ Erro ao processar mensagem de ${topic}:`, error)
          }
        }
      })

      this.consumers.set(groupId, consumer)
      console.log(`🎧 Consumidor ${groupId} conectado ao tópico ${topic}`)
    } catch (error) {
      if (error instanceof Error) {
        console.log(`⚠️ Erro ao conectar consumidor ${groupId}:`, error.message)
      } else {
        console.log(`⚠️ Erro ao conectar consumidor ${groupId}:`, error)
      }
    }
  }
}

export const kafkaService = new KafkaService()

// Tópicos do sistema
export const TOPICS = {
  DELIVERY_CREATED: 'delivery.created',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_STATUS_UPDATED: 'delivery.status.updated',
  LOCATION_UPDATED: 'location.updated',
  COURIER_AVAILABLE: 'courier.available',
  COURIER_BUSY: 'courier.busy'
} as const