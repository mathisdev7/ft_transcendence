import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "../init";

const createSessionSchema = z.object({
  userId: z.number().positive("user id must be positive"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const createSession = async (
  userId: number,
  ipAddress?: string,
  userAgent?: string
) => {
  const validation = createSessionSchema.safeParse({
    userId,
    ipAddress,
    userAgent,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const refreshToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const session = db
    .prepare(
      "INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)"
    )
    .run(userId, refreshToken, expiresAt.toISOString(), ipAddress, userAgent);

  return {
    sessionId: session.lastInsertRowid,
    refreshToken,
    expiresAt,
  };
};
