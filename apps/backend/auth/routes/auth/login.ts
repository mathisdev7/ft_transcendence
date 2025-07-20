import { FastifyInstance } from "fastify";
import { z } from "zod";
import winston from "winston";
import { createSession } from "../../database/lib/createSession.ts";
import { loginUser } from "../../database/lib/loginUser.ts";

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Http({
      host: process.env.LOGSTASH_HOST || "localhost",
      port: parseInt(process.env.LOGSTASH_PORT || "5000"),
      path: "/",
    }),
  ],
});

const loginBodySchema = z.object({
  email: z.string().email("invalid email format"),
  password: z.string().min(1, "password is required"),
});

export async function loginRoute(fastify: FastifyInstance) {
  fastify.post(
    "/auth/login",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Login user",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: { type: "string", description: "User password" },
          },
        },
        response: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    accessToken: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        username: { type: "string" },
                        display_name: { type: "string" },
                        avatar_url: { type: "string" },
                        is_verified: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Login failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const clientIp = request.ip;

      try {
        const validation = loginBodySchema.safeParse(request.body);

        if (!validation.success) {
          logger.warn("Login validation failed", {
            service: "auth",
            action: "login",
            clientIp,
            error: validation.error.errors[0].message,
            duration: Date.now() - startTime,
          });

          return reply.status(400).send({
            error: validation.error.errors[0].message,
          });
        }

        const { email, password } = validation.data;

        logger.info("Login attempt", {
          service: "auth",
          action: "login",
          email,
          clientIp,
          userAgent: request.headers["user-agent"],
        });

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

        logger.info("Login successful", {
          service: "auth",
          action: "login",
          userId: user.id,
          email: user.email,
          clientIp,
          duration: Date.now() - startTime,
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
        logger.error("Login failed", {
          service: "auth",
          action: "login",
          clientIp,
          error: error.message,
          duration: Date.now() - startTime,
        });

        reply.status(401).send({ error: error.message });
      }
    }
  );
}
