import { authAPI, type User } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";

export class DashboardPage extends BaseComponent {
  private user: User | null = null;
  private isLoadingUserData = false;
  private eventListenersSetup = false;

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

    this.renderPage();

    if (!this.eventListenersSetup) {
      this.setupEventListeners();
      this.eventListenersSetup = true;
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
      this.renderPage();
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    } finally {
      this.isLoadingUserData = false;
    }
  }

  private renderPage(): void {
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
          <h2 class="text-2xl font-bold text-white mb-4">Dashboard</h2>
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-6">
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
                <span class="text-white">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Games Won:</span>
                <span class="text-white">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Win Rate:</span>
                <span class="text-white">0%</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
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
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { path: "/docs" } })
      );
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
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { path: "/change-password" } })
    );
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
