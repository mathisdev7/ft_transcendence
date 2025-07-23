import { friendsAPI } from "../api/friends";
import { profileAPI, type UserProfile } from "../api/profile";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class UserSearchModal extends BaseComponent {
  private isSearching = false;
  private searchResults: UserProfile[] = [];
  private searchTimeout: number | null = null;
  private friendshipStatuses = new Map<number, string | null>();

  constructor() {
    super(
      "div",
      "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden"
    );
  }

  protected init(): void {}

  public open(): void {
    this.element.classList.remove("hidden");
    this.renderModal();
    this.setupEventListeners();

    setTimeout(() => {
      const searchInput = this.element.querySelector(
        "#user-search-input"
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  public close(): void {
    this.element.classList.add("hidden");
    this.searchResults = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  private renderModal(): void {
    this.element.innerHTML = `
      <div class="card w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div class="card-header flex-row justify-between items-center">
          <h3 class="card-title">🔍 Search Users</h3>
          <button id="close-search-modal" class="btn btn-ghost btn-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="px-6 pb-6">
          <div class="mb-6">
            <div class="relative">
              <div class="relative">
                <input
                  type="text"
                  id="user-search-input"
                  class="input w-full pl-10"
                  autocomplete="off"
                />
              </div>
              ${
                this.isSearching
                  ? `
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <div id="search-results" class="max-h-96 overflow-y-auto">
            ${this.renderSearchResults()}
          </div>
        </div>
      </div>
    `;
  }

  private renderSearchResults(): string {
    if (this.isSearching) {
      return `
        <div class="flex justify-center py-8">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-muted-foreground">Searching...</p>
          </div>
        </div>
      `;
    }

    if (this.searchResults.length === 0) {
      return `
        <div class="text-center py-8 text-muted-foreground">
          <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p>Start typing to search for users</p>
        </div>
      `;
    }

    return `
      <div class="space-y-2">
        ${this.searchResults
          .map(
            (user) => `
          <div class="flex items-center space-x-4 p-4 hover:bg-muted rounded-lg cursor-pointer user-result" data-user-id="${
            user.id
          }">
            <img
              src="${
                user.avatar_url ||
                profileAPI.getDefaultAvatarUrl(user.display_name)
              }"
              alt="Avatar of ${user.display_name}"
              class="w-12 h-12 rounded-full object-cover border-2 border-border"
            />
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h4 class="font-semibold text-foreground">${
                  user.display_name
                }</h4>
                ${
                  user.is_verified
                    ? `
                  <svg class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                `
                    : ""
                }
              </div>
              <p class="text-sm text-muted-foreground">Click to view profile</p>
            </div>
            <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private setupEventListeners(): void {
    const closeBtn = this.element.querySelector(
      "#close-search-modal"
    ) as HTMLButtonElement;
    const searchInput = this.element.querySelector(
      "#user-search-input"
    ) as HTMLInputElement;

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.close();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = (e.target as HTMLInputElement).value.trim();
        this.handleSearch(query);
      });

      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.close();
        }
      });
    }

    const resultsContainer = this.element.querySelector(
      "#search-results"
    ) as HTMLElement;
    if (resultsContainer) {
      resultsContainer.addEventListener("click", (e) => {
        const userResult = (e.target as HTMLElement).closest(
          ".user-result"
        ) as HTMLElement;
        if (userResult) {
          const userId = userResult.getAttribute("data-user-id");
          if (userId) {
            this.close();
            window.location.hash = `#/profile/${userId}`;
            window.dispatchEvent(new CustomEvent("hashchange"));
          }
        }
      });
    }

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });
  }

  private handleSearch(query: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query || query.length < 2) {
      this.searchResults = [];
      this.updateSearchResults();
      return;
    }

    this.searchTimeout = window.setTimeout(async () => {
      await this.performSearch(query);
    }, 300);
  }

  private async performSearch(query: string): Promise<void> {
    if (this.isSearching) return;

    this.isSearching = true;
    this.updateSearchResults();

    try {
      const response = await profileAPI.searchUsers(query, 20);
      this.searchResults = response.users;

      await this.loadFriendshipStatuses();

      this.renderResults();
    } catch (error) {
      console.error("Search error:", error);
      Toast.error("Error searching users");
      this.searchResults = [];
    } finally {
      this.isSearching = false;
      this.updateSearchResults();
    }
  }

  private async loadFriendshipStatuses(): Promise<void> {
    const statusPromises = this.searchResults.map(async (user) => {
      try {
        const response = await friendsAPI.getFriendshipStatus(user.id);
        this.friendshipStatuses.set(user.id, response.status);
      } catch (error) {
        this.friendshipStatuses.set(user.id, null);
      }
    });

    await Promise.all(statusPromises);
  }

  private renderResults(): void {
    const resultsContainer = this.element.querySelector("#search-results");
    if (!resultsContainer) return;

    if (this.searchResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="text-center py-8 text-muted-foreground">
          <div class="text-4xl mb-4">🔍</div>
          <p>No users found matching your search</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = this.searchResults
      .map((user) => {
        const avatarUrl =
          user.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.display_name
          )}&background=random&color=fff&size=50`;

        const friendshipStatus = this.friendshipStatuses.get(user.id) || null;

        return `
          <div class="flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors">
            <div class="flex items-center space-x-3 cursor-pointer" data-user-id="${
              user.id
            }">
              <img
                src="${avatarUrl}"
                alt="${user.display_name}"
                class="w-12 h-12 rounded-full"
              />
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-foreground">${
                    user.display_name
                  }</span>
                  ${
                    user.is_verified
                      ? `
                    <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  `
                      : ""
                  }
                </div>
                <div class="text-sm text-muted-foreground">Click to view profile</div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              ${this.renderFriendButton(user.id, friendshipStatus)}
            </div>
          </div>
        `;
      })
      .join("");

    resultsContainer.querySelectorAll("[data-user-id]").forEach((element) => {
      element.addEventListener("click", (e) => {
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          this.close();
          window.location.hash = `#/profile/${userId}`;
          window.dispatchEvent(new CustomEvent("hashchange"));
        }
      });
    });

    resultsContainer.querySelectorAll(".friend-action-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLButtonElement;
        const userId = parseInt(button.dataset.userId!);
        const action = button.dataset.action!;

        await this.handleFriendAction(userId, action, button);
      });
    });
  }

  private renderFriendButton(userId: number, status: string | null): string {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (currentUser.id === userId) {
      return '<span class="text-xs text-muted-foreground">You</span>';
    }

    switch (status) {
      case "accepted":
        return `
          <span class="text-xs text-success flex items-center">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
            Friends
          </span>
        `;
      case "pending":
        return '<span class="text-xs text-warning">Request Sent</span>';
      case "blocked":
        return '<span class="text-xs text-destructive">Blocked</span>';
      default:
        return `
          <button class="friend-action-btn btn btn-primary btn-sm"
                  data-user-id="${userId}"
                  data-action="send_request">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Friend
          </button>
        `;
    }
  }

  private async handleFriendAction(
    userId: number,
    action: string,
    button: HTMLButtonElement
  ): Promise<void> {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML =
      '<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>';

    try {
      switch (action) {
        case "send_request":
          await friendsAPI.sendFriendRequest(userId);
          Toast.success("Friend request sent!");
          this.friendshipStatuses.set(userId, "pending");
          break;
      }

      this.renderResults();
    } catch (error: any) {
      console.error("Friend action failed:", error);
      Toast.error(error.message || "Failed to perform action");
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  private updateSearchResults(): void {
    this.renderResults();
  }
}

export const userSearchModal = new UserSearchModal();
