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

export class PlayLocalPage extends BaseComponent {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;
  private animationId: number = 0;
  private keys: Set<string> = new Set();
  private paddleHeight = 100;
  private paddleWidth = 15;
  private ballSize = 15;
  private maxScore = 11;

  constructor() {
    super("div", "min-h-screen bg-black text-white");
    this.gameState = this.initializeGameState();
  }

  protected init(): void {
    this.renderPage();
    this.setupCanvas();
    this.setupEventListeners();
    this.setupKeyboardControls();
  }

  private initializeGameState(): GameState {
    return {
      ball: {
        x: 400,
        y: 300,
        dx: 5,
        dy: 3,
        speed: 5,
      },
      paddles: {
        left: { y: 250, speed: 8 },
        right: { y: 250, speed: 8 },
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
    this.element.innerHTML = `
      <div class="container mx-auto px-4 py-8">
        <div class="text-center mb-6">
          <h1 class="text-3xl font-bold mb-4">Local Game</h1>
          <div class="flex justify-center gap-4 mb-4">
            <button id="start-game" class="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-semibold">
              Start Game
            </button>
            <button id="pause-game" class="bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded-lg font-semibold" disabled>
              Pause
            </button>
            <button id="reset-game" class="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-semibold">
              Reset
            </button>
            <button id="back-to-menu" class="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg font-semibold">
              Back to Menu
            </button>
          </div>
        </div>

        <div class="flex justify-center mb-4">
          <canvas id="gameCanvas" class="border-2 border-white bg-black"></canvas>
        </div>

        <div class="text-center text-sm text-gray-400">
          <p class="mb-2">Controls:</p>
          <p>Player 1 (Left): W/S keys | Player 2 (Right): ↑/↓ arrow keys</p>
          <p>First to ${this.maxScore} points wins!</p>
        </div>

        <div id="game-over-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center">
            <h2 class="text-2xl font-bold mb-4" id="winner-text"></h2>
            <div class="flex gap-4 justify-center">
              <button id="play-again" class="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-semibold">
                Play Again
              </button>
              <button id="back-to-menu-modal" class="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg font-semibold">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupCanvas(): void {
    this.canvas = this.element.querySelector(
      "#gameCanvas"
    ) as HTMLCanvasElement;
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";
  }

  private setupEventListeners(): void {
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

    startBtn.addEventListener("click", () => this.startGame());
    pauseBtn.addEventListener("click", () => this.togglePause());
    resetBtn.addEventListener("click", () => this.resetGame());
    backBtn.addEventListener("click", () => this.goBackToMenu());
    playAgainBtn.addEventListener("click", () => this.resetGame());
    backModalBtn.addEventListener("click", () => this.goBackToMenu());
  }

  private setupKeyboardControls(): void {
    document.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    document.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
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
  }

  private togglePause(): void {
    this.gameState.isPaused = !this.gameState.isPaused;
    const pauseBtn = this.element.querySelector(
      "#pause-game"
    ) as HTMLButtonElement;
    pauseBtn.textContent = this.gameState.isPaused ? "Resume" : "Pause";

    if (!this.gameState.isPaused) {
      this.gameLoop();
    }
  }

  private resetGame(): void {
    cancelAnimationFrame(this.animationId);
    this.gameState = this.initializeGameState();

    const startBtn = this.element.querySelector(
      "#start-game"
    ) as HTMLButtonElement;
    const pauseBtn = this.element.querySelector(
      "#pause-game"
    ) as HTMLButtonElement;
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause";
    modal.classList.add("hidden");

    this.draw();
  }

  private goBackToMenu(): void {
    cancelAnimationFrame(this.animationId);
    navigateToView(ViewType.PLAY_MENU);
  }

  private gameLoop(): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.updatePaddles();
    this.updateBall();
  }

  private updatePaddles(): void {
    if (this.keys.has("w") && this.gameState.paddles.left.y > 0) {
      this.gameState.paddles.left.y -= this.gameState.paddles.left.speed;
    }
    if (
      this.keys.has("s") &&
      this.gameState.paddles.left.y < this.canvas.height - this.paddleHeight
    ) {
      this.gameState.paddles.left.y += this.gameState.paddles.left.speed;
    }

    if (this.keys.has("arrowup") && this.gameState.paddles.right.y > 0) {
      this.gameState.paddles.right.y -= this.gameState.paddles.right.speed;
    }
    if (
      this.keys.has("arrowdown") &&
      this.gameState.paddles.right.y < this.canvas.height - this.paddleHeight
    ) {
      this.gameState.paddles.right.y += this.gameState.paddles.right.speed;
    }
  }

  private updateBall(): void {
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    if (
      this.gameState.ball.y <= 0 ||
      this.gameState.ball.y >= this.canvas.height - this.ballSize
    ) {
      this.gameState.ball.dy = -this.gameState.ball.dy;
    }

    if (this.gameState.ball.x <= this.paddleWidth) {
      if (
        this.gameState.ball.y >= this.gameState.paddles.left.y &&
        this.gameState.ball.y <=
          this.gameState.paddles.left.y + this.paddleHeight
      ) {
        this.gameState.ball.dx = -this.gameState.ball.dx;
        this.gameState.ball.dy += (Math.random() - 0.5) * 2;
      } else {
        this.gameState.score.right++;
        this.resetBall();
      }
    }

    if (
      this.gameState.ball.x >=
      this.canvas.width - this.paddleWidth - this.ballSize
    ) {
      if (
        this.gameState.ball.y >= this.gameState.paddles.right.y &&
        this.gameState.ball.y <=
          this.gameState.paddles.right.y + this.paddleHeight
      ) {
        this.gameState.ball.dx = -this.gameState.ball.dx;
        this.gameState.ball.dy += (Math.random() - 0.5) * 2;
      } else {
        this.gameState.score.left++;
        this.resetBall();
      }
    }

    if (
      this.gameState.score.left >= this.maxScore ||
      this.gameState.score.right >= this.maxScore
    ) {
      this.endGame();
    }
  }

  private resetBall(): void {
    this.gameState.ball.x = this.canvas.width / 2;
    this.gameState.ball.y = this.canvas.height / 2;
    this.gameState.ball.dx =
      (Math.random() > 0.5 ? 1 : -1) * this.gameState.ball.speed;
    this.gameState.ball.dy = (Math.random() - 0.5) * 4;
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillRect(
      10,
      this.gameState.paddles.left.y,
      this.paddleWidth,
      this.paddleHeight
    );
    this.ctx.fillRect(
      this.canvas.width - this.paddleWidth - 10,
      this.gameState.paddles.right.y,
      this.paddleWidth,
      this.paddleHeight
    );

    this.ctx.fillRect(
      this.gameState.ball.x,
      this.gameState.ball.y,
      this.ballSize,
      this.ballSize
    );

    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.textAlign = "center";
    this.ctx.fillText(
      this.gameState.score.left.toString(),
      this.canvas.width / 4,
      50
    );
    this.ctx.fillText(
      this.gameState.score.right.toString(),
      (3 * this.canvas.width) / 4,
      50
    );
  }

  private async endGame(): Promise<void> {
    this.gameState.isPlaying = false;
    cancelAnimationFrame(this.animationId);

    const winner =
      this.gameState.score.left >= this.maxScore ? "Player 1" : "Player 2";
    const winnerId = this.gameState.score.left >= this.maxScore ? 1 : 2;

    const winnerText = this.element.querySelector(
      "#winner-text"
    ) as HTMLElement;
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;

    winnerText.textContent = `${winner} Wins!`;
    modal.classList.remove("hidden");

    if (this.gameState.matchId && authAPI.isAuthenticated()) {
      try {
        const duration = Math.floor(
          (Date.now() - this.gameState.gameStartTime) / 1000
        );
        const user = authAPI.getCurrentUser();

        if (user) {
          await gameAPI.updateGameResult({
            matchId: this.gameState.matchId,
            player1Score: this.gameState.score.left,
            player2Score: this.gameState.score.right,
            duration,
            winnerId: winnerId === 1 ? user.id : undefined,
          });

          Toast.success("Game result saved!");
        }
      } catch (error) {
        console.error("Failed to save game result:", error);
        Toast.error("Failed to save game result");
      }
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    document.removeEventListener("keydown", () => {});
    document.removeEventListener("keyup", () => {});
  }
}

export async function createLocalGamePage(): Promise<HTMLElement> {
  const page = new PlayLocalPage();
  return page.render();
}
