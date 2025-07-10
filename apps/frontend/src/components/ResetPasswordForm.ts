import { authAPI, type ResetPasswordData } from "../api/auth";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class ResetPasswordForm extends BaseComponent {
  private passwordInput!: HTMLInputElement;
  private confirmPasswordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private token: string;
  private isLoading = false;

  constructor(token: string) {
    super("div", "w-full max-w-md mx-auto");
    this.token = token;
  }

  protected init(): void {
    this.renderForm();
    this.setupEventListeners();
  }

  private renderForm(): void {
    this.element.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">Reset Password</h2>

        <form class="space-y-6">
          <div>
            <label for="reset-password" class="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="reset-password"
              name="password"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter new password (min 8 characters)"
            />
          </div>

          <div>
            <label for="reset-confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="reset-confirmPassword"
              name="confirmPassword"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-white text-black py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span class="button-text">Reset Password</span>
            <div class="spinner hidden ml-2"></div>
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="#login" class="text-gray-400 hover:text-white transition-colors">
            Back to Sign In
          </a>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.passwordInput = this.element.querySelector(
        "#reset-password"
      ) as HTMLInputElement;
      this.confirmPasswordInput = this.element.querySelector(
        "#reset-confirmPassword"
      ) as HTMLInputElement;
      this.submitButton = this.element.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
    }, 0);
  }

  private setupEventListeners(): void {
    setTimeout(() => {
      const form = this.element.querySelector("form") as HTMLFormElement;
      if (form) {
        form.addEventListener("submit", (e) => this.handleSubmit(e));
      }

      const loginLink = this.element.querySelector(
        'a[href="#login"]'
      ) as HTMLAnchorElement;
      if (loginLink) {
        loginLink.addEventListener("click", (e) => {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("navigate", { detail: { path: "/login" } })
          );
        });
      }

      if (this.passwordInput) {
        this.passwordInput.addEventListener("input", () =>
          this.validatePasswords()
        );
      }
      if (this.confirmPasswordInput) {
        this.confirmPasswordInput.addEventListener("input", () =>
          this.validatePasswords()
        );
      }
    }, 0);
  }

  private validatePasswords(): void {
    if (!this.passwordInput || !this.confirmPasswordInput) return;

    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;

    if (password.length > 0 && password.length < 8) {
      this.passwordInput.classList.add("border-red-500");
    } else {
      this.passwordInput.classList.remove("border-red-500");
    }

    if (confirmPassword.length > 0 && password !== confirmPassword) {
      this.confirmPasswordInput.classList.add("border-red-500");
    } else {
      this.confirmPasswordInput.classList.remove("border-red-500");
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isLoading) return;

    if (!this.passwordInput || !this.confirmPasswordInput) {
      Toast.error("Form not ready, please try again");
      return;
    }

    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;

    if (!password || !confirmPassword) {
      Toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      Toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Toast.error("Passwords do not match");
      return;
    }

    const formData: ResetPasswordData = {
      token: this.token,
      newPassword: password,
    };

    this.setLoading(true);

    try {
      const response = await authAPI.resetPassword(formData);
      Toast.success(response.message);

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("navigate", { detail: { path: "/login" } })
        );
      }, 2000);
    } catch (error) {
      console.error("Password reset failed:", error);
      Toast.error(
        error instanceof Error ? error.message : "Password reset failed"
      );
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (!this.submitButton) return;

    const buttonText = this.submitButton.querySelector(
      ".button-text"
    ) as HTMLElement;
    const spinner = this.submitButton.querySelector(".spinner") as HTMLElement;

    if (loading) {
      if (buttonText) buttonText.classList.add("hidden");
      if (spinner) spinner.classList.remove("hidden");
      this.submitButton.disabled = true;
    } else {
      if (buttonText) buttonText.classList.remove("hidden");
      if (spinner) spinner.classList.add("hidden");
      this.submitButton.disabled = false;
    }
  }

  public reset(): void {
    if (this.passwordInput) {
      this.passwordInput.value = "";
      this.passwordInput.classList.remove("border-red-500");
    }
    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.value = "";
      this.confirmPasswordInput.classList.remove("border-red-500");
    }
    this.setLoading(false);
  }
}
