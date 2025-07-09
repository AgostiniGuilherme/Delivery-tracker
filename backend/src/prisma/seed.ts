import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuários de exemplo
  const customerPassword = await bcrypt.hash('123456', 10)
  const courierPassword = await bcrypt.hash('123456', 10)
  const adminPassword = await bcrypt.hash('123456', 10)

  const customer1 = await prisma.user.upsert({
    where: { email: 'cliente1@exemplo.com' },
    update: {},
    create: {
      email: 'cliente1@exemplo.com',
      name: 'Maria Eduarda',
      password: customerPassword,
      role: 'CUSTOMER'
    }
  })

  const customer = await prisma.user.upsert({
    where: { email: 'cliente2@exemplo.com' },
    update: {},
    create: {
      email: 'cliente2@exemplo.com',
      name: 'Patrícia Silva',
      password: customerPassword,
      role: 'CUSTOMER'
    }
  })

  const courier1 = await prisma.user.upsert({
    where: { email: 'entregador1@exemplo.com' },
    update: {},
    create: {
      email: 'entregador1@exemplo.com',
      name: 'Jorge Eduardo',
      password: courierPassword,
      role: 'COURIER'
    }
  })

  const courier2 = await prisma.user.upsert({
    where: { email: 'entregador2@exemplo.com' },
    update: {},
    create: {
      email: 'entregador2@exemplo.com',
      name: 'Paulo Almeida',
      password: courierPassword,
      role: 'COURIER'
    }
  })

    const courier3 = await prisma.user.upsert({
    where: { email: 'entregador2@exemplo.com' },
    update: {},
    create: {
      email: 'entregador3@exemplo.com',
      name: 'Renato Chagas',
      password: courierPassword,
      role: 'COURIER'
    }
  })
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@exemplo.com' },
    update: {},
    create: {
      email: 'admin@exemplo.com',
      name: 'Administrador',
      password: adminPassword,
      role: 'ADMIN'
    }
  })

  // Criar entregas de exemplo
  const delivery1 = await prisma.delivery.create({
    data: {
      productName: 'Smartphone Galaxy S23',
      productDescription: 'Smartphone Samsung Galaxy S23 128GB',
      address: 'Av. Paulista, 1000, São Paulo, SP',
      destinationLat: -23.5505,
      destinationLng: -46.6333,
      status: 'IN_TRANSIT',
      estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 horas a partir de agora
      customerId: customer.id,
      courierId: courier1.id
    }
  })

  const delivery2 = await prisma.delivery.create({
    data: {
      productName: 'Notebook Dell XPS',
      productDescription: 'Notebook Dell XPS 13 Intel i7',
      address: 'Rua Augusta, 500, São Paulo, SP',
      destinationLat: -23.5605,
      destinationLng: -46.6433,
      status: 'PENDING',
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas a partir de agora
      customerId: customer.id
    }
  })

  const delivery3 = await prisma.delivery.create({
    data: {
      productName: 'Monitor LG 27 polegadas',
      productDescription: 'Monitor LG UltraWide 27 polegadas',
      address: 'Rua Oscar Freire, 300, São Paulo, SP',
      destinationLat: -23.5705,
      destinationLng: -46.6533,
      status: 'DELIVERED',
      estimatedDelivery: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 horas atrás
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      customerId: customer.id,
      courierId: courier2.id
    }
  })

  // Criar localizações para a entrega em trânsito
  const locations = [
    { lat: -23.5605, lng: -46.6433, time: -30 }, // 30 min atrás
    { lat: -23.5580, lng: -46.6400, time: -25 }, // 25 min atrás
    { lat: -23.5555, lng: -46.6370, time: -20 }, // 20 min atrás
    { lat: -23.5530, lng: -46.6350, time: -15 }, // 15 min atrás
    { lat: -23.5510, lng: -46.6340, time: -5 }   // 5 min atrás
  ]

  for (const loc of locations) {
    await prisma.location.create({
      data: {
        deliveryId: delivery1.id,
        latitude: loc.lat,
        longitude: loc.lng,
        timestamp: new Date(Date.now() + loc.time * 60 * 1000)
      }
    })
  }

  // Criar localizações para a entrega entregue (trajeto completo)
  const deliveredLocations = [
    { lat: -23.5805, lng: -46.6633, time: -180 }, // 3 horas atrás
    { lat: -23.5780, lng: -46.6600, time: -160 },
    { lat: -23.5755, lng: -46.6570, time: -140 },
    { lat: -23.5730, lng: -46.6550, time: -120 },
    { lat: -23.5705, lng: -46.6533, time: -120 }  // Chegada ao destino
  ]

  for (const loc of deliveredLocations) {
    await prisma.location.create({
      data: {
        deliveryId: delivery3.id,
        latitude: loc.lat,
        longitude: loc.lng,
        timestamp: new Date(Date.now() + loc.time * 60 * 1000)
      }
    })
  }

  console.log('✅ Seed concluído!')
  console.log('👤 Usuários criados:')
  console.log(`   Cliente: ${customer.email} (senha: 123456)`)
  console.log(`   Entregador 1: ${courier1.email} (senha: 123456)`)
  console.log(`   Entregador 2: ${courier2.email} (senha: 123456)`)
  console.log(`   Admin: ${admin.email} (senha: admin123)`)
  console.log('📦 Entregas criadas:', { 
    delivery1: delivery1.id, 
    delivery2: delivery2.id, 
    delivery3: delivery3.id 
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })