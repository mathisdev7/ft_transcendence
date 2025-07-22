import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";
import { TournamentPage } from "./TournamentPage";

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
}

interface Player {
  id: string;
  name: string;
  isCurrentUser?: boolean;
}

interface TournamentMatch {
  tournamentId: string;
  matchId: string;
  player1: Player;
  player2: Player;
}

export class TournamentGamePage extends BaseComponent {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;
  private animationId: number = 0;
  private keys: Set<string> = new Set();
  private tournamentMatch: TournamentMatch | null = null;

  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_WIDTH = 15;
  private readonly PADDLE_HEIGHT = 100;
  private readonly BALL_SIZE = 15;
  private readonly PADDLE_SPEED = 8;
  private readonly BALL_SPEED = 3;
  private readonly MAX_SCORE = 11;

  constructor() {
    super("div", "min-h-screen bg-black text-white");
    this.gameState = this.initializeGameState();
  }

  protected init(): void {
    if (!this.gameState) {
      this.gameState = this.initializeGameState();
    }

    const matchInfo = sessionStorage.getItem("tournamentMatch");

    if (!matchInfo) {
      Toast.error("No tournament match found");
      this.goBackToTournament();
      return;
    }

    try {
      this.tournamentMatch = JSON.parse(matchInfo);
    } catch (error) {
      console.error("Failed to parse tournament match data:", error);
      Toast.error("Invalid tournament match data");
      this.goBackToTournament();
      return;
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
    };
  }

  private renderPage(): void {
    if (!this.tournamentMatch) return;

    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - Tournament Match</h1>
            </div>
            <button id="back-to-tournament" class="btn btn-secondary btn-sm">
              Back to Tournament
            </button>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Tournament Match</h2>
          <p class="text-muted-foreground text-lg">First to 11 points wins</p>
        </div>

        <div class="card mb-8">
          <div class="card-content">
            <div class="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
              <div class="text-center flex-1">
                <div class="text-2xl sm:text-3xl font-bold text-foreground mb-2">${this.tournamentMatch.player1.name}</div>
                <div class="text-muted-foreground mb-2">Player 1 (Left Paddle)</div>
                <div class="text-sm text-muted-foreground">W/S keys</div>
              </div>
              <div class="text-center px-8">
                <div class="text-3xl font-bold text-foreground mb-2">VS</div>
                <div class="text-sm text-muted-foreground">First to 11</div>
              </div>
              <div class="text-center flex-1">
                <div class="text-2xl sm:text-3xl font-bold text-foreground mb-2">${this.tournamentMatch.player2.name}</div>
                <div class="text-muted-foreground mb-2">Player 2 (Right Paddle)</div>
                <div class="text-sm text-muted-foreground">↑/↓ arrow keys</div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center mb-8">
          <div class="card">
            <div class="card-content p-0">
              <canvas id="gameCanvas" class="border-2 border-border bg-background"></canvas>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <button id="start-game" class="btn btn-success font-semibold">
            Start Match
          </button>
          <button id="pause-game" class="btn btn-warning font-semibold" disabled>
            Pause
          </button>
          <button id="reset-game" class="btn btn-destructive font-semibold">
            Reset Match
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🎮 Controls</h3>
          </div>
          <div class="card-content">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="card">
                <div class="card-content p-4 text-center">
                  <h4 class="text-lg font-semibold text-foreground mb-3">${this.tournamentMatch.player1.name}</h4>
                  <div class="text-muted-foreground space-y-1">
                    <p><span class="font-semibold">W</span> - Move Up</p>
                    <p><span class="font-semibold">S</span> - Move Down</p>
                  </div>
                </div>
              </div>
              <div class="card">
                <div class="card-content p-4 text-center">
                  <h4 class="text-lg font-semibold text-foreground mb-3">${this.tournamentMatch.player2.name}</h4>
                  <div class="text-muted-foreground space-y-1">
                    <p><span class="font-semibold">↑</span> - Move Up</p>
                    <p><span class="font-semibold">↓</span> - Move Down</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="game-over-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden p-4">
          <div class="card w-full max-w-md">
            <div class="card-header">
              <h3 class="card-title text-center" id="winner-text">Match Complete</h3>
            </div>
            <div class="card-content">
              <div class="text-center mb-6">
                <div class="text-lg text-foreground" id="final-score">Final Score</div>
              </div>
              <div class="flex flex-col sm:flex-row gap-4">
                <button id="play-again" class="btn btn-success flex-1">
                  Play Again
                </button>
                <button id="continue-tournament" class="btn btn-primary flex-1">
                  Continue Tournament
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

    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;

    const context = this.canvas.getContext("2d");
    if (!context) {
      Toast.error("Your browser doesn't support canvas 2D context");
      return;
    }

    this.ctx = context;
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";

    this.drawInitialState();
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
    const playAgainBtn = this.element.querySelector(
      "#play-again"
    ) as HTMLButtonElement;
    const continueBtn = this.element.querySelector(
      "#continue-tournament"
    ) as HTMLButtonElement;
    const backBtn = this.element.querySelector(
      "#back-to-tournament"
    ) as HTMLButtonElement;

    startBtn?.addEventListener("click", () => this.startGame());
    pauseBtn?.addEventListener("click", () => this.togglePause());
    resetBtn?.addEventListener("click", () => this.resetGame());
    playAgainBtn?.addEventListener("click", () => this.resetGame());
    continueBtn?.addEventListener("click", () => this.continueToTournament());
    backBtn?.addEventListener("click", () => this.goBackToTournament());
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

  private startGame(): void {
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
    Toast.success("Match started! Good luck!");
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

    Toast.info("Match reset");
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
      console.error("Error drawing initial state:", error);
      Toast.error("Failed to initialize game display");
    }
  }

  private drawGame(): void {
    if (!this.ctx || !this.gameState) return;

    this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
    this.ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillRect(
      10,
      this.gameState.paddles.left.y,
      this.PADDLE_WIDTH,
      this.PADDLE_HEIGHT
    );
    this.ctx.fillRect(
      this.CANVAS_WIDTH - this.PADDLE_WIDTH - 10,
      this.gameState.paddles.right.y,
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
      this.gameState.score.left.toString(),
      this.CANVAS_WIDTH / 4,
      50
    );
    this.ctx.fillText(
      this.gameState.score.right.toString(),
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
  }

  private showGameOverModal(): void {
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;
    const winnerText = this.element.querySelector(
      "#winner-text"
    ) as HTMLElement;
    const scoreText = this.element.querySelector("#final-score") as HTMLElement;

    const leftScore = this.gameState.score.left;
    const rightScore = this.gameState.score.right;

    if (!this.tournamentMatch) {
      const matchInfo = sessionStorage.getItem("tournamentMatch");
      if (matchInfo) {
        try {
          this.tournamentMatch = JSON.parse(matchInfo);
        } catch (error) {
          console.error("Failed to reload tournament match:", error);
        }
      }

      if (!this.tournamentMatch) {
        winnerText.textContent =
          leftScore > rightScore
            ? "🎉 Player 1 Wins! 🎉"
            : "🎉 Player 2 Wins! 🎉";
        scoreText.textContent = `Final Score: ${leftScore} - ${rightScore}`;
        modal.classList.remove("hidden");

        Toast.success("Game finished! Click Continue Tournament to proceed.");
        return;
      }
    }

    const winner =
      this.gameState.score.left > this.gameState.score.right
        ? this.tournamentMatch.player1
        : this.tournamentMatch.player2;

    winnerText.textContent = `🎉 ${winner.name} Wins! 🎉`;
    scoreText.textContent = `Final Score: ${leftScore} - ${rightScore}`;

    modal.classList.remove("hidden");

    this.saveMatchResult(winner, { player1: leftScore, player2: rightScore });

    Toast.success(`${winner.name} wins the match!`);
  }

  private hideGameOverModal(): void {
    const modal = this.element.querySelector("#game-over-modal") as HTMLElement;
    modal.classList.add("hidden");
  }

  private saveMatchResult(
    winner: Player,
    score: { player1: number; player2: number }
  ): void {
    let matchData = this.tournamentMatch;

    if (!matchData) {
      const matchInfo = sessionStorage.getItem("tournamentMatch");
      if (matchInfo) {
        try {
          matchData = JSON.parse(matchInfo);
        } catch (error) {
          console.error("Failed to reload tournament match data:", error);
        }
      }
    }

    if (!matchData) {
      return;
    }

    try {
      TournamentPage.completeMatch(matchData.matchId, winner, score);
      Toast.success("Match result saved to tournament!");
    } catch (error) {
      console.error("Failed to save match result:", error);
      Toast.error("Failed to save match result");
    }
  }

  private continueToTournament(): void {
    sessionStorage.removeItem("tournamentMatch");
    this.goBackToTournament();
  }

  private goBackToTournament(): void {
    navigateToView(ViewType.TOURNAMENT);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);

    super.destroy();
  }
}

export async function createTournamentGamePage(): Promise<HTMLElement> {
  const page = new TournamentGamePage();
  return page.render();
}
