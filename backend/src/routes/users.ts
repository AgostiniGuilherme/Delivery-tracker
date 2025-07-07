import { FastifyPluginAsync } from 'fastify'

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users/couriers - Listar entregadores (apenas para admin)
  fastify.get('/couriers', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = request.user as AuthenticatedUser

      const couriers = await fastify.prisma.user.findMany({
        where: { role: 'COURIER' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      })

      return couriers
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar entregadores' })
    }
  })

  // GET /api/users/profile - Obter perfil do usuário
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = request.user as AuthenticatedUser

      const profile = await fastify.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })

      return profile
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar perfil' })
    }
  })
}

export default userRoutes