import { authAPI, type ForgotPasswordData } from "../api/auth";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class ForgotPasswordForm extends BaseComponent {
  private emailInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private isLoading = false;

  constructor() {
    super("div", "w-full max-w-md mx-auto");
  }

  protected init(): void {
    this.renderForm();
    this.setupEventListeners();
  }

  private renderForm(): void {
    this.element.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">Reset Password</h2>

        <div class="mb-6 text-center">
          <p class="text-gray-400 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-white text-black py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="button-text">Send Reset Link</span>
            <div class="spinner hidden"></div>
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="#login" class="text-gray-400 hover:text-white transition-colors">
            Back to Sign In
          </a>
        </div>
      </div>
    `;

    this.emailInput = this.element.querySelector("#email") as HTMLInputElement;
    this.submitButton = this.element.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector("form") as HTMLFormElement;
    form.addEventListener("submit", (e) => this.handleSubmit(e));

    const loginLink = this.element.querySelector(
      'a[href="#login"]'
    ) as HTMLAnchorElement;
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { path: "/login" } })
      );
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isLoading) return;

    const email = this.emailInput.value.trim();

    if (!email) {
      Toast.error("Please enter your email address");
      return;
    }

    const formData: ForgotPasswordData = { email };

    this.setLoading(true);

    try {
      const response = await authAPI.forgotPassword(formData);

      Toast.success(response.message);

      this.emailInput.value = "";
    } catch (error) {
      console.error("Forgot password failed:", error);
      Toast.error(
        error instanceof Error ? error.message : "Failed to send reset link"
      );
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const buttonText = this.submitButton.querySelector(
      ".button-text"
    ) as HTMLElement;
    const spinner = this.submitButton.querySelector(".spinner") as HTMLElement;

    if (loading) {
      buttonText.classList.add("hidden");
      spinner.classList.remove("hidden");
      this.submitButton.disabled = true;
    } else {
      buttonText.classList.remove("hidden");
      spinner.classList.add("hidden");
      this.submitButton.disabled = false;
    }
  }

  public reset(): void {
    this.emailInput.value = "";
    this.setLoading(false);
  }
}
