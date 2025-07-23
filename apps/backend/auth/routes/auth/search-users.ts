import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../database/init";

const searchUsersQuerySchema = z.object({
  q: z
    .string()
    .min(1, "search query is required")
    .max(50, "search query must be at most 50 characters"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

export async function searchUsersRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/users/search",
    {
      schema: {
        tags: ["Users"],
        summary: "Search users by display name",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: {
              type: "string",
              minLength: 1,
              maxLength: 50,
              description: "Search query for display name",
            },
            limit: {
              type: "string",
              description: "Maximum number of results (default: 10, max: 50)",
            },
          },
        },
        response: {
          200: {
            description: "Users found successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number" },
                          display_name: { type: "string" },
                          avatar_url: { type: "string" },
                          is_verified: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid search parameters",
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
        const validation = searchUsersQuerySchema.safeParse(request.query);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { q: query, limit } = validation.data;
        const maxLimit = Math.min(limit, 50);

        const users = db
          .prepare(
            `SELECT id, display_name, avatar_url, is_verified
             FROM users
             WHERE display_name LIKE ?
             AND is_active = 1
             AND is_verified = 1
             ORDER BY display_name ASC
             LIMIT ?`
          )
          .all(`%${query}%`, maxLimit) as any[];

        reply.send({
          users: users.map((user) => ({
            id: user.id,
            display_name: user.display_name,
            avatar_url: user.avatar_url || null,
            is_verified: user.is_verified,
          })),
        });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );
}
