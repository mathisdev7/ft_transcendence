import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../database/init";
import { createSession } from "../../database/lib/createSession";
import { verifyTwoFactorCode } from "../../database/lib/twoFactorService";

const loginVerifyBodySchema = z.object({
  userId: z.number().min(1, "user id is required"),
  code: z.string().length(6, "code must be 6 digits"),
});

export async function loginVerifyRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/login/verify",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Verify 2FA code and complete login",
        body: {
          type: "object",
          required: ["userId", "code"],
          properties: {
            userId: {
              type: "number",
              description: "User ID from login init",
            },
            code: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              description: "6-digit verification code",
            },
          },
        },
        response: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    accessToken: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        email: { type: "string" },
                        username: { type: "string" },
                        display_name: { type: "string" },
                        avatar_url: { type: "string" },
                        is_verified: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Verification failed",
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
        const validation = loginVerifyBodySchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { userId, code } = validation.data;

        const isCodeValid = await verifyTwoFactorCode(
          userId,
          code,
          request.ip,
          request.headers["user-agent"]
        );

        if (!isCodeValid) {
          return reply.status(401).send({
            error: "invalid or expired verification code",
          });
        }

        const user = db
          .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
          .get(userId) as any;

        if (!user) {
          return reply.status(401).send({
            error: "user not found",
          });
        }

        const accessToken = fastify.jwt.sign(
          {
            userId: user.id,
            email: user.email,
            username: user.username,
          },
          { expiresIn: "15m" }
        );

        const session = await createSession(
          user.id,
          request.ip,
          request.headers["user-agent"]
        );

        (reply as any).setCookie("refreshToken", session.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        db.prepare(
          "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(user.id);

        reply.send({
          message: "login successful",
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            is_verified: user.is_verified,
          },
        });
      } catch (error: any) {
        reply.status(401).send({ error: error.message });
      }
    }
  );
}
