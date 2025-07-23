import { authAPI } from "../api/auth";
import { gameAPI } from "../api/game";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

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

interface Player {
  playerNumber: 1 | 2;
  displayName: string;
  connected: boolean;
}

export class PlayOnlinePage extends BaseComponent {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameId: string | null = null;
  private websocket: WebSocket | null = null;
  private gameState: GameState | null = null;
  private players: Player[] = [];
  private myPlayerNumber: number | null = null;
  private isConnected = false;
  private gameStatus: "waiting" | "active" | "finished" = "waiting";
  private keys: Set<string> = new Set();
  private connectionRetries = 0;
  private maxRetries = 3;
  private retryTimeout: number = 0;
  private canvasReady = false;
  private pendingGameState: GameState | null = null;
  private movementInterval: number = 0;

  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_WIDTH = 15;
  private readonly PADDLE_HEIGHT = 100;
  private readonly BALL_SIZE = 15;

  constructor() {
    super("div", "min-h-screen bg-black text-white");
  }

  protected init(): void {
    this.gameId = sessionStorage.getItem("currentGameId");

    if (!this.gameId) {
      Toast.error("No game ID found");
      this.goBackToMenu();
      return;
    }

    this.renderPage();

    setTimeout(() => {
      this.setupCanvas();
      this.setupEventListeners();
    }, 50);
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="container-responsive py-8">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold text-foreground mb-4">Online Pong Game</h1>
          <div id="connection-status" class="mb-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-warning text-foreground">
              🔄 Connecting...
            </span>
          </div>
          <div id="game-info" class="mb-4 text-muted-foreground">
            Game ID: ${this.gameId?.substring(0, 8)}...
          </div>
        </div>

        <div class="flex justify-center mb-4">
          <div class="relative">
            <canvas id="gameCanvas" class="border-2 border-primary bg-black rounded-lg"></canvas>

            <div id="game-overlay" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
              <div class="text-center">
                <div id="waiting-message" class="text-xl font-bold mb-4 text-foreground">
                  Waiting for another player...
                </div>
                <div class="animate-pulse text-4xl">🎮</div>
              </div>
            </div>

            <div id="game-ended-overlay" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 hidden rounded-lg">
              <div class="card text-center">
                <div class="card-content">
                  <h2 class="card-title mb-4" id="winner-text"></h2>
                  <div id="final-score" class="text-lg mb-6 text-muted-foreground"></div>
                  <div class="flex gap-4 justify-center">
                    <button id="play-again-btn" class="btn btn-success">
                      Back to Menu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center mb-4">
          <div class="card min-w-96">
            <div class="card-header">
              <h3 class="card-title text-center">Players</h3>
            </div>
            <div class="card-content">
              <div id="players-list" class="space-y-2">
                <div class="text-center text-muted-foreground">Loading players...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center text-sm text-muted-foreground mb-4">
          <p class="mb-2 font-medium">Controls:</p>
          <p id="controls-text">Use ↑/↓ arrow keys to move your paddle</p>
          <p>First to 11 points wins!</p>
        </div>

        <div class="flex justify-center gap-4">
          <button id="disconnect-btn" class="btn btn-destructive">
            Disconnect
          </button>
          <button id="back-to-menu-btn" class="btn btn-secondary">
            Back to Menu
          </button>
        </div>
      </div>
    `;
  }

  private setupCanvas(): void {
    this.canvas = this.element.querySelector(
      "#gameCanvas"
    ) as HTMLCanvasElement;

    if (!this.canvas) {
      Toast.error("Failed to initialize game canvas");
      this.goBackToMenu();
      return;
    }

    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;

    const context = this.canvas.getContext("2d");

    if (!context) {
      Toast.error("Your browser doesn't support canvas 2D context");
      this.goBackToMenu();
      return;
    }

    this.ctx = context;
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";

    setTimeout(() => {
      if (!this.canvas || !this.ctx) {
        Toast.error("Failed to initialize game canvas");
        this.goBackToMenu();
        return;
      }

      this.canvasReady = true;

      this.drawInitialState();

      if (this.pendingGameState) {
        this.gameState = this.pendingGameState;
        this.pendingGameState = null;
        this.drawGame();
      }

      this.gameId = sessionStorage.getItem("currentGameId");
      if (this.gameId) {
        this.connectToGame();
      }
    }, 100);
  }

  private setupEventListeners(): void {
    const disconnectBtn = this.element.querySelector(
      "#disconnect-btn"
    ) as HTMLButtonElement;
    const backBtn = this.element.querySelector(
      "#back-to-menu-btn"
    ) as HTMLButtonElement;
    const playAgainBtn = this.element.querySelector(
      "#play-again-btn"
    ) as HTMLButtonElement;

    disconnectBtn.addEventListener("click", () => this.disconnect());
    backBtn.addEventListener("click", () => this.goBackToMenu());
    playAgainBtn.addEventListener("click", () => this.goBackToMenu());

    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  private async connectToGame(): Promise<void> {
    if (!this.gameId || !authAPI.isAuthenticated()) {
      Toast.error("Authentication required");
      this.goBackToMenu();
      return;
    }

    try {
      this.updateConnectionStatus("connecting", "Connecting to game...");

      this.websocket = gameAPI.connectToGame(
        this.gameId,
        (data) => this.handleWebSocketMessage(data),
        (error) => this.handleWebSocketError(error),
        (event) => this.handleWebSocketClose(event)
      );
    } catch (error: any) {
      this.updateConnectionStatus("error", "Connection failed");
      Toast.error(error.message || "Failed to connect to game");

      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        this.retryTimeout = window.setTimeout(() => {
          this.connectToGame();
        }, 2000 * this.connectionRetries);
      } else {
        this.goBackToMenu();
      }
    }
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case "connected":
        this.handlePlayerConnected(data);
        break;
      case "game_started":
        this.handleGameStarted(data);
        break;
      case "game_state":
        this.handleGameState(data);
        break;
      case "goal_scored":
        this.handleGoalScored(data);
        break;
      case "game_ended":
        this.handleGameEnded(data);
        break;
      case "player_disconnected":
        this.handlePlayerDisconnected(data);
        break;
      case "game_paused":
        this.handleGamePaused(data);
        break;
      case "game_resumed":
        this.handleGameResumed(data);
        break;
      default:
        Toast.error("Unknown message type: " + data.type);
        break;
    }
  }

  private handlePlayerConnected(data: any): void {
    this.isConnected = true;
    this.myPlayerNumber = data.playerNumber;
    this.connectionRetries = 0;

    this.updateConnectionStatus("connected", "Connected");
    this.updateControlsText();

    if (data.waitingForPlayer) {
      this.showWaitingOverlay("Waiting for another player...");
    } else {
      this.hideGameOverlay();
    }

    Toast.success(`Connected as Player ${data.playerNumber}`);
  }

  private handleGameStarted(data: any): void {
    this.gameStatus = "active";
    this.players = data.players;
    this.hideGameOverlay();
    this.updatePlayersDisplay();
    Toast.success("Game started!");
  }

  private handleGameState(data: any): void {
    if (this.isDestroyed) return;

    this.gameState = data.state;

    if (this.canDraw()) {
      this.drawGame();
    } else {
      this.pendingGameState = data.state;
    }
  }

  private handleGoalScored(data: any): void {
    if (this.isDestroyed) return;

    this.gameState = data.gameState;

    if (this.canDraw()) {
      this.drawGame();
    }

    const scorerName =
      this.players.find((p) => p.playerNumber === data.scorer)?.displayName ||
      `Player ${data.scorer}`;
    Toast.success(`Goal scored by ${scorerName}!`);
  }

  private handleGameEnded(data: any): void {
    if (this.isDestroyed) return;

    this.gameStatus = "finished";
    this.gameState = data.gameState || this.gameState;

    if (this.canDraw() && this.gameState) {
      this.drawGame();
    }

    this.showGameEndedOverlay(data.winner, data.finalScore, data.duration);
  }

  private handlePlayerDisconnected(data: any): void {
    const disconnectedPlayer = this.players.find(
      (p) => p.playerNumber === data.playerNumber
    );
    if (disconnectedPlayer) {
      disconnectedPlayer.connected = false;
      this.updatePlayersDisplay();
    }

    Toast.warning(
      `${data.displayName || `Player ${data.playerNumber}`} disconnected`
    );
    this.showWaitingOverlay("Player disconnected. Waiting for reconnection...");
  }

  private handleGamePaused(data: any): void {
    Toast.info(`Game paused by ${data.pausedBy || "a player"}`);
  }

  private handleGameResumed(data: any): void {
    Toast.info(`Game resumed by ${data.resumedBy || "a player"}`);
  }

  private handleWebSocketError(_error: Event): void {
    this.updateConnectionStatus("error", "Connection error");
  }

  private handleWebSocketClose(event: CloseEvent): void {
    this.isConnected = false;
    this.updateConnectionStatus("disconnected", "Disconnected");

    if (event.code !== 1000 && this.connectionRetries < this.maxRetries) {
      Toast.warning("Connection lost. Attempting to reconnect...");
      this.connectionRetries++;
      this.retryTimeout = window.setTimeout(() => {
        this.connectToGame();
      }, 2000 * this.connectionRetries);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isConnected || this.gameStatus !== "active") return;

    const key = e.key.toLowerCase();
    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.startMovementLoop();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
    if (this.keys.size === 0) {
      this.stopMovementLoop();
    }
  }

  private startMovementLoop(): void {
    if (this.movementInterval) return;

    this.movementInterval = window.setInterval(() => {
      if (
        !this.isConnected ||
        this.gameStatus !== "active" ||
        !this.myPlayerNumber
      )
        return;

      if (this.keys.has("arrowup") || this.keys.has("w")) {
        this.sendPaddleMove("up");
      } else if (this.keys.has("arrowdown") || this.keys.has("s")) {
        this.sendPaddleMove("down");
      }
    }, 50);
  }

  private stopMovementLoop(): void {
    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = 0;
    }
  }

  private sendPaddleMove(direction: "up" | "down"): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          type: "paddle_move",
          direction,
        })
      );
    }
  }

  private updateConnectionStatus(
    status: "connecting" | "connected" | "disconnected" | "error",
    message: string
  ): void {
    const statusElement = this.element.querySelector(
      "#connection-status"
    ) as HTMLElement;

    let className = "inline-flex items-center px-3 py-1 rounded-full text-sm ";
    let icon = "";

    switch (status) {
      case "connecting":
        className += "bg-yellow-600";
        icon = "🔄";
        break;
      case "connected":
        className += "bg-green-600";
        icon = "✅";
        break;
      case "disconnected":
        className += "bg-gray-600";
        icon = "⚪";
        break;
      case "error":
        className += "bg-red-600";
        icon = "❌";
        break;
    }

    statusElement.innerHTML = `<span class="${className}">${icon} ${message}</span>`;
  }

  private updateControlsText(): void {
    const controlsText = this.element.querySelector(
      "#controls-text"
    ) as HTMLElement;
    if (this.myPlayerNumber === 1) {
      controlsText.textContent =
        "🏓 You control the LEFT paddle - Use W/S keys or ↑/↓ arrows";
    } else if (this.myPlayerNumber === 2) {
      controlsText.textContent =
        "🏓 You control the RIGHT paddle - Use W/S keys or ↑/↓ arrows";
    }
  }

  private updatePlayersDisplay(): void {
    const playersList = this.element.querySelector(
      "#players-list"
    ) as HTMLElement;

    if (this.players.length === 0) {
      playersList.innerHTML =
        '<div class="text-center text-muted-foreground">Loading players...</div>';
      return;
    }

    const sortedPlayers = [...this.players].sort(
      (a, b) => a.playerNumber - b.playerNumber
    );

    playersList.innerHTML = sortedPlayers
      .map(
        (player) => `
      <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
            ${player.playerNumber}
          </div>
          <div>
            <div class="font-medium text-foreground">${player.displayName}</div>
            <div class="text-xs text-muted-foreground">
              ${player.playerNumber === 1 ? "Left Paddle" : "Right Paddle"}
            </div>
          </div>
        </div>
        <div class="text-right">
          ${
            player.playerNumber === this.myPlayerNumber
              ? '<span class="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">You</span>'
              : '<span class="text-muted-foreground text-xs">Opponent</span>'
          }
        </div>
      </div>
    `
      )
      .join("");
  }

  private showWaitingOverlay(message: string): void {
    const overlay = this.element.querySelector("#game-overlay") as HTMLElement;
    const messageEl = this.element.querySelector(
      "#waiting-message"
    ) as HTMLElement;

    messageEl.textContent = message;
    overlay.classList.remove("hidden");
  }

  private hideGameOverlay(): void {
    const overlay = this.element.querySelector("#game-overlay") as HTMLElement;
    overlay.classList.add("hidden");
  }

  private showGameEndedOverlay(
    winner: number,
    finalScore: any,
    duration: number
  ): void {
    const overlay = this.element.querySelector(
      "#game-ended-overlay"
    ) as HTMLElement;
    const winnerText = this.element.querySelector(
      "#winner-text"
    ) as HTMLElement;
    const scoreText = this.element.querySelector("#final-score") as HTMLElement;

    const winnerPlayer = this.players.find((p) => p.playerNumber === winner);
    const winnerName = winnerPlayer?.displayName || `Player ${winner}`;

    winnerText.textContent =
      winnerPlayer?.playerNumber === this.myPlayerNumber
        ? "🎉 You Won!"
        : `${winnerName} Won!`;

    scoreText.innerHTML = `
      <div>Final Score: ${finalScore.player1} - ${finalScore.player2}</div>
      <div class="text-sm text-gray-400 mt-1">Game Duration: ${Math.floor(
        duration / 60
      )}:${(duration % 60).toString().padStart(2, "0")}</div>
    `;

    overlay.classList.remove("hidden");
  }

  private canDraw(): boolean {
    if (this.isDestroyed) {
      return false;
    }

    if (!this.canvasReady) {
      return false;
    }

    if (!this.canvas) {
      return false;
    }

    if (!this.ctx) {
      return false;
    }

    if (!this.canvas.parentElement) {
      return false;
    }

    return true;
  }

  private drawInitialState(): void {
    if (!this.ctx || this.isDestroyed) {
      return;
    }

    try {
      this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
      this.ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillRect(
        10,
        this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );
      this.ctx.fillRect(
        this.CANVAS_WIDTH - this.PADDLE_WIDTH - 10,
        this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );

      this.ctx.fillRect(
        this.CANVAS_WIDTH / 2 - this.BALL_SIZE / 2,
        this.CANVAS_HEIGHT / 2 - this.BALL_SIZE / 2,
        this.BALL_SIZE,
        this.BALL_SIZE
      );

      this.ctx.textAlign = "center";
      this.ctx.fillText("0", this.CANVAS_WIDTH / 4, 50);
      this.ctx.fillText("0", (3 * this.CANVAS_WIDTH) / 4, 50);
    } catch (error) {
      Toast.error("Failed to initialize game display");
    }
  }

  private drawGame(): void {
    if (!this.canDraw()) {
      return;
    }

    if (!this.gameState) {
      return;
    }

    try {
      this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
      this.ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillRect(
        10,
        this.gameState.paddle1.y,
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );
      this.ctx.fillRect(
        this.CANVAS_WIDTH - this.PADDLE_WIDTH - 10,
        this.gameState.paddle2.y,
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );

      this.ctx.fillRect(
        this.gameState.ball.x,
        this.gameState.ball.y,
        this.BALL_SIZE,
        this.BALL_SIZE
      );

      this.ctx.textAlign = "center";
      this.ctx.fillText(
        this.gameState.score.player1.toString(),
        this.CANVAS_WIDTH / 4,
        50
      );
      this.ctx.fillText(
        this.gameState.score.player2.toString(),
        (3 * this.CANVAS_WIDTH) / 4,
        50
      );

      if (this.gameState.isPaused) {
        this.ctx.fillText(
          "PAUSED",
          this.CANVAS_WIDTH / 2,
          this.CANVAS_HEIGHT / 2
        );
      }
    } catch (error) {
      Toast.error("Rendering error occurred");
    }
  }

  private disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.gameId) {
      gameAPI.disconnectFromGame(this.gameId);
    }

    this.updateConnectionStatus("disconnected", "Disconnected");
    Toast.info("Disconnected from game");
    this.goBackToMenu();
  }

  private goBackToMenu(): void {
    sessionStorage.removeItem("currentGameId");
    navigateToView(ViewType.PLAY_MENU);
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = 0;
    }

    this.stopMovementLoop();

    this.pendingGameState = null;

    this.disconnect();

    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    this.ctx = null as any;
    this.canvas = null as any;

    super.destroy();
  }
}

export async function createOnlineGamePage(): Promise<HTMLElement> {
  const page = new PlayOnlinePage();
  return page.render();
}
