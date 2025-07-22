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
  paddles: {
    left: { y: number; speed: number };
    right: { y: number; speed: number };
  };
  score: {
    left: number;
    right: number;
  };
  isPlaying: boolean;
  isPaused: boolean;
  gameStartTime: number;
  matchId: string | null;
}

interface GameMode {
  type: "pvp" | "ai";
  aiDifficulty?: "easy" | "medium" | "hard";
}

export class PlayLocalPage extends BaseComponent {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;
  private animationId: number = 0;
  private keys: Set<string> = new Set();
  private gameMode: GameMode = { type: "pvp" };

  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_WIDTH = 15;
  private readonly PADDLE_HEIGHT = 100;
  private readonly BALL_SIZE = 15;
  private readonly PADDLE_SPEED = 8;
  private readonly BALL_SPEED = 3;
  private readonly MAX_SCORE = 11;

  constructor() {
    super("div", "min-h-screen bg-background");
    this.gameState = this.initializeGameState();
    this.gameMode = { type: "pvp" };
  }

  protected init(): void {
    if (!this.gameState) {
      this.gameState = this.initializeGameState();
    }

    this.renderPage();

    setTimeout(() => {
      this.setupCanvas();
      this.setupEventListeners();
      this.setupKeyboardControls();
    }, 50);
  }

  private initializeGameState(): GameState {
    return {
      ball: {
        x: this.CANVAS_WIDTH / 2 - this.BALL_SIZE / 2,
        y: this.CANVAS_HEIGHT / 2 - this.BALL_SIZE / 2,
        dx: Math.random() > 0.5 ? this.BALL_SPEED : -this.BALL_SPEED,
        dy: (Math.random() - 0.5) * this.BALL_SPEED,
        speed: this.BALL_SPEED,
      },
      paddles: {
        left: {
          y: this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
          speed: this.PADDLE_SPEED,
        },
        right: {
          y: this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
          speed: this.PADDLE_SPEED,
        },
      },
      score: {
        left: 0,
        right: 0,
      },
      isPlaying: false,
      isPaused: false,
      gameStartTime: 0,
      matchId: null,
    };
  }

  private renderPage(): void {
    if (!this.gameMode) {
      this.gameMode = { type: "pvp" };
    }

    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - Local Game</h1>
            </div>
            <button id="back-to-menu" class="btn btn-secondary btn-sm">
              Back to Menu
            </button>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Local Pong Game</h2>
          <p class="text-muted-foreground text-lg">Choose your game mode and start playing!</p>
        </div>

        <div class="card mb-6 sm:mb-8">
          <div class="card-header">
            <h3 class="card-title">🎮 Game Mode</h3>
          </div>
          <div class="card-content">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div class="card bg-muted">
                <div class="card-content p-3 sm:p-4">
                  <div class="text-center">
                    <div class="text-3xl sm:text-4xl mb-2 sm:mb-3">👥</div>
                    <h4 class="text-base sm:text-lg font-semibold text-foreground mb-2">Player vs Player</h4>
                    <p class="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">Play against a friend locally</p>
                    <button id="mode-pvp" class="btn btn-primary w-full text-sm sm:text-base ${
                      this.gameMode.type === "pvp"
                        ? "bg-primary"
                        : "btn-secondary"
                    }">
                      Select PvP
                    </button>
                  </div>
                </div>
              </div>
              <div class="card bg-muted">
                <div class="card-content p-3 sm:p-4">
                  <div class="text-center">
                    <div class="text-3xl sm:text-4xl mb-2 sm:mb-3">🤖</div>
                    <h4 class="text-base sm:text-lg font-semibold text-foreground mb-2">Player vs AI</h4>
                    <p class="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">Challenge the computer</p>
                    <button id="mode-ai" class="btn btn-primary w-full text-sm sm:text-base ${
                      this.gameMode.type === "ai"
                        ? "bg-primary"
                        : "btn-secondary"
                    }">
                      Select AI
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="ai-difficulty" class="mt-4 sm:mt-6 ${
              this.gameMode.type === "ai" ? "" : "hidden"
            }">
              <h4 class="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3">AI Difficulty</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <button id="difficulty-easy" class="btn btn-success text-sm sm:text-base ${
                  this.gameMode.aiDifficulty === "easy"
                    ? "bg-success"
                    : "btn-secondary"
                }">
                  Easy
                </button>
                <button id="difficulty-medium" class="btn btn-warning text-sm sm:text-base ${
                  this.gameMode.aiDifficulty === "medium"
                    ? "bg-warning"
                    : "btn-secondary"
                }">
                  Medium
                </button>
                <button id="difficulty-hard" class="btn btn-destructive text-sm sm:text-base ${
                  this.gameMode.aiDifficulty === "hard"
                    ? "bg-destructive"
                    : "btn-secondary"
                }">
                  Hard
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-6 sm:mb-8">
          <div class="card-content">
            <div class="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
              <div class="text-center flex-1">
                <div class="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">Player 1</div>
                <div class="text-muted-foreground mb-1 sm:mb-2 text-sm sm:text-base">Left Paddle</div>
                <div class="text-xs sm:text-sm text-muted-foreground">W/S keys</div>
              </div>
              <div class="text-center px-4 lg:px-8">
                <div class="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">VS</div>
                <div class="text-xs sm:text-sm text-muted-foreground">First to ${
                  this.MAX_SCORE
                }</div>
              </div>
              <div class="text-center flex-1">
                <div class="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">${
                  this.gameMode.type === "ai" ? "AI" : "Player 2"
                }</div>
                <div class="text-muted-foreground mb-1 sm:mb-2 text-sm sm:text-base">Right Paddle</div>
                <div class="text-xs sm:text-sm text-muted-foreground">${
                  this.gameMode.type === "ai"
                    ? "Computer controlled"
                    : "↑/↓ arrow keys"
                }</div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center mb-6 sm:mb-8">
          <div class="card w-full max-w-4xl">
            <div class="card-content p-2 sm:p-4">
              <div class="overflow-x-auto flex justify-center">
                <canvas id="gameCanvas" class="border-2 border-border bg-background max-w-full h-auto"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
          <button id="start-game" class="btn btn-success font-semibold text-sm sm:text-base">
            Start Game
          </button>
          <button id="pause-game" class="btn btn-warning font-semibold text-sm sm:text-base" disabled>
            Pause
          </button>
          <button id="reset-game" class="btn btn-destructive font-semibold text-sm sm:text-base">
            Reset Game
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🎮 Controls</h3>
          </div>
          <div class="card-content">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div class="card">
                <div class="card-content p-3 sm:p-4 text-center">
                  <h4 class="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3">Player 1</h4>
                  <div class="text-muted-foreground space-y-1 text-sm sm:text-base">
                    <p><span class="font-semibold">W</span> - Move Up</p>
                    <p><span class="font-semibold">S</span> - Move Down</p>
                  </div>
                </div>
              </div>
              <div class="card">
                <div class="card-content p-3 sm:p-4 text-center">
                  <h4 class="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3">${
                    this.gameMode.type === "ai" ? "AI Player" : "Player 2"
                  }</h4>
                  <div class="text-muted-foreground space-y-1 text-sm sm:text-base">
                    ${
                      this.gameMode.type === "ai"
                        ? "<p>Automatically controlled</p><p>by computer AI</p>"
                        : '<p><span class="font-semibold">↑</span> - Move Up</p><p><span class="font-semibold">↓</span> - Move Down</p>'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="game-over-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden p-4">
          <div class="card w-full max-w-sm sm:max-w-md">
            <div class="card-header">
              <h3 class="card-title text-center text-lg sm:text-xl" id="winner-text">Game Complete</h3>
            </div>
            <div class="card-content">
              <div class="text-center mb-4 sm:mb-6">
                <div class="text-base sm:text-lg text-foreground" id="final-score">Final Score</div>
              </div>
              <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button id="play-again" class="btn btn-success flex-1 text-sm sm:text-base">
                Play Again
              </button>
                <button id="back-to-menu-modal" class="btn btn-secondary flex-1 text-sm sm:text-base">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
      </main>
    `;
  }

  private setupCanvas(): void {
    this.canvas = this.element.querySelector(
      "#gameCanvas"
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      Toast.error("Failed to initialize game canvas");
      return;
    }

    this.resizeCanvas();

    const context = this.canvas.getContext("2d");
    if (!context) {
      Toast.error("Your browser doesn't support canvas 2D context");
      return;
    }

    this.ctx = context;
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";

    window.addEventListener("resize", () => this.resizeCanvas());

    this.drawInitialState();
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;

    const container = this.canvas.parentElement?.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 32;
    const maxWidth = Math.min(containerWidth, 800);
    const aspectRatio = 600 / 800;

    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth * aspectRatio;

    if (canvasWidth < 400) {
      canvasWidth = 400;
      canvasHeight = 300;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    const scaleX = canvasWidth / this.CANVAS_WIDTH;
    const scaleY = canvasHeight / this.CANVAS_HEIGHT;

    if (!this.canvas.dataset.originalWidth) {
      this.canvas.dataset.originalWidth = this.CANVAS_WIDTH.toString();
      this.canvas.dataset.originalHeight = this.CANVAS_HEIGHT.toString();
    }

    if (this.ctx) {
      this.ctx.fillStyle = "white";
      this.ctx.font = `${Math.max(16, 24 * Math.min(scaleX, scaleY))}px Arial`;
    }
  }

  private setupEventListeners(): void {
    const pvpBtn = this.element.querySelector("#mode-pvp") as HTMLButtonElement;
    const aiBtn = this.element.querySelector("#mode-ai") as HTMLButtonElement;

    const easyBtn = this.element.querySelector(
      "#difficulty-easy"
    ) as HTMLButtonElement;
    const mediumBtn = this.element.querySelector(
      "#difficulty-medium"
    ) as HTMLButtonElement;
    const hardBtn = this.element.querySelector(
      "#difficulty-hard"
    ) as HTMLButtonElement;

    const startBtn = this.element.querySelector(
      "#start-game"
    ) as HTMLButtonElement;
    const pauseBtn = this.element.querySelector(
      "#pause-game"
    ) as HTMLButtonElement;
    const resetBtn = this.element.querySelector(
      "#reset-game"
    ) as HTMLButtonElement;
    const backBtn = this.element.querySelector(
      "#back-to-menu"
    ) as HTMLButtonElement;
    const playAgainBtn = this.element.querySelector(
      "#play-again"
    ) as HTMLButtonElement;
    const backModalBtn = this.element.querySelector(
      "#back-to-menu-modal"
    ) as HTMLButtonElement;

    pvpBtn?.addEventListener("click", () => this.setGameMode("pvp"));
    aiBtn?.addEventListener("click", () => this.setGameMode("ai"));

    easyBtn?.addEventListener("click", () => this.setAIDifficulty("easy"));
    mediumBtn?.addEventListener("click", () => this.setAIDifficulty("medium"));
    hardBtn?.addEventListener("click", () => this.setAIDifficulty("hard"));

    startBtn?.addEventListener("click", () => this.startGame());
    pauseBtn?.addEventListener("click", () => this.togglePause());
    resetBtn?.addEventListener("click", () => this.resetGame());
    backBtn?.addEventListener("click", () => this.goBackToMenu());
    playAgainBtn?.addEventListener("click", () => this.resetGame());
    backModalBtn?.addEventListener("click", () => this.goBackToMenu());
  }

  private setGameMode(mode: "pvp" | "ai"): void {
    this.gameMode.type = mode;
    if (mode === "ai" && !this.gameMode.aiDifficulty) {
      this.gameMode.aiDifficulty = "medium";
    }
    this.renderPage();
    setTimeout(() => {
      this.setupCanvas();
      this.setupEventListeners();
      this.setupKeyboardControls();
    }, 50);
  }

  private setAIDifficulty(difficulty: "easy" | "medium" | "hard"): void {
    this.gameMode.aiDifficulty = difficulty;
    this.renderPage();
    setTimeout(() => {
      this.setupCanvas();
      this.setupEventListeners();
      this.setupKeyboardControls();
    }, 50);
  }

  private setupKeyboardControls(): void {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    e.preventDefault();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
    e.preventDefault();
  }

  private async startGame(): Promise<void> {
    if (authAPI.isAuthenticated()) {
      try {
        const user = authAPI.getCurrentUser();
        if (user) {
          const response = await gameAPI.createLocalGame(user.id);
          this.gameState.matchId = response.matchId;
        }
      } catch (error) {
        console.error("Failed to create local game session:", error);
      }
    }

    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.gameState.gameStartTime = Date.now();

    const startBtn = this.element.querySelector(
      "#start-game"
    ) as HTMLButtonElement;
    const pauseBtn = this.element.querySelector(
      "#pause-game"
    ) as HTMLButtonElement;

    startBtn.disabled = true;
    pauseBtn.disabled = false;

    this.gameLoop();
    Toast.success("Game started! Good luck!");
  }

  private togglePause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;

    if (this.gameState.isPaused) {
      Toast.info("Game paused");
    } else {
      Toast.info("Game resumed");
      this.gameLoop();
    }
  }

  private resetGame(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.gameState = this.initializeGameState();
    this.drawGame();
    this.hideGameOverModal();

    const startBtn = this.element.querySelector(
      "#start-game"
    ) as HTMLButtonElement;
    const pauseBtn = this.element.querySelector(
      "#pause-game"
    ) as HTMLButtonElement;

    startBtn.disabled = false;
    pauseBtn.disabled = true;

    Toast.info("Game reset");
  }

  private goBackToMenu(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    navigateToView(ViewType.PLAY_MENU);
  }

  private gameLoop(): void {
    if (this.gameState.isPaused || !this.gameState.isPlaying) {
      return;
    }

    this.updateGame();
    this.drawGame();

    if (this.gameState.isPlaying) {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private updateGame(): void {
    this.handleInput();
    this.updateAI();

    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    if (
      this.gameState.ball.y <= 0 ||
      this.gameState.ball.y >= this.CANVAS_HEIGHT - this.BALL_SIZE
    ) {
      this.gameState.ball.dy = -this.gameState.ball.dy;
    }

    const ballCenterX = this.gameState.ball.x + this.BALL_SIZE / 2;
    const ballCenterY = this.gameState.ball.y + this.BALL_SIZE / 2;

    if (
      ballCenterX <= 10 + this.PADDLE_WIDTH &&
      ballCenterY >= this.gameState.paddles.left.y &&
      ballCenterY <= this.gameState.paddles.left.y + this.PADDLE_HEIGHT &&
      this.gameState.ball.dx < 0
    ) {
      this.gameState.ball.dx = -this.gameState.ball.dx;
      const hitPos =
        (ballCenterY - this.gameState.paddles.left.y) / this.PADDLE_HEIGHT;
      this.gameState.ball.dy = (hitPos - 0.5) * this.BALL_SPEED;
    }

    if (
      ballCenterX >= this.CANVAS_WIDTH - 10 - this.PADDLE_WIDTH &&
      ballCenterY >= this.gameState.paddles.right.y &&
      ballCenterY <= this.gameState.paddles.right.y + this.PADDLE_HEIGHT &&
      this.gameState.ball.dx > 0
    ) {
      this.gameState.ball.dx = -this.gameState.ball.dx;
      const hitPos =
        (ballCenterY - this.gameState.paddles.right.y) / this.PADDLE_HEIGHT;
      this.gameState.ball.dy = (hitPos - 0.5) * this.BALL_SPEED;
    }

    if (this.gameState.ball.x < 0) {
      this.gameState.score.right++;
      this.resetBall();
      this.checkGameEnd();
    } else if (this.gameState.ball.x > this.CANVAS_WIDTH) {
      this.gameState.score.left++;
      this.resetBall();
      this.checkGameEnd();
    }
  }

  private handleInput(): void {
    if (this.keys.has("w")) {
      this.gameState.paddles.left.y = Math.max(
        0,
        this.gameState.paddles.left.y - this.gameState.paddles.left.speed
      );
    }
    if (this.keys.has("s")) {
      this.gameState.paddles.left.y = Math.min(
        this.CANVAS_HEIGHT - this.PADDLE_HEIGHT,
        this.gameState.paddles.left.y + this.gameState.paddles.left.speed
      );
    }

    if (this.gameMode.type === "pvp") {
      if (this.keys.has("arrowup")) {
        this.gameState.paddles.right.y = Math.max(
          0,
          this.gameState.paddles.right.y - this.gameState.paddles.right.speed
        );
      }
      if (this.keys.has("arrowdown")) {
        this.gameState.paddles.right.y = Math.min(
          this.CANVAS_HEIGHT - this.PADDLE_HEIGHT,
          this.gameState.paddles.right.y + this.gameState.paddles.right.speed
        );
      }
    }
  }

  private updateAI(): void {
    if (this.gameMode.type !== "ai") return;

    const ballCenterY = this.gameState.ball.y + this.BALL_SIZE / 2;
    const paddleCenterY =
      this.gameState.paddles.right.y + this.PADDLE_HEIGHT / 2;

    let aiSpeed = this.gameState.paddles.right.speed;
    let reactionDelay = 0;

    switch (this.gameMode.aiDifficulty) {
      case "easy":
        aiSpeed *= 0.6;
        reactionDelay = 20;
        break;
      case "medium":
        aiSpeed *= 0.8;
        reactionDelay = 10;
        break;
      case "hard":
        aiSpeed *= 1.0;
        reactionDelay = 2;
        break;
    }

    if (Math.abs(ballCenterY - paddleCenterY) > reactionDelay) {
      if (ballCenterY < paddleCenterY) {
        this.gameState.paddles.right.y = Math.max(
          0,
          this.gameState.paddles.right.y - aiSpeed
        );
      } else if (ballCenterY > paddleCenterY) {
        this.gameState.paddles.right.y = Math.min(
          this.CANVAS_HEIGHT - this.PADDLE_HEIGHT,
          this.gameState.paddles.right.y + aiSpeed
        );
      }
    }
  }

  private resetBall(): void {
    this.gameState.ball.x = this.CANVAS_WIDTH / 2 - this.BALL_SIZE / 2;
    this.gameState.ball.y = this.CANVAS_HEIGHT / 2 - this.BALL_SIZE / 2;
    this.gameState.ball.dx =
      Math.random() > 0.5 ? this.BALL_SPEED : -this.BALL_SPEED;
    this.gameState.ball.dy = (Math.random() - 0.5) * this.BALL_SPEED;
  }

  private checkGameEnd(): void {
    const leftScore = this.gameState.score.left;
    const rightScore = this.gameState.score.right;

    if (leftScore >= this.MAX_SCORE || rightScore >= this.MAX_SCORE) {
      this.gameState.isPlaying = false;

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = 0;
      }

      this.showGameOverModal();
    }
  }

  private drawInitialState(): void {
    if (!this.ctx) {
      console.warn("Canvas context not available for initial draw");
      return;
    }

    try {
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;
      const scale = Math.min(
        canvasWidth / this.CANVAS_WIDTH,
        canvasHeight / this.CANVAS_HEIGHT
      );

      this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(canvasWidth / 2, 0);
      this.ctx.lineTo(canvasWidth / 2, canvasHeight);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      const paddleWidth = this.PADDLE_WIDTH * scale;
      const paddleHeight = this.PADDLE_HEIGHT * scale;

      this.ctx.fillRect(
        10 * scale,
        canvasHeight / 2 - paddleHeight / 2,
        paddleWidth,
        paddleHeight
      );
      this.ctx.fillRect(
        canvasWidth - paddleWidth - 10 * scale,
        canvasHeight / 2 - paddleHeight / 2,
        paddleWidth,
        paddleHeight
      );

      const ballSize = this.BALL_SIZE * scale;
      this.ctx.fillRect(
        canvasWidth / 2 - ballSize / 2,
        canvasHeight / 2 - ballSize / 2,
        ballSize,
        ballSize
      );

      this.ctx.textAlign = "center";
      this.ctx.fillText("0", canvasWidth / 4, 50 * scale);
      this.ctx.fillText("0", (3 * canvasWidth) / 4, 50 * scale);
    } catch (error) {
      console.error("Error drawing initial state:", error);
      Toast.error("Failed to initialize game display");
    }
  }

  private drawGame(): void {
    if (!this.ctx || !this.gameState) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const scale = Math.min(
      canvasWidth / this.CANVAS_WIDTH,
      canvasHeight / this.CANVAS_HEIGHT
    );

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(canvasWidth / 2, 0);
    this.ctx.lineTo(canvasWidth / 2, canvasHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    const paddleWidth = this.PADDLE_WIDTH * scale;
    const paddleHeight = this.PADDLE_HEIGHT * scale;
    const ballSize = this.BALL_SIZE * scale;

    this.ctx.fillRect(
      10 * scale,
      (this.gameState.paddles.left.y / this.CANVAS_HEIGHT) * canvasHeight,
      paddleWidth,
      paddleHeight
    );
    this.ctx.fillRect(
      canvasWidth - paddleWidth - 10 * scale,
      (this.gameState.paddles.right.y / this.CANVAS_HEIGHT) * canvasHeight,
      paddleWidth,
      paddleHeight
    );

    this.ctx.fillRect(
      (this.gameState.ball.x / this.CANVAS_WIDTH) * canvasWidth,
      (this.gameState.ball.y / this.CANVAS_HEIGHT) * canvasHeight,
      ballSize,
      ballSize
    );

    this.ctx.textAlign = "center";
    this.ctx.fillText(
      this.gameState.score.left.toString(),
      canvasWidth / 4,
      50 * scale
    );
    this.ctx.fillText(
      this.gameState.score.right.toString(),
      (3 * canvasWidth) / 4,
      50 * scale
    );

    if (this.gameState.isPaused) {
      this.ctx.fillText("PAUSED", canvasWidth / 2, canvasHeight / 2);
    }
  }

  private showGameOverModal(): void {
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;
    const winnerText = this.element.querySelector(
      "#winner-text"
    ) as HTMLElement;
    const scoreText = this.element.querySelector("#final-score") as HTMLElement;

    const leftScore = this.gameState.score.left;
    const rightScore = this.gameState.score.right;

    const winner =
      leftScore > rightScore
        ? "Player 1"
        : this.gameMode.type === "ai"
        ? "AI"
        : "Player 2";

    winnerText.textContent = `🎉 ${winner} Wins! 🎉`;
    scoreText.textContent = `Final Score: ${leftScore} - ${rightScore}`;

    modal.classList.remove("hidden");

    this.saveGameResult();
    Toast.success(`${winner} wins the match!`);
  }

  private hideGameOverModal(): void {
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;
    modal.classList.add("hidden");
  }

  private async saveGameResult(): Promise<void> {
    if (!this.gameState.matchId || !authAPI.isAuthenticated()) return;

    try {
      const duration = Math.floor(
        (Date.now() - this.gameState.gameStartTime) / 1000
      );
      const user = authAPI.getCurrentUser();

      if (user) {
        const winnerId =
          this.gameState.score.left > this.gameState.score.right
            ? user.id
            : undefined;

        await gameAPI.updateGameResult({
          matchId: this.gameState.matchId,
          player1Score: this.gameState.score.left,
          player2Score: this.gameState.score.right,
          duration,
          winnerId,
        });

        Toast.success("Game result saved!");
      }
    } catch (error) {
      console.error("Failed to save game result:", error);
      Toast.error("Failed to save game result");
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("keyup", this.handleKeyUp.bind(this));
    window.removeEventListener("resize", this.resizeCanvas.bind(this));

    super.destroy();
  }
}

export async function createLocalGamePage(): Promise<HTMLElement> {
  const page = new PlayLocalPage();
  return page.render();
}
