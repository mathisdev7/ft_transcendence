const AUTH_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const GAME_BASE_URL =
  import.meta.env.VITE_GAME_API_BASE_URL || "http://localhost:4000";

export interface ActivityItem {
  id: string;
  type:
    | "login"
    | "profile_update"
    | "password_change"
    | "game_finished"
    | "game_created"
    | "tournament_completed";
  description: string;
  timestamp: string;
  source?: "auth" | "game" | "tournament";
  metadata?: Record<string, any>;
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  total: number;
}

export class ActivityAPI {
  private async request(url: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || error.error || `HTTP ${response.status}`
      );
    }

    return response.json();
  }

  async getAuthActivities(limit: number = 20): Promise<RecentActivityResponse> {
    const response = await this.request(
      `${AUTH_BASE_URL}/auth/activity/recent?limit=${limit}`,
      {
        method: "GET",
      }
    );
    return response;
  }

  async getGameActivities(limit: number = 20): Promise<RecentActivityResponse> {
    const response = await this.request(
      `${GAME_BASE_URL}/activity/recent?limit=${limit}`,
      {
        method: "GET",
      }
    );
    return response;
  }

  async getCombinedActivities(
    limit: number = 20
  ): Promise<RecentActivityResponse> {
    const response = await this.request(
      `${GAME_BASE_URL}/activity/combined?limit=${limit}`,
      {
        method: "GET",
      }
    );
    return response;
  }

  async getAllRecentActivities(
    limit: number = 30
  ): Promise<RecentActivityResponse> {
    try {
      const [authActivities, gameActivities] = await Promise.allSettled([
        this.getAuthActivities(Math.ceil(limit / 2)),
        this.getGameActivities(Math.ceil(limit / 2)),
      ]);

      const allActivities: ActivityItem[] = [];

      if (authActivities.status === "fulfilled") {
        allActivities.push(
          ...authActivities.value.activities.map((activity) => ({
            ...activity,
            source: "auth" as const,
          }))
        );
      }

      if (gameActivities.status === "fulfilled") {
        allActivities.push(
          ...gameActivities.value.activities.map((activity) => ({
            ...activity,
            source: activity.metadata?.source || ("game" as const),
          }))
        );
      }

      allActivities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const limitedActivities = allActivities.slice(0, limit);

      return {
        activities: limitedActivities,
        total: allActivities.length,
      };
    } catch (error) {
      console.error("Failed to fetch combined activities:", error);
      return {
        activities: [],
        total: 0,
      };
    }
  }

  formatActivityDescription(activity: ActivityItem): string {
    switch (activity.type) {
      case "login":
        return `Signed in${
          activity.metadata?.ip_address
            ? ` from ${activity.metadata.ip_address}`
            : ""
        }`;
      case "profile_update":
        return "Updated profile information";
      case "password_change":
        return "Changed password";
      case "game_finished":
        const isWinner = activity.metadata?.isWinner;
        const score = activity.metadata?.score;
        return `${isWinner ? "Won" : "Lost"} game${score ? ` ${score}` : ""}`;
      case "game_created":
        return "Created new game";
      case "tournament_completed":
        const tournamentName = activity.metadata?.name;
        return `Completed tournament${
          tournamentName ? ` "${tournamentName}"` : ""
        }`;
      default:
        return activity.description;
    }
  }

  getActivityIcon(activity: ActivityItem): string {
    switch (activity.type) {
      case "login":
        return "🔐";
      case "profile_update":
        return "👤";
      case "password_change":
        return "🔑";
      case "game_finished":
        return activity.metadata?.isWinner ? "🏆" : "🎮";
      case "game_created":
        return "🎯";
      case "tournament_completed":
        return "🏅";
      default:
        return "📝";
    }
  }

  getActivityColor(activity: ActivityItem): string {
    switch (activity.type) {
      case "login":
        return "text-blue-400";
      case "profile_update":
        return "text-purple-400";
      case "password_change":
        return "text-orange-400";
      case "game_finished":
        return activity.metadata?.isWinner ? "text-green-400" : "text-red-400";
      case "game_created":
        return "text-cyan-400";
      case "tournament_completed":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export const activityAPI = new ActivityAPI();
