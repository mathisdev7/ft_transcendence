import { FastifyInstance } from "fastify";

export async function logoutRoute(fastify: FastifyInstance) {
  fastify.post("/auth/logout", async (request, reply) => {
    reply.send({ message: "Route logout - todo" });
  });
}
