import { FastifyInstance } from "fastify";
import { z } from "zod";
import { useToken, verifyToken } from "../../database/lib/tokenService.ts";
import { verifyUserEmail } from "../../database/lib/userService.ts";

const verifyEmailBodySchema = z.object({
  token: z.string().min(1, "token is required"),
});

export async function verifyEmailRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/verify-email",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Verify user email address",
        body: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              description: "Email verification token",
            },
          },
        },
        response: {
          200: {
            description: "Email verified successfully",
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
            description: "Email verification failed",
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
        const validation = verifyEmailBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { token } = validation.data;

        const tokenData = await verifyToken(token, "email_verification");

        await verifyUserEmail(tokenData.userId);

        await useToken(tokenData.tokenId);

        reply.send({ message: "email verified successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
