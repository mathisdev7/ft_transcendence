import winston from 'winston';

const logstashTransport = new winston.transports.Http({
  host: 'localhost',
  port: 5000,
  path: '/',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ft-transcendence-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    logstashTransport
  ]
});
