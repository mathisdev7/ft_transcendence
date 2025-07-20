export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballSize: number;
  ballSpeed: number;
  maxScore: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
}

export interface Paddle {
  y: number;
  speed: number;
}

export interface GameState {
  ball: Ball;
  paddle1: Paddle;
  paddle2: Paddle;
  score: {
    player1: number;
    player2: number;
  };
  isPaused: boolean;
  isFinished: boolean;
  winner?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  paddleWidth: 15,
  paddleHeight: 100,
  paddleSpeed: 8,
  ballSize: 15,
  ballSpeed: 5,
  maxScore: 11,
};

export class PongGame {
  private config: GameConfig;
  private gameState: GameState;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    return {
      ball: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        dx:
          Math.random() > 0.5 ? this.config.ballSpeed : -this.config.ballSpeed,
        dy: (Math.random() - 0.5) * 4,
        speed: this.config.ballSpeed,
      },
      paddle1: {
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        speed: this.config.paddleSpeed,
      },
      paddle2: {
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        speed: this.config.paddleSpeed,
      },
      score: {
        player1: 0,
        player2: 0,
      },
      isPaused: false,
      isFinished: false,
    };
  }

  public getState(): GameState {
    return { ...this.gameState };
  }

  public setState(state: Partial<GameState>): void {
    this.gameState = { ...this.gameState, ...state };
  }

  public movePaddle(player: 1 | 2, direction: "up" | "down"): void {
    if (this.gameState.isPaused || this.gameState.isFinished) return;

    const paddle =
      player === 1 ? this.gameState.paddle1 : this.gameState.paddle2;
    const movement = direction === "up" ? -paddle.speed : paddle.speed;

    paddle.y = Math.max(
      0,
      Math.min(
        this.config.canvasHeight - this.config.paddleHeight,
        paddle.y + movement
      )
    );
  }

  public update(): { scored?: number; gameEnded?: boolean } {
    if (this.gameState.isPaused || this.gameState.isFinished) {
      return {};
    }

    const result: { scored?: number; gameEnded?: boolean } = {};

    this.updateBall();

    this.checkCollisions();

    const scoredPlayer = this.checkScore();
    if (scoredPlayer) {
      result.scored = scoredPlayer;
      this.resetBall();
      if (this.checkGameEnd()) {
        this.gameState.isFinished = true;
        this.gameState.winner =
          this.gameState.score.player1 >= this.config.maxScore ? 1 : 2;
        result.gameEnded = true;
      }
    }

    return result;
  }

  private updateBall(): void {
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    if (
      this.gameState.ball.y <= 0 ||
      this.gameState.ball.y >= this.config.canvasHeight - this.config.ballSize
    ) {
      this.gameState.ball.dy = -this.gameState.ball.dy;
    }
  }

  private checkCollisions(): boolean {
    const ball = this.gameState.ball;
    let collision = false;

    if (ball.x <= this.config.paddleWidth) {
      if (
        ball.y >= this.gameState.paddle1.y &&
        ball.y <= this.gameState.paddle1.y + this.config.paddleHeight
      ) {
        ball.dx = Math.abs(ball.dx);
        ball.dy += (Math.random() - 0.5) * 2;
        ball.x = this.config.paddleWidth + 1;
        collision = true;
      }
    }

    if (
      ball.x >=
      this.config.canvasWidth - this.config.paddleWidth - this.config.ballSize
    ) {
      if (
        ball.y >= this.gameState.paddle2.y &&
        ball.y <= this.gameState.paddle2.y + this.config.paddleHeight
      ) {
        ball.dx = -Math.abs(ball.dx);
        ball.dy += (Math.random() - 0.5) * 2;
        ball.x =
          this.config.canvasWidth -
          this.config.paddleWidth -
          this.config.ballSize -
          1;
        collision = true;
      }
    }

    return collision;
  }

  private checkScore(): number | null {
    const ball = this.gameState.ball;

    if (ball.x + this.config.ballSize < 0) {
      this.gameState.score.player2++;
      return 2;
    }

    if (ball.x > this.config.canvasWidth) {
      this.gameState.score.player1++;
      return 1;
    }

    return null;
  }

  private resetBall(): void {
    this.gameState.ball.x =
      this.config.canvasWidth / 2 - this.config.ballSize / 2;
    this.gameState.ball.y =
      this.config.canvasHeight / 2 - this.config.ballSize / 2;
    this.gameState.ball.dx =
      Math.random() > 0.5 ? this.config.ballSpeed : -this.config.ballSpeed;
    let dy = (Math.random() - 0.5) * 4;
    if (Math.abs(dy) < 1) {
      dy = dy < 0 ? -1 : 1;
    }
    this.gameState.ball.dy = dy;
  }

  private checkGameEnd(): boolean {
    return (
      this.gameState.score.player1 >= this.config.maxScore ||
      this.gameState.score.player2 >= this.config.maxScore
    );
  }

  public pause(): void {
    this.gameState.isPaused = true;
  }

  public resume(): void {
    this.gameState.isPaused = false;
  }

  public reset(): void {
    this.gameState = this.initializeGameState();
  }
}
