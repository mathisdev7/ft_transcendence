import Fastify from 'fastify'
import websocket from '@fastify/websocket'

const port = parseInt(process.env.PORT || '4000', 10)

const fastify = Fastify()
fastify.register(websocket)

fastify.get('/ws', { websocket: true }, (connection, req) => {
  const { socket } = connection

  socket.send('Connexion au serveur de jeu établie !')

  socket.on('message', message => {
    console.log('Message reçu du client :', message.toString())

    socket.send(`Reçu: ${message}`)
  })
})

fastify.listen({ port }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log("ws is running")
  fastify.log.info(`Serveur de jeu actif sur ${address}`)
})
