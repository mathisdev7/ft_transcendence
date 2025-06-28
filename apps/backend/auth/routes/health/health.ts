import { FastifyInstance } from "fastify";

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get(
    "/auth/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check endpoint",
        response: {
          200: {
            description: "Service health status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    service: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      reply.send({ status: "ok", service: "auth" });
    }
  );
}
