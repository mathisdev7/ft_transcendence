import { randomUUID } from "crypto";
import type { WebSocket } from "ws";
import { db } from "../database/init.js";
import { JwtPayload } from "../middleware/auth.js";
import { GameState, PongGame } from "./gameLogic.js";

export interface PlayerConnection {
  userId: number;
  playerNumber: 1 | 2;
  socket: WebSocket;
  displayName: string;
  connected: boolean;
}

export interface GameSession {
  id: string;
  game: PongGame;
  players: Map<number, PlayerConnection>;
  originalPlayers: Map<
    number,
    { userId: number; displayName: string; playerNumber: 1 | 2 }
  >;
  status: "waiting" | "active" | "finished" | "cancelled";
  createdAt: Date;
  startedAt?: Date;
  gameLoop?: NodeJS.Timeout;
}

export class GameManager {
  private games: Map<string, GameSession> = new Map();
  private waitingGames: string[] = [];

  public createGame(hostUser: JwtPayload): string {
    const gameId = randomUUID();
    const game = new PongGame();

    const gameSession: GameSession = {
      id: gameId,
      game,
      players: new Map(),
      originalPlayers: new Map(),
      status: "waiting",
      createdAt: new Date(),
    };

    this.games.set(gameId, gameSession);
    this.waitingGames.push(gameId);

    try {
      const stmt = db.prepare(`
        INSERT INTO games (id, status, player1_id, max_score, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        gameId,
        "waiting",
        hostUser.userId,
        11,
        new Date().toISOString()
      );

      const stateStmt = db.prepare(`
        INSERT INTO game_states (game_id, ball_x, ball_y, ball_dx, ball_dy, ball_speed, paddle1_y, paddle2_y)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const state = game.getState();
      stateStmt.run(
        gameId,
        state.ball.x,
        state.ball.y,
        state.ball.dx,
        state.ball.dy,
        state.ball.speed,
        state.paddle1.y,
        state.paddle2.y
      );
    } catch (error) {
      console.error("Failed to save game to database:", error);
    }

    return gameId;
  }

  public joinGame(
    gameId: string,
    user: JwtPayload,
    socket: WebSocket
  ): boolean {
    const gameSession = this.games.get(gameId);
    if (!gameSession) {
      return false;
    }

    const originalPlayer = gameSession.originalPlayers.get(user.userId);
    if (originalPlayer) {
      const playerConnection: PlayerConnection = {
        userId: user.userId,
        playerNumber: originalPlayer.playerNumber,
        socket,
        displayName: user.displayName,
        connected: true,
      };

      gameSession.players.set(user.userId, playerConnection);

      try {
        const stmt = db.prepare(`
          UPDATE player_connections
          SET connected = ?, disconnected_at = NULL
          WHERE game_id = ? AND user_id = ?
        `);
        stmt.run(1, gameSession.id, user.userId);
      } catch (error) {
        console.error("Failed to update player reconnection:", error);
      }

      this.setupSocketHandlers(gameSession, playerConnection);

      if (gameSession.players.size === 2) {
        if (gameSession.game.getState().isPaused) {
          gameSession.game.resume();
          this.broadcastToGame(gameSession, {
            type: "game_resumed",
            resumedBy: user.displayName,
          });
        }
      }

      if (gameSession.status === "active") {
        if (
          gameSession.players.size === 2 &&
          gameSession.game.getState().isPaused
        ) {
          gameSession.game.resume();
          this.broadcastToGame(gameSession, {
            type: "game_resumed",
            resumedBy: user.displayName,
          });
        }
      }

      if (gameSession.status === "waiting" && gameSession.players.size === 2) {
        this.startGame(gameSession);
      }

      return true;
    }

    if (gameSession.status !== "waiting") {
      return false;
    }

    if (gameSession.players.size >= 2) {
      return false;
    }

    const playerNumber = gameSession.players.size === 0 ? 1 : 2;
    const playerConnection: PlayerConnection = {
      userId: user.userId,
      playerNumber: playerNumber as 1 | 2,
      socket,
      displayName: user.displayName,
      connected: true,
    };

    gameSession.players.set(user.userId, playerConnection);
    gameSession.originalPlayers.set(user.userId, {
      userId: user.userId,
      displayName: user.displayName,
      playerNumber: playerNumber as 1 | 2,
    });

    try {
      const stmt = db.prepare(`
        INSERT INTO player_connections (game_id, user_id, player_number, connected)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(game_id, user_id) DO UPDATE SET
          connected = excluded.connected,
          disconnected_at = NULL
      `);
      stmt.run(gameId, user.userId, playerNumber, 1);

      if (playerNumber === 2) {
        const updateStmt = db.prepare(`
          UPDATE games SET player2_id = ? WHERE id = ?
        `);
        updateStmt.run(user.userId, gameId);
      }
    } catch (error) {
      console.error("Failed to save player connection:", error);
    }

    this.setupSocketHandlers(gameSession, playerConnection);

    if (gameSession.players.size === 2) {
      this.startGame(gameSession);
    }

    return true;
  }

  private setupSocketHandlers(
    gameSession: GameSession,
    player: PlayerConnection
  ): void {
    player.socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handlePlayerMessage(gameSession, player, data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    });

    player.socket.on("close", () => {
      this.handlePlayerDisconnect(gameSession, player);
    });

    player.socket.send(
      JSON.stringify({
        type: "connected",
        playerNumber: player.playerNumber,
        gameId: gameSession.id,
        waitingForPlayer: gameSession.players.size < 2,
      })
    );
  }

  private handlePlayerMessage(
    gameSession: GameSession,
    player: PlayerConnection,
    data: any
  ): void {
    switch (data.type) {
      case "paddle_move":
        if (data.direction === "up" || data.direction === "down") {
          gameSession.game.movePaddle(player.playerNumber, data.direction);
          this.broadcastGameState(gameSession);
        }
        break;
      case "pause_game":
        if (gameSession.status === "active") {
          gameSession.game.pause();
          this.broadcastToGame(gameSession, {
            type: "game_paused",
            pausedBy: player.displayName,
          });
        }
        break;
      case "resume_game":
        if (gameSession.status === "active") {
          gameSession.game.resume();
          this.broadcastToGame(gameSession, {
            type: "game_resumed",
            resumedBy: player.displayName,
          });
        }
        break;
    }
  }

  private handlePlayerDisconnect(
    gameSession: GameSession,
    player: PlayerConnection
  ): void {
    if (!gameSession.players.has(player.userId)) {
      return;
    }

    try {
      const stmt = db.prepare(`
        UPDATE player_connections
        SET connected = ?, disconnected_at = ?
        WHERE game_id = ? AND user_id = ?
      `);
      stmt.run(0, new Date().toISOString(), gameSession.id, player.userId);
    } catch (error) {
      console.error("Failed to update player disconnection:", error);
    }

    gameSession.players.delete(player.userId);

    this.broadcastToGame(gameSession, {
      type: "player_disconnected",
      playerNumber: player.playerNumber,
      displayName: player.displayName,
    });

    if (gameSession.status === "active") {
      if (!gameSession.game.getState().isPaused) {
        gameSession.game.pause();
      }

      if (gameSession.players.size < 2) {
        gameSession.status = "waiting";

        if (gameSession.game.getState().isPaused) {
          gameSession.game.resume();
        }

        if (!this.waitingGames.includes(gameSession.id)) {
          this.waitingGames.push(gameSession.id);
        }

        try {
          const stmt = db.prepare(`
            UPDATE games SET status = ? WHERE id = ?
          `);
          stmt.run("waiting", gameSession.id);
        } catch (error) {
          console.error("Failed to update game status to waiting:", error);
        }

        if (gameSession.gameLoop) {
          clearInterval(gameSession.gameLoop);
          gameSession.gameLoop = undefined;
        }
      }
    }
  }

  private startGame(gameSession: GameSession): void {
    gameSession.status = "active";
    gameSession.startedAt = new Date();

    if (gameSession.game.getState().isPaused) {
      gameSession.game.resume();
    }

    try {
      const stmt = db.prepare(`
        UPDATE games SET status = ?, started_at = ? WHERE id = ?
      `);
      stmt.run("active", gameSession.startedAt.toISOString(), gameSession.id);
    } catch (error) {
      console.error("Failed to update game status:", error);
    }

    this.removeFromWaitingList(gameSession.id);

    this.broadcastToGame(gameSession, {
      type: "game_started",
      players: Array.from(gameSession.players.values()).map((p) => ({
        playerNumber: p.playerNumber,
        displayName: p.displayName,
      })),
    });

    this.startGameLoop(gameSession);
  }

  private startGameLoop(gameSession: GameSession): void {
    gameSession.gameLoop = setInterval(() => {
      const updateResult = gameSession.game.update();

      if (updateResult.scored) {
        const goalMessage = {
          type: "goal_scored",
          scorer: updateResult.scored,
          gameState: gameSession.game.getState(),
        };
        this.broadcastToGame(gameSession, goalMessage);
      }

      if (updateResult.gameEnded) {
        this.endGame(gameSession);
        return;
      }

      this.broadcastGameState(gameSession);
      this.saveGameState(gameSession);
    }, 1000 / 60);
  }

  private endGame(gameSession: GameSession): void {
    if (gameSession.gameLoop) {
      clearInterval(gameSession.gameLoop);
      gameSession.gameLoop = undefined;
    }

    gameSession.status = "finished";
    const gameState = gameSession.game.getState();
    const finishedAt = new Date();
    const duration = gameSession.startedAt
      ? Math.floor(
          (finishedAt.getTime() - gameSession.startedAt.getTime()) / 1000
        )
      : 0;

    try {
      const stmt = db.prepare(`
        UPDATE games
        SET status = ?, finished_at = ?, game_duration = ?, winner_id = ?, player1_score = ?, player2_score = ?
        WHERE id = ?
      `);

      const winnerId =
        gameState.winner === 1
          ? Array.from(gameSession.originalPlayers.values()).find(
              (p) => p.playerNumber === 1
            )?.userId
          : Array.from(gameSession.originalPlayers.values()).find(
              (p) => p.playerNumber === 2
            )?.userId;

      stmt.run(
        "finished",
        finishedAt.toISOString(),
        duration,
        winnerId || null,
        gameState.score.player1,
        gameState.score.player2,
        gameSession.id
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
    }

    this.broadcastToGame(gameSession, {
      type: "game_ended",
      winner: gameState.winner,
      finalScore: gameState.score,
      duration,
    });

    setTimeout(() => {
      this.games.delete(gameSession.id);
    }, 30000);
  }

  private broadcastGameState(gameSession: GameSession): void {
    const gameState = gameSession.game.getState();
    this.broadcastToGame(gameSession, {
      type: "game_state",
      state: gameState,
    });
  }

  private broadcastToGame(gameSession: GameSession, message: any): void {
    const messageStr = JSON.stringify(message);
    for (const player of gameSession.players.values()) {
      try {
        player.socket.send(messageStr);
      } catch (error) {
        console.error("Failed to send message to player:", error);
        gameSession.players.delete(player.userId);
      }
    }
  }

  private saveGameState(gameSession: GameSession): void {
    try {
      const state = gameSession.game.getState();
      const stmt = db.prepare(`
        UPDATE game_states
        SET ball_x = ?, ball_y = ?, ball_dx = ?, ball_dy = ?, paddle1_y = ?, paddle2_y = ?, is_paused = ?, last_updated = ?
        WHERE game_id = ?
      `);
      stmt.run(
        state.ball.x,
        state.ball.y,
        state.ball.dx,
        state.ball.dy,
        state.paddle1.y,
        state.paddle2.y,
        state.isPaused ? 1 : 0,
        new Date().toISOString(),
        gameSession.id
      );
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }

  private removeFromWaitingList(gameId: string): void {
    const index = this.waitingGames.indexOf(gameId);
    if (index > -1) {
      this.waitingGames.splice(index, 1);
    }
  }

  public getGame(gameId: string): GameSession | undefined {
    return this.games.get(gameId);
  }

  public getWaitingGames(): string[] {
    return [...this.waitingGames];
  }

  public getAllGames(): GameSession[] {
    return Array.from(this.games.values());
  }

  public getGameState(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    return game ? game.game.getState() : null;
  }

  public pauseGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (game && game.status === "active") {
      game.game.pause();
      return true;
    }
    return false;
  }

  public resumeGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (game && game.status === "active") {
      game.game.resume();
      return true;
    }
    return false;
  }

  public deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }
}

export const gameManager = new GameManager();
