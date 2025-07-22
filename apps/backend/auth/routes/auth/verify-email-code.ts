import { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyEmailVerificationCode } from "../../database/lib/emailVerificationService.ts";
import { verifyUserEmail } from "../../database/lib/userService.ts";

const verifyEmailCodeSchema = z.object({
  email: z.string().email("invalid email format"),
  code: z.string().length(6, "code must be 6 digits"),
});

export async function verifyEmailCodeRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/verify-email-code",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Verify email with 6-digit code",
        body: {
          type: "object",
          required: ["email", "code"],
          properties: {
            email: { type: "string", format: "email" },
            code: { type: "string", minLength: 6, maxLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const validation = verifyEmailCodeSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { email, code } = validation.data;

        const verificationResult = await verifyEmailVerificationCode(
          email,
          code
        );

        if (!verificationResult.success || !verificationResult.userId) {
          return reply.status(400).send({
            error: "invalid or expired verification code",
          });
        }

        await verifyUserEmail(verificationResult.userId);

        reply.send({
          message: "email verified successfully",
        });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
