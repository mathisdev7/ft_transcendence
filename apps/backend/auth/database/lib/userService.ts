import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../init";

const updatePasswordSchema = z.object({
  userId: z.number().positive("user id must be positive"),
  newPassword: z.string().min(8, "password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  userId: z.number().positive("user id must be positive"),
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

export const getUserById = async (userId: number) => {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
    .get(userId) as any;

  if (!user) {
    throw new Error("user not found");
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.last_login,
  };
};

export const getUserByEmail = async (email: string) => {
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
    .get(email) as any;

  if (!user) {
    throw new Error("user not found");
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.last_login,
  };
};

export const updatePassword = async (userId: number, newPassword: string) => {
  const validation = updatePasswordSchema.safeParse({
    userId,
    newPassword,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const result = db
    .prepare(
      "UPDATE users SET password_hash = ? WHERE id = ? AND is_active = 1"
    )
    .run(passwordHash, userId);

  if (result.changes === 0) {
    throw new Error("user not found or inactive");
  }

  return true;
};

export const verifyUserEmail = async (userId: number) => {
  const result = db
    .prepare("UPDATE users SET is_verified = 1 WHERE id = ? AND is_active = 1")
    .run(userId);

  if (result.changes === 0) {
    throw new Error("user not found or inactive");
  }

  return true;
};

export const updateUser = async (
  userId: number,
  updates: {
    email?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  }
) => {
  const validation = updateUserSchema.safeParse({
    userId,
    ...updates,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.email) {
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(updates.email, userId);
    if (existingUser) {
      throw new Error("email already exists");
    }
    fields.push("email = ?");
    values.push(updates.email);
  }

  if (updates.username) {
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(updates.username, userId);
    if (existingUser) {
      throw new Error("username already exists");
    }
    fields.push("username = ?");
    values.push(updates.username);
  }

  if (updates.displayName) {
    fields.push("display_name = ?");
    values.push(updates.displayName);
  }

  if (updates.avatarUrl) {
    fields.push("avatar_url = ?");
    values.push(updates.avatarUrl);
  }

  if (fields.length === 0) {
    throw new Error("no fields to update");
  }

  values.push(userId);

  const result = db
    .prepare(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ? AND is_active = 1`
    )
    .run(...values);

  if (result.changes === 0) {
    throw new Error("user not found or inactive");
  }

  return getUserById(userId);
};

export const deactivateUser = async (userId: number) => {
  const result = db
    .prepare("UPDATE users SET is_active = 0 WHERE id = ?")
    .run(userId);

  if (result.changes === 0) {
    throw new Error("user not found");
  }

  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare("UPDATE tokens SET used = 1 WHERE user_id = ?").run(userId);

  return true;
};

export const validatePassword = async (userId: number, password: string) => {
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ? AND is_active = 1")
    .get(userId) as any;

  if (!user) {
    throw new Error("user not found");
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid;
};
