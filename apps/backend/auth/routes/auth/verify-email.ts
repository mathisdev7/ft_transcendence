import { FastifyInstance } from "fastify";

export async function verifyEmailRoute(fastify: FastifyInstance) {
  fastify.post("/auth/verify-email", async (request, reply) => {
    reply.send({ message: "Route verify email - todo" });
  });
}
