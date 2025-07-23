import { authAPI, type User } from "../api/auth";
import {
  gameAPI,
  type GameHistoryItem,
  type GameHistoryResponse,
} from "../api/game";
import {
  tournamentAPI,
  type TournamentHistoryItem,
  type TournamentHistoryResponse,
} from "../api/tournament";
import { BaseComponent } from "../components/BaseComponent";
import { FriendsWidget } from "../components/FriendsWidget";
import { RecentActivityWidget } from "../components/RecentActivityWidget";
import { Toast } from "../components/Toast";
import { userSearchModal } from "../components/UserSearchModal";
import { navigateToView, ViewType } from "../utils/navigation";

export class DashboardPage extends BaseComponent {
  private user: User | null = null;
  private isLoadingUserData = false;
  private eventListenersSetup = false;
  private gameHistory: GameHistoryResponse | null = null;
  private isLoadingGameHistory = false;
  private tournamentHistory: TournamentHistoryResponse | null = null;
  private isLoadingTournamentHistory = false;
  private recentActivityWidget: RecentActivityWidget;
  private friendsWidget: FriendsWidget;

  constructor() {
    super("div", "min-h-screen bg-background");
    this.recentActivityWidget = new RecentActivityWidget();
    this.friendsWidget = new FriendsWidget();
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
    await this.loadTournamentHistory();
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

  private async loadTournamentHistory(): Promise<void> {
    if (this.isLoadingTournamentHistory) {
      return;
    }

    this.isLoadingTournamentHistory = true;

    try {
      this.tournamentHistory = await tournamentAPI.getTournamentHistory();
    } catch (error) {
      console.error("Failed to load tournament history:", error);
      this.tournamentHistory = {
        tournaments: [],
        stats: {
          total_tournaments: 0,
          tournaments_won: 0,
          win_rate: 0,
        },
      };
    } finally {
      this.isLoadingTournamentHistory = false;
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
      await this.loadTournamentHistory();
      this.renderPage();
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    } finally {
      this.isLoadingUserData = false;
    }
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <nav class="navbar">
        <div class="container-responsive">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-foreground text-xl font-bold">Dashboard</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button id="search-users-btn" class="btn btn-ghost">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Search Users
              </button>
              <div class="dropdown">
                <button id="user-menu-btn" class="btn btn-ghost flex items-center space-x-2">
                  <img
                    src="${
                      this.user?.avatar_url ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(this.user?.display_name || "User") +
                        "&background=random&color=fff&size=32"
                    }"
                    alt="Avatar"
                    class="w-8 h-8 rounded-full"
                  />
                  <span class="text-sm font-medium">${
                    this.user?.display_name || "User"
                  }</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div id="user-menu" class="dropdown-menu hidden">
                  <a href="#" id="view-profile-btn" class="dropdown-item">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    My Profile
                  </a>
                  <a href="#" id="edit-profile-btn" class="dropdown-item">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit Profile
                  </a>
                  <div class="dropdown-divider"></div>
                  <a href="#" id="logout-btn" class="dropdown-item">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Sign Out
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      ${this.renderMainContent()}
    `;

    if (!document.querySelector(".user-search-modal")) {
      const modalElement = userSearchModal.render();
      modalElement.classList.add("user-search-modal");
      document.body.appendChild(modalElement);
    }

    const friendsContainer = this.element.querySelector(
      "#friends-widget-container"
    );
    if (friendsContainer) {
      friendsContainer.appendChild(this.friendsWidget.render());
    }

    const activityContainer = this.element.querySelector(
      "#recent-activity-container"
    );
    if (activityContainer) {
      activityContainer.appendChild(this.recentActivityWidget.render());
    }

    this.setupEventListeners();
  }

  private renderMainContent(): string {
    return `
      <main class="container-responsive py-8">
        ${this.renderWelcomeSection()}
        ${this.renderQuickActions()}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div class="lg:col-span-2">
            ${this.renderGameStats()}
            ${this.renderTournamentStats()}
          </div>
          <div class="lg:col-span-1 space-y-6">
            <div id="friends-widget-container"></div>
            <div id="recent-activity-container"></div>
          </div>
        </div>

        ${this.renderModals()}
      </main>
    `;
  }

  private renderWelcomeSection(): string {
    return `
      <div class="mb-8">
        <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Dashboard</h2>
        <p class="text-muted-foreground text-lg">Manage your gaming experience</p>
      </div>
    `;
  }

  private renderQuickActions(): string {
    return `
      <div class="card mb-8">
        <div class="card-content">
          <div class="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            <div class="text-center lg:text-left">
              <h3 class="text-2xl sm:text-3xl font-bold text-foreground mb-3">🏓 Ready to Play Pong?</h3>
              <p class="text-muted-foreground text-base sm:text-lg">Challenge other players online or compete in tournaments</p>
            </div>
            <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 w-full lg:w-auto">
              <button id="play-btn" class="btn btn-primary btn-lg font-bold">
                🎮 Play Now
              </button>
              <button id="tournament-btn" class="btn btn-success btn-lg font-bold">
                🏆 Tournament
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGameStats(): string {
    const stats = this.gameHistory?.stats || {
      total_games: 0,
      games_won: 0,
      games_lost: 0,
      win_rate: 0,
    };

    return `
      <div class="card mb-8">
        <div class="card-header">
          <h3 class="card-title">🎮 Game Statistics</h3>
        </div>
        <div class="card-content">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-2xl sm:text-3xl font-bold text-foreground mb-1">${stats.total_games}</div>
                <div class="text-xs sm:text-sm text-muted-foreground">Games Played</div>
              </div>
            </div>
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-2xl sm:text-3xl font-bold text-success mb-1">${stats.games_won}</div>
                <div class="text-xs sm:text-sm text-muted-foreground">Games Won</div>
              </div>
            </div>
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-2xl sm:text-3xl font-bold text-destructive mb-1">${stats.games_lost}</div>
                <div class="text-xs sm:text-sm text-muted-foreground">Games Lost</div>
              </div>
            </div>
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-2xl sm:text-3xl font-bold text-foreground mb-1">${stats.win_rate}%</div>
                <div class="text-xs sm:text-sm text-muted-foreground">Win Rate</div>
              </div>
            </div>
          </div>
          <button id="view-game-history-btn" class="btn btn-primary w-full">
            📊 View Game History
          </button>
        </div>
      </div>
    `;
  }

  private renderTournamentStats(): string {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 Tournament Statistics</h3>
        </div>
        <div class="card-content">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-3xl sm:text-4xl font-bold text-foreground mb-2">${
                  this.tournamentHistory?.stats.total_tournaments || 0
                }</div>
                <div class="text-sm text-muted-foreground">Tournaments Played</div>
              </div>
            </div>
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-3xl sm:text-4xl font-bold text-warning mb-2">${
                  this.tournamentHistory?.stats.tournaments_won || 0
                }</div>
                <div class="text-sm text-muted-foreground">Tournaments Won</div>
              </div>
            </div>
            <div class="card">
              <div class="card-content p-4 text-center">
                <div class="text-3xl sm:text-4xl font-bold text-foreground mb-2">${
                  this.tournamentHistory?.stats.win_rate || 0
                }%</div>
                <div class="text-sm text-muted-foreground">Tournament Win Rate</div>
              </div>
            </div>
          </div>
          <button id="view-tournament-history-btn" class="btn btn-success w-full text-lg font-semibold">
            🏆 View Tournament History
          </button>
        </div>
      </div>
    `;
  }

  private renderModals(): string {
    return `
      <div id="game-history-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden p-4">
        <div class="card w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div class="card-header flex-row justify-between items-center">
            <h3 class="card-title">📊 Game History</h3>
            <button id="close-modal-btn" class="btn btn-ghost btn-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-96 px-6 pb-6">
            <div id="game-history-content">
              ${this.renderGameHistory()}
            </div>
          </div>
        </div>
      </div>


      <div id="tournament-history-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden p-4">
        <div class="card w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div class="card-header flex-row justify-between items-center">
            <h3 class="card-title">🏆 Tournament History</h3>
            <button id="close-tournament-modal-btn" class="btn btn-ghost btn-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-96 px-6 pb-6">
            <div id="tournament-history-content">
              ${this.renderTournamentHistory()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGameHistory(): string {
    if (!this.gameHistory || this.gameHistory.games.length === 0) {
      return '<div class="text-center text-muted-foreground py-8 text-sm sm:text-base">No games played yet. Start playing to see your history!</div>';
    }

    return this.gameHistory.games
      .map((game: GameHistoryItem) => {
        const date = new Date(game.finished_at).toLocaleDateString();
        const time = new Date(game.finished_at).toLocaleTimeString();
        const duration = this.formatDuration(game.game_duration);

        const resultColor =
          game.result === "won"
            ? "text-success"
            : game.result === "lost"
            ? "text-destructive"
            : "text-warning";

        const resultIcon =
          game.result === "won" ? "🏆" : game.result === "lost" ? "💀" : "🤝";

        return `
          <div class="card mb-3">
            <div class="card-content">
              <div class="flex flex-col sm:flex-row justify-between items-start space-y-3 sm:space-y-0">
                <div class="flex-1 w-full sm:w-auto">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
                    <span class="${resultColor} font-bold text-sm sm:text-base">${resultIcon} ${game.result.toUpperCase()}</span>
                    <span class="text-muted-foreground text-xs sm:text-sm">${date} at ${time}</span>
                  </div>
                  <div class="text-foreground text-lg sm:text-xl font-semibold mb-1">
                    ${game.player1_score} - ${game.player2_score}
                  </div>
                  <div class="text-muted-foreground text-xs sm:text-sm">
                    Duration: ${duration} • Max Score: ${game.max_score}
                  </div>
                </div>
                <div class="text-left sm:text-right">
                  <div class="text-xs text-muted-foreground">Game ID</div>
                  <div class="text-xs text-muted-foreground font-mono">${game.id.substring(
                    0,
                    8
                  )}...</div>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  private renderTournamentHistory(): string {
    if (
      !this.tournamentHistory ||
      this.tournamentHistory.tournaments.length === 0
    ) {
      return '<div class="text-center text-muted-foreground py-8 text-sm sm:text-base">No tournaments played yet. Start playing to see your history!</div>';
    }

    return this.tournamentHistory.tournaments
      .map((tournament: TournamentHistoryItem) => {
        const date = new Date(tournament.completed_at).toLocaleDateString();
        const time = new Date(tournament.completed_at).toLocaleTimeString();

        const currentUser = this.user;
        const isWinner =
          currentUser && tournament.winner_name === currentUser.display_name;

        const resultColor = isWinner ? "text-warning" : "text-muted-foreground";
        const resultIcon = isWinner ? "🏆" : "🥈";
        const resultText = isWinner ? "WON" : "PARTICIPATED";

        return `
          <div class="card mb-4">
            <div class="card-content">
              <div class="flex flex-col sm:flex-row justify-between items-start mb-4 space-y-3 sm:space-y-0">
                <div class="flex-1 w-full sm:w-auto">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
                    <span class="${resultColor} font-bold text-sm sm:text-base">${resultIcon} ${resultText}</span>
                    <span class="text-muted-foreground text-xs sm:text-sm">${date} at ${time}</span>
                  </div>
                  <div class="text-foreground text-lg sm:text-xl font-semibold mb-1">
                    ${tournament.name}
                  </div>
                  <div class="text-muted-foreground text-xs sm:text-sm mb-2">
                    Winner: <span class="text-warning">${
                      tournament.winner_name
                    }</span> • ${tournament.players_count} players
                  </div>
                </div>
                <div class="text-left sm:text-right">
                  <div class="text-xs text-muted-foreground">Tournament ID</div>
                  <div class="text-xs text-muted-foreground font-mono">${tournament.id.substring(
                    0,
                    8
                  )}...</div>
                </div>
              </div>


              <div class="card bg-muted">
                <div class="card-content">
                  <div class="text-sm font-semibold text-foreground mb-3">Tournament Bracket:</div>
                  <div class="grid gap-2">
                    ${tournament.matches
                      .filter((match) => match.winner_name)
                      .sort(
                        (a, b) => a.round - b.round || a.position - b.position
                      )
                      .map((match) => {
                        const roundName = this.getRoundName(
                          match.round,
                          tournament.matches
                        );
                        return `
                          <div class="card bg-secondary">
                            <div class="card-content p-3">
                              <div class="text-muted-foreground font-semibold mb-1 text-xs">${roundName}</div>
                              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
                                <span class="${
                                  match.winner_name === match.player1_name
                                    ? "text-success font-bold"
                                    : "text-muted-foreground"
                                }">
                                  ${match.player1_name || "TBD"}
                                </span>
                                <span class="text-muted-foreground mx-0 sm:mx-2 text-center">${
                                  match.player1_score
                                } - ${match.player2_score}</span>
                                <span class="${
                                  match.winner_name === match.player2_name
                                    ? "text-success font-bold"
                                    : "text-muted-foreground"
                                }">
                                  ${match.player2_name || "TBD"}
                                </span>
                              </div>
                            </div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  private getRoundName(round: number, matches: any[]): string {
    const maxRound = Math.max(...matches.map((m) => m.round));
    if (round === maxRound) return "Final";
    if (round === maxRound - 1) return "Semifinal";
    if (round === maxRound - 2) return "Quarterfinal";
    return `Round ${round}`;
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  private setupEventListeners(): void {
    if (this.eventListenersSetup) return;
    this.eventListenersSetup = true;

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

    const tournamentBtn = this.element.querySelector(
      "#tournament-btn"
    ) as HTMLButtonElement;
    tournamentBtn?.addEventListener("click", () => {
      navigateToView(ViewType.TOURNAMENT);
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

    const viewTournamentHistoryBtn = this.element.querySelector(
      "#view-tournament-history-btn"
    ) as HTMLButtonElement;
    viewTournamentHistoryBtn?.addEventListener("click", () => {
      this.showTournamentHistoryModal();
    });

    const closeModalBtn = this.element.querySelector(
      "#close-modal-btn"
    ) as HTMLButtonElement;
    closeModalBtn?.addEventListener("click", () => {
      this.hideGameHistoryModal();
    });

    const closeTournamentModalBtn = this.element.querySelector(
      "#close-tournament-modal-btn"
    ) as HTMLButtonElement;
    closeTournamentModalBtn?.addEventListener("click", () => {
      this.hideTournamentHistoryModal();
    });

    const modal = this.element.querySelector(
      "#game-history-modal"
    ) as HTMLElement;
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideGameHistoryModal();
      }
    });

    const tournamentModal = this.element.querySelector(
      "#tournament-history-modal"
    ) as HTMLElement;
    tournamentModal?.addEventListener("click", (e) => {
      if (e.target === tournamentModal) {
        this.hideTournamentHistoryModal();
      }
    });

    this.setupQuickActionButtons();
    this.setupModals();
    this.setupUserMenu();
  }

  private setupQuickActionButtons(): void {
    const playBtn = this.element.querySelector(
      "#play-btn"
    ) as HTMLButtonElement;
    playBtn?.addEventListener("click", () => {
      navigateToView(ViewType.PLAY_MENU);
    });

    const tournamentBtn = this.element.querySelector(
      "#tournament-btn"
    ) as HTMLButtonElement;
    tournamentBtn?.addEventListener("click", () => {
      navigateToView(ViewType.TOURNAMENT);
    });
  }

  private setupModals(): void {
    const viewGameHistoryBtn = this.element.querySelector(
      "#view-game-history-btn"
    ) as HTMLButtonElement;
    viewGameHistoryBtn?.addEventListener("click", () => {
      this.showGameHistoryModal();
    });

    const viewTournamentHistoryBtn = this.element.querySelector(
      "#view-tournament-history-btn"
    ) as HTMLButtonElement;
    viewTournamentHistoryBtn?.addEventListener("click", () => {
      this.showTournamentHistoryModal();
    });

    const closeModalBtn = this.element.querySelector(
      "#close-modal-btn"
    ) as HTMLButtonElement;
    closeModalBtn?.addEventListener("click", () => {
      this.hideGameHistoryModal();
    });

    const closeTournamentModalBtn = this.element.querySelector(
      "#close-tournament-modal-btn"
    ) as HTMLButtonElement;
    closeTournamentModalBtn?.addEventListener("click", () => {
      this.hideTournamentHistoryModal();
    });

    const modal = this.element.querySelector(
      "#game-history-modal"
    ) as HTMLElement;
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideGameHistoryModal();
      }
    });

    const tournamentModal = this.element.querySelector(
      "#tournament-history-modal"
    ) as HTMLElement;
    tournamentModal?.addEventListener("click", (e) => {
      if (e.target === tournamentModal) {
        this.hideTournamentHistoryModal();
      }
    });
  }

  private setupUserMenu(): void {
    const userMenuBtn = this.element.querySelector(
      "#user-menu-btn"
    ) as HTMLButtonElement;
    const userMenu = this.element.querySelector("#user-menu") as HTMLElement;
    const searchUsersBtn = this.element.querySelector(
      "#search-users-btn"
    ) as HTMLButtonElement;
    const viewProfileBtn = this.element.querySelector(
      "#view-profile-btn"
    ) as HTMLAnchorElement;
    const editProfileBtn = this.element.querySelector(
      "#edit-profile-btn"
    ) as HTMLAnchorElement;
    const logoutBtn = this.element.querySelector(
      "#logout-btn"
    ) as HTMLAnchorElement;

    if (userMenuBtn && userMenu) {
      userMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.toggle("hidden");
      });

      document.addEventListener("click", () => {
        userMenu.classList.add("hidden");
      });
    }

    if (searchUsersBtn) {
      searchUsersBtn.addEventListener("click", () => {
        userSearchModal.open();
      });
    }

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.user) {
          window.location.hash = `#/profile/${this.user.id}`;
          window.dispatchEvent(new CustomEvent("hashchange"));
        }
      });
    }

    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        navigateToView(ViewType.PROFILE_EDIT);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }
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

  private showTournamentHistoryModal(): void {
    const modal = this.element.querySelector(
      "#tournament-history-modal"
    ) as HTMLElement;
    modal.classList.remove("hidden");
  }

  private hideTournamentHistoryModal(): void {
    const modal = this.element.querySelector(
      "#tournament-history-modal"
    ) as HTMLElement;
    modal.classList.add("hidden");
  }

  private handleLogout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("auth:logout"));
    Toast.success("Successfully signed out");
    navigateToView(ViewType.LOGIN);
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
