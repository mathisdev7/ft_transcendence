import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendVerificationEmail } from "../../database/lib/emailService.ts";
import { createToken } from "../../database/lib/tokenService.ts";
import { getUserByEmail } from "../../database/lib/userService.ts";

const resendVerificationBodySchema = z.object({
  email: z.string().email("invalid email format"),
});

export async function resendVerificationRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/resend-verification",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Resend email verification",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
          },
        },
        response: {
          200: {
            description: "Verification email sent",
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
            description: "Request failed",
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
        const validation = resendVerificationBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { email } = validation.data;

        try {
          const user = await getUserByEmail(email);

          if (user.is_verified) {
            return reply.send({
              message: "email is already verified. you can sign in now.",
            });
          }

          const tokenData = await createToken(
            user.id,
            "email_verification",
            24
          );

          await sendVerificationEmail(email, tokenData.token);

          reply.send({
            message:
              "verification email sent successfully. please check your inbox.",
          });
        } catch (error) {
          reply.send({
            message:
              "if email exists and is not verified, verification email has been sent",
          });
        }
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
