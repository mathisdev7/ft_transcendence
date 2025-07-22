import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../database/init.js";
import { JwtPayload, requireAuth } from "../middleware/auth.js";

const saveTournamentSchema = z.object({
  tournamentId: z.string(),
  name: z.string().min(1),
  winner: z.object({
    id: z.string(),
    name: z.string(),
  }),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  matches: z.array(
    z.object({
      id: z.string(),
      round: z.number(),
      position: z.number(),
      player1: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable(),
      player2: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable(),
      winner: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable(),
      score: z
        .object({
          player1: z.number(),
          player2: z.number(),
        })
        .nullable(),
    })
  ),
});

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export async function tournamentRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/tournament/save",
    {
      schema: {
        tags: ["Tournament"],
        summary: "Save tournament results",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["tournamentId", "name", "winner", "players", "matches"],
          properties: {
            tournamentId: { type: "string" },
            name: { type: "string" },
            winner: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
              required: ["id", "name"],
            },
            players: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                },
                required: ["id", "name"],
              },
            },
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  round: { type: "number" },
                  position: { type: "number" },
                  player1: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                    nullable: true,
                  },
                  player2: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                    nullable: true,
                  },
                  winner: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                    nullable: true,
                  },
                  score: {
                    type: "object",
                    properties: {
                      player1: { type: "number" },
                      player2: { type: "number" },
                    },
                    nullable: true,
                  },
                },
                required: ["id", "round", "position"],
              },
            },
          },
        },
        response: {
          201: {
            description: "Tournament saved successfully",
            type: "object",
            properties: {
              message: { type: "string" },
              tournamentId: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            ...errorSchema,
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
        const validation = saveTournamentSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.issues[0].message,
          });
        }

        const { tournamentId, name, winner, players, matches } =
          validation.data;

        const saveTournament = db.transaction(() => {
          const tournamentStmt = db.prepare(`
            INSERT INTO tournaments (id, name, user_id, winner_name, players_count, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          tournamentStmt.run(
            tournamentId,
            name,
            user.userId,
            winner.name,
            players.length,
            new Date().toISOString()
          );

          const playerStmt = db.prepare(`
            INSERT INTO tournament_players (tournament_id, player_name, position)
            VALUES (?, ?, ?)
          `);

          players.forEach((player, index) => {
            playerStmt.run(tournamentId, player.name, index);
          });

          const matchStmt = db.prepare(`
            INSERT INTO tournament_matches (tournament_id, round, position, player1_name, player2_name, winner_name, player1_score, player2_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          matches.forEach((match) => {
            matchStmt.run(
              tournamentId,
              match.round,
              match.position,
              match.player1?.name || null,
              match.player2?.name || null,
              match.winner?.name || null,
              match.score?.player1 || 0,
              match.score?.player2 || 0
            );
          });
        });

        saveTournament();

        reply.status(201).send({
          message: "Tournament saved successfully",
          tournamentId,
        });
      } catch (error: any) {
        fastify.log.error("Failed to save tournament:", error);
        reply.status(500).send({ error: "Failed to save tournament" });
      }
    }
  );

  fastify.get(
    "/tournaments/history",
    {
      schema: {
        tags: ["Tournament"],
        summary: "Get user's tournament history",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Tournament history retrieved successfully",
            type: "object",
            properties: {
              tournaments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    winner_name: { type: "string" },
                    players_count: { type: "number" },
                    created_at: { type: "string" },
                    completed_at: { type: "string" },
                    players: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          player_name: { type: "string" },
                          position: { type: "number" },
                        },
                      },
                    },
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          round: { type: "number" },
                          position: { type: "number" },
                          player1_name: { type: "string" },
                          player2_name: { type: "string" },
                          winner_name: { type: "string" },
                          player1_score: { type: "number" },
                          player2_score: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
              stats: {
                type: "object",
                properties: {
                  total_tournaments: { type: "number" },
                  tournaments_won: { type: "number" },
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

        const tournaments = db
          .prepare(
            `
            SELECT id, name, winner_name, players_count, created_at, completed_at
            FROM tournaments
            WHERE user_id = ?
            ORDER BY completed_at DESC
          `
          )
          .all(userId) as any[];

        const tournamentsWithDetails = tournaments.map((tournament) => {
          const players = db
            .prepare(
              `
              SELECT player_name, position
              FROM tournament_players
              WHERE tournament_id = ?
              ORDER BY position
            `
            )
            .all(tournament.id);

          const matches = db
            .prepare(
              `
              SELECT round, position, player1_name, player2_name, winner_name, player1_score, player2_score
              FROM tournament_matches
              WHERE tournament_id = ?
              ORDER BY round, position
            `
            )
            .all(tournament.id);

          return {
            ...tournament,
            players,
            matches,
          };
        });

        const totalTournaments = tournaments.length;
        const tournamentsWon = tournaments.filter(
          (t) => t.winner_name === user.username
        ).length;
        const winRate =
          totalTournaments > 0
            ? Math.round((tournamentsWon / totalTournaments) * 100)
            : 0;

        reply.send({
          tournaments: tournamentsWithDetails,
          stats: {
            total_tournaments: totalTournaments,
            tournaments_won: tournamentsWon,
            win_rate: winRate,
          },
        });
      } catch (error: any) {
        fastify.log.error("Failed to get tournament history:", error);
        reply.status(500).send({ error: "Failed to get tournament history" });
      }
    }
  );
}
