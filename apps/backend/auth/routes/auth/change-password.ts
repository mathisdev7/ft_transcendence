import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  updatePassword,
  validatePassword,
} from "../../database/lib/userService.ts";

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "current password is required"),
  newPassword: z.string().min(8, "new password must be at least 8 characters"),
});

export async function changePasswordRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/change-password",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Change user password",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: {
              type: "string",
              description: "Current password",
            },
            newPassword: {
              type: "string",
              minLength: 8,
              description: "New password (min 8 characters)",
            },
          },
        },
        response: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Password change failed",
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
        const validation = changePasswordBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { currentPassword, newPassword } = validation.data;
        const payload = request.user as any;

        const isCurrentPasswordValid = await validatePassword(
          payload.userId,
          currentPassword
        );

        if (!isCurrentPasswordValid) {
          return reply
            .status(400)
            .send({ error: "current password is incorrect" });
        }

        if (currentPassword === newPassword) {
          return reply
            .status(400)
            .send({
              error: "new password must be different from current password",
            });
        }

        await updatePassword(payload.userId, newPassword);

        reply.send({ message: "password changed successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
