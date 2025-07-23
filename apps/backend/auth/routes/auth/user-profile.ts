import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getUserById } from "../../database/lib/userService.ts";

const userProfileParamsSchema = z.object({
  userId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, "invalid user ID"),
});

export async function userProfileRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/users/:userId/profile",
    {
      schema: {
        tags: ["Users"],
        summary: "Get user profile by ID",
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
            description: "User profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        display_name: { type: "string" },
                        avatar_url: { type: "string" },
                        is_verified: { type: "boolean" },
                        created_at: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid user ID",
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
          404: {
            description: "User not found",
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
        const validation = userProfileParamsSchema.safeParse(request.params);

        if (!validation.success) {
          return reply.status(400).send({
            error: "invalid user ID",
          });
        }

        const { userId } = validation.data;
        const user = await getUserById(userId);

        reply.send({
          user: {
            id: user.id,
            display_name: user.display_name,
            avatar_url: user.avatar_url || null,
            is_verified: user.is_verified,
            created_at: user.created_at,
          },
        });
      } catch (error: any) {
        if (error.message === "user not found") {
          reply.status(404).send({ error: "user not found" });
        } else {
          reply.status(500).send({ error: error.message });
        }
      }
    }
  );
}
