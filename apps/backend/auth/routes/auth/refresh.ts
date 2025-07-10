import { FastifyInstance } from "fastify";
import { refreshSession } from "../../database/lib/sessionService.ts";

export async function refreshRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        response: {
          200: {
            description: "Token refreshed successfully",
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
            description: "Invalid or expired refresh token",
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
        const refreshToken = (request.cookies as any)?.refreshToken;

        if (!refreshToken) {
          return reply
            .status(401)
            .send({ error: "refresh token not provided" });
        }

        const session = await refreshSession(refreshToken);

        const accessToken = fastify.jwt.sign(
          {
            userId: session.user.id,
            email: session.user.email,
            username: session.user.username,
          },
          { expiresIn: "15m" }
        );

        (reply as any).setCookie("refreshToken", session.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });

        reply.send({
          message: "token refreshed successfully",
          accessToken,
          user: session.user,
        });
      } catch (error: any) {
        reply.status(401).send({ error: error.message });
      }
    }
  );
}
