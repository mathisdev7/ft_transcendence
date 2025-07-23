import { FastifyInstance } from "fastify";
import {
  getOnlineFriends,
  setUserOfflineBySocketId,
  setUserOnline,
} from "../../database/lib/presenceService";

interface PresenceConnection {
  userId: number;
  displayName: string;
  socket: any;
}

const connections = new Map<string, PresenceConnection>();

export async function presenceWebSocketRoute(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get(
      "/ws/presence",
      { websocket: true },
      async (connection: any, request: any) => {
        let user: any;
        let socketId: string;

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

          user = fastify.jwt.verify(token) as any;
          socketId = `${user.userId}-${Date.now()}-${Math.random()}`;

          await setUserOnline(user.userId, socketId);

          connections.set(socketId, {
            userId: user.userId,
            displayName: user.displayName,
            socket: connection,
          });

          const onlineFriends = await getOnlineFriends(user.userId);

          connection.send(
            JSON.stringify({
              type: "presence_update",
              online_friends: onlineFriends,
            })
          );

          broadcastPresenceUpdate(user.userId, true, user.displayName);

          fastify.log.info(
            `User ${user.displayName} connected to presence WebSocket`
          );

          connection.on("message", async (message: any) => {
            try {
              const data = JSON.parse(message.toString());

              if (data.type === "ping") {
                connection.send(JSON.stringify({ type: "pong" }));
              } else if (data.type === "get_online_friends") {
                const onlineFriends = await getOnlineFriends(user.userId);
                connection.send(
                  JSON.stringify({
                    type: "online_friends",
                    friends: onlineFriends,
                  })
                );
              }
            } catch (error) {
              fastify.log.error("Error processing presence message:", error);
            }
          });

          connection.on("close", async () => {
            try {
              const disconnectedUserId = await setUserOfflineBySocketId(
                socketId
              );
              connections.delete(socketId);

              if (disconnectedUserId) {
                broadcastPresenceUpdate(
                  disconnectedUserId,
                  false,
                  user.displayName
                );
                fastify.log.info(
                  `User ${user.displayName} disconnected from presence WebSocket`
                );
              }
            } catch (error) {
              fastify.log.error(
                "Error handling presence disconnection:",
                error
              );
            }
          });
        } catch (error) {
          fastify.log.error("Presence WebSocket connection error:", error);
          try {
            connection.close(1011, "Server error");
          } catch (closeError) {
            fastify.log.error("Error closing presence connection:", closeError);
          }
        }
      }
    );
  });
}

function broadcastPresenceUpdate(
  userId: number,
  isOnline: boolean,
  displayName: string
) {
  const message = JSON.stringify({
    type: "friend_presence_update",
    user_id: userId,
    display_name: displayName,
    is_online: isOnline,
    timestamp: new Date().toISOString(),
  });

  for (const [socketId, conn] of connections) {
    if (conn.userId !== userId) {
      try {
        conn.socket.send(message);
      } catch (error) {
        connections.delete(socketId);
      }
    }
  }
}

export function broadcastToUser(userId: number, message: any) {
  for (const [socketId, conn] of connections) {
    if (conn.userId === userId) {
      try {
        conn.socket.send(JSON.stringify(message));
      } catch (error) {
        connections.delete(socketId);
      }
    }
  }
}

export function broadcastToFriends(userId: number, message: any) {
  const messageStr = JSON.stringify(message);

  for (const [socketId, conn] of connections) {
    if (conn.userId !== userId) {
      try {
        conn.socket.send(messageStr);
      } catch (error) {
        connections.delete(socketId);
      }
    }
  }
}
