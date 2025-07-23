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
    display_name TEXT UNIQUE NOT NULL,
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

const createTwoFactorCodesTable = `
  CREATE TABLE IF NOT EXISTS two_factor_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`;

const createEmailVerificationCodesTable = `
  CREATE TABLE IF NOT EXISTS email_verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`;

const createIndexes = [
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
  "CREATE INDEX IF NOT EXISTS idx_users_display_name ON users (display_name)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens (token)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions (refresh_token)",
  "CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_id ON two_factor_codes (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_two_factor_codes_code ON two_factor_codes (code)",
  "CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id ON email_verification_codes (user_id)",
  "CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON email_verification_codes (email)",
  "CREATE INDEX IF NOT EXISTS idx_email_verification_codes_code ON email_verification_codes (code)",
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
    db.exec(createTwoFactorCodesTable);
    db.exec(createEmailVerificationCodesTable);

    createIndexes.forEach((indexQuery) => {
      db.exec(indexQuery);
    });

    db.exec(createUpdateTrigger);

    db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id INTEGER PRIMARY KEY,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        socket_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends (user_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends (friend_id);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_friends_status ON friends (status);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence (is_online);
    `);

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

  const deleteExpiredTwoFactorCodes = db.prepare(`
    DELETE FROM two_factor_codes
    WHERE expires_at < datetime('now')
  `);

  const deletedTokens = deleteExpiredTokens.run();
  const deletedSessions = deleteExpiredSessions.run();
  const deletedCodes = deleteExpiredTwoFactorCodes.run();

  console.log(
    `cleaning ${deletedTokens.changes} tokens, ${deletedSessions.changes} sessions, and ${deletedCodes.changes} 2FA codes deleted`
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
