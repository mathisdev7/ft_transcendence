import { authAPI } from "../api/auth";
import { tournamentAPI } from "../api/tournament";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

interface Player {
  id: string;
  name: string;
  isCurrentUser?: boolean;
}

interface Match {
  id: string;
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
  score: { player1: number; player2: number } | null;
  round: number;
  position: number;
}

interface Tournament {
  id: string;
  name: string;
  status: "setup" | "in_progress" | "completed";
  players: Player[];
  matches: Match[];
  winner: Player | null;
  currentMatch: Match | null;
}

export class TournamentPage extends BaseComponent {
  private tournament: Tournament | null = null;
  private maxPlayers = 8;
  private eventListenersSetup = false;

  constructor() {
    super("div", "min-h-screen pong-bg-primary pong-text-primary");
  }

  protected init(): void {
    const savedTournament = localStorage.getItem("currentTournament");

    if (savedTournament) {
      try {
        this.tournament = JSON.parse(savedTournament);
      } catch (error) {
        localStorage.removeItem("currentTournament");
      }
    }

    this.renderPage();

    if (!this.eventListenersSetup) {
      this.setupEventListeners();
      this.eventListenersSetup = true;
    }
  }

  private renderPage(): void {
    if (!this.tournament) {
      this.renderTournamentSetup();
    } else if (this.tournament.status === "setup") {
      this.renderPlayerRegistration();
    } else if (this.tournament.status === "in_progress") {
      this.renderTournamentBracket();
    } else {
      this.renderTournamentComplete();
    }
  }

  private renderTournamentSetup(): void {
    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - Tournament Setup</h1>
            </div>
            <button id="back-to-dashboard" class="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Create New Tournament</h2>
          <p class="text-muted-foreground text-lg">Set up a Pong tournament with up to ${this.maxPlayers} players</p>
        </div>

        <div class="card mx-auto">
          <div class="card-content">
            <form id="tournament-form" class="space-y-8">
              <div>
                <label for="tournament-name" class="block text-sm font-medium text-foreground mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  id="tournament-name"
                  class="w-full px-5 py-4 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter tournament name"
                  required
                >
              </div>

              <div>
                <label for="max-players" class="block text-sm font-medium text-foreground mb-2">
                  Maximum Players
                </label>
                <select
                  id="max-players"
                  class="w-full px-5 py-4 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="4">4 Players</option>
                  <option value="8" selected>8 Players</option>
                  <option value="16">16 Players</option>
                </select>
              </div>

              <div class="card bg-muted">
                <div class="card-header">
                  <h3 class="card-title">🏆 Tournament Rules</h3>
                </div>
                <div class="card-content">
                  <ul class="text-sm text-muted-foreground space-y-2">
                    <li class="flex items-center"><span class="text-success mr-3">✓</span>Single elimination bracket</li>
                    <li class="flex items-center"><span class="text-success mr-3">✓</span>Each match is first to 11 points</li>
                    <li class="flex items-center"><span class="text-success mr-3">✓</span>Must win by 2 points</li>
                    <li class="flex items-center"><span class="text-primary mr-3">•</span>Players will be randomly seeded</li>
                    <li class="flex items-center"><span class="text-primary mr-3">•</span>All matches are played locally</li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                class="w-full btn btn-primary font-semibold text-lg"
              >
                Create Tournament
              </button>
            </form>
          </div>
        </div>
      </main>
    `;
  }

  private renderPlayerRegistration(): void {
    const tournament = this.tournament!;
    const remainingSlots = this.maxPlayers - tournament.players.length;

    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - ${
                tournament.name
              }</h1>
            </div>
            <button id="cancel-tournament" class="btn btn-destructive btn-sm">
              Cancel Tournament
            </button>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Player Registration</h2>
          <p class="text-muted-foreground text-lg">${
            tournament.players.length
          }/${this.maxPlayers} players registered</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Add Player</h3>
            </div>
            <div class="card-content">
              ${
                remainingSlots > 0
                  ? `
                <form id="add-player-form" class="space-y-4">
                  <div>
                    <label for="player-name" class="block text-sm font-medium text-foreground mb-2">
                      Player Name
                    </label>
                    <input
                      type="text"
                      id="player-name"
                      class="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter player name"
                      required
                    >
                  </div>
                  <button
                    type="submit"
                    class="w-full btn btn-success font-semibold"
                  >
                    Add Player
                  </button>
                </form>
              `
                  : `
                <div class="text-center py-8">
                  <div class="text-4xl sm:text-6xl mb-4">🏆</div>
                  <p class="text-lg font-semibold text-foreground">Tournament is full!</p>
                  <p class="text-muted-foreground">All ${this.maxPlayers} slots are filled.</p>
                </div>
              `
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Registered Players</h3>
            </div>
            <div class="card-content">
              <div id="players-list" class="space-y-3">
                ${
                  tournament.players.length === 0
                    ? `
                  <div class="text-center py-8">
                    <div class="text-4xl sm:text-6xl mb-4">👥</div>
                    <p class="text-muted-foreground">No players registered yet</p>
                  </div>
                `
                    : tournament.players
                        .map(
                          (player, index) => `
                  <div class="flex items-center justify-between card bg-muted p-3 sm:p-4">
                    <div class="flex items-center space-x-3">
                      <div class="w-8 h-8 sm:w-10 sm:h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        ${index + 1}
                      </div>
                      <div class="flex flex-col">
                        <span class="font-medium text-foreground text-sm sm:text-base">${
                          player.name
                        }</span>
                        ${
                          player.isCurrentUser
                            ? '<span class="text-xs text-primary px-2 py-1 rounded bg-primary/10">You</span>'
                            : ""
                        }
                      </div>
                    </div>
                    <button
                      class="remove-player-btn btn btn-ghost btn-sm text-destructive hover:text-destructive"
                      data-player-id="${player.id}"
                    >
                      Remove
                    </button>
                  </div>
                `
                        )
                        .join("")
                }
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <button
            id="start-tournament"
            class="btn btn-primary font-semibold text-lg ${
              tournament.players.length < 2
                ? "opacity-50 cursor-not-allowed"
                : ""
            }"
            ${tournament.players.length < 2 ? "disabled" : ""}
          >
            Start Tournament (${tournament.players.length} players)
          </button>
          <p class="text-muted-foreground mt-2">
            ${
              tournament.players.length < 2
                ? "Need at least 2 players to start"
                : "Ready to begin!"
            }
          </p>
        </div>
      </main>
    `;
  }

  private renderTournamentBracket(): void {
    const tournament = this.tournament!;

    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - ${
                tournament.name
              }</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-muted-foreground">Tournament in Progress</span>
              <button id="back-to-dashboard" class="btn btn-secondary btn-sm">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Tournament Bracket</h2>
          <p class="text-muted-foreground text-lg">${
            tournament.players.length
          } players competing</p>
        </div>

        ${this.renderBracket()}

        ${
          tournament.currentMatch
            ? `
          <div class="card mt-8">
            <div class="card-header">
              <h3 class="card-title text-center">Current Match</h3>
            </div>
            <div class="card-content">
              <div class="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
                <div class="text-center flex-1">
                  <div class="text-xl font-bold text-foreground">${
                    tournament.currentMatch.player1?.name || "TBD"
                  }</div>
                  <div class="text-muted-foreground">Player 1</div>
                </div>
                <div class="text-center px-8">
                  <div class="text-2xl font-bold text-foreground">VS</div>
                  <div class="text-sm text-muted-foreground">Round ${
                    tournament.currentMatch.round
                  }</div>
                </div>
                <div class="text-center flex-1">
                  <div class="text-xl font-bold text-foreground">${
                    tournament.currentMatch.player2?.name || "TBD"
                  }</div>
                  <div class="text-muted-foreground">Player 2</div>
                </div>
              </div>
              <div class="text-center mt-6">
                <button id="play-match" class="btn btn-success font-semibold text-lg">
                  🎮 Play Match
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </main>
    `;
  }

  private renderTournamentComplete(): void {
    const tournament = this.tournament!;

    this.element.innerHTML = `
      <nav class="navbar sticky top-0 z-50">
        <div class="container-responsive">
          <div class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div class="flex items-center mb-4 sm:mb-0">
              <h1 class="text-foreground text-xl sm:text-2xl font-bold">TRANSCENDENCE - ${
                tournament.name
              }</h1>
            </div>
            <button id="back-to-dashboard" class="btn btn-secondary btn-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-6 sm:py-8">
        <div class="mb-8">
          <h2 class="text-3xl sm:text-4xl font-bold text-foreground mb-2">Tournament Complete</h2>
          <p class="text-muted-foreground text-lg">Congratulations to our champion!</p>
        </div>

        <div class="card mb-8">
          <div class="card-content">
            <div class="text-center py-8">
              <div class="text-6xl mb-4">🎉</div>
              <h2 class="text-3xl font-bold text-warning mb-4">Tournament Champion!</h2>
              <div class="text-2xl font-bold text-foreground mb-2">${
                tournament.winner?.name
              }</div>
              <p class="text-muted-foreground">Congratulations on winning the tournament!</p>
            </div>
          </div>
        </div>

        ${this.renderBracket()}

        <div class="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          <button id="new-tournament" class="btn btn-primary font-semibold">
            Start New Tournament
          </button>
          <button id="back-to-dashboard" class="btn btn-secondary font-semibold">
            Back to Dashboard
          </button>
        </div>
      </main>
    `;
  }

  private renderBracket(): string {
    const tournament = this.tournament!;
    const rounds = this.organizeBracket(tournament.matches);

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Tournament Bracket</h3>
        </div>
        <div class="card-content">
          <div class="overflow-x-auto">
            <div class="flex space-x-8 min-w-max">
              ${rounds
                .map(
                  (round, roundIndex) => `
                <div class="round">
                  <h4 class="text-center font-semibold mb-4 text-foreground">
                    ${this.getRoundName(roundIndex, rounds.length)}
                  </h4>
                  <div class="space-y-4">
                    ${round
                      .map(
                        (match) => `
                      <div class="match card bg-muted min-w-48">
                        <div class="card-content p-3">
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <span class="text-sm ${
                                match.winner?.id === match.player1?.id
                                  ? "text-success font-bold"
                                  : "text-foreground"
                              }">
                                ${match.player1?.name || "TBD"}
                              </span>
                              <span class="text-xs text-muted-foreground">
                                ${match.score ? match.score.player1 : "-"}
                              </span>
                            </div>
                            <div class="flex items-center justify-between">
                              <span class="text-sm ${
                                match.winner?.id === match.player2?.id
                                  ? "text-success font-bold"
                                  : "text-foreground"
                              }">
                                ${match.player2?.name || "TBD"}
                              </span>
                              <span class="text-xs text-muted-foreground">
                                ${match.score ? match.score.player2 : "-"}
                              </span>
                            </div>
                          </div>
                          ${
                            match === tournament.currentMatch
                              ? `
                            <div class="text-center mt-2">
                              <span class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">CURRENT</span>
                            </div>
                          `
                              : ""
                          }
                        </div>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private organizeBracket(matches: Match[]): Match[][] {
    const rounds: Match[][] = [];
    const maxRound = Math.max(...matches.map((m) => m.round));

    for (let i = 1; i <= maxRound; i++) {
      const roundMatches = matches
        .filter((m) => m.round === i)
        .sort((a, b) => a.position - b.position);
      rounds.push(roundMatches);
    }

    return rounds;
  }

  private getRoundName(roundIndex: number, totalRounds: number): string {
    if (roundIndex === totalRounds - 1) return "Final";
    if (roundIndex === totalRounds - 2) return "Semifinal";
    if (roundIndex === totalRounds - 3) return "Quarterfinal";
    return `Round ${roundIndex + 1}`;
  }

  private setupEventListeners(): void {
    this.element.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.id === "back-to-dashboard") {
        this.goBackToDashboard();
      } else if (target.id === "cancel-tournament") {
        this.cancelTournament();
      } else if (target.id === "start-tournament") {
        this.startTournament();
      } else if (target.id === "play-match") {
        this.playCurrentMatch();
      } else if (target.id === "new-tournament") {
        this.startNewTournament();
      } else if (target.classList.contains("remove-player-btn")) {
        const playerId = target.getAttribute("data-player-id");
        if (playerId) this.removePlayer(playerId);
      }
    });

    this.element.addEventListener("submit", (e) => {
      const target = e.target as HTMLFormElement;

      if (target.id === "tournament-form") {
        e.preventDefault();
        this.createTournament();
      } else if (target.id === "add-player-form") {
        e.preventDefault();
        this.addPlayer();
      }
    });
  }

  private createTournament(): void {
    const nameInput = this.element.querySelector(
      "#tournament-name"
    ) as HTMLInputElement;
    const maxPlayersSelect = this.element.querySelector(
      "#max-players"
    ) as HTMLSelectElement;

    const name = nameInput.value.trim();
    this.maxPlayers = parseInt(maxPlayersSelect.value);

    if (!name) {
      Toast.error("Please enter a tournament name");
      return;
    }

    const players: Player[] = [];
    if (authAPI.isAuthenticated()) {
      const currentUser = authAPI.getCurrentUser();
      if (currentUser) {
        players.push({
          id: currentUser.id.toString(),
          name: currentUser.display_name,
          isCurrentUser: true,
        });
      }
    }

    this.tournament = {
      id: this.generateId(),
      name,
      status: "setup",
      players,
      matches: [],
      winner: null,
      currentMatch: null,
    };

    this.saveTournament();
    this.renderPage();
    Toast.success("Tournament created! Add players to begin.");
  }

  private addPlayer(): void {
    const nameInput = this.element.querySelector(
      "#player-name"
    ) as HTMLInputElement;
    const name = nameInput.value.trim();

    if (!name) {
      Toast.error("Please enter a player name");
      return;
    }

    if (!this.tournament) return;

    if (this.tournament.players.length >= this.maxPlayers) {
      Toast.error("Tournament is full");
      return;
    }

    if (
      this.tournament.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      Toast.error("Player name already exists");
      return;
    }

    this.tournament.players.push({
      id: this.generateId(),
      name,
      isCurrentUser: false,
    });

    nameInput.value = "";
    this.saveTournament();
    this.renderPage();
    Toast.success(`${name} added to tournament`);
  }

  private removePlayer(playerId: string): void {
    if (!this.tournament) return;

    const playerIndex = this.tournament.players.findIndex(
      (p) => p.id === playerId
    );
    if (playerIndex === -1) return;

    const playerName = this.tournament.players[playerIndex].name;
    this.tournament.players.splice(playerIndex, 1);

    this.saveTournament();
    this.renderPage();
    Toast.success(`${playerName} removed from tournament`);
  }

  private startTournament(): void {
    if (!this.tournament || this.tournament.players.length < 2) {
      Toast.error("Need at least 2 players to start tournament");
      return;
    }

    if (this.tournament.players.length % 2 !== 0) {
      Toast.error(
        "Tournament requires an even number of players. Please add or remove one player."
      );
      return;
    }

    const shuffledPlayers = [...this.tournament.players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [
        shuffledPlayers[j],
        shuffledPlayers[i],
      ];
    }

    const matches = this.createBracket(shuffledPlayers);

    this.tournament.status = "in_progress";
    this.tournament.matches = matches;

    this.tournament.currentMatch =
      matches.find((m) => m.round === 1 && m.player1 && m.player2) || null;

    this.saveTournament();
    this.renderPage();
    Toast.success("Tournament started! Good luck to all players.");
  }

  private createBracket(players: Player[]): Match[] {
    const matches: Match[] = [];
    let matchId = 1;

    const totalRounds = Math.ceil(Math.log2(players.length));

    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        id: (matchId++).toString(),
        player1: players[i],
        player2: players[i + 1],
        winner: null,
        score: null,
        round: 1,
        position: Math.floor(i / 2),
      });
    }

    for (let round = 2; round <= totalRounds; round++) {
      const prevRoundMatches = matches.filter((m) => m.round === round - 1);
      for (let i = 0; i < prevRoundMatches.length; i += 2) {
        matches.push({
          id: (matchId++).toString(),
          player1: null,
          player2: null,
          winner: null,
          score: null,
          round,
          position: Math.floor(i / 2),
        });
      }
    }

    return matches;
  }

  private playCurrentMatch(): void {
    if (!this.tournament?.currentMatch) {
      const savedTournament = localStorage.getItem("currentTournament");
      if (savedTournament) {
        try {
          this.tournament = JSON.parse(savedTournament);

          if (this.tournament?.currentMatch) {
            const match = this.tournament.currentMatch;

            if (!match.player1 || !match.player2) {
              Toast.error("Match is not ready - missing players");
              return;
            }

            const matchData = {
              tournamentId: this.tournament.id,
              matchId: match.id,
              player1: match.player1,
              player2: match.player2,
            };

            sessionStorage.setItem(
              "tournamentMatch",
              JSON.stringify(matchData)
            );

            Toast.success(
              `Starting match: ${match.player1.name} vs ${match.player2.name}`
            );

            try {
              navigateToView(ViewType.TOURNAMENT_GAME);
            } catch (error) {
              Toast.error("Failed to start match - " + error);
            }
            return;
          }
        } catch (error) {
          Toast.error("Failed to start match - " + error);
        }
      }

      Toast.error("No current match found");
      return;
    }

    const match = this.tournament.currentMatch;

    if (!match.player1 || !match.player2) {
      Toast.error("Match is not ready - missing players");
      return;
    }

    const matchData = {
      tournamentId: this.tournament.id,
      matchId: match.id,
      player1: match.player1,
      player2: match.player2,
    };

    sessionStorage.setItem("tournamentMatch", JSON.stringify(matchData));

    Toast.success(
      `Starting match: ${match.player1.name} vs ${match.player2.name}`
    );

    try {
      navigateToView(ViewType.TOURNAMENT_GAME);
    } catch (error) {
      Toast.error("Failed to start match - " + error);
    }
  }

  private cancelTournament(): void {
    if (
      confirm(
        "Are you sure you want to cancel this tournament? All progress will be lost."
      )
    ) {
      this.tournament = null;
      localStorage.removeItem("currentTournament");
      this.renderPage();
      Toast.info("Tournament cancelled");
    }
  }

  private startNewTournament(): void {
    this.tournament = null;
    localStorage.removeItem("currentTournament");
    this.renderPage();
  }

  private goBackToDashboard(): void {
    navigateToView(ViewType.DASHBOARD);
  }

  private saveTournament(): void {
    if (this.tournament) {
      localStorage.setItem(
        "currentTournament",
        JSON.stringify(this.tournament)
      );
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public static completeMatch(
    matchId: string,
    winner: Player,
    score: { player1: number; player2: number }
  ): void {
    const savedTournament = localStorage.getItem("currentTournament");
    if (!savedTournament) {
      return;
    }

    try {
      const tournament: Tournament = JSON.parse(savedTournament);

      const match = tournament.matches.find((m) => m.id === matchId);
      if (!match) {
        return;
      }

      match.winner = winner;
      match.score = score;

      const nextRoundMatch = tournament.matches.find(
        (m) =>
          m.round === match.round + 1 &&
          Math.floor(match.position / 2) === m.position
      );

      if (nextRoundMatch) {
        if (match.position % 2 === 0) {
          nextRoundMatch.player1 = winner;
        } else {
          nextRoundMatch.player2 = winner;
        }
      }

      tournament.currentMatch =
        tournament.matches.find((m) => !m.winner && m.player1 && m.player2) ||
        null;

      if (!tournament.currentMatch) {
        const finalMatch = tournament.matches.find(
          (m) => m.round === Math.max(...tournament.matches.map((m) => m.round))
        );
        if (finalMatch?.winner) {
          tournament.status = "completed";
          tournament.winner = finalMatch.winner;

          TournamentPage.saveTournamentResults(tournament);
        }
      }

      localStorage.setItem("currentTournament", JSON.stringify(tournament));
    } catch (error) {
      Toast.error("Failed to complete match - " + error);
    }
  }

  private static async saveTournamentResults(
    tournament: Tournament
  ): Promise<void> {
    try {
      if (!tournament.winner) {
        return;
      }

      const tournamentData = {
        tournamentId: tournament.id,
        name: tournament.name,
        winner: tournament.winner,
        players: tournament.players,
        matches: tournament.matches,
      };

      await tournamentAPI.saveTournament(tournamentData);
      Toast.success("Tournament results saved!");
    } catch (error) {
      Toast.error("Failed to save tournament results to database");
    }
  }
}

export async function createTournamentPage(): Promise<HTMLElement> {
  const page = new TournamentPage();
  return page.render();
}
