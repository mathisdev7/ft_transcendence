import { authAPI, type User } from "../api/auth";
import { profileAPI } from "../api/profile";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class ProfileEditPage extends BaseComponent {
  private user: User | null = null;
  private isLoadingProfile = false;
  private isUpdatingProfile = false;
  private isUploadingAvatar = false;
  private isChangingPassword = false;

  constructor() {
    super("div", "min-h-screen bg-background");
  }

  protected init(): void {
    this.loadUserData();
    this.renderPage();
  }

  private async loadUserData(): Promise<void> {
    if (this.isLoadingProfile) return;

    this.isLoadingProfile = true;

    try {
      const userResponse = await authAPI.getMe();
      this.user = userResponse.user;
      this.renderPage();
    } catch (error) {
      console.error("Error loading profile:", error);
      Toast.error("Error loading profile");
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

    if (!this.user) {
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
              <h1 class="text-foreground text-xl font-bold">Edit Profile</h1>
            </div>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-8">
        <div class="max-w-2xl mx-auto space-y-8">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Profile Picture</h2>
              <p class="text-muted-foreground">Change your avatar</p>
            </div>
            <div class="card-content">
              <div class="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div class="relative">
                  <img
                    id="current-avatar"
                    src="${
                      this.user.avatar_url ||
                      profileAPI.getDefaultAvatarUrl(this.user.display_name)
                    }"
                    alt="Current avatar"
                    class="w-24 h-24 rounded-full object-cover border-4 border-border"
                  />
                  <div id="avatar-loading" class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center hidden">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                </div>
                <div class="flex-1 text-center sm:text-left">
                  <input
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    class="hidden"
                  />
                  <button id="upload-avatar-btn" class="btn btn-primary mb-2">
                    Change Picture
                  </button>
                  <p class="text-sm text-muted-foreground">
                    JPG, PNG or GIF. Maximum 5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Profile Information</h2>
              <p class="text-muted-foreground">Update your personal information</p>
            </div>
            <div class="card-content">
              <form id="profile-form" class="space-y-6">
                <div>
                  <label for="display-name" class="block text-sm font-medium text-foreground mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="display-name"
                    value="${this.user.display_name}"
                    class="input w-full"
                    placeholder="Your display name"
                    maxlength="50"
                    required
                  />
                </div>

                <div>
                  <label for="email" class="block text-sm font-medium text-muted-foreground mb-2">
                    Email (read-only)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value="${this.user.email}"
                    class="input w-full bg-muted text-muted-foreground"
                    disabled
                  />
                </div>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    id="save-profile-btn"
                    class="btn btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Change Password</h2>
              <p class="text-muted-foreground">Update your password</p>
            </div>
            <div class="card-content">
              <form id="password-form" class="space-y-6">
                <div>
                  <label for="current-password" class="block text-sm font-medium text-foreground mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    class="input w-full"
                    placeholder="Your current password"
                    required
                  />
                </div>

                <div>
                  <label for="new-password" class="block text-sm font-medium text-foreground mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    class="input w-full"
                    placeholder="Your new password"
                    minlength="8"
                    required
                  />
                </div>

                <div>
                  <label for="confirm-password" class="block text-sm font-medium text-foreground mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    class="input w-full"
                    placeholder="Confirm your new password"
                    minlength="8"
                    required
                  />
                </div>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    id="change-password-btn"
                    class="btn btn-warning"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.setupBackButton();
    this.setupAvatarUpload();
    this.setupProfileForm();
    this.setupPasswordForm();
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

  private setupAvatarUpload(): void {
    const uploadBtn = this.element.querySelector(
      "#upload-avatar-btn"
    ) as HTMLButtonElement;
    const avatarInput = this.element.querySelector(
      "#avatar-input"
    ) as HTMLInputElement;

    if (uploadBtn && avatarInput) {
      uploadBtn.addEventListener("click", () => {
        avatarInput.click();
      });

      avatarInput.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await this.handleAvatarUpload(file);
        }
      });
    }
  }

  private async handleAvatarUpload(file: File): Promise<void> {
    if (this.isUploadingAvatar) return;

    this.isUploadingAvatar = true;
    const loadingEl = this.element.querySelector(
      "#avatar-loading"
    ) as HTMLElement;
    const uploadBtn = this.element.querySelector(
      "#upload-avatar-btn"
    ) as HTMLButtonElement;

    try {
      loadingEl.classList.remove("hidden");
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";

      const avatarUrl = await profileAPI.uploadAvatar(file);

      await profileAPI.updateProfile({ avatar_url: avatarUrl });

      const avatarImg = this.element.querySelector(
        "#current-avatar"
      ) as HTMLImageElement;
      avatarImg.src = avatarUrl;

      if (this.user) {
        this.user.avatar_url = avatarUrl;
        localStorage.setItem("user", JSON.stringify(this.user));
      }

      Toast.success("Avatar updated successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload error";
      Toast.error(errorMessage);
    } finally {
      this.isUploadingAvatar = false;
      loadingEl.classList.add("hidden");
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Change Picture";
    }
  }

  private setupProfileForm(): void {
    const form = this.element.querySelector("#profile-form") as HTMLFormElement;

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleProfileUpdate();
      });
    }
  }

  private async handleProfileUpdate(): Promise<void> {
    if (this.isUpdatingProfile) return;

    this.isUpdatingProfile = true;
    const saveBtn = this.element.querySelector(
      "#save-profile-btn"
    ) as HTMLButtonElement;
    const displayNameInput = this.element.querySelector(
      "#display-name"
    ) as HTMLInputElement;

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const displayName = displayNameInput.value.trim();

      if (!displayName) {
        Toast.error("Display name is required");
        return;
      }

      const response = await profileAPI.updateProfile({
        display_name: displayName,
      });

      this.user = response.user;
      localStorage.setItem("user", JSON.stringify(this.user));

      Toast.success("Profile updated successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Update error";
      Toast.error(errorMessage);
    } finally {
      this.isUpdatingProfile = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }

  private setupPasswordForm(): void {
    const form = this.element.querySelector(
      "#password-form"
    ) as HTMLFormElement;

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handlePasswordChange();
      });
    }
  }

  private async handlePasswordChange(): Promise<void> {
    if (this.isChangingPassword) return;

    this.isChangingPassword = true;
    const changeBtn = this.element.querySelector(
      "#change-password-btn"
    ) as HTMLButtonElement;
    const currentPasswordInput = this.element.querySelector(
      "#current-password"
    ) as HTMLInputElement;
    const newPasswordInput = this.element.querySelector(
      "#new-password"
    ) as HTMLInputElement;
    const confirmPasswordInput = this.element.querySelector(
      "#confirm-password"
    ) as HTMLInputElement;

    try {
      changeBtn.disabled = true;
      changeBtn.textContent = "Changing...";

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (newPassword !== confirmPassword) {
        Toast.error("New passwords do not match");
        return;
      }

      if (newPassword.length < 8) {
        Toast.error("New password must be at least 8 characters long");
        return;
      }

      await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      currentPasswordInput.value = "";
      newPasswordInput.value = "";
      confirmPasswordInput.value = "";

      Toast.success("Password changed successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Password change error";
      Toast.error(errorMessage);
    } finally {
      this.isChangingPassword = false;
      changeBtn.disabled = false;
      changeBtn.textContent = "Change Password";
    }
  }
}

export async function createProfileEditPage(): Promise<HTMLElement> {
  const page = new ProfileEditPage();
  return page.render();
}
