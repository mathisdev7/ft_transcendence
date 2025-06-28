import { FastifyInstance } from "fastify";

export async function meRoute(fastify: FastifyInstance) {
  fastify.get("/auth/me", async (request, reply) => {
    reply.send({ message: "Route me - todo" });
  });
}
