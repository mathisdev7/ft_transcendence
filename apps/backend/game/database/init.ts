import Database from "better-sqlite3";

interface DatabaseConfig {
  filePath: string;
  readOnly?: boolean;
  verbose?: boolean;
  walMode?: boolean;
  foreignKeys?: boolean;
}

const config: DatabaseConfig = {
  filePath: process.env.NODE_ENV === "test" ? ":memory:" : "game.db",
  readOnly: false,
  verbose: process.env.NODE_ENV === "development",
  walMode: true,
  foreignKeys: true,
};

export const db = new Database(config.filePath, {
  readonly: config.readOnly,
  verbose: config.verbose ? console.log : undefined,
});

if (config.walMode) {
  db.pragma("journal_mode = WAL");
}

if (config.foreignKeys) {
  db.pragma("foreign_keys = ON");
}

const createGamesTable = `
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    status TEXT CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')) DEFAULT 'waiting',
    player1_id INTEGER,
    player2_id INTEGER,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_id INTEGER,
    max_score INTEGER DEFAULT 11,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    finished_at DATETIME,
    game_duration INTEGER
  )
`;

const createGameStatesTable = `
  CREATE TABLE IF NOT EXISTS game_states (
    game_id TEXT PRIMARY KEY,
    ball_x REAL DEFAULT 400,
    ball_y REAL DEFAULT 300,
    ball_dx REAL DEFAULT 5,
    ball_dy REAL DEFAULT 3,
    ball_speed REAL DEFAULT 5,
    paddle1_y REAL DEFAULT 250,
    paddle2_y REAL DEFAULT 250,
    is_paused BOOLEAN DEFAULT FALSE,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
  )
`;

const createPlayerConnectionsTable = `
  CREATE TABLE IF NOT EXISTS player_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    player_number INTEGER CHECK (player_number IN (1, 2)),
    socket_id TEXT,
    connected BOOLEAN DEFAULT TRUE,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    disconnected_at DATETIME,
    FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, player_number)
  )
`;

const createIndexes = [
  "CREATE INDEX IF NOT EXISTS idx_games_status ON games (status)",
  "CREATE INDEX IF NOT EXISTS idx_games_player1 ON games (player1_id)",
  "CREATE INDEX IF NOT EXISTS idx_games_player2 ON games (player2_id)",
  "CREATE INDEX IF NOT EXISTS idx_player_connections_game_id ON player_connections (game_id)",
  "CREATE INDEX IF NOT EXISTS idx_player_connections_user_id ON player_connections (user_id)",
];

export function initDatabase() {
  try {
    db.exec(createGamesTable);
    db.exec(createGameStatesTable);
    db.exec(createPlayerConnectionsTable);

    createIndexes.forEach((indexSQL) => {
      db.exec(indexSQL);
    });

    console.log("Game database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize game database:", error);
    throw error;
  }
}

export function closeDatabase() {
  try {
    db.close();
    console.log("Game database connection closed");
  } catch (error) {
    console.error("Error closing game database:", error);
  }
}
