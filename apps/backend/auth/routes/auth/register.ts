import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUser } from "../../database/lib/createUser.ts";
import { sendVerificationEmail } from "../../database/lib/emailService.ts";
import { createEmailVerificationCode } from "../../database/lib/emailVerificationService.ts";

const registerBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export async function registerRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/register",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Register a new user",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: {
              type: "string",
              minLength: 8,
              description: "User password (min 8 characters)",
            },
          },
        },
        response: {
          200: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    userId: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Registration failed",
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
        const validation = registerBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { email, password } = validation.data;
        const userId = await createUser(email, password);

        try {
          const code = await createEmailVerificationCode(
            userId as number,
            email
          );
          await sendVerificationEmail(email, code);
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
        }

        reply.send({
          message:
            "user registered successfully. please check your email for a 6-digit verification code.",
          userId: userId.toString(),
        });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
