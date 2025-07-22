import { authAPI, type ForgotPasswordData } from "../api/auth";
import { navigateToView, ViewType } from "../utils/navigation";
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
      <div class="card">
        <div class="card-header text-center">
          <h2 class="card-title">Reset Password</h2>
          <p class="card-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div class="card-content">
          <form class="space-y-6">
            <div>
              <label for="email" class="label block mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                class="input"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
            >
              <span class="button-text">📧 Send Reset Link</span>
              <div class="spinner hidden ml-2"></div>
            </button>
          </form>
        </div>

        <div class="card-footer">
          <div class="text-center">
            <a href="#login" class="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Back to Sign In
            </a>
          </div>
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
      navigateToView(ViewType.LOGIN);
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
