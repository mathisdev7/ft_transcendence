import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendTwoFactorCode } from "../../database/lib/emailService";
import { loginUser } from "../../database/lib/loginUser";
import { createTwoFactorCode } from "../../database/lib/twoFactorService";

const loginInitBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
});

export async function loginInitRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/login/init",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Initiate login and send 2FA code",
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
            description: "2FA code sent successfully",
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
          429: {
            description: "Too many requests",
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
        const validation = loginInitBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { email, password } = validation.data;

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
          message: "verification code sent to your email",
          requiresTwoFactor: true,
          userId: user.id,
        });
      } catch (error: any) {
        if (error.message === "email not verified") {
          return reply.status(401).send({
            error:
              "email not verified. please verify your email before logging in",
          });
        }
        reply.status(401).send({ error: error.message });
      }
    }
  );
}
