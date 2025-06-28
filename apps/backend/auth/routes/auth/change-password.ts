import { FastifyInstance } from "fastify";

export async function changePasswordRoute(fastify: FastifyInstance) {
  fastify.post("/auth/change-password", async (request, reply) => {
    reply.send({ message: "Route change password - todo" });
  });
}
