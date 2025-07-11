import Database from "better-sqlite3";
import dotenv from "dotenv";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { z } from "zod";
dotenv.config();

const dbConfigSchema = z.object({
  path: z.string().min(1, "database path cannot be empty"),
  walMode: z.boolean().default(true),
  foreignKeys: z.boolean().default(true),
});

const DB_PATH = process.env.TEST_DB_PATH || join(__dirname, "auth.db");

if (process.env.TEST_DB_PATH) {
  const fileExists = existsSync(process.env.TEST_DB_PATH);
  if (fileExists) {
    unlinkSync(process.env.TEST_DB_PATH);
  }
}

const config = dbConfigSchema.parse({
  path: DB_PATH,
  walMode: true,
  foreignKeys: true,
});

export const db = new Database(config.path);

if (config.walMode) {
  db.pragma("journal_mode = WAL");
}

if (config.foreignKeys) {
  db.pragma("foreign_keys = ON");
}

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`;

const createTokensTable = `
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`;

const createSessionsTable = `
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`;

const createIndexes = [
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
  "CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens (token)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions (refresh_token)",
];

const createUpdateTrigger = `
  CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`;

export function initDatabase() {
  try {
    console.log("initializing database...");

    db.exec(createUsersTable);
    db.exec(createTokensTable);
    db.exec(createSessionsTable);

    createIndexes.forEach((indexQuery) => {
      db.exec(indexQuery);
    });

    db.exec(createUpdateTrigger);

    console.log("database initialized successfully");
  } catch (error) {
    console.error("error initializing database:", error);
    throw error;
  }
}

export function cleanupExpiredTokens() {
  const deleteExpiredTokens = db.prepare(`
    DELETE FROM tokens
    WHERE expires_at < datetime('now')
  `);

  const deleteExpiredSessions = db.prepare(`
    DELETE FROM sessions
    WHERE expires_at < datetime('now')
  `);

  const deletedTokens = deleteExpiredTokens.run();
  const deletedSessions = deleteExpiredSessions.run();

  console.log(
    `cleaning ${deletedTokens.changes} tokens and ${deletedSessions.changes} sessions deleted`
  );
}

export function closeDatabase() {
  db.close();
}

process.on("exit", closeDatabase);
process.on("SIGINT", () => {
  closeDatabase();
  process.exit(0);
});
process.on("SIGTERM", () => {
  closeDatabase();
  process.exit(0);
});
