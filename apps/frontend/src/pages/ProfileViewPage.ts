import { authAPI, type User } from "../api/auth";
import { friendsAPI } from "../api/friends";
import { gameAPI, type GameHistoryResponse } from "../api/game";
import { profileAPI, type UserProfile } from "../api/profile";
import { BaseComponent } from "../components/BaseComponent";
import { RecentActivityWidget } from "../components/RecentActivityWidget";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class ProfileViewPage extends BaseComponent {
  private userId: number | null = null;
  private userProfile: UserProfile | null = null;
  private currentUser: User | null = null;
  private gameStats: GameHistoryResponse["stats"] | null = null;
  private isLoadingProfile = false;
  private isLoadingStats = false;
  private recentActivityWidget: RecentActivityWidget;
  private friendshipStatus: string | null = null;

  constructor() {
    super("div", "min-h-screen bg-background");
    this.recentActivityWidget = new RecentActivityWidget();
  }

  protected init(): void {
    this.parseUrlParams();
    this.loadCurrentUser();
    this.loadUserProfile();
  }

  private parseUrlParams(): void {
    const hash = window.location.hash;

    if (hash.includes("/profile/")) {
      const parts = hash.split("/profile/");
      if (parts.length > 1) {
        this.userId = parseInt(parts[1], 10);
      }
    } else if (hash.includes("userId=")) {
      const params = new URLSearchParams(hash.split("?")[1] || "");
      const userIdParam = params.get("userId");
      if (userIdParam) {
        this.userId = parseInt(userIdParam, 10);
      }
    }

    if (!this.userId || isNaN(this.userId)) {
      Toast.error("Invalid user ID");
      navigateToView(ViewType.DASHBOARD);
      return;
    }
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const userResponse = await authAPI.getMe();
      this.currentUser = userResponse.user;
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  }

  private async loadUserProfile(): Promise<void> {
    if (this.isLoadingProfile || !this.userId) return;

    this.isLoadingProfile = true;

    try {
      const [profileResponse, gameStatsResponse] = await Promise.all([
        profileAPI.getUserProfile(this.userId),
        gameAPI.getUserGameStats(this.userId),
      ]);

      this.userProfile = profileResponse.user;
      this.gameStats = gameStatsResponse;

      const currentUser = authAPI.getCurrentUser();
      if (currentUser && currentUser.id !== this.userId) {
        try {
          const statusResponse = await friendsAPI.getFriendshipStatus(
            this.userId
          );
          this.friendshipStatus = statusResponse.status;
        } catch (error) {
          console.error("Failed to load friendship status:", error);
        }
      }

      this.renderPage();
    } catch (error) {
      console.error("Error loading profile:", error);
      Toast.error("Profile not found");
      navigateToView(ViewType.DASHBOARD);
    } finally {
      this.isLoadingProfile = false;
    }
  }

  private renderPage(): void {
    if (this.isLoadingProfile) {
      this.element.innerHTML = `
        <div class="container-responsive py-8">
          <div class="flex justify-center items-center min-h-[400px]">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p class="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (!this.userProfile) {
      this.element.innerHTML = `
        <div class="container-responsive py-8">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-foreground mb-4">Profile not found</h1>
            <button id="back-to-dashboard" class="btn btn-primary">
              Back to dashboard
            </button>
          </div>
        </div>
      `;
      this.setupBackButton();
      return;
    }

    const isOwnProfile = this.currentUser?.id === this.userProfile.id;

    this.element.innerHTML = `
      <nav class="navbar">
        <div class="container-responsive">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center space-x-4">
              <button id="back-btn" class="btn btn-ghost">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <h1 class="text-foreground text-xl font-bold">
                ${
                  isOwnProfile
                    ? "My Profile"
                    : `Profile of ${this.userProfile.display_name}`
                }
              </h1>
            </div>
            ${
              isOwnProfile
                ? `
              <button id="edit-profile-btn" class="btn btn-primary">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Profile
              </button>
            `
                : ""
            }
          </div>
        </div>
      </nav>

      <main class="container-responsive py-8">
        <div class="max-w-4xl mx-auto space-y-8">
          ${this.renderProfileHeader()}

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">📊 Game Statistics</h3>
            </div>
            <div class="card-content">
              ${
                this.isLoadingStats
                  ? `
                <div class="flex justify-center py-8">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              `
                  : `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div class="text-center p-6 bg-muted rounded-lg">
                    <div class="text-3xl font-bold text-foreground mb-2">
                      ${this.gameStats?.total_games || 0}
                    </div>
                    <div class="text-sm text-muted-foreground">Games Played</div>
                  </div>

                  <div class="text-center p-6 bg-muted rounded-lg">
                    <div class="text-3xl font-bold text-success mb-2">
                      ${this.gameStats?.games_won || 0}
                    </div>
                    <div class="text-sm text-muted-foreground">Wins</div>
                  </div>

                  <div class="text-center p-6 bg-muted rounded-lg">
                    <div class="text-3xl font-bold text-destructive mb-2">
                      ${this.gameStats?.games_lost || 0}
                    </div>
                    <div class="text-sm text-muted-foreground">Losses</div>
                  </div>

                  <div class="text-center p-6 bg-muted rounded-lg">
                    <div class="text-3xl font-bold text-warning mb-2">
                      ${this.gameStats?.win_rate || 0}%
                    </div>
                    <div class="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                </div>
              `
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🎮 Recent Activity</h3>
            </div>
            <div class="card-content">
              <div id="profile-recent-activity-container"></div>
            </div>
          </div>
        </div>
      </main>
    `;

    this.setupEventListeners();

    const activityContainer = this.element.querySelector(
      "#profile-recent-activity-container"
    );
    if (activityContainer) {
      activityContainer.appendChild(this.recentActivityWidget.render());
    }
  }

  private renderProfileHeader(): string {
    if (!this.userProfile) return "";

    const currentUser = authAPI.getCurrentUser();
    const isOwnProfile = currentUser?.id === this.userProfile.id;

    return `
      <div class="card mb-8">
        <div class="card-content">
          <div class="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-6">
            <div class="flex-shrink-0">
              <img
                src="${
                  this.userProfile.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    this.userProfile.display_name
                  )}&background=random&color=fff&size=120`
                }"
                alt="${this.userProfile.display_name}"
                class="w-32 h-32 rounded-full border-4 border-border"
              />
            </div>
            <div class="flex-grow text-center md:text-left">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <div class="flex items-center justify-center md:justify-start space-x-2 mb-2">
                    <h1 class="text-3xl font-bold text-foreground">${
                      this.userProfile.display_name
                    }</h1>
                    ${
                      this.userProfile.is_verified
                        ? `
                      <svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    `
                        : ""
                    }
                  </div>
                  <p class="text-muted-foreground mb-4">
                    Member since ${new Date(
                      this.userProfile.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div class="flex items-center space-x-3">
                  ${!isOwnProfile ? this.renderFriendButton() : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderFriendButton(): string {
    switch (this.friendshipStatus) {
      case "accepted":
        return `
          <div class="flex items-center space-x-2">
            <span class="text-success flex items-center text-sm">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              Friends
            </span>
            <button id="remove-friend-btn" class="btn btn-destructive btn-sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Remove Friend
            </button>
          </div>
        `;
      case "pending":
        return `
          <span class="text-warning text-sm">Friend Request Sent</span>
        `;
      case "blocked":
        return `
          <button id="unblock-user-btn" class="btn btn-secondary btn-sm">
            Unblock User
          </button>
        `;
      default:
        return `
          <div class="flex items-center space-x-2">
            <button id="send-friend-request-btn" class="btn btn-primary">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add Friend
            </button>
            <button id="block-user-btn" class="btn btn-ghost btn-sm text-destructive">
              Block
            </button>
          </div>
        `;
    }
  }

  private setupEventListeners(): void {
    this.setupBackButton();
    this.setupEditButton();
    this.setupActionButtons();

    const sendFriendRequestBtn = this.element.querySelector(
      "#send-friend-request-btn"
    );
    sendFriendRequestBtn?.addEventListener("click", () =>
      this.sendFriendRequest()
    );

    const removeFriendBtn = this.element.querySelector("#remove-friend-btn");
    removeFriendBtn?.addEventListener("click", () => this.removeFriend());

    const blockUserBtn = this.element.querySelector("#block-user-btn");
    blockUserBtn?.addEventListener("click", () => this.blockUser());

    const unblockUserBtn = this.element.querySelector("#unblock-user-btn");
    unblockUserBtn?.addEventListener("click", () => this.unblockUser());
  }

  private setupBackButton(): void {
    const backBtn = this.element.querySelector(
      "#back-btn"
    ) as HTMLButtonElement;
    const dashboardBtn = this.element.querySelector(
      "#back-to-dashboard"
    ) as HTMLButtonElement;

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        navigateToView(ViewType.DASHBOARD);
      });
    }

    if (dashboardBtn) {
      dashboardBtn.addEventListener("click", () => {
        navigateToView(ViewType.DASHBOARD);
      });
    }
  }

  private setupEditButton(): void {
    const editBtn = this.element.querySelector(
      "#edit-profile-btn"
    ) as HTMLButtonElement;

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        navigateToView(ViewType.PROFILE_EDIT);
      });
    }
  }

  private setupActionButtons(): void {
    const addFriendBtn = this.element.querySelector(
      "#add-friend-btn"
    ) as HTMLButtonElement;
    const challengeBtn = this.element.querySelector(
      "#challenge-btn"
    ) as HTMLButtonElement;

    if (addFriendBtn) {
      addFriendBtn.addEventListener("click", () => {
        Toast.info("Add friend feature coming soon!");
      });
    }

    if (challengeBtn) {
      challengeBtn.addEventListener("click", () => {
        Toast.info("Challenge feature coming soon!");
      });
    }
  }

  private async sendFriendRequest(): Promise<void> {
    if (!this.userProfile) return;

    try {
      await friendsAPI.sendFriendRequest(this.userProfile.id);
      this.friendshipStatus = "pending";
      Toast.success("Friend request sent!");
      this.renderPage();
    } catch (error: any) {
      console.error("Failed to send friend request:", error);
      Toast.error(error.message || "Failed to send friend request");
    }
  }

  private async removeFriend(): Promise<void> {
    if (!this.userProfile) return;

    if (
      !confirm(
        `Are you sure you want to remove ${this.userProfile.display_name} from your friends?`
      )
    ) {
      return;
    }

    try {
      await friendsAPI.removeFriend(this.userProfile.id);
      this.friendshipStatus = null;
      Toast.success("Friend removed successfully");
      this.renderPage();
    } catch (error: any) {
      console.error("Failed to remove friend:", error);
      Toast.error(error.message || "Failed to remove friend");
    }
  }

  private async blockUser(): Promise<void> {
    if (!this.userProfile) return;

    if (
      !confirm(
        `Are you sure you want to block ${this.userProfile.display_name}?`
      )
    ) {
      return;
    }

    try {
      await friendsAPI.blockUser(this.userProfile.id);
      this.friendshipStatus = "blocked";
      Toast.success("User blocked successfully");
      this.renderPage();
    } catch (error: any) {
      console.error("Failed to block user:", error);
      Toast.error(error.message || "Failed to block user");
    }
  }

  private async unblockUser(): Promise<void> {
    if (!this.userProfile) return;

    try {
      await friendsAPI.unblockUser(this.userProfile.id);
      this.friendshipStatus = null;
      Toast.success("User unblocked successfully");
      this.renderPage();
    } catch (error: any) {
      console.error("Failed to unblock user:", error);
      Toast.error(error.message || "Failed to unblock user");
    }
  }
}

export async function createProfileViewPage(): Promise<HTMLElement> {
  const page = new ProfileViewPage();
  return page.render();
}
