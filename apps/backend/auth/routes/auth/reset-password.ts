import { FastifyInstance } from "fastify";

export async function resetPasswordRoute(fastify: FastifyInstance) {
  fastify.post("/auth/reset-password", async (request, reply) => {
    reply.send({ message: "Route reset password - todo" });
  });
}
