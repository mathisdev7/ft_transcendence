import { db } from "../init";

export interface UserPresence {
  user_id: number;
  is_online: boolean;
  last_seen: string;
  socket_id?: string;
}

export const setUserOnline = async (
  userId: number,
  socketId: string
): Promise<void> => {
  db.prepare(
    `
    INSERT OR REPLACE INTO user_presence (user_id, is_online, last_seen, socket_id)
    VALUES (?, 1, CURRENT_TIMESTAMP, ?)
  `
  ).run(userId, socketId);
};

export const setUserOffline = async (userId: number): Promise<void> => {
  db.prepare(
    `
    UPDATE user_presence
    SET is_online = 0, last_seen = CURRENT_TIMESTAMP, socket_id = NULL
    WHERE user_id = ?
  `
  ).run(userId);
};

export const setUserOfflineBySocketId = async (
  socketId: string
): Promise<number | null> => {
  const presence = db
    .prepare(
      `
    SELECT user_id FROM user_presence WHERE socket_id = ?
  `
    )
    .get(socketId) as any;

  if (presence) {
    db.prepare(
      `
      UPDATE user_presence
      SET is_online = 0, last_seen = CURRENT_TIMESTAMP, socket_id = NULL
      WHERE socket_id = ?
    `
    ).run(socketId);
    return presence.user_id;
  }

  return null;
};

export const getUserPresence = async (
  userId: number
): Promise<UserPresence | null> => {
  const presence = db
    .prepare(
      `
    SELECT * FROM user_presence WHERE user_id = ?
  `
    )
    .get(userId) as any;

  return presence
    ? {
        user_id: presence.user_id,
        is_online: Boolean(presence.is_online),
        last_seen: presence.last_seen,
        socket_id: presence.socket_id,
      }
    : null;
};

export const getOnlineFriends = async (userId: number): Promise<number[]> => {
  const onlineFriends = db
    .prepare(
      `
    SELECT DISTINCT
      CASE
        WHEN f.user_id = ? THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friends f
    JOIN user_presence p ON (
      CASE
        WHEN f.user_id = ? THEN f.friend_id = p.user_id
        ELSE f.user_id = p.user_id
      END
    )
    WHERE (f.user_id = ? OR f.friend_id = ?)
      AND f.status = 'accepted'
      AND p.is_online = 1
  `
    )
    .all(userId, userId, userId, userId) as any[];

  return onlineFriends.map((row) => row.friend_id);
};

export const getAllOnlineUsers = async (): Promise<number[]> => {
  const onlineUsers = db
    .prepare(
      `
    SELECT user_id FROM user_presence WHERE is_online = 1
  `
    )
    .all() as any[];

  return onlineUsers.map((row) => row.user_id);
};
