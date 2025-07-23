import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../database/init.ts";

const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
});

interface ActivityItem {
  id: string;
  type: "login" | "profile_update" | "password_change" | "session_created";
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function recentActivityRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/activity/recent",
    {
      schema: {
        tags: ["User Activity"],
        summary: "Get recent user activities",
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
            content: {
              "application/json": {
                schema: {
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
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
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
        const validation = recentActivityQuerySchema.safeParse(request.query);
        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const payload = request.user as any;
        const { limit } = validation.data;

        const activities: ActivityItem[] = [];

        const recentLogins = db
          .prepare(
            `
          SELECT
            'login_' || id as id,
            'login' as type,
            last_used,
            ip_address,
            user_agent
          FROM sessions
          WHERE user_id = ?
          ORDER BY last_used DESC
          LIMIT ?
        `
          )
          .all(payload.userId, Math.ceil(limit / 3)) as any[];

        recentLogins.forEach((login) => {
          activities.push({
            id: login.id,
            type: "login",
            description: `Signed in from ${login.ip_address || "unknown IP"}`,
            timestamp: login.last_used,
            metadata: {
              ip_address: login.ip_address,
              user_agent: login.user_agent,
            },
          });
        });

        const user = db
          .prepare(
            `
          SELECT updated_at, created_at
          FROM users
          WHERE id = ?
        `
          )
          .get(payload.userId) as any;

        if (user && user.updated_at !== user.created_at) {
          activities.push({
            id: `profile_update_${payload.userId}`,
            type: "profile_update",
            description: "Updated profile information",
            timestamp: user.updated_at,
          });
        }

        const passwordResets = db
          .prepare(
            `
          SELECT
            'password_' || id as id,
            created_at,
            used
          FROM tokens
          WHERE user_id = ? AND type = 'password_reset' AND used = 1
          ORDER BY created_at DESC
          LIMIT ?
        `
          )
          .all(payload.userId, Math.ceil(limit / 3)) as any[];

        passwordResets.forEach((reset) => {
          activities.push({
            id: reset.id,
            type: "password_change",
            description: "Changed password",
            timestamp: reset.created_at,
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
        fastify.log.error("Failed to get recent activities:", error);
        reply.status(500).send({ error: error.message });
      }
    }
  );
}
