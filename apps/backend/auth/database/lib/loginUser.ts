import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../init";

const loginUserSchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
});

export const loginUser = async (email: string, password: string) => {
  const validation = loginUserSchema.safeParse({ email, password });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
    .get(email) as any;

  if (!user) {
    throw new Error("invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error("invalid credentials");
  }

  if (!user.is_verified) {
    const error = new Error("email not verified");
    (error as any).user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    throw error;
  }

  db.prepare(
    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(user.id);

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
