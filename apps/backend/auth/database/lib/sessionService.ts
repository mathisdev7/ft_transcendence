import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "../init";

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refresh token is required"),
});

export const getSessionByRefreshToken = async (refreshToken: string) => {
  const validation = refreshTokenSchema.safeParse({ refreshToken });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const session = db
    .prepare(
      `
      SELECT s.*, u.email, u.username, u.display_name, u.avatar_url, u.is_verified
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `
    )
    .get(refreshToken) as any;

  if (!session) {
    throw new Error("invalid or expired refresh token");
  }

  db.prepare(
    "UPDATE sessions SET last_used = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(session.id);

  return {
    sessionId: session.id,
    userId: session.user_id,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    createdAt: session.created_at,
    lastUsed: session.last_used,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    user: {
      id: session.user_id,
      email: session.email,
      username: session.username,
      display_name: session.display_name,
      avatar_url: session.avatar_url,
      is_verified: session.is_verified,
    },
  };
};

export const refreshSession = async (oldRefreshToken: string) => {
  const session = await getSessionByRefreshToken(oldRefreshToken);

  const newRefreshToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  const result = db
    .prepare(
      `
      UPDATE sessions
      SET refresh_token = ?, expires_at = ?, last_used = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    )
    .run(newRefreshToken, newExpiresAt.toISOString(), session.sessionId);

  if (result.changes === 0) {
    throw new Error("failed to refresh session");
  }

  return {
    sessionId: session.sessionId,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt,
    user: session.user,
  };
};

export const deleteSession = async (refreshToken: string) => {
  const result = db
    .prepare("DELETE FROM sessions WHERE refresh_token = ?")
    .run(refreshToken);

  if (result.changes === 0) {
    throw new Error("session not found");
  }

  return true;
};

export const deleteAllUserSessions = async (userId: number) => {
  const result = db
    .prepare("DELETE FROM sessions WHERE user_id = ?")
    .run(userId);

  return result.changes;
};

export const getUserSessions = async (userId: number) => {
  const sessions = db
    .prepare(
      `
      SELECT id, refresh_token, expires_at, created_at, last_used, ip_address, user_agent
      FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now')
      ORDER BY last_used DESC
    `
    )
    .all(userId);

  return sessions;
};

export const cleanupExpiredSessions = () => {
  const result = db
    .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
    .run();

  return result.changes;
};

export const getSessionStats = (userId: number) => {
  const stats = db
    .prepare(
      `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_sessions,
        MAX(last_used) as last_activity
      FROM sessions
      WHERE user_id = ?
    `
    )
    .get(userId) as any;

  return {
    totalSessions: stats.total_sessions,
    activeSessions: stats.active_sessions,
    lastActivity: stats.last_activity,
  };
};
