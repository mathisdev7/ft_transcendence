import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../database/init.js";
import { JwtPayload, requireAuth } from "../middleware/auth.js";

const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
});

interface GameActivityItem {
  id: string;
  type:
    | "game_finished"
    | "game_created"
    | "tournament_completed"
    | "tournament_created";
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/activity/recent",
    {
      schema: {
        tags: ["Game Activity"],
        summary: "Get recent game and tournament activities",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              minimum: 1,
              maximum: 50,
              default: 20,
              description: "Number of activities to return",
            },
          },
        },
        response: {
          200: {
            description: "Recent activities retrieved successfully",
            type: "object",
            properties: {
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" },
                    timestamp: { type: "string" },
                    metadata: { type: "object" },
                  },
                },
              },
              total: { type: "number" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = recentActivityQuerySchema.safeParse(request.query);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { limit } = validation.data;
        const activities: GameActivityItem[] = [];

        const recentGames = db
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
            finished_at,
            game_duration
          FROM games
          WHERE (player1_id = ? OR player2_id = ?)
            AND status = 'finished'
            AND finished_at IS NOT NULL
          ORDER BY finished_at DESC
          LIMIT ?
        `
          )
          .all(user.userId, user.userId, Math.ceil(limit * 0.6)) as any[];

        recentGames.forEach((game) => {
          const isWinner = game.winner_id === user.userId;
          const opponentId =
            game.player1_id === user.userId ? game.player2_id : game.player1_id;
          const finalScore = `${game.player1_score}-${game.player2_score}`;

          activities.push({
            id: `game_${game.id}`,
            type: "game_finished",
            description: `${isWinner ? "Won" : "Lost"} game ${finalScore}${
              game.game_duration
                ? ` in ${Math.floor(game.game_duration / 60)}:${(
                    game.game_duration % 60
                  )
                    .toString()
                    .padStart(2, "0")}`
                : ""
            }`,
            timestamp: game.finished_at,
            metadata: {
              gameId: game.id,
              isWinner,
              score: finalScore,
              opponentId,
              duration: game.game_duration,
            },
          });
        });

        const recentGameCreations = db
          .prepare(
            `
          SELECT
            id,
            status,
            created_at
          FROM games
          WHERE player1_id = ?
            AND created_at IS NOT NULL
          ORDER BY created_at DESC
          LIMIT ?
        `
          )
          .all(user.userId, Math.ceil(limit * 0.2)) as any[];

        recentGameCreations.forEach((game) => {
          activities.push({
            id: `game_created_${game.id}`,
            type: "game_created",
            description: "Created new game",
            timestamp: game.created_at,
            metadata: {
              gameId: game.id,
              status: game.status,
            },
          });
        });

        const recentTournaments = db
          .prepare(
            `
          SELECT
            id,
            name,
            winner_name,
            players_count,
            completed_at,
            user_id
          FROM tournaments
          WHERE user_id = ?
          ORDER BY completed_at DESC
          LIMIT ?
        `
          )
          .all(user.userId, Math.ceil(limit * 0.2)) as any[];

        recentTournaments.forEach((tournament) => {
          activities.push({
            id: `tournament_${tournament.id}`,
            type: "tournament_completed",
            description: `Completed tournament "${tournament.name}" with ${tournament.players_count} players`,
            timestamp: tournament.completed_at,
            metadata: {
              tournamentId: tournament.id,
              name: tournament.name,
              winner: tournament.winner_name,
              playersCount: tournament.players_count,
            },
          });
        });

        activities.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const limitedActivities = activities.slice(0, limit);

        reply.send({
          activities: limitedActivities,
          total: activities.length,
        });
      } catch (error: any) {
        fastify.log.error("Failed to get recent game activities:", error);
        reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/activity/combined",
    {
      schema: {
        tags: ["Game Activity"],
        summary: "Get combined recent activities (games + auth)",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              minimum: 1,
              maximum: 50,
              default: 20,
              description: "Number of activities to return",
            },
          },
        },
        response: {
          200: {
            description: "Combined recent activities retrieved successfully",
            type: "object",
            properties: {
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" },
                    timestamp: { type: "string" },
                    source: { type: "string" },
                    metadata: { type: "object" },
                  },
                },
              },
              total: { type: "number" },
            },
          },
        },
      },
      ...requireAuth(),
    },
    async (request, reply) => {
      try {
        const user = (request as any).gameUser as JwtPayload;
        const validation = recentActivityQuerySchema.safeParse(request.query);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { limit } = validation.data;
        const activities: (GameActivityItem & { source: string })[] = [];

        const gameActivities = db
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
            finished_at,
            created_at,
            game_duration
          FROM games
          WHERE (player1_id = ? OR player2_id = ?)
            AND (finished_at IS NOT NULL OR created_at IS NOT NULL)
          ORDER BY COALESCE(finished_at, created_at) DESC
          LIMIT ?
        `
          )
          .all(user.userId, user.userId, limit) as any[];

        gameActivities.forEach((game) => {
          if (game.finished_at) {
            const isWinner = game.winner_id === user.userId;
            const finalScore = `${game.player1_score}-${game.player2_score}`;

            activities.push({
              id: `game_${game.id}`,
              type: "game_finished",
              description: `${isWinner ? "Won" : "Lost"} game ${finalScore}`,
              timestamp: game.finished_at,
              source: "game",
              metadata: {
                gameId: game.id,
                isWinner,
                score: finalScore,
                duration: game.game_duration,
              },
            });
          } else if (game.player1_id === user.userId) {
            activities.push({
              id: `game_created_${game.id}`,
              type: "game_created",
              description: "Created new game",
              timestamp: game.created_at,
              source: "game",
              metadata: {
                gameId: game.id,
                status: game.status,
              },
            });
          }
        });

        const tournamentActivities = db
          .prepare(
            `
          SELECT
            id,
            name,
            winner_name,
            players_count,
            completed_at
          FROM tournaments
          WHERE user_id = ?
          ORDER BY completed_at DESC
          LIMIT ?
        `
          )
          .all(user.userId, Math.ceil(limit / 2)) as any[];

        tournamentActivities.forEach((tournament) => {
          activities.push({
            id: `tournament_${tournament.id}`,
            type: "tournament_completed",
            description: `Completed tournament "${tournament.name}"`,
            timestamp: tournament.completed_at,
            source: "tournament",
            metadata: {
              tournamentId: tournament.id,
              name: tournament.name,
              winner: tournament.winner_name,
              playersCount: tournament.players_count,
            },
          });
        });

        activities.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const limitedActivities = activities.slice(0, limit);

        reply.send({
          activities: limitedActivities,
          total: activities.length,
        });
      } catch (error: any) {
        fastify.log.error("Failed to get combined activities:", error);
        reply.status(500).send({ error: error.message });
      }
    }
  );
}
