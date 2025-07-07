import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const authenticatePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return reply.status(401).send({ error: 'Token não fornecido' })
      }

      const decoded = fastify.jwt.verify(token) as any
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, name: true }
      })

      if (!user) {
        return reply.status(401).send({ error: 'Usuário não encontrado' })
      }

      request.user = user
    } catch (error) {
      return reply.status(401).send({ error: 'Token inválido' })
    }
  })
}

export { authenticatePlugin }
export default fp(authenticatePlugin)