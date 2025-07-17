import Fastify from 'fastify'
import { fork } from 'child_process'
import path from 'path'

const fastify = Fastify({
  logger: true
})

let nextPort = 4000 // Premier port disponible pour une instance de jeu
const activeGames: { [key: string]: { pid: number, port: number } } = {}

fastify.register(import("@fastify/cors"), {
    origin: [
        "http://localhost:5173"
    ],
    credentials: true,
});

fastify.get('/', async (request, reply) => {
  return { message: 'Lobby is running' }
})

fastify.post('/create-game', async (request, reply) => {
  const gameId = crypto.randomUUID()
  const port = nextPort++

  const child = fork(path.join(__dirname, 'game-server.js'), [], {
    env: { PORT: port.toString() }
  })

  activeGames[gameId] = { pid: child.pid ?? -1, port }

  reply.send({
    message: 'Game server started',
    gameId,
    port
  })
})

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Lobby server listening on ${address}`)
})
