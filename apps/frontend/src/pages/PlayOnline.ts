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
  username: string;
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
    console.log("PlayOnlinePage init() called");
    console.log("All sessionStorage keys:", Object.keys(sessionStorage));
    console.log("SessionStorage content:", sessionStorage);

    this.gameId = sessionStorage.getItem("currentGameId");
    console.log("Game ID from sessionStorage:", this.gameId);

    if (!this.gameId) {
      console.error("No game ID found in sessionStorage");
      Toast.error("No game ID found");
      this.goBackToMenu();
      return;
    }

    console.log("Rendering page...");
    this.renderPage();

    setTimeout(() => {
      console.log("Setting up canvas after DOM update...");
      this.setupCanvas();

      console.log("Setting up event listeners...");
      this.setupEventListeners();

      console.log("PlayOnlinePage initialization complete");
    }, 50);
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="container mx-auto px-4 py-8">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold mb-4">Online Pong Game</h1>
          <div id="connection-status" class="mb-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-600">
              🔄 Connecting...
            </span>
          </div>
          <div id="game-info" class="mb-4 text-gray-400">
            Game ID: ${this.gameId?.substring(0, 8)}...
          </div>
        </div>

        <div class="flex justify-center mb-4">
          <div class="relative">
            <canvas id="gameCanvas" class="border-2 border-white bg-black"></canvas>

            <!-- Game overlay -->
            <div id="game-overlay" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div class="text-center">
                <div id="waiting-message" class="text-xl font-bold mb-4">
                  Waiting for another player...
                </div>
                <div class="animate-pulse text-4xl">🎮</div>
              </div>
            </div>

            <!-- Game ended overlay -->
            <div id="game-ended-overlay" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 hidden">
              <div class="text-center bg-gray-900 border border-gray-700 rounded-lg p-8">
                <h2 class="text-2xl font-bold mb-4" id="winner-text"></h2>
                <div id="final-score" class="text-lg mb-6"></div>
                <div class="flex gap-4 justify-center">
                  <button id="play-again-btn" class="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-semibold">
                    Back to Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Players Info -->
        <div class="flex justify-center mb-4">
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 min-w-96">
            <h3 class="text-center font-bold mb-3">Players</h3>
            <div id="players-list" class="space-y-2">
              <div class="text-center text-gray-500">Loading players...</div>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="text-center text-sm text-gray-400 mb-4">
          <p class="mb-2">Controls:</p>
          <p id="controls-text">Use ↑/↓ arrow keys to move your paddle</p>
          <p>First to 11 points wins!</p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-center gap-4">
          <button id="disconnect-btn" class="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-semibold">
            Disconnect
          </button>
          <button id="back-to-menu-btn" class="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg font-semibold">
            Back to Menu
          </button>
        </div>
      </div>
    `;
  }

  private setupCanvas(): void {
    console.log("Starting canvas setup...");

    this.canvas = this.element.querySelector(
      "#gameCanvas"
    ) as HTMLCanvasElement;

    console.log("Canvas element found:", !!this.canvas);
    console.log("Canvas element:", this.canvas);

    if (!this.canvas) {
      console.error("Game canvas not found in DOM");
      Toast.error("Failed to initialize game canvas");
      this.goBackToMenu();
      return;
    }

    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;
    console.log(
      "Canvas dimensions set:",
      this.canvas.width,
      "x",
      this.canvas.height
    );

    const context = this.canvas.getContext("2d");
    console.log("2D context obtained:", !!context);

    if (!context) {
      console.error("Failed to get 2D context from canvas");
      Toast.error("Your browser doesn't support canvas 2D context");
      this.goBackToMenu();
      return;
    }

    this.ctx = context;
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";
    console.log("Canvas context configured successfully");

    setTimeout(() => {
      console.log("Timeout callback - verifying canvas state...");
      console.log("Canvas still available:", !!this.canvas);
      console.log("Context still available:", !!this.ctx);

      if (!this.canvas || !this.ctx) {
        console.error("Canvas or context not available after initialization");
        console.error("Canvas:", this.canvas);
        console.error("Context:", this.ctx);
        Toast.error("Failed to initialize game canvas");
        this.goBackToMenu();
        return;
      }

      this.canvasReady = true;
      console.log("Canvas initialized successfully");

      this.drawInitialState();

      if (this.pendingGameState) {
        console.log(
          "Processing pending game state after canvas initialization"
        );
        this.gameState = this.pendingGameState;
        this.pendingGameState = null;
        this.drawGame();
      }

      console.log("About to check gameId for connection:", this.gameId);
      console.log(
        "SessionStorage at timeout:",
        sessionStorage.getItem("currentGameId")
      );
      console.log(
        "Re-reading gameId from sessionStorage:",
        sessionStorage.getItem("currentGameId")
      );
      this.gameId = sessionStorage.getItem("currentGameId");
      console.log("GameId after re-reading:", this.gameId);
      if (this.gameId) {
        console.log("Calling connectToGame...");
        this.connectToGame();
      } else {
        console.error("No gameId available for connection!");
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
    console.log("connectToGame() called with gameId:", this.gameId);
    console.log("Authentication status:", authAPI.isAuthenticated());

    if (!this.gameId || !authAPI.isAuthenticated()) {
      console.error("Missing gameId or not authenticated:", {
        gameId: this.gameId,
        authenticated: authAPI.isAuthenticated(),
      });
      Toast.error("Authentication required");
      this.goBackToMenu();
      return;
    }

    try {
      this.updateConnectionStatus("connecting", "Connecting to game...");
      console.log(`Attempting to connect to game: ${this.gameId}`);

      this.websocket = gameAPI.connectToGame(
        this.gameId,
        (data) => this.handleWebSocketMessage(data),
        (error) => this.handleWebSocketError(error),
        (event) => this.handleWebSocketClose(event)
      );

      console.log(
        "WebSocket connection initiated:",
        this.websocket?.readyState
      );
    } catch (error: any) {
      console.error("Failed to connect to game:", error);
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
        console.log("Unknown message type:", data.type);
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
      console.log(
        "Game state received but cannot draw yet, storing for later rendering"
      );
      this.pendingGameState = data.state;
    }
  }

  private handleGoalScored(data: any): void {
    console.log("Frontend received goal_scored message:", data);
    if (this.isDestroyed) return;

    this.gameState = data.gameState;
    console.log("Updated game state after goal:", this.gameState);

    if (this.canDraw()) {
      this.drawGame();
    }

    const scorerName =
      this.players.find((p) => p.playerNumber === data.scorer)?.username ||
      `Player ${data.scorer}`;
    console.log("Showing toast for goal scored by:", scorerName);
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

    Toast.warning(`${data.username} disconnected`);
    this.showWaitingOverlay("Player disconnected. Waiting for reconnection...");
  }

  private handleGamePaused(data: any): void {
    Toast.info(`Game paused by ${data.pausedBy}`);
  }

  private handleGameResumed(data: any): void {
    Toast.info(`Game resumed by ${data.resumedBy}`);
  }

  private handleWebSocketError(error: Event): void {
    console.error("WebSocket error:", error);
    console.error("WebSocket state:", this.websocket?.readyState);
    this.updateConnectionStatus("error", "Connection error");
  }

  private handleWebSocketClose(event: CloseEvent): void {
    this.isConnected = false;
    console.log("WebSocket closed:", event.code, event.reason);
    console.log("Was clean close:", event.wasClean);
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
        "You are Player 1 (left paddle) - Use W/S keys or ↑/↓ arrows";
    } else if (this.myPlayerNumber === 2) {
      controlsText.textContent =
        "You are Player 2 (right paddle) - Use W/S keys or ↑/↓ arrows";
    }
  }

  private updatePlayersDisplay(): void {
    const playersList = this.element.querySelector(
      "#players-list"
    ) as HTMLElement;

    if (this.players.length === 0) {
      playersList.innerHTML =
        '<div class="text-center text-gray-500">Loading players...</div>';
      return;
    }

    playersList.innerHTML = this.players
      .map(
        (player) => `
      <div class="flex items-center justify-between p-2 bg-gray-800 rounded">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium">Player ${player.playerNumber}</span>
          <span class="text-xs text-gray-400">${player.username}</span>
          ${
            player.playerNumber === this.myPlayerNumber
              ? '<span class="text-xs bg-blue-600 px-2 py-1 rounded">You</span>'
              : ""
          }
        </div>
        <div class="flex items-center space-x-2">
          <span class="${
            player.connected ? "text-green-400" : "text-red-400"
          } text-xs">
            ${player.connected ? "● Online" : "● Offline"}
          </span>
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
    const winnerName = winnerPlayer?.username || `Player ${winner}`;

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
      console.log("Cannot draw: component destroyed");
      return false;
    }

    if (!this.canvasReady) {
      console.log(
        "Cannot draw: canvas not ready yet, waiting for initialization..."
      );
      return false;
    }

    if (!this.canvas) {
      console.log("Cannot draw: canvas element not found");
      return false;
    }

    if (!this.ctx) {
      console.log("Cannot draw: no canvas context available");
      return false;
    }

    if (!this.canvas.parentElement) {
      console.log("Cannot draw: canvas not attached to DOM");
      return false;
    }

    return true;
  }

  private drawInitialState(): void {
    if (!this.ctx || this.isDestroyed) {
      console.warn("Canvas context not available for initial draw");
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

      console.log("Initial game state drawn");
    } catch (error) {
      console.error("Error drawing initial state:", error);
      Toast.error("Failed to initialize game display");
    }
  }

  private drawGame(): void {
    if (!this.canDraw()) {
      console.warn("Cannot draw game: canvas not ready");
      return;
    }

    if (!this.gameState) {
      console.warn("Cannot draw game: no game state");
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
      console.error("Error drawing game:", error);
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

    console.log("Destroying PlayOnline page...");

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
