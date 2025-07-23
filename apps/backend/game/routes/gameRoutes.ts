import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../database/init.js";
import { gameManager } from "../lib/gameManager.js";
import { JwtPayload, requireAuth } from "../middleware/auth.js";

const createGameSchema = z.object({
  maxScore: z.number().min(1).max(21).optional().default(11),
});

const joinGameSchema = z.object({
  gameId: z.string().uuid("invalid game id format"),
});

const controlGameSchema = z.object({
  gameId: z.string().uuid("invalid game id format"),
  action: z.enum(["paddle_up", "paddle_down", "pause", "resume"]),
});

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export async function gameRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/game",
    {
      schema: {
        tags: ["Game"],
        summary: "Create a new Pong game",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            maxScore: {
              type: "number",
              minimum: 1,
              maximum: 21,
              default: 11,
              description: "Maximum score to win the game",
            },
          },
        },
        response: {
          201: {
            description: "Game created successfully",
            type: "object",
            properties: {
              message: { type: "string" },
              gameId: { type: "string" },
              status: { type: "string" },
            },
          },
          401: {
            description: "Unauthorized",
            ...errorSchema,
          },
          500: {
            description: "Internal server error",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = createGameSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.issues[0].message,
          });
        }

        const gameId = gameManager.createGame(user);

        reply.status(201).send({
          message: "game created successfully",
          gameId,
          status: "waiting",
        });
      } catch (error: any) {
        fastify.log.error("Failed to create game:", error);
        reply.status(500).send({ error: "failed to create game" });
      }
    }
  );

  fastify.post(
    "/game/join",
    {
      schema: {
        tags: ["Game"],
        summary: "Join an existing game",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["gameId"],
          properties: {
            gameId: {
              type: "string",
              format: "uuid",
              description: "Game ID to join",
            },
          },
        },
        response: {
          200: {
            description: "Successfully joined game",
            type: "object",
            properties: {
              message: { type: "string" },
              gameId: { type: "string" },
              wsEndpoint: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            ...errorSchema,
          },
          404: {
            description: "Game not found",
            ...errorSchema,
          },
          409: {
            description: "Conflict",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = joinGameSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.issues[0].message,
          });
        }

        const { gameId } = validation.data;
        const game = gameManager.getGame(gameId);

        if (!game) {
          return reply.status(404).send({ error: "game not found" });
        }

        if (game.status !== "waiting") {
          return reply
            .status(409)
            .send({ error: "game already started or finished" });
        }

        if (game.players.size >= 2) {
          return reply.status(409).send({ error: "game is full" });
        }

        if (game.players.has(user.userId)) {
          return reply.status(409).send({ error: "already joined this game" });
        }

        reply.send({
          message: "ready to join game via websocket",
          gameId,
          wsEndpoint: `/ws/game/${gameId}`,
        });
      } catch (error: any) {
        fastify.log.error("Failed to join game:", error);
        reply.status(500).send({ error: "failed to join game" });
      }
    }
  );

  fastify.get(
    "/game/state/:gameId",
    {
      schema: {
        tags: ["Game"],
        summary: "Get current game state",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["gameId"],
          properties: {
            gameId: {
              type: "string",
              format: "uuid",
              description: "Game ID",
            },
          },
        },
        response: {
          200: {
            description: "Game state retrieved successfully",
            type: "object",
            properties: {
              gameId: { type: "string" },
              status: { type: "string" },
              gameState: { type: "object" },
              players: { type: "array" },
              createdAt: { type: "string" },
              startedAt: { type: "string" },
            },
          },
          404: {
            description: "Game not found",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const { gameId } = request.params as { gameId: string };
        const game = gameManager.getGame(gameId);

        if (!game) {
          return reply.status(404).send({ error: "game not found" });
        }

        const gameState = game.game.getState();
        const players = Array.from(game.players.values()).map((p) => ({
          playerNumber: p.playerNumber,
          displayName: p.displayName,
          connected: p.connected,
        }));

        reply.send({
          gameId: game.id,
          status: game.status,
          gameState,
          players,
          createdAt: game.createdAt,
          startedAt: game.startedAt,
        });
      } catch (error: any) {
        fastify.log.error("Failed to get game state:", error);
        reply.status(500).send({ error: "failed to get game state" });
      }
    }
  );

  fastify.get(
    "/games/waiting",
    {
      schema: {
        tags: ["Game"],
        summary: "Get list of games waiting for players",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "List of waiting games",
            type: "object",
            properties: {
              games: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    gameId: { type: "string" },
                    createdAt: { type: "string" },
                    playersCount: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const waitingGameIds = gameManager.getWaitingGames();

        const allGames = gameManager.getAllGames();

        const additionalWaitingGames = allGames.filter(
          (game) =>
            game.status === "waiting" && !waitingGameIds.includes(game.id)
        );

        const allWaitingGameIds = [
          ...waitingGameIds,
          ...additionalWaitingGames.map((g) => g.id),
        ];

        const games = allWaitingGameIds
          .map((gameId) => {
            const game = gameManager.getGame(gameId);
            return game && game.status === "waiting"
              ? {
                  gameId: game.id,
                  createdAt: game.createdAt.toISOString(),
                  playersCount: Array.from(game.players.values()).filter(
                    (p) => p.connected
                  ).length,
                }
              : null;
          })
          .filter(Boolean);

        for (const game of games) {
          if (
            game?.createdAt &&
            new Date(game.createdAt) < new Date(Date.now() - 1000 * 60 * 5)
          ) {
            gameManager.deleteGame(game.gameId);
          }
        }

        reply.send({ games });
      } catch (error: any) {
        fastify.log.error("Failed to get waiting games:", error);
        reply.status(500).send({ error: "failed to get waiting games" });
      }
    }
  );

  fastify.post(
    "/game/control",
    {
      schema: {
        tags: ["Game"],
        summary: "Send game control commands",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["gameId", "action"],
          properties: {
            gameId: {
              type: "string",
              format: "uuid",
              description: "Game ID",
            },
            action: {
              type: "string",
              enum: ["paddle_up", "paddle_down", "pause", "resume"],
              description: "Control action",
            },
          },
        },
        response: {
          200: {
            description: "Command executed successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            ...errorSchema,
          },
          404: {
            description: "Game not found",
            ...errorSchema,
          },
          403: {
            description: "Forbidden",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = controlGameSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.issues[0].message,
          });
        }

        const { gameId, action } = validation.data;
        const game = gameManager.getGame(gameId);

        if (!game) {
          return reply.status(404).send({ error: "game not found" });
        }

        const player = game.players.get(user.userId);
        if (!player) {
          return reply.status(403).send({ error: "not a player in this game" });
        }

        if (action === "paddle_up" || action === "paddle_down") {
          const direction = action === "paddle_up" ? "up" : "down";
          game.game.movePaddle(player.playerNumber, direction);
        } else if (action === "pause") {
          game.game.pause();
        } else if (action === "resume") {
          game.game.resume();
        }

        reply.send({ message: "command executed successfully" });
      } catch (error: any) {
        fastify.log.error("Failed to execute game control:", error);
        reply.status(500).send({ error: "failed to execute command" });
      }
    }
  );

  fastify.post(
    "/game/local",
    {
      schema: {
        tags: ["Game"],
        summary: "Create a new local Pong game",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            maxScore: {
              type: "number",
              minimum: 1,
              maximum: 21,
              default: 11,
              description: "Maximum score to win the game",
            },
          },
        },
        response: {
          201: {
            description: "Local game created successfully",
            type: "object",
            properties: {
              message: { type: "string" },
              matchId: { type: "string" },
              status: { type: "string" },
            },
          },
          401: {
            description: "Unauthorized",
            ...errorSchema,
          },
          500: {
            description: "Internal server error",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = createGameSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.issues[0].message,
          });
        }

        const gameId = crypto.randomUUID();

        db.prepare(
          `
          INSERT INTO games (
            id, status, player1_id, max_score, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `
        ).run(
          gameId,
          "local",
          user.userId,
          validation.data.maxScore,
          new Date().toISOString()
        );

        reply.status(201).send({
          message: "local game created successfully",
          matchId: gameId,
          status: "local",
        });
      } catch (error: any) {
        fastify.log.error("Failed to create local game:", error);
        reply.status(500).send({ error: "failed to create local game" });
      }
    }
  );

  fastify.post(
    "/game/local/result",
    {
      schema: {
        tags: ["Game"],
        summary: "Update local game result",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["matchId", "player1Score", "player2Score", "duration"],
          properties: {
            matchId: {
              type: "string",
              format: "uuid",
              description: "Local game match ID",
            },
            player1Score: {
              type: "number",
              minimum: 0,
              description: "Player 1 final score",
            },
            player2Score: {
              type: "number",
              minimum: 0,
              description: "Player 2 final score",
            },
            duration: {
              type: "number",
              minimum: 0,
              description: "Game duration in seconds",
            },
            winnerId: {
              type: "number",
              description: "Winner user ID (optional)",
            },
          },
        },
        response: {
          200: {
            description: "Local game result updated successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          404: {
            description: "Game not found",
            ...errorSchema,
          },
          500: {
            description: "Internal server error",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const { matchId, player1Score, player2Score, duration, winnerId } =
          request.body as {
            matchId: string;
            player1Score: number;
            player2Score: number;
            duration: number;
            winnerId?: number;
          };

        const game = db
          .prepare(
            `
          SELECT id, player1_id, status FROM games
          WHERE id = ? AND status = 'local' AND player1_id = ?
        `
          )
          .get(matchId, user.userId) as any;

        if (!game) {
          return reply.status(404).send({ error: "local game not found" });
        }

        db.prepare(
          `
          UPDATE games SET
            status = 'finished',
            player1_score = ?,
            player2_score = ?,
            winner_id = ?,
            game_duration = ?,
            finished_at = ?
          WHERE id = ?
        `
        ).run(
          player1Score,
          player2Score,
          winnerId || null,
          duration,
          new Date().toISOString(),
          matchId
        );

        reply.send({
          message: "local game result updated successfully",
        });
      } catch (error: any) {
        fastify.log.error("Failed to update local game result:", error);
        reply.status(500).send({ error: "failed to update local game result" });
      }
    }
  );

  fastify.get(
    "/games/history",
    {
      schema: {
        tags: ["Game"],
        summary: "Get user's game history",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Game history retrieved successfully",
            type: "object",
            properties: {
              games: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: { type: "string" },
                    player1_id: { type: "number" },
                    player2_id: { type: "number" },
                    player1_score: { type: "number" },
                    player2_score: { type: "number" },
                    winner_id: { type: "number" },
                    max_score: { type: "number" },
                    created_at: { type: "string" },
                    started_at: { type: "string" },
                    finished_at: { type: "string" },
                    game_duration: { type: "number" },
                    result: { type: "string" },
                    opponent_id: { type: "number" },
                  },
                },
              },
              stats: {
                type: "object",
                properties: {
                  total_games: { type: "number" },
                  games_won: { type: "number" },
                  games_lost: { type: "number" },
                  win_rate: { type: "number" },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const userId = user.userId;

        const games = db
          .prepare(
            `
            SELECT
              id,
              status,
              player1_id,
              player2_id,
              player1_score,
              player2_score,
              winner_id,
              max_score,
              created_at,
              started_at,
              finished_at,
              game_duration
            FROM games
            WHERE (player1_id = ? OR player2_id = ?)
              AND status = 'finished'
            ORDER BY finished_at DESC
          `
          )
          .all(userId, userId) as any[];

        const gamesWithResults = games.map((game) => {
          const isPlayer1 = game.player1_id === userId;
          const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
          let result = "draw";

          if (game.winner_id === userId) {
            result = "won";
          } else if (game.winner_id && game.winner_id !== userId) {
            result = "lost";
          }

          return {
            ...game,
            result,
            opponent_id: opponentId,
          };
        });

        const totalGames = gamesWithResults.length;
        const gamesWon = gamesWithResults.filter(
          (g) => g.result === "won"
        ).length;
        const gamesLost = gamesWithResults.filter(
          (g) => g.result === "lost"
        ).length;
        const winRate =
          totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

        reply.send({
          games: gamesWithResults,
          stats: {
            total_games: totalGames,
            games_won: gamesWon,
            games_lost: gamesLost,
            win_rate: winRate,
          },
        });
      } catch (error: any) {
        fastify.log.error("Failed to get game history:", error);
        reply.status(500).send({ error: "failed to get game history" });
      }
    }
  );

  fastify.get(
    "/user/history",
    {
      schema: {
        tags: ["Game"],
        summary: "Get user game history and statistics",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "User game history retrieved successfully",
            type: "object",
            properties: {
              stats: {
                type: "object",
                properties: {
                  total_games: { type: "number" },
                  games_won: { type: "number" },
                  games_lost: { type: "number" },
                  win_rate: { type: "number" },
                },
              },
              games: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: { type: "string" },
                    player1_score: { type: "number" },
                    player2_score: { type: "number" },
                    winner_id: { type: "number" },
                    game_duration: { type: "number" },
                    finished_at: { type: "string" },
                    opponent_id: { type: "number" },
                    is_winner: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const userId = user.userId;

        const gamesQuery = db.prepare(`
          SELECT
            id, status, player1_id, player2_id, player1_score, player2_score,
            winner_id, game_duration, finished_at, created_at
          FROM games
          WHERE (player1_id = ? OR player2_id = ?)
            AND status = 'finished'
          ORDER BY finished_at DESC
          LIMIT 50
        `);

        const games = gamesQuery.all(userId, userId) as any[];

        const stats = {
          total_games: games.length,
          games_won: games.filter((g) => g.winner_id === userId).length,
          games_lost: games.filter(
            (g) => g.winner_id !== userId && g.winner_id !== null
          ).length,
          win_rate:
            games.length > 0
              ? Math.round(
                  (games.filter((g) => g.winner_id === userId).length /
                    games.length) *
                    100
                )
              : 0,
        };

        const gameHistory = games.map((game) => ({
          id: game.id,
          status: game.status,
          player1_score: game.player1_score,
          player2_score: game.player2_score,
          winner_id: game.winner_id,
          game_duration: game.game_duration,
          finished_at: game.finished_at,
          opponent_id:
            game.player1_id === userId ? game.player2_id : game.player1_id,
          is_winner: game.winner_id === userId,
        }));

        reply.send({
          stats,
          games: gameHistory,
        });
      } catch (error: any) {
        fastify.log.error("Failed to get user game history:", error);
        reply.status(500).send({ error: "failed to get game history" });
      }
    }
  );

  fastify.get(
    "/user/:userId/history",
    {
      schema: {
        tags: ["Game"],
        summary: "Get specific user game statistics",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: {
              type: "string",
              description: "User ID",
            },
          },
        },
        response: {
          200: {
            description: "User game statistics retrieved successfully",
            type: "object",
            properties: {
              stats: {
                type: "object",
                properties: {
                  total_games: { type: "number" },
                  games_won: { type: "number" },
                  games_lost: { type: "number" },
                  win_rate: { type: "number" },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            ...errorSchema,
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const userIdNum = parseInt(userId, 10);

        if (isNaN(userIdNum)) {
          return reply.status(400).send({ error: "invalid user id" });
        }

        const gamesQuery = db.prepare(`
          SELECT
            id, status, player1_id, player2_id, winner_id
          FROM games
          WHERE (player1_id = ? OR player2_id = ?)
            AND status = 'finished'
        `);

        const games = gamesQuery.all(userIdNum, userIdNum) as any[];

        const stats = {
          total_games: games.length,
          games_won: games.filter((g) => g.winner_id === userIdNum).length,
          games_lost: games.filter(
            (g) => g.winner_id !== userIdNum && g.winner_id !== null
          ).length,
          win_rate:
            games.length > 0
              ? Math.round(
                  (games.filter((g) => g.winner_id === userIdNum).length /
                    games.length) *
                    100
                )
              : 0,
        };

        reply.send({ stats });
      } catch (error: any) {
        fastify.log.error("Failed to get user game statistics:", error);
        reply.status(500).send({ error: "failed to get game statistics" });
      }
    }
  );
}
