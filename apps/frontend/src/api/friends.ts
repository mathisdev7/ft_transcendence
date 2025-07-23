const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface Friend {
  id: number;
  user_id: number;
  friend_id: number;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
  friend_info: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_online: boolean;
    last_seen: string;
  };
}

export interface FriendRequest {
  id: number;
  from_user_id: number;
  to_user_id: number;
  status: "pending";
  created_at: string;
  from_user_info: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface FriendsResponse {
  friends: Friend[];
}

export interface FriendRequestsResponse {
  requests: FriendRequest[];
}

export interface FriendshipStatusResponse {
  status: string | null;
}

class FriendsAPI {
  private presenceSocket: WebSocket | null = null;
  private presenceCallbacks = new Set<(data: any) => void>();
  private reconnectInterval: number | null = null;
  private isConnecting = false;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const accessToken = localStorage.getItem("accessToken");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      headers,
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }

      const error = new Error(data.error || `HTTP ${response.status}`);
      throw error;
    }

    return response.json();
  }

  async sendFriendRequest(
    friendId: number
  ): Promise<{ message: string; request: any }> {
    return await this.request("/friends/request", {
      method: "POST",
      body: JSON.stringify({ friendId }),
    });
  }

  async acceptFriendRequest(requestId: number): Promise<{ message: string }> {
    return await this.request("/friends/accept", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });
  }

  async rejectFriendRequest(requestId: number): Promise<{ message: string }> {
    return await this.request("/friends/reject", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });
  }

  async removeFriend(friendId: number): Promise<{ message: string }> {
    return await this.request(`/friends/${friendId}`, {
      method: "DELETE",
      body: JSON.stringify({ friendId }),
    });
  }

  async blockUser(friendId: number): Promise<{ message: string }> {
    return await this.request("/friends/block", {
      method: "POST",
      body: JSON.stringify({ friendId }),
    });
  }

  async unblockUser(friendId: number): Promise<{ message: string }> {
    return await this.request("/friends/unblock", {
      method: "POST",
      body: JSON.stringify({ friendId }),
    });
  }

  async getFriends(): Promise<FriendsResponse> {
    return await this.request("/friends");
  }

  async getFriendRequests(): Promise<FriendRequestsResponse> {
    return await this.request("/friends/requests");
  }

  async getSentRequests(): Promise<FriendRequestsResponse> {
    return await this.request("/friends/requests/sent");
  }

  async getFriendshipStatus(userId: number): Promise<FriendshipStatusResponse> {
    return await this.request(`/friends/status/${userId}`);
  }

  connectToPresence(): void {
    if (
      this.presenceSocket &&
      this.presenceSocket.readyState === WebSocket.OPEN
    ) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      this.isConnecting = false;
      return;
    }

    const wsBaseURL = API_BASE_URL.replace(/^https?:\/\//, "ws://");
    const wsURL = `${wsBaseURL}/ws/presence?token=${encodeURIComponent(token)}`;

    this.presenceSocket = new WebSocket(wsURL);

    this.presenceSocket.onopen = () => {
      this.isConnecting = false;

      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      this.startHeartbeat();
    };

    this.presenceSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.presenceCallbacks.forEach((callback) => callback(data));
      } catch (error) {
        console.error("Failed to parse presence message:", error);
      }
    };

    this.presenceSocket.onclose = () => {
      this.isConnecting = false;
      this.presenceSocket = null;

      if (!this.reconnectInterval) {
        this.reconnectInterval = window.setInterval(() => {
          this.connectToPresence();
        }, 5000);
      }
    };

    this.presenceSocket.onerror = (error) => {
      console.error("Presence WebSocket error:", error);
      this.isConnecting = false;
    };
  }

  disconnectFromPresence(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.presenceSocket) {
      this.presenceSocket.close();
      this.presenceSocket = null;
    }

    this.presenceCallbacks.clear();
    this.isConnecting = false;
  }

  onPresenceUpdate(callback: (data: any) => void): () => void {
    this.presenceCallbacks.add(callback);

    return () => {
      this.presenceCallbacks.delete(callback);
    };
  }

  requestOnlineFriends(): void {
    if (
      this.presenceSocket &&
      this.presenceSocket.readyState === WebSocket.OPEN
    ) {
      this.presenceSocket.send(JSON.stringify({ type: "get_online_friends" }));
    }
  }

  private startHeartbeat(): void {
    const heartbeat = () => {
      if (
        this.presenceSocket &&
        this.presenceSocket.readyState === WebSocket.OPEN
      ) {
        this.presenceSocket.send(JSON.stringify({ type: "ping" }));
        setTimeout(heartbeat, 30000);
      }
    };

    setTimeout(heartbeat, 30000);
  }
}

export const friendsAPI = new FriendsAPI();
