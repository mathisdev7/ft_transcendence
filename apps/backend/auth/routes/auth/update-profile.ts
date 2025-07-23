import { FastifyInstance } from "fastify";
import { z } from "zod";
import { updateUser } from "../../database/lib/userService.ts";

const updateProfileBodySchema = z.object({
  display_name: z
    .string()
    .min(1, "display name is required")
    .max(50, "display name must be at most 50 characters")
    .optional(),
  avatar_url: z.string().url("invalid avatar URL").optional(),
});

export async function updateProfileRoute(fastify: FastifyInstance) {
  fastify.put(
    "/auth/profile",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Update user profile",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            display_name: {
              type: "string",
              minLength: 1,
              maxLength: 50,
              description: "User display name",
            },
            avatar_url: {
              type: "string",
              format: "uri",
              description: "User avatar URL",
            },
          },
        },
        response: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        email: { type: "string" },
                        display_name: { type: "string" },
                        avatar_url: { type: "string" },
                        is_verified: { type: "boolean" },
                        created_at: { type: "string" },
                        updated_at: { type: "string" },
                        last_login: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid data",
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
        const validation = updateProfileBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const payload = request.user as any;
        const updates = validation.data;

        if (Object.keys(updates).length === 0) {
          return reply.status(400).send({
            error: "no fields to update",
          });
        }

        const updatedUser = await updateUser(payload.userId, {
          displayName: updates.display_name,
          avatarUrl: updates.avatar_url,
        });

        reply.send({
          message: "profile updated successfully",
          user: updatedUser,
        });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
