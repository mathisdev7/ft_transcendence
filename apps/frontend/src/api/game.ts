interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
  };
  paddle1: { y: number; speed: number };
  paddle2: { y: number; speed: number };
  score: {
    player1: number;
    player2: number;
  };
  isPaused: boolean;
  isFinished: boolean;
  winner?: number;
}

interface GameInfo {
  gameId: string;
  status: "waiting" | "active" | "finished" | "cancelled";
  gameState: GameState;
  players: Array<{
    playerNumber: 1 | 2;
    username: string;
    connected: boolean;
  }>;
  createdAt: string;
  startedAt?: string;
}

interface WaitingGame {
  gameId: string;
  createdAt: string;
  playersCount: number;
}

export interface GameHistoryItem {
  id: string;
  status: string;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  winner_id: number;
  max_score: number;
  created_at: string;
  started_at: string;
  finished_at: string;
  game_duration: number;
  result: "won" | "lost" | "draw";
  opponent_id: number;
}

export interface GameStats {
  total_games: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
}

export interface GameHistoryResponse {
  games: GameHistoryItem[];
  stats: GameStats;
}

class GameAPI {
  private baseURL =
    import.meta.env.VITE_API_GAME_URL || "http://localhost:3001";
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    console.log("GameAPI initialized with baseURL:", this.baseURL);
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createGame(
    maxScore: number = 11
  ): Promise<{ gameId: string; status: string }> {
    return this.fetchWithAuth("/game", {
      method: "POST",
      body: JSON.stringify({ maxScore }),
    });
  }

  async joinGame(
    gameId: string
  ): Promise<{ message: string; wsEndpoint: string }> {
    return this.fetchWithAuth("/game/join", {
      method: "POST",
      body: JSON.stringify({ gameId }),
    });
  }

  async getGameState(gameId: string): Promise<GameInfo> {
    return this.fetchWithAuth(`/game/state/${gameId}`);
  }

  async getWaitingGames(): Promise<{ games: WaitingGame[] }> {
    return this.fetchWithAuth("/games/waiting");
  }

  async getGameHistory(): Promise<GameHistoryResponse> {
    return this.fetchWithAuth("/games/history");
  }

  async sendGameControl(
    gameId: string,
    action: "paddle_up" | "paddle_down" | "pause" | "resume"
  ): Promise<void> {
    await this.fetchWithAuth("/game/control", {
      method: "POST",
      body: JSON.stringify({ gameId, action }),
    });
  }

  connectToGame(
    gameId: string,
    onMessage: (data: any) => void,
    onError: (error: Event) => void = () => {},
    onClose: (event: CloseEvent) => void = () => {}
  ): WebSocket | null {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No access token available");
    }

    const existing = this.wsConnections.get(gameId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }

    const wsBaseURL = this.baseURL.replace(/^https?:\/\//, "ws://");
    const wsURL = `${wsBaseURL}/ws/game/${gameId}?token=${encodeURIComponent(
      token
    )}`;
    console.log("Connecting to WebSocket URL:", wsURL);
    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      console.log(
        `WebSocket opened for game ${gameId}, readyState:`,
        ws.readyState
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error in gameAPI:", error);
      console.error("WebSocket readyState:", ws.readyState);
      onError(error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed for game ${gameId}:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      this.wsConnections.delete(gameId);
      onClose(event);
    };

    this.wsConnections.set(gameId, ws);
    return ws;
  }

  sendGameMessage(gameId: string, message: any): boolean {
    const ws = this.wsConnections.get(gameId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  disconnectFromGame(gameId: string): void {
    const ws = this.wsConnections.get(gameId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(gameId);
    }
  }

  disconnectAll(): void {
    for (const [gameId, ws] of this.wsConnections) {
      ws.close();
    }
    this.wsConnections.clear();
  }

  async createLocalGame(userId: number): Promise<{ matchId: string }> {
    return this.createGame().then((result) => ({ matchId: result.gameId }));
  }

  async updateGameResult(data: {
    matchId: string;
    player1Score: number;
    player2Score: number;
    duration: number;
    winnerId?: number;
  }): Promise<void> {
    console.log("Game result would be saved:", data);
  }
}

export const gameAPI = new GameAPI();
