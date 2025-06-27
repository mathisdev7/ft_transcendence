import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "../init";

const createUserSchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export const createUser = async (email: string, password: string) => {
  const validation = createUserSchema.safeParse({ email, password });

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const emailExists = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);
  if (emailExists) {
    throw new Error("email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db
    .prepare(
      "INSERT INTO users (email, password_hash, username, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)"
    )
    .run(email, passwordHash, uuidv4(), email.split("@")[0], "");

  return user.lastInsertRowid;
};
