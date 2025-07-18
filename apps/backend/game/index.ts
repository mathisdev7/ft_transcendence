import Fastify from 'fastify'
import { fork } from 'child_process'
import path from 'path'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Préparation des requêtes pour optimiser les performances
const insertGame = db.prepare(`
  INSERT INTO active_games (id, pid, port, full)
  VALUES (?, ?, ?, ?)
`)

const updateGameStatus = db.prepare(`
  UPDATE active_games 
  SET full = ?, updated_at = CURRENT_TIMESTAMP 
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

fastify.get('/', async (request, reply) => {
  return { message: 'Lobby is running' }
})

fastify.post('/create-game', async (request, reply) => {
  try {
    const gameId = randomUUID()
    const port = getNextAvailablePort()

    const child = fork(path.join(__dirname, 'game-server.js'), [], {
      env: { PORT: port.toString() }
    })

    if (!child.pid) {
      return reply.code(500).send({
        error: 'Failed to start game server'
      })
    }

    // Insertion en base de données
    insertGame.run(gameId, child.pid, port, false)

    // Gestion de la fermeture du processus enfant
    child.on('exit', (code, signal) => {
      fastify.log.info(`Game ${gameId} exited with code ${code}, signal ${signal}`)
      deleteGame.run(gameId)
    })

    reply.send({
      message: 'Game server started',
      gameId,
      port,
      full: false
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to create game'
    })
  }
})

fastify.get('/games', async (request, reply) => {
  try {
    const games = getAllGames.all()
    console.log(games);
    
    // Convertir en objet pour maintenir la compatibilité
    const gamesObject: { [key: string]: { pid: number, port: number, full: boolean } } = {}
    games.forEach((game: any) => {
      gamesObject[game.id] = {
        pid: game.pid,
        port: game.port,
        full: !!game.full
      }
    })
    
    return gamesObject
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to retrieve games'
    })
  }
})

// Route pour rejoindre une game disponible ou en créer une nouvelle
fastify.post('/games/join', async (request, reply) => {
  try {
    // Chercher une game disponible
    const availableGame = getAvailableGame.get()
    console.log("available game elle est la:")
    
    if (availableGame) {
      // Une game est disponible
      const game = availableGame as any
      
      // Marquer la game comme pleine (assumant que c'est un jeu à 2 joueurs)
      updateGameStatus.run(1, game.id) // 1 = true
      
      reply.send({
        message: 'Joined existing game',
        gameId: game.id,
        port: game.port,
        full: 1,
        action: 'joined'
      })
    } else {
      // Aucune game disponible, créer une nouvelle
      const gameId = randomUUID()
      const port = getNextAvailablePort()

      const child = fork(path.join(__dirname, 'game-server.js'), [], {
        env: { PORT: port.toString() }
      })

      if (!child.pid) {
        return reply.code(500).send({
          error: 'Failed to start game server'
        })
      }

      // Insertion en base de données (full = false car on attend un 2ème joueur)
      const insertQuery = insertGame.run(gameId, child.pid, port, 0) // 0 = false
      const games = getAllGames.all();
      console.log(games)

      // Gestion de la fermeture du processus enfant
      child.on('exit', (code, signal) => {
        fastify.log.info(`Game ${gameId} exited with code ${code}, signal ${signal}`)
        deleteGame.run(gameId)
      })

      reply.send({
        message: 'Created new game, waiting for opponent',
        gameId,
        port,
        full: 0,
        action: 'created'
      })
    }
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to join or create game'
    })
  }
})

// Nouvelle route pour récupérer une game spécifique
fastify.get('/games/:gameId', async (request, reply) => {
  try {
    const { gameId } = request.params as { gameId: string }
    
    if (!gameId) {
      return reply.code(400).send({
        error: 'Game ID is required'
      })
    }

    const game = getGame.get(gameId)
    
    if (!game) {
      return reply.code(404).send({
        error: 'Game not found'
      })
    }

    reply.send({
      id: (game as any).id,
      pid: (game as any).pid,
      port: (game as any).port,
      full: !!(game as any).full,
      created_at: (game as any).created_at,
      updated_at: (game as any).updated_at
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to retrieve game'
    })
  }
})

// Route pour vérifier le statut d'une game (utile pour le polling côté client)
fastify.get('/games/:gameId/status', async (request, reply) => {
  try {
    const { gameId } = request.params as { gameId: string }
    
    if (!gameId) {
      return reply.code(400).send({
        error: 'Game ID is required'
      })
    }

    const game = getGame.get(gameId)
    
    if (!game) {
      return reply.code(404).send({
        error: 'Game not found'
      })
    }

    reply.send({
      gameId: (game as any).id,
      port: (game as any).port,
      full: !!(game as any).full,
      status: !!(game as any).full ? 'full' : 'waiting'
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to retrieve game status'
    })
  }
})
fastify.put('/games/:gameId/status', async (request, reply) => {
  try {
    const { gameId } = request.params as { gameId: string }
    const { full } = request.body as { full: boolean }
    
    if (!gameId) {
      return reply.code(400).send({
        error: 'Game ID is required'
      })
    }

    if (typeof full !== 'boolean') {
      return reply.code(400).send({
        error: 'Full status must be a boolean'
      })
    }

    const result = updateGameStatus.run(full ? 1 : 0, gameId) // Convertir boolean en number
    
    if (result.changes === 0) {
      return reply.code(404).send({
        error: 'Game not found'
      })
    }

    reply.send({
      message: 'Game status updated successfully'
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to update game status'
    })
  }
})

// Route pour supprimer une game
fastify.delete('/games/:gameId', async (request, reply) => {
  try {
    const { gameId } = request.params as { gameId: string }
    
    if (!gameId) {
      return reply.code(400).send({
        error: 'Game ID is required'
      })
    }

    const game = getGame.get(gameId)
    
    if (!game) {
      return reply.code(404).send({
        error: 'Game not found'
      })
    }

    // Tuer le processus si il existe encore
    try {
      process.kill((game as any).pid, 'SIGTERM')
    } catch (error) {
      // Le processus n'existe peut-être plus
    }

    deleteGame.run(gameId)

    reply.send({
      message: 'Game deleted successfully'
    })
  } catch (error) {
    fastify.log.error(error)
    reply.code(500).send({
      error: 'Failed to delete game'
    })
  }
})

// Nettoyage à la fermeture du serveur
process.on('SIGINT', () => {
  fastify.log.info('Shutting down lobby server...')
  
  // Tuer tous les processus de jeu actifs
  const games = getAllGames.all()
  games.forEach((game: any) => {
    try {
      process.kill(game.pid, 'SIGTERM')
    } catch (error) {
      // Le processus n'existe peut-être plus
    }
  })
  
  db.close()
  process.exit(0)
})

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Lobby server listening on ${address}`)
})