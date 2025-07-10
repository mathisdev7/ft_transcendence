import { FastifyInstance } from "fastify";
import { deleteSession } from "../../database/lib/sessionService.ts";

export async function logoutRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Logout user",
        response: {
          200: {
            description: "Logout successful",
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
            description: "Logout failed",
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

        if (refreshToken) {
          try {
            await deleteSession(refreshToken);
          } catch (error) {
            console.log("Session not found or already deleted");
          }
        }

        (reply as any).clearCookie("refreshToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });

        reply.send({ message: "logout successful" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );
}
