import { FastifyInstance } from "fastify";
import { getUserById } from "../../database/lib/userService.ts";

export async function meRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/me",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Get current user information",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "User information retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        email: { type: "string" },
                        display_name: { type: "string" },
                        avatar_url: { type: "string" },
                        is_verified: { type: "boolean" },
                        created_at: { type: "string" },
                        updated_at: { type: "string" },
                        last_login: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
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
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const payload = request.user as any;
        const user = await getUserById(payload.userId);

        reply.send({ user });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );
}
