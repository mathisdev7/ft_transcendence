import { FastifyInstance } from "fastify";
import { z } from "zod";
import { useToken, verifyToken } from "../../database/lib/tokenService.ts";
import { updatePassword } from "../../database/lib/userService.ts";

const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "token is required"),
  newPassword: z.string().min(8, "password must be at least 8 characters"),
});

export async function resetPasswordRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/reset-password",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Reset user password",
        body: {
          type: "object",
          required: ["token", "newPassword"],
          properties: {
            token: {
              type: "string",
              description: "Password reset token",
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
            description: "Password reset successfully",
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
            description: "Password reset failed",
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
    },
    async (request, reply) => {
      try {
        const validation = resetPasswordBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { token, newPassword } = validation.data;

        const tokenData = await verifyToken(token, "password_reset");

        await updatePassword(tokenData.userId, newPassword);

        await useToken(tokenData.tokenId);

        reply.send({ message: "password reset successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
