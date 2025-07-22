import { FastifyReply, FastifyRequest } from "fastify";

export interface JwtPayload {
  userId: number;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token && request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      return reply.status(401).send({ error: "access token required" });
    }

    const decoded = request.server.jwt.verify(token) as JwtPayload;
    (request as any).gameUser = decoded;
  } catch (error: any) {
    return reply.status(401).send({ error: "invalid or expired token" });
  }
}

export function requireAuth() {
  return {
    preHandler: authenticateUser,
  };
}
