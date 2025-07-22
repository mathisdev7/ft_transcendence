import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  sendTwoFactorCode,
  sendVerificationEmail,
} from "../../database/lib/emailService.ts";
import { createEmailVerificationCode } from "../../database/lib/emailVerificationService.ts";
import { loginUser } from "../../database/lib/loginUser.ts";
import { createTwoFactorCode } from "../../database/lib/twoFactorService.ts";

const loginBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
});

export async function loginRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/login",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Login user (redirects to 2FA flow)",
        description:
          "This endpoint now initiates 2FA login flow. Use /auth/login/init and /auth/login/verify for new implementations.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: { type: "string", description: "User password" },
          },
        },
        response: {
          200: {
            description: "2FA code sent - login requires verification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    requiresTwoFactor: { type: "boolean" },
                    userId: { type: "number" },
                  },
                },
              },
            },
          },
          401: {
            description: "Login failed",
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
      const validation = loginBodySchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          error: validation.error.errors[0].message,
        });
      }

      const { email, password } = validation.data;

      try {
        const user = await loginUser(email, password);

        const code = await createTwoFactorCode(
          user.id,
          request.ip,
          request.headers["user-agent"]
        );

        await sendTwoFactorCode(
          user.email,
          code,
          request.headers["user-agent"]
        );

        reply.send({
          message:
            "verification code sent to your email. use /auth/login/verify to complete login",
          requiresTwoFactor: true,
          userId: user.id,
        });
      } catch (error: any) {
        if (error.message === "email not verified") {
          try {
            const user = error.user;

            if (user && user.id) {
              const code = await createEmailVerificationCode(user.id, email);
              await sendVerificationEmail(email, code);

              return reply.status(401).send({
                error: "email not verified",
                requiresEmailVerification: true,
                email: email,
                message: "A verification code has been sent to your email",
              });
            }
          } catch (emailError) {
            console.error("🔍 Failed to send verification email:", emailError);
          }

          return reply.status(401).send({
            error:
              "email not verified. please verify your email before logging in",
            requiresEmailVerification: true,
            email: email,
          });
        }
        reply.status(401).send({ error: error.message });
      }
    }
  );
}
