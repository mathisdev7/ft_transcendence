import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import dotenv from "dotenv";
import Fastify from "fastify";
import winston from "winston";
import { initDatabase } from "./database/init.ts";
import { registerAllRoutes } from "./routes/index.ts";
dotenv.config();

if (!process.env.JWT_SECRET || !process.env.COOKIE_SECRET) {
  throw new Error("JWT_SECRET or COOKIE_SECRET is not set");
}

// Configure Winston logger for ELK
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        "@timestamp": timestamp,
        level,
        message,
        service: "auth",
        environment: process.env.NODE_ENV || "development",
        ...meta
      });
    })
  ),
  transports: [
    new winston.transports.Console(),
    // TCP transport to Logstash
    new winston.transports.Http({
      host: process.env.LOGSTASH_HOST || "localhost",
      port: parseInt(process.env.LOGSTASH_PORT || "5000"),
      path: "/",
    })
  ],
});

const fastify = Fastify({
  logger: {
    stream: {
      write: (msg: string) => {
        const logObj = JSON.parse(msg);
        logger.log(logObj.level, logObj.msg, {
          reqId: logObj.reqId,
          req: logObj.req,
          res: logObj.res
        });
      }
    }
  }
});

fastify.register(import("@fastify/cors"), {
  origin: ["http://localhost:5173", "https://www.pongenmoinsbien.xyz"],
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
      logger.error("Failed to start auth service", { error: err.message });
      process.exit(1);
    }
    logger.info("Microservice Auth started", { address, service: "auth" });
	console.log("Microservice Auth started", { address, service: "auth" });
  }
);
