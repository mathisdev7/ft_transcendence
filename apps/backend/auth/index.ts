import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import dotenv from "dotenv";
import Fastify from "fastify";
import { initDatabase } from "./database/init.ts";
import { registerAllRoutes } from "./routes/index.ts";
dotenv.config();

if (!process.env.JWT_SECRET || !process.env.COOKIE_SECRET) {
  throw new Error("JWT_SECRET or COOKIE_SECRET is not set");
}

const fastify = Fastify({
  logger: process.env.NODE_ENV === "development" ? true : false,
});

fastify.register(import("@fastify/cors"), {
  origin: [
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : "https://www.pongenmoinsbien.xyz",
  ],
  credentials: true,
});

if (process.env.NODE_ENV === "development") {
  fastify.register(swagger, {
    openapi: {
      info: {
        title: "Transcendence Auth API",
        description: "Authentication microservice API documentation",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
}

fastify.register(import("@fastify/jwt"), {
  secret: process.env.JWT_SECRET,
});

fastify.register(import("@fastify/cookie"), {
  secret: process.env.COOKIE_SECRET,
});

initDatabase();

fastify.register(registerAllRoutes);

fastify.listen(
  { port: Number(process.env.PORT) || 3000 },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`Microservice Auth started on ${address}`);
  }
);
