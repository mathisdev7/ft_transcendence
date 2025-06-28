import { FastifyInstance } from "fastify";

export async function forgotPasswordRoute(fastify: FastifyInstance) {
  fastify.post("/auth/forgot-password", async (request, reply) => {
    reply.send({ message: "Route forgot password - todo" });
  });
}
