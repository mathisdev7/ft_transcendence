import { db } from "../init";

export interface Friend {
  id: number;
  user_id: number;
  friend_id: number;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
  friend_info?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_online: boolean;
    last_seen: string;
  };
}

export interface FriendRequest {
  id: number;
  from_user_id: number;
  to_user_id: number;
  status: "pending";
  created_at: string;
  from_user_info: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export const sendFriendRequest = async (
  userId: number,
  friendId: number
): Promise<Friend> => {
  if (userId === friendId) {
    throw new Error("cannot send friend request to yourself");
  }

  const existingFriend = db
    .prepare(
      "SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .get(userId, friendId, friendId, userId) as any;

  if (existingFriend) {
    if (existingFriend.status === "blocked") {
      throw new Error("user is blocked");
    }
    if (existingFriend.status === "accepted") {
      throw new Error("users are already friends");
    }
    if (existingFriend.status === "pending") {
      throw new Error("friend request already sent");
    }
  }

  const targetUser = db
    .prepare("SELECT id FROM users WHERE id = ? AND is_active = 1")
    .get(friendId) as any;

  if (!targetUser) {
    throw new Error("user not found");
  }

  const result = db
    .prepare(
      "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')"
    )
    .run(userId, friendId);

  return db
    .prepare("SELECT * FROM friends WHERE id = ?")
    .get(result.lastInsertRowid) as Friend;
};

export const acceptFriendRequest = async (
  userId: number,
  requestId: number
): Promise<Friend> => {
  const request = db
    .prepare(
      "SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = 'pending'"
    )
    .get(requestId, userId) as any;

  if (!request) {
    throw new Error("friend request not found");
  }

  db.prepare(
    "UPDATE friends SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(requestId);

  db.prepare(
    "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')"
  ).run(userId, request.user_id);

  return db
    .prepare("SELECT * FROM friends WHERE id = ?")
    .get(requestId) as Friend;
};

export const rejectFriendRequest = async (
  userId: number,
  requestId: number
): Promise<void> => {
  const request = db
    .prepare(
      "SELECT * FROM friends WHERE id = ? AND friend_id = ? AND status = 'pending'"
    )
    .get(requestId, userId) as any;

  if (!request) {
    throw new Error("friend request not found");
  }

  db.prepare("DELETE FROM friends WHERE id = ?").run(requestId);
};

export const removeFriend = async (
  userId: number,
  friendId: number
): Promise<void> => {
  const result = db
    .prepare(
      "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .run(userId, friendId, friendId, userId);

  if (result.changes === 0) {
    throw new Error("friendship not found");
  }
};

export const blockUser = async (
  userId: number,
  targetUserId: number
): Promise<void> => {
  if (userId === targetUserId) {
    throw new Error("cannot block yourself");
  }

  db.prepare(
    "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
  ).run(userId, targetUserId, targetUserId, userId);

  db.prepare(
    "INSERT OR REPLACE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'blocked')"
  ).run(userId, targetUserId);
};

export const unblockUser = async (
  userId: number,
  targetUserId: number
): Promise<void> => {
  const result = db
    .prepare(
      "DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'blocked'"
    )
    .run(userId, targetUserId);

  if (result.changes === 0) {
    throw new Error("user is not blocked");
  }
};

export const getFriends = async (userId: number): Promise<Friend[]> => {
  const friends = db
    .prepare(
      `
      SELECT
        f.id,
        f.user_id,
        f.friend_id,
        f.status,
        f.created_at,
        f.updated_at,
        u.display_name,
        u.avatar_url,
        u.is_verified,
        COALESCE(p.is_online, 0) as is_online,
        COALESCE(p.last_seen, u.created_at) as last_seen
      FROM friends f
      JOIN users u ON (
        CASE
          WHEN f.user_id = ? THEN f.friend_id = u.id
          ELSE f.user_id = u.id
        END
      )
      LEFT JOIN user_presence p ON u.id = p.user_id
      WHERE (f.user_id = ? OR f.friend_id = ?)
        AND f.status = 'accepted'
        AND u.is_active = 1
        AND u.id != ?
      ORDER BY p.is_online DESC, u.display_name ASC
    `
    )
    .all(userId, userId, userId, userId) as any[];

  const uniqueFriends = new Map<number, any>();

  friends.forEach((friend) => {
    const friendUserId =
      friend.user_id === userId ? friend.friend_id : friend.user_id;

    if (!uniqueFriends.has(friendUserId)) {
      uniqueFriends.set(friendUserId, {
        ...friend,
        friend_info: {
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          is_verified: friend.is_verified,
          is_online: Boolean(friend.is_online),
          last_seen: friend.last_seen,
        },
      });
    }
  });

  return Array.from(uniqueFriends.values());
};

export const getFriendRequests = async (
  userId: number
): Promise<FriendRequest[]> => {
  const requests = db
    .prepare(
      `
      SELECT
        f.id,
        f.user_id as from_user_id,
        f.friend_id as to_user_id,
        f.status,
        f.created_at,
        u.display_name,
        u.avatar_url,
        u.is_verified
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending' AND u.is_active = 1
      ORDER BY f.created_at DESC
    `
    )
    .all(userId) as any[];

  return requests.map((request) => ({
    id: request.id,
    from_user_id: request.from_user_id,
    to_user_id: request.to_user_id,
    status: request.status,
    created_at: request.created_at,
    from_user_info: {
      display_name: request.display_name,
      avatar_url: request.avatar_url,
      is_verified: request.is_verified,
    },
  }));
};

export const getSentRequests = async (
  userId: number
): Promise<FriendRequest[]> => {
  const requests = db
    .prepare(
      `
      SELECT
        f.id,
        f.user_id as from_user_id,
        f.friend_id as to_user_id,
        f.status,
        f.created_at,
        u.display_name,
        u.avatar_url,
        u.is_verified
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending' AND u.is_active = 1
      ORDER BY f.created_at DESC
    `
    )
    .all(userId) as any[];

  return requests.map((request) => ({
    id: request.id,
    from_user_id: request.from_user_id,
    to_user_id: request.to_user_id,
    status: request.status,
    created_at: request.created_at,
    from_user_info: {
      display_name: request.display_name,
      avatar_url: request.avatar_url,
      is_verified: request.is_verified,
    },
  }));
};

export const getFriendshipStatus = async (
  userId: number,
  targetUserId: number
): Promise<string | null> => {
  const friendship = db
    .prepare(
      "SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .get(userId, targetUserId, targetUserId, userId) as any;

  return friendship ? friendship.status : null;
};
