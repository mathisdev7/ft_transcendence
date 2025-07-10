import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "../init";

const createTokenSchema = z.object({
  userId: z.number().positive("user id must be positive"),
  type: z.enum(["email_verification", "password_reset"]),
  expiresInHours: z.number().positive().default(24),
});

export const createToken = async (
  userId: number,
  type: "email_verification" | "password_reset",
  expiresInHours: number = 24
) => {
  const validation = createTokenSchema.safeParse({
    userId,
    type,
    expiresInHours,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const existingToken = db
    .prepare(
      "SELECT id FROM tokens WHERE user_id = ? AND type = ? AND used = 0"
    )
    .get(userId, type) as any;

  if (existingToken) {
    db.prepare("UPDATE tokens SET used = 1 WHERE id = ?").run(existingToken.id);
  }

  const result = db
    .prepare(
      "INSERT INTO tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)"
    )
    .run(userId, token, type, expiresAt.toISOString());

  return {
    tokenId: result.lastInsertRowid,
    token,
    expiresAt,
  };
};

export const verifyToken = async (
  token: string,
  type: "email_verification" | "password_reset"
) => {
  const tokenRecord = db
    .prepare(
      `
      SELECT t.*, u.email, u.id as user_id
      FROM tokens t
      JOIN users u ON t.user_id = u.id
      WHERE t.token = ? AND t.type = ? AND t.used = 0 AND t.expires_at > datetime('now')
    `
    )
    .get(token, type) as any;

  if (!tokenRecord) {
    throw new Error("invalid or expired token");
  }

  return {
    tokenId: tokenRecord.id,
    userId: tokenRecord.user_id,
    email: tokenRecord.email,
    expiresAt: tokenRecord.expires_at,
  };
};

export const useToken = async (tokenId: number) => {
  const result = db
    .prepare("UPDATE tokens SET used = 1 WHERE id = ? AND used = 0")
    .run(tokenId);

  if (result.changes === 0) {
    throw new Error("token not found or already used");
  }

  return true;
};

export const deleteExpiredTokens = () => {
  const result = db
    .prepare(
      "DELETE FROM tokens WHERE expires_at < datetime('now') OR used = 1"
    )
    .run();

  return result.changes;
};

export const getUserTokens = (
  userId: number,
  type?: "email_verification" | "password_reset"
) => {
  let query = "SELECT * FROM tokens WHERE user_id = ?";
  const params: any[] = [userId];

  if (type) {
    query += " AND type = ?";
    params.push(type);
  }

  query += " ORDER BY created_at DESC";

  return db.prepare(query).all(...params);
};
