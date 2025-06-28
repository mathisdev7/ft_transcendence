import { FastifyInstance } from "fastify";

export async function refreshRoute(fastify: FastifyInstance) {
  fastify.post("/auth/refresh", async (request, reply) => {
    reply.send({ message: "Route refresh token - todo" });
  });
}
