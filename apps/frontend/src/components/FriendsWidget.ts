import { friendsAPI, type Friend, type FriendRequest } from "../api/friends";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class FriendsWidget extends BaseComponent {
  private friends: Friend[] = [];
  private friendRequests: FriendRequest[] = [];
  private sentRequests: FriendRequest[] = [];
  private isLoading = false;
  private presenceUnsubscribe: (() => void) | null = null;
  private activeTab: "friends" | "requests" | "sent" = "friends";

  constructor() {
    super("div", "card");
    this.init();
  }

  protected init(): void {
    this.setupPresenceConnection();
    this.loadFriendsData();
    this.render();
  }

  private setupPresenceConnection(): void {
    friendsAPI.connectToPresence();

    this.presenceUnsubscribe = friendsAPI.onPresenceUpdate((data) => {
      if (data.type === "friend_presence_update") {
        this.updateFriendPresence(data.user_id, data.is_online);
      } else if (
        data.type === "presence_update" ||
        data.type === "online_friends"
      ) {
        this.handlePresenceUpdate(data);
      }
    });
  }

  private updateFriendPresence(userId: number, isOnline: boolean): void {
    this.friends = this.friends.map((friend) => {
      const friendUserId =
        friend.user_id === JSON.parse(localStorage.getItem("user") || "{}").id
          ? friend.friend_id
          : friend.user_id;

      if (friendUserId === userId) {
        return {
          ...friend,
          friend_info: {
            ...friend.friend_info,
            is_online: isOnline,
          },
        };
      }
      return friend;
    });

    this.renderWidget();
  }

  private handlePresenceUpdate(data: any): void {
    if (data.online_friends) {
      const onlineFriendIds = new Set(data.online_friends);
      this.friends = this.friends.map((friend) => ({
        ...friend,
        friend_info: {
          ...friend.friend_info,
          is_online:
            onlineFriendIds.has(friend.friend_id) ||
            onlineFriendIds.has(friend.user_id),
        },
      }));
      this.renderWidget();
    }
  }

  private async loadFriendsData(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const [friendsResponse, requestsResponse, sentResponse] =
        await Promise.all([
          friendsAPI.getFriends(),
          friendsAPI.getFriendRequests(),
          friendsAPI.getSentRequests(),
        ]);

      this.friends = friendsResponse.friends;
      this.friendRequests = requestsResponse.requests;
      this.sentRequests = sentResponse.requests;

      friendsAPI.requestOnlineFriends();
    } catch (error) {
      console.error("Failed to load friends data:", error);
      Toast.error("Failed to load friends data");
    } finally {
      this.isLoading = false;
      this.renderWidget();
    }
  }

  private renderWidget(): void {
    this.element.innerHTML = `
      <div class="card-header">
        <h3 class="card-title flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239"></path>
          </svg>
          Friends
        </h3>
        <div class="flex items-center space-x-2">
          ${
            this.friendRequests.length > 0
              ? `
            <span class="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
              ${this.friendRequests.length}
            </span>
          `
              : ""
          }
          <button id="refresh-friends" class="btn btn-ghost btn-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-content">
        ${this.renderTabs()}
        <div id="tab-content">
          ${this.renderContent()}
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private renderTabs(): string {
    return `
      <div class="flex border-b border-border mb-4">
        <button id="tab-friends" class="tab-button ${
          this.activeTab === "friends"
            ? "active border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        } px-4 py-2 text-sm font-medium border-b-2">
          Friends (${this.friends.length})
        </button>
        <button id="tab-requests" class="tab-button ${
          this.activeTab === "requests"
            ? "active border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        } px-4 py-2 text-sm font-medium border-b-2">
          Requests (${this.friendRequests.length})
        </button>
        <button id="tab-sent" class="tab-button ${
          this.activeTab === "sent"
            ? "active border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        } px-4 py-2 text-sm font-medium border-b-2">
          Sent (${this.sentRequests.length})
        </button>
      </div>
    `;
  }

  private renderContent(): string {
    switch (this.activeTab) {
      case "requests":
        return this.renderFriendRequests();
      case "sent":
        return this.renderSentRequests();
      default:
        return this.renderFriendsList();
    }
  }

  private renderFriendsList(): string {
    if (this.isLoading) {
      return '<div class="text-center py-8 text-muted-foreground">Loading friends...</div>';
    }

    if (this.friends.length === 0) {
      return `
        <div class="text-center py-8">
          <div class="text-4xl mb-4">👥</div>
          <p class="text-muted-foreground">No friends yet</p>
          <p class="text-sm text-muted-foreground mt-2">Search for users to add them as friends!</p>
        </div>
      `;
    }

    const onlineFriends = this.friends.filter((f) => f.friend_info.is_online);
    const offlineFriends = this.friends.filter((f) => !f.friend_info.is_online);

    return `
      <div class="space-y-4">
        ${
          onlineFriends.length > 0
            ? `
          <div>
            <h4 class="text-sm font-semibold text-success mb-2">Online - ${
              onlineFriends.length
            }</h4>
            <div class="space-y-2">
              ${onlineFriends
                .map((friend) => this.renderFriendItem(friend))
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          offlineFriends.length > 0
            ? `
          <div>
            <h4 class="text-sm font-semibold text-muted-foreground mb-2">Offline - ${
              offlineFriends.length
            }</h4>
            <div class="space-y-2">
              ${offlineFriends
                .map((friend) => this.renderFriendItem(friend))
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private renderFriendItem(friend: Friend): string {
    const friendInfo = friend.friend_info;
    const avatarUrl =
      friendInfo.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        friendInfo.display_name
      )}&background=random&color=fff&size=40`;

    const currentUserId = JSON.parse(localStorage.getItem("user") || "{}").id;
    const friendId =
      friend.user_id === currentUserId ? friend.friend_id : friend.user_id;

    return `
      <div class="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
        <div class="flex items-center space-x-3">
          <div class="relative">
            <img src="${avatarUrl}" alt="${
      friendInfo.display_name
    }" class="w-10 h-10 rounded-full">
            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
              friendInfo.is_online ? "bg-success" : "bg-muted-foreground"
            }"></div>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-medium text-foreground">${
                friendInfo.display_name
              }</span>
              ${
                friendInfo.is_verified
                  ? '<svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
                  : ""
              }
            </div>
            <div class="text-sm text-muted-foreground">
              ${
                friendInfo.is_online
                  ? "Online"
                  : `Last seen ${this.formatLastSeen(friendInfo.last_seen)}`
              }
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="remove-friend-btn btn btn-ghost btn-sm text-destructive hover:text-destructive"
                  data-friend-id="${friendId}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private renderFriendRequests(): string {
    if (this.friendRequests.length === 0) {
      return `
        <div class="text-center py-8">
          <div class="text-4xl mb-4">📬</div>
          <p class="text-muted-foreground">No friend requests</p>
        </div>
      `;
    }

    return `
      <div class="space-y-3">
        ${this.friendRequests
          .map(
            (request) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div class="flex items-center space-x-3">
              <img src="${
                request.from_user_info.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  request.from_user_info.display_name
                )}&background=random&color=fff&size=40`
              }"
                   alt="${
                     request.from_user_info.display_name
                   }" class="w-10 h-10 rounded-full">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-foreground">${
                    request.from_user_info.display_name
                  }</span>
                  ${
                    request.from_user_info.is_verified
                      ? '<svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
                      : ""
                  }
                </div>
                <div class="text-sm text-muted-foreground">${this.formatDate(
                  request.created_at
                )}</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button class="accept-request-btn btn btn-success btn-sm" data-request-id="${
                request.id
              }">
                Accept
              </button>
              <button class="reject-request-btn btn btn-destructive btn-sm" data-request-id="${
                request.id
              }">
                Reject
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private renderSentRequests(): string {
    if (this.sentRequests.length === 0) {
      return `
        <div class="text-center py-8">
          <div class="text-4xl mb-4">📤</div>
          <p class="text-muted-foreground">No sent requests</p>
        </div>
      `;
    }

    return `
      <div class="space-y-3">
        ${this.sentRequests
          .map(
            (request) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div class="flex items-center space-x-3">
              <img src="${
                request.from_user_info.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  request.from_user_info.display_name
                )}&background=random&color=fff&size=40`
              }"
                   alt="${
                     request.from_user_info.display_name
                   }" class="w-10 h-10 rounded-full">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-foreground">${
                    request.from_user_info.display_name
                  }</span>
                  ${
                    request.from_user_info.is_verified
                      ? '<svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
                      : ""
                  }
                </div>
                <div class="text-sm text-muted-foreground">Sent ${this.formatDate(
                  request.created_at
                )}</div>
              </div>
            </div>
            <div class="text-sm text-warning font-medium">Pending</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private setupEventListeners(): void {
    this.element.querySelectorAll(".tab-button").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const tabId = target.id;

        switch (tabId) {
          case "tab-requests":
            this.activeTab = "requests";
            break;
          case "tab-sent":
            this.activeTab = "sent";
            break;
          default:
            this.activeTab = "friends";
            break;
        }

        this.element.querySelectorAll(".tab-button").forEach((t) => {
          t.classList.remove("active", "border-primary", "text-primary");
          t.classList.add("border-transparent", "text-muted-foreground");
        });

        target.classList.add("active", "border-primary", "text-primary");
        target.classList.remove("border-transparent", "text-muted-foreground");

        const contentContainer = this.element.querySelector("#tab-content");
        if (contentContainer) {
          contentContainer.innerHTML = this.renderContent();
          this.setupContentEventListeners();
        }
      });
    });

    const refreshBtn = this.element.querySelector("#refresh-friends");
    refreshBtn?.addEventListener("click", () => {
      this.loadFriendsData();
    });

    this.setupContentEventListeners();
  }

  private setupContentEventListeners(): void {
    this.element.querySelectorAll(".remove-friend-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const friendId = parseInt(
          (e.currentTarget as HTMLElement).dataset.friendId!
        );
        await this.removeFriend(friendId);
      });
    });

    this.element.querySelectorAll(".accept-request-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const requestId = parseInt(
          (e.currentTarget as HTMLElement).dataset.requestId!
        );
        await this.acceptFriendRequest(requestId);
      });
    });

    this.element.querySelectorAll(".reject-request-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const requestId = parseInt(
          (e.currentTarget as HTMLElement).dataset.requestId!
        );
        await this.rejectFriendRequest(requestId);
      });
    });
  }

  private async removeFriend(friendId: number): Promise<void> {
    try {
      await friendsAPI.removeFriend(friendId);
      Toast.success("Friend removed successfully");
      this.loadFriendsData();
    } catch (error) {
      console.error("Failed to remove friend:", error);
      Toast.error("Failed to remove friend");
    }
  }

  private async acceptFriendRequest(requestId: number): Promise<void> {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      Toast.success("Friend request accepted");
      this.loadFriendsData();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      Toast.error("Failed to accept friend request");
    }
  }

  private async rejectFriendRequest(requestId: number): Promise<void> {
    try {
      await friendsAPI.rejectFriendRequest(requestId);
      Toast.success("Friend request rejected");
      this.loadFriendsData();
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      Toast.error("Failed to reject friend request");
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  private formatLastSeen(dateString: string): string {
    console.log(dateString);
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return "just now";
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    } else if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffSeconds / 86400)}d ago`;
    }
  }

  public destroy(): void {
    if (this.presenceUnsubscribe) {
      this.presenceUnsubscribe();
    }
  }
}
