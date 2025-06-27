import dotenv from "dotenv";
import Fastify from "fastify";
import { z } from "zod";
import { initDatabase } from "./database/init.ts";
import { createSession } from "./database/lib/createSession.ts";
import { createUser } from "./database/lib/createUser.ts";
import { loginUser } from "./database/lib/loginUser.ts";
dotenv.config();

if (!process.env.JWT_SECRET || !process.env.COOKIE_SECRET) {
  throw new Error("JWT_SECRET or COOKIE_SECRET is not set");
}

const registerBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

const loginBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
});

const fastify = Fastify({
  logger: true,
});

fastify.register(import("@fastify/cors"), {
  origin: ["http://localhost:5173", "https://pongenmoinsbien.xyz"],
  credentials: true,
});

fastify.register(import("@fastify/jwt"), {
  secret: process.env.JWT_SECRET,
});

fastify.register(import("@fastify/cookie"), {
  secret: process.env.COOKIE_SECRET,
});

initDatabase();

fastify.post("/auth/register", async (request, reply) => {
  try {
    const validation = registerBodySchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: validation.error.errors[0].message,
      });
    }

    const { email, password } = validation.data;
    const userId = await createUser(email, password);
    reply.send({ message: "user registered successfully", userId });
  } catch (error: any) {
    reply.status(400).send({ error: error.message });
  }
});

fastify.post("/auth/login", async (request, reply) => {
  try {
    const validation = loginBodySchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: validation.error.errors[0].message,
      });
    }

    const { email, password } = validation.data;
    const user = await loginUser(email, password);

    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
      },
      { expiresIn: "15m" }
    );

    const session = await createSession(
      user.id,
      request.ip,
      request.headers["user-agent"]
    );

    (reply as any).setCookie("refreshToken", session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    reply.send({
      message: "login successful",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
      },
    });
  } catch (error: any) {
    reply.status(401).send({ error: error.message });
  }
});

fastify.post("/auth/logout", async (request, reply) => {
  reply.send({ message: "Route logout - todo" });
});

fastify.post("/auth/refresh", async (request, reply) => {
  reply.send({ message: "Route refresh token - todo" });
});

fastify.get("/auth/me", async (request, reply) => {
  reply.send({ message: "Route me - todo" });
});

fastify.post("/auth/verify-email", async (request, reply) => {
  reply.send({ message: "Route verify email - todo" });
});

fastify.post("/auth/forgot-password", async (request, reply) => {
  reply.send({ message: "Route forgot password - todo" });
});

fastify.post("/auth/reset-password", async (request, reply) => {
  reply.send({ message: "Route reset password - todo" });
});

fastify.post("/auth/change-password", async (request, reply) => {
  reply.send({ message: "Route change password - todo" });
});

fastify.get("/auth/health", async (request, reply) => {
  reply.send({ status: "ok", service: "auth" });
});

fastify.listen(
  { port: Number(process.env.PORT) || 3000 },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`Microservice Auth démarré sur ${address}`);
  }
);
