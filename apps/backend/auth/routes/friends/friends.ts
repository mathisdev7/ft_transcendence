import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  acceptFriendRequest,
  blockUser,
  getFriendRequests,
  getFriends,
  getFriendshipStatus,
  getSentRequests,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "../../database/lib/friendsService";

const sendFriendRequestSchema = z.object({
  friendId: z.number().min(1, "friend ID is required"),
});

const friendRequestActionSchema = z.object({
  requestId: z.number().min(1, "request ID is required"),
});

const friendActionSchema = z.object({
  friendId: z.number().min(1, "friend ID is required"),
});

export async function friendsRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/friends/request",
    {
      schema: {
        tags: ["Friends"],
        summary: "Send a friend request",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["friendId"],
          properties: {
            friendId: {
              type: "number",
              description: "ID of user to send friend request to",
            },
          },
        },
        response: {
          200: {
            description: "Friend request sent successfully",
            type: "object",
            properties: {
              message: { type: "string" },
              request: { type: "object" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const validation = sendFriendRequestSchema.safeParse(request.body);
        if (!validation.success) {
          return reply
            .status(400)
            .send({ error: validation.error.errors[0].message });
        }

        const payload = request.user as any;
        const { friendId } = validation.data;

        const friendRequest = await sendFriendRequest(payload.userId, friendId);

        reply.send({
          message: "friend request sent successfully",
          request: friendRequest,
        });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/friends/accept",
    {
      schema: {
        tags: ["Friends"],
        summary: "Accept a friend request",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["requestId"],
          properties: {
            requestId: {
              type: "number",
              description: "ID of friend request to accept",
            },
          },
        },
        response: {
          200: {
            description: "Friend request accepted successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const validation = friendRequestActionSchema.safeParse(request.body);
        if (!validation.success) {
          return reply
            .status(400)
            .send({ error: validation.error.errors[0].message });
        }

        const payload = request.user as any;
        const { requestId } = validation.data;

        await acceptFriendRequest(payload.userId, requestId);

        reply.send({ message: "friend request accepted successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/friends/reject",
    {
      schema: {
        tags: ["Friends"],
        summary: "Reject a friend request",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["requestId"],
          properties: {
            requestId: {
              type: "number",
              description: "ID of friend request to reject",
            },
          },
        },
        response: {
          200: {
            description: "Friend request rejected successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const validation = friendRequestActionSchema.safeParse(request.body);
        if (!validation.success) {
          return reply
            .status(400)
            .send({ error: validation.error.errors[0].message });
        }

        const payload = request.user as any;
        const { requestId } = validation.data;

        await rejectFriendRequest(payload.userId, requestId);

        reply.send({ message: "friend request rejected successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.delete(
    "/friends/:friendId",
    {
      schema: {
        tags: ["Friends"],
        summary: "Remove a friend",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["friendId"],
          properties: {
            friendId: { type: "string", description: "ID of friend to remove" },
          },
        },
        response: {
          200: {
            description: "Friend removed successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const { friendId } = request.params as { friendId: string };
        const friendIdNum = parseInt(friendId, 10);

        if (isNaN(friendIdNum)) {
          return reply.status(400).send({ error: "invalid friend ID" });
        }

        const payload = request.user as any;
        await removeFriend(payload.userId, friendIdNum);

        reply.send({ message: "friend removed successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/friends/block",
    {
      schema: {
        tags: ["Friends"],
        summary: "Block a user",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["friendId"],
          properties: {
            friendId: { type: "number", description: "ID of user to block" },
          },
        },
        response: {
          200: {
            description: "User blocked successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const validation = friendActionSchema.safeParse(request.body);
        if (!validation.success) {
          return reply
            .status(400)
            .send({ error: validation.error.errors[0].message });
        }

        const payload = request.user as any;
        const { friendId } = validation.data;

        await blockUser(payload.userId, friendId);

        reply.send({ message: "user blocked successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.post(
    "/friends/unblock",
    {
      schema: {
        tags: ["Friends"],
        summary: "Unblock a user",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["friendId"],
          properties: {
            friendId: { type: "number", description: "ID of user to unblock" },
          },
        },
        response: {
          200: {
            description: "User unblocked successfully",
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const validation = friendActionSchema.safeParse(request.body);
        if (!validation.success) {
          return reply
            .status(400)
            .send({ error: validation.error.errors[0].message });
        }

        const payload = request.user as any;
        const { friendId } = validation.data;

        await unblockUser(payload.userId, friendId);

        reply.send({ message: "user unblocked successfully" });
      } catch (error: any) {
        reply.status(400).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/friends",
    {
      schema: {
        tags: ["Friends"],
        summary: "Get user's friends list",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Friends list retrieved successfully",
            type: "object",
            properties: {
              friends: { type: "array" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const payload = request.user as any;
        const friends = await getFriends(payload.userId);

        reply.send({ friends });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/friends/requests",
    {
      schema: {
        tags: ["Friends"],
        summary: "Get received friend requests",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Friend requests retrieved successfully",
            type: "object",
            properties: {
              requests: { type: "array" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const payload = request.user as any;
        const requests = await getFriendRequests(payload.userId);

        reply.send({ requests });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/friends/requests/sent",
    {
      schema: {
        tags: ["Friends"],
        summary: "Get sent friend requests",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "Sent friend requests retrieved successfully",
            type: "object",
            properties: {
              requests: { type: "array" },
            },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const payload = request.user as any;
        const requests = await getSentRequests(payload.userId);

        reply.send({ requests });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/friends/status/:userId",
    {
      schema: {
        tags: ["Friends"],
        summary: "Get friendship status with a specific user",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: {
              type: "string",
              description: "ID of user to check friendship status with",
            },
          },
        },
        response: {
          200: {
            description: "Friendship status retrieved successfully",
            type: "object",
            properties: {
              status: { type: "string", nullable: true },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: { error: { type: "string" } },
          },
          401: {
            description: "Unauthorized",
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.status(401).send({ error: "unauthorized" });
        }
      },
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const userIdNum = parseInt(userId, 10);

        if (isNaN(userIdNum)) {
          return reply.status(400).send({ error: "invalid user ID" });
        }

        const payload = request.user as any;
        const status = await getFriendshipStatus(payload.userId, userIdNum);

        reply.send({ status });
      } catch (error: any) {
        reply.status(500).send({ error: error.message });
      }
    }
  );
}
