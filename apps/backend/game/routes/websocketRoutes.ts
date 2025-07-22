import { FastifyInstance } from "fastify";
import { gameManager } from "../lib/gameManager.js";
import { JwtPayload } from "../middleware/auth.js";

export async function websocketRoutes(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get(
      "/ws/game/:gameId",
      { websocket: true },
      async (connection, request) => {
        const { gameId } = request.params as { gameId: string };

        try {
          let user: JwtPayload;

          try {
            let token: string | undefined;

            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
              token = authHeader.substring(7);
            }

            if (
              !token &&
              request.query &&
              typeof request.query === "object" &&
              "token" in request.query
            ) {
              token = request.query.token as string;
            }

            if (!token) {
              connection.close(1008, "Authentication required");
              return;
            }

            user = fastify.jwt.verify(token) as JwtPayload;
          } catch (error) {
            connection.close(1008, "Invalid token");
            return;
          }

          const success = gameManager.joinGame(gameId, user, connection);

          if (!success) {
            connection.close(1000, "Failed to join game");
            return;
          }

          fastify.log.info(
            `Player ${user.username} connected to game ${gameId}`
          );
        } catch (error) {
          fastify.log.error("WebSocket connection error:", error);
          try {
            connection.close(1011, "Server error");
          } catch (closeError) {
            fastify.log.error("Error closing connection:", closeError);
          }
        }
      }
    );
  });
}
