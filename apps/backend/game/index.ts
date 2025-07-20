import Database from 'better-sqlite3';
import { fork } from 'child_process';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import path from 'path';

dotenv.config();

const fastify = Fastify({
  logger: true
})

// Initialisation de la base de données
const db = new Database('lobby.db')

// Création de la table des jeux actifs
db.exec(`
  CREATE TABLE IF NOT EXISTS active_games (
    id TEXT PRIMARY KEY,
    pid INTEGER NOT NULL,
    port INTEGER NOT NULL UNIQUE,
    full INTEGER DEFAULT 0,
    player_1_id TEXT NOT NULL,
    player_2_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Préparation des requêtes pour optimiser les performances
const insertGame = db.prepare(`
  INSERT INTO active_games (id, pid, port, full, player_1_id, player_2_id)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const updateGameStatus = db.prepare(`
  UPDATE active_games 
  SET full = ?, player_2_id = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

const getGame = db.prepare(`
  SELECT * FROM active_games WHERE id = ?
`)

const getAllGames = db.prepare(`
  SELECT * FROM active_games
`)

const deleteGame = db.prepare(`
  DELETE FROM active_games WHERE id = ?
`)

const getMaxPort = db.prepare(`
  SELECT MAX(port) as max_port FROM active_games
`)

const getAvailableGame = db.prepare(`
  SELECT * FROM active_games WHERE full = 0 ORDER BY created_at ASC LIMIT 1
`)

// Fonction pour obtenir le prochain port disponible
function getNextAvailablePort(): number {
  const result = getMaxPort.get() as { max_port: number | null }
  return result.max_port ? result.max_port + 1 : 4000
}

// Fonction pour nettoyer les processus morts
function cleanupDeadProcesses() {
  const games = getAllGames.all()
  games.forEach((game: any) => {
    try {
      process.kill(game.pid, 0) // Test si le processus existe
    } catch (error) {
      // Le processus n'existe plus, on le supprime de la DB
      deleteGame.run(game.id)
      fastify.log.info(`Cleaned up dead process for game ${game.id}`)
    }
  })
}

// Nettoyage initial au démarrage
cleanupDeadProcesses()

// Nettoyage périodique toutes les minutes
setInterval(cleanupDeadProcesses, 60000)

fastify.register(import("@fastify/cors"), {
  origin: [
    "http://localhost:5173"
  ],
  credentials: true,
})

fastify.register(import("@fastify/jwt"), {
  secret: process.env.JWT_SECRET,
});

fastify.register(import("@fastify/cookie"), {
  secret: process.env.COOKIE_SECRET,
});

fastify.get('/', async (request, reply) => {
  return { message: 'Lobby is running' }
})

fastify.post(
  '/games/join',
  {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: "unauthorized" });
      }
    },
  },
  async (request, reply) => {
    try {
      const {userId} = request.body;
      const availableGame = getAvailableGame.get()
      if (availableGame) {
        const game = availableGame as any
        
        updateGameStatus.run(1, null, game.id)
        reply.send({
          message: 'Joined existing game',
          gameId: game.id,
          port: game.port,
          full: 1,
          player_1_id: game.player_1_id,
          player_2_id: userId,
          action: 'joined'
        })
      } else {
        const gameId = randomUUID();
        const port = getNextAvailablePort();

        const child = fork(path.join(__dirname, 'game-server.js'), [], {
          env: { PORT: port.toString() }
        })

        if (!child.pid) {
          return reply.code(500).send({
            error: 'Failed to start game server'
          })
        }
        insertGame.run(gameId, child.pid, port, 0, null, null)
        const games = getAllGames.all();
        child.on('exit', (code, signal) => {
          fastify.log.info(`Game ${gameId} exited with code ${code}, signal ${signal}`)
          deleteGame.run(gameId)
        })

        reply.send({
          message: 'Created new game, waiting for opponent',
          gameId,
          port,
          full: 0,
          player_1_id: userId,
          player_2_id: null,
          action: 'created'
        })
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({
        error: 'Failed to join or create game'
      });
    }
  }
)

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Lobby server listening on ${address}`)
})