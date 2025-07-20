import { authAPI, type User } from "../api/auth";
import {
  gameAPI,
  type GameHistoryResponse,
  type GameHistoryItem,
  type GameStats,
} from "../api/game";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class DashboardPage extends BaseComponent {
  private user: User | null = null;
  private isLoadingUserData = false;
  private eventListenersSetup = false;
  private gameHistory: GameHistoryResponse | null = null;
  private isLoadingGameHistory = false;

  constructor() {
    super("div", "min-h-screen bg-black");
  }

  protected init(): void {
    this.loadUserData();
  }

  private async loadUserData(): Promise<void> {
    if (this.isLoadingUserData) {
      return;
    }

    this.isLoadingUserData = true;

    try {
      const userResponse = await authAPI.getMe();
      this.user = userResponse.user;
      localStorage.setItem(
        "accessToken",
        localStorage.getItem("accessToken") || ""
      );
      localStorage.setItem("user", JSON.stringify(this.user));
    } catch (error) {
      console.error("Failed to load user data:", error);
      this.user = authAPI.getCurrentUser();
    } finally {
      this.isLoadingUserData = false;
    }

    await this.loadGameHistory();
    this.renderPage();

    if (!this.eventListenersSetup) {
      this.setupEventListeners();
      this.eventListenersSetup = true;
    }
  }

  private async loadGameHistory(): Promise<void> {
    if (this.isLoadingGameHistory) {
      return;
    }

    this.isLoadingGameHistory = true;

    try {
      this.gameHistory = await gameAPI.getGameHistory();
    } catch (error) {
      console.error("Failed to load game history:", error);
      this.gameHistory = {
        games: [],
        stats: {
          total_games: 0,
          games_won: 0,
          games_lost: 0,
          win_rate: 0,
        },
      };
    } finally {
      this.isLoadingGameHistory = false;
    }
  }

  private async refreshUserData(): Promise<void> {
    if (this.isLoadingUserData) {
      return;
    }

    this.isLoadingUserData = true;

    try {
      const userResponse = await authAPI.getMe();
      this.user = userResponse.user;
      localStorage.setItem("user", JSON.stringify(this.user));
      await this.loadGameHistory();
      this.renderPage();
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    } finally {
      this.isLoadingUserData = false;
    }
  }

  private renderPage(): void {
    const stats = this.gameHistory?.stats || {
      total_games: 0,
      games_won: 0,
      games_lost: 0,
      win_rate: 0,
    };

    this.element.innerHTML = `
      <nav class="bg-gray-900 border-b border-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-white text-xl font-bold">Transcendence</h1>
            </div>

            <div class="flex items-center space-x-4">
              <span class="text-gray-300">Welcome, ${
                this.user?.display_name || "User"
              }</span>
              <button id="docs-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                📚 Documentation
              </button>
              <button id="logout-btn" class="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white mb-6">Dashboard</h2>

          <!-- Game Section -->
          <div class="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-700 rounded-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-white mb-2">🏓 Ready to Play Pong?</h3>
                <p class="text-blue-200">Challenge other players online or play locally with a friend</p>
              </div>
              <button id="play-btn" class="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg">
                🎮 Play Now
              </button>
            </div>
          </div>

          <!-- Profile Information -->
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-white mb-4">Profile Information</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">Email:</span>
                <span class="text-white">${this.user?.email || "N/A"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Username:</span>
                <span class="text-white">${this.user?.username || "N/A"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Display Name:</span>
                <span class="text-white">${
                  this.user?.display_name || "N/A"
                }</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Email Verified:</span>
                <span class="text-white">
                  ${
                    this.user?.is_verified
                      ? '<span class="text-green-400">✓ Verified</span>'
                      : '<span class="text-red-400">✗ Not Verified</span>'
                  }
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Member Since:</span>
                <span class="text-white">${
                  this.user?.created_at
                    ? new Date(this.user.created_at).toLocaleDateString()
                    : "N/A"
                }</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Account Actions</h3>
            <div class="space-y-3">
              <button id="refresh-status-btn" class="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
                Refresh Status
              </button>
              <button id="change-password-btn" class="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
                Change Password
              </button>
              ${
                !this.user?.is_verified
                  ? `
                <button id="resend-verification-btn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Resend Verification Email
                </button>
              `
                  : ""
              }
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Game Statistics</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">Games Played:</span>
                <span class="text-white">${stats.total_games}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Games Won:</span>
                <span class="text-green-400">${stats.games_won}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Games Lost:</span>
                <span class="text-red-400">${stats.games_lost}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Win Rate:</span>
                <span class="text-white">${stats.win_rate}%</span>
              </div>
              <div class="mt-4 pt-4 border-t border-gray-700">
                <button id="view-game-history-btn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm">
                  View Game History
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Game History Modal -->
      <div id="game-history-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden">
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">Game History</h3>
            <button id="close-modal-btn" class="text-gray-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto max-h-96">
            <div id="game-history-content">
              ${this.renderGameHistory()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGameHistory(): string {
    if (!this.gameHistory || this.gameHistory.games.length === 0) {
      return '<div class="text-center text-gray-400 py-8">No games played yet. Start playing to see your history!</div>';
    }

    return this.gameHistory.games
      .map((game: GameHistoryItem) => {
        const date = new Date(game.finished_at).toLocaleDateString();
        const time = new Date(game.finished_at).toLocaleTimeString();
        const duration = this.formatDuration(game.game_duration);

        const resultColor =
          game.result === "won"
            ? "text-green-400"
            : game.result === "lost"
            ? "text-red-400"
            : "text-yellow-400";

        const resultIcon =
          game.result === "won" ? "🏆" : game.result === "lost" ? "💀" : "🤝";

        return `
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="${resultColor} font-bold">${resultIcon} ${game.result.toUpperCase()}</span>
                  <span class="text-gray-400 text-sm">${date} at ${time}</span>
                </div>
                <div class="text-white text-lg font-semibold mb-1">
                  ${game.player1_score} - ${game.player2_score}
                </div>
                <div class="text-gray-400 text-sm">
                  Duration: ${duration} • Max Score: ${game.max_score}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500">Game ID</div>
                <div class="text-xs text-gray-400 font-mono">${game.id.substring(
                  0,
                  8
                )}...</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  private setupEventListeners(): void {
    const logoutBtn = this.element.querySelector(
      "#logout-btn"
    ) as HTMLButtonElement;
    logoutBtn.addEventListener("click", () => this.handleLogout());

    const docsBtn = this.element.querySelector(
      "#docs-btn"
    ) as HTMLButtonElement;
    docsBtn?.addEventListener("click", () => {
      navigateToView(ViewType.DOCS);
    });

    const playBtn = this.element.querySelector(
      "#play-btn"
    ) as HTMLButtonElement;
    playBtn?.addEventListener("click", () => {
      navigateToView(ViewType.PLAY_MENU);
    });

    const refreshStatusBtn = this.element.querySelector(
      "#refresh-status-btn"
    ) as HTMLButtonElement;
    refreshStatusBtn?.addEventListener("click", async () => {
      if (this.isLoadingUserData) {
        return;
      }

      refreshStatusBtn.disabled = true;
      refreshStatusBtn.textContent = "Refreshing...";

      await this.refreshUserData();

      refreshStatusBtn.disabled = false;
      refreshStatusBtn.textContent = "Refresh Status";
    });

    const changePasswordBtn = this.element.querySelector(
      "#change-password-btn"
    ) as HTMLButtonElement;
    changePasswordBtn?.addEventListener("click", () =>
      this.handleChangePassword()
    );

    const resendVerificationBtn = this.element.querySelector(
      "#resend-verification-btn"
    ) as HTMLButtonElement;
    resendVerificationBtn?.addEventListener("click", () =>
      this.handleResendVerification()
    );

    const viewGameHistoryBtn = this.element.querySelector(
      "#view-game-history-btn"
    ) as HTMLButtonElement;
    viewGameHistoryBtn?.addEventListener("click", () => {
      this.showGameHistoryModal();
    });

    const closeModalBtn = this.element.querySelector(
      "#close-modal-btn"
    ) as HTMLButtonElement;
    closeModalBtn?.addEventListener("click", () => {
      this.hideGameHistoryModal();
    });

    const modal = this.element.querySelector(
      "#game-history-modal"
    ) as HTMLElement;
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideGameHistoryModal();
      }
    });
  }

  private showGameHistoryModal(): void {
    const modal = this.element.querySelector(
      "#game-history-modal"
    ) as HTMLElement;
    modal.classList.remove("hidden");
  }

  private hideGameHistoryModal(): void {
    const modal = this.element.querySelector(
      "#game-history-modal"
    ) as HTMLElement;
    modal.classList.add("hidden");
  }

  private async handleLogout(): Promise<void> {
    try {
      await authAPI.logout();
      Toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      Toast.error("Logout failed");
    }
  }

  private handleChangePassword(): void {
    Toast.info("Change password feature coming soon!");
  }

  private async handleResendVerification(): Promise<void> {
    try {
      let userEmail = this.user?.email;

      if (!userEmail) {
        const userResponse = await authAPI.getMe();
        userEmail = userResponse.user.email;
        this.user = userResponse.user;
      }

      if (!userEmail) {
        Toast.error("Unable to get user email");
        return;
      }

      const response = await authAPI.resendVerification({ email: userEmail });
      Toast.success(response.message);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send verification email";
      Toast.error(errorMessage);
    }
  }
}

export async function createDashboardPage(): Promise<HTMLElement> {
  const page = new DashboardPage();
  return page.render();
}
