import { authAPI } from "../api/auth";
import { gameAPI } from "../api/game";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

interface WaitingGame {
  gameId: string;
  createdAt: string;
  playersCount: number;
}

export class PlayMenuPage extends BaseComponent {
  private waitingGames: WaitingGame[] = [];
  private refreshInterval: number = 0;

  constructor() {
    super("div", "min-h-screen bg-black text-white");
  }

  protected init(): void {
    this.renderPage();
    this.loadWaitingGames();
    this.startAutoRefresh();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="container mx-auto px-4 py-8">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold mb-4">Play Pong</h1>
          <p class="text-gray-400 text-lg">Choose your game mode</p>
        </div>

        <div class="max-w-4xl mx-auto">
          <!-- Game Mode Selection -->
          <div class="grid md:grid-cols-2 gap-8 mb-8">
            <!-- Local Mode -->
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div class="text-center mb-6">
                <div class="text-4xl mb-4">🏓</div>
                <h3 class="text-xl font-bold mb-2">Local Game</h3>
                <p class="text-gray-400 mb-4">Play with a friend on the same device</p>
                <ul class="text-sm text-gray-500 mb-4 text-left">
                  <li>• Player 1: W/S keys</li>
                  <li>• Player 2: ↑/↓ arrow keys</li>
                  <li>• First to 11 points wins</li>
                </ul>
              </div>
              <button id="local-game-btn" class="w-full bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition-colors">
                Start Local Game
              </button>
            </div>

            <!-- Online Mode -->
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div class="text-center mb-6">
                <div class="text-4xl mb-4">🌐</div>
                <h3 class="text-xl font-bold mb-2">Online Game</h3>
                <p class="text-gray-400 mb-4">Play against other players online</p>
                <ul class="text-sm text-gray-500 mb-4 text-left">
                  <li>• Real-time multiplayer</li>
                  <li>• Server-side game logic</li>
                  <li>• Competitive scoring</li>
                </ul>
              </div>
              <div class="space-y-3">
                <button id="create-game-btn" class="w-full bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-semibold transition-colors">
                  Create Online Game
                </button>
                <button id="refresh-games-btn" class="w-full bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm transition-colors">
                  Refresh Games List
                </button>
              </div>
            </div>
          </div>

          <!-- Waiting Games List -->
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Join Existing Games</h3>
              <span id="games-count" class="text-sm text-gray-400">0 games waiting</span>
            </div>

            <div id="waiting-games-list" class="space-y-3">
              <div class="text-center text-gray-500 py-8">
                <div class="text-2xl mb-2">🎮</div>
                <p>No games waiting for players</p>
                <p class="text-sm">Create a new game or refresh the list</p>
              </div>
            </div>
          </div>

          <!-- Back Button -->
          <div class="text-center mt-8">
            <button id="back-btn" class="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg font-semibold transition-colors">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const localGameBtn = this.element.querySelector(
      "#local-game-btn"
    ) as HTMLButtonElement;
    const createGameBtn = this.element.querySelector(
      "#create-game-btn"
    ) as HTMLButtonElement;
    const refreshGamesBtn = this.element.querySelector(
      "#refresh-games-btn"
    ) as HTMLButtonElement;
    const backBtn = this.element.querySelector(
      "#back-btn"
    ) as HTMLButtonElement;

    localGameBtn.addEventListener("click", () => this.startLocalGame());
    createGameBtn.addEventListener("click", () => this.createOnlineGame());
    refreshGamesBtn.addEventListener("click", () => this.loadWaitingGames());
    backBtn.addEventListener("click", () => this.goBack());
  }

  private startLocalGame(): void {
    navigateToView(ViewType.PLAY_LOCAL);
  }

  private async createOnlineGame(): Promise<void> {
    if (!authAPI.isAuthenticated()) {
      Toast.error("You must be logged in to play online");
      return;
    }

    const createBtn = this.element.querySelector(
      "#create-game-btn"
    ) as HTMLButtonElement;
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";

    try {
      const result = await gameAPI.createGame();
      Toast.success("Game created successfully!");

      sessionStorage.setItem("currentGameId", result.gameId);
      navigateToView(ViewType.PLAY_ONLINE);
    } catch (error: any) {
      console.error("Failed to create game:", error);
      Toast.error(error.message || "Failed to create game");
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Create Online Game";
    }
  }

  private async loadWaitingGames(): Promise<void> {
    if (!authAPI.isAuthenticated()) {
      this.renderWaitingGames([]);
      return;
    }

    try {
      const result = await gameAPI.getWaitingGames();
      this.waitingGames = result.games;
      this.renderWaitingGames(this.waitingGames);
    } catch (error: any) {
      console.error("Failed to load waiting games:", error);
      this.renderWaitingGames([]);
    }
  }

  private renderWaitingGames(games: WaitingGame[]): void {
    const gamesList = this.element.querySelector(
      "#waiting-games-list"
    ) as HTMLElement;
    const gamesCount = this.element.querySelector(
      "#games-count"
    ) as HTMLElement;

    gamesCount.textContent = `${games.length} games waiting`;

    if (games.length === 0) {
      gamesList.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <div class="text-2xl mb-2">🎮</div>
          <p>No games waiting for players</p>
          <p class="text-sm">Create a new game to start playing</p>
        </div>
      `;
      return;
    }

    gamesList.innerHTML = games
      .map(
        (game) => `
      <div class="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-600">
        <div class="flex-1">
          <div class="flex items-center space-x-3">
            <div class="text-green-400">●</div>
            <div>
              <p class="font-medium">Game ${game.gameId.substring(0, 8)}...</p>
              <p class="text-sm text-gray-400">
                Created ${this.formatTimeAgo(game.createdAt)} • ${
          game.playersCount
        }/2 players
              </p>
            </div>
          </div>
        </div>
        <button
          class="join-game-btn bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          data-game-id="${game.gameId}"
        >
          Join Game
        </button>
      </div>
    `
      )
      .join("");

    const joinButtons = gamesList.querySelectorAll(".join-game-btn");
    joinButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const gameId = (e.target as HTMLElement).getAttribute("data-game-id");
        if (gameId) this.joinGame(gameId);
      });
    });
  }

  private async joinGame(gameId: string): Promise<void> {
    if (!authAPI.isAuthenticated()) {
      Toast.error("You must be logged in to join games");
      return;
    }

    const button = this.element.querySelector(
      `[data-game-id="${gameId}"]`
    ) as HTMLButtonElement;
    button.disabled = true;
    button.textContent = "Joining...";

    try {
      console.log("About to join game with ID:", gameId);
      await gameAPI.joinGame(gameId);
      Toast.success("Joined game successfully!");

      console.log("Setting gameId in sessionStorage:", gameId);
      sessionStorage.setItem("currentGameId", gameId);
      console.log(
        "Stored gameId in sessionStorage:",
        sessionStorage.getItem("currentGameId")
      );
      console.log("About to navigate to PLAY_ONLINE view");
      navigateToView(ViewType.PLAY_ONLINE);
    } catch (error: any) {
      console.error("Failed to join game:", error);
      Toast.error(error.message || "Failed to join game");
      button.disabled = false;
      button.textContent = "Join Game";
    }
  }

  private formatTimeAgo(dateString: string): string {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return created.toLocaleDateString();
  }

  private startAutoRefresh(): void {
    this.refreshInterval = window.setInterval(() => {
      if (authAPI.isAuthenticated()) {
        this.loadWaitingGames();
      }
    }, 5000);
  }

  private goBack(): void {
    navigateToView(ViewType.DASHBOARD);
  }

  public destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    super.destroy();
  }
}

export async function createPlayMenuPage(): Promise<HTMLElement> {
  const page = new PlayMenuPage();
  return page.render();
}
