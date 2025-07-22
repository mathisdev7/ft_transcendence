import { authAPI } from "../api/auth";
import { navigateToView, ViewType } from "../utils/navigation";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class LoginForm extends BaseComponent {
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private isLoading = false;

  public onLoginSuccess?: (response: any) => void;

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
          <h2 class="card-title">Sign In</h2>
          <p class="card-description">Welcome back to Transcendence</p>
        </div>

        <div class="card-content">
          <form class="space-y-6">
            <div>
              <label for="login-email" class="label block mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="login-email"
                name="email"
                required
                class="input"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label for="login-password" class="label block mb-2">
                Password
              </label>
              <input
                type="password"
                id="login-password"
                name="password"
                required
                class="input"
                placeholder="Enter your password"
              />
            </div>

            <div class="flex items-center justify-between">
              <a href="#forgot-password" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Forgot your password?
              </a>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
            >
              <span class="button-text">🚀 Sign In</span>
              <div class="spinner hidden ml-2"></div>
            </button>
          </form>
        </div>

        <div class="card-footer">
          <p class="text-center text-muted-foreground text-sm">
            Don't have an account?
            <button
              type="button"
              id="go-to-register"
              class="text-foreground hover:underline font-medium ml-1"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.emailInput = this.element.querySelector(
        "#login-email"
      ) as HTMLInputElement;
      this.passwordInput = this.element.querySelector(
        "#login-password"
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
        form.addEventListener("submit", (e) => {
          this.handleSubmit(e);
        });
      } else {
        console.error("Form not found in LoginForm");
      }

      const forgotPasswordLink = this.element.querySelector(
        'a[href="#forgot-password"]'
      ) as HTMLAnchorElement;
      if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (e) => {
          e.preventDefault();
          navigateToView(ViewType.FORGOT_PASSWORD);
        });
      }

      const registerLink = this.element.querySelector(
        'button[id="go-to-register"]'
      ) as HTMLButtonElement;
      if (registerLink) {
        registerLink.addEventListener("click", (e) => {
          e.preventDefault();
          navigateToView(ViewType.REGISTER);
        });
      }
    }, 0);
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.isLoading) {
      return;
    }

    if (!this.emailInput || !this.passwordInput) {
      Toast.error("Form not ready, please try again");
      return;
    }

    const formData = {
      email: this.emailInput.value.trim(),
      password: this.passwordInput.value,
    };

    if (!formData.email || !formData.password) {
      Toast.error("Please fill in all fields");
      return;
    }

    this.setLoading(true);

    try {
      const response = await authAPI.login(formData);

      if (response.requiresTwoFactor) {
        sessionStorage.setItem("twoFactorUserId", response.userId.toString());
        sessionStorage.setItem("twoFactorEmail", formData.email);

        Toast.info("Verification code sent to your email");

        navigateToView(ViewType.TWO_FACTOR);
      } else {
        Toast.success("Login successful!");

        if (this.onLoginSuccess) {
          this.onLoginSuccess({
            message: "Login successful",
            accessToken: "",
            user: {} as any,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      if (errorMessage.includes("email not verified")) {
        if (error && (error as any).requiresEmailVerification) {
          const errorData = error as any;
          if (errorData.email) {
            sessionStorage.setItem("verificationEmail", errorData.email);
            Toast.info(
              errorData.message ||
                "A verification code has been sent to your email"
            );
            navigateToView(ViewType.VERIFY_EMAIL_CODE);
            return;
          }
        }
        sessionStorage.setItem("verificationEmail", formData.email);
        Toast.info("Please verify your email with the 6-digit code");
        navigateToView(ViewType.VERIFY_EMAIL_CODE);
      } else {
        Toast.error(errorMessage);
      }
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (!this.submitButton) {
      return;
    }

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
    if (this.emailInput) this.emailInput.value = "";
    if (this.passwordInput) this.passwordInput.value = "";
    this.setLoading(false);
  }
}
