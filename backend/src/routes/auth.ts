import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['CUSTOMER', 'COURIER']).optional().default('CUSTOMER')
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      const user = await fastify.prisma.user.findUnique({
        where: { email }
      })

      if (!user || !await bcrypt.compare(password, user.password)) {
        return reply.status(401).send({ error: 'Credenciais inválidas' })
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      })

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    try {
      const { name, email, password, role } = registerSchema.parse(request.body)

      const existingUser = await fastify.prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return reply.status(409).send({ error: 'Email já está em uso' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await fastify.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role
        }
      })

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      })

      return reply.status(201).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return { user: request.user }
  })
}

export default authRoutes