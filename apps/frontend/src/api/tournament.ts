interface TournamentPlayer {
  id: string;
  name: string;
}

interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  score: { player1: number; player2: number } | null;
}

interface SaveTournamentData {
  tournamentId: string;
  name: string;
  winner: TournamentPlayer;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
}

interface TournamentHistoryItem {
  id: string;
  name: string;
  winner_name: string;
  players_count: number;
  created_at: string;
  completed_at: string;
  players: Array<{
    player_name: string;
    position: number;
  }>;
  matches: Array<{
    round: number;
    position: number;
    player1_name: string | null;
    player2_name: string | null;
    winner_name: string | null;
    player1_score: number;
    player2_score: number;
  }>;
}

interface TournamentHistoryResponse {
  tournaments: TournamentHistoryItem[];
  stats: {
    total_tournaments: number;
    tournaments_won: number;
    win_rate: number;
  };
}

class TournamentAPI {
  private baseURL =
    import.meta.env.VITE_API_GAME_URL || "http://localhost:4000";

  constructor() {}

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async saveTournament(
    data: SaveTournamentData
  ): Promise<{ message: string; tournamentId: string }> {
    return this.fetchWithAuth("/tournament/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTournamentHistory(): Promise<TournamentHistoryResponse> {
    return this.fetchWithAuth("/tournaments/history");
  }
}

export const tournamentAPI = new TournamentAPI();
export type {
  SaveTournamentData,
  TournamentHistoryItem,
  TournamentHistoryResponse,
};
