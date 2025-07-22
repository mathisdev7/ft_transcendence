import { authAPI } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class LoginPage extends BaseComponent {
  private isLoading = false;

  constructor() {
    super(
      "div",
      "min-h-screen bg-background flex items-center justify-center p-4"
    );
  }

  protected init(): void {
    this.renderPage();
    this.setupEventListeners();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="w-full max-w-md mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            TRANSCENDENCE
          </h1>
          <p class="text-muted-foreground text-base sm:text-lg">
            Classic Pong • Modern Experience
          </p>
        </div>

        <div class="card">
          <div class="card-header text-center">
            <h2 class="card-title">
              Welcome Back
            </h2>
            <p class="card-description">
              Sign in to continue your gaming journey
            </p>
          </div>

          <div class="card-content">
            <form id="login-form" class="space-y-6">
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

              <div>
                <label for="password" class="label block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  class="input"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                id="login-btn"
                class="btn btn-primary w-full font-bold text-lg ${
                  this.isLoading ? "opacity-50" : ""
                }"
                ${this.isLoading ? "disabled" : ""}
              >
                ${this.isLoading ? "Signing In..." : "🚀 Sign In"}
              </button>
            </form>
          </div>

          <div class="card-footer">
            <div class="w-full">
              <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-border"></div>
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <div class="card bg-muted text-center">
                <div class="card-content">
                  <p class="text-muted-foreground mb-3">
                    New to Transcendence?
                  </p>
                  <button
                    id="register-link"
                    class="btn btn-success font-semibold"
                  >
                    ✨ Create Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <p class="text-muted-foreground text-sm">
            © 2024 Transcendence • Built with ❤️ for gamers
          </p>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector("#login-form") as HTMLFormElement;
    const registerLink = this.element.querySelector(
      "#register-link"
    ) as HTMLButtonElement;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    registerLink?.addEventListener("click", () => {
      navigateToView(ViewType.REGISTER);
    });
  }

  private async handleLogin(): Promise<void> {
    if (this.isLoading) return;

    const form = this.element.querySelector("#login-form") as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      Toast.error("Please fill in all fields");
      return;
    }

    this.setLoading(true);

    try {
      const response = await authAPI.login({ email, password });

      if (response.requiresTwoFactor) {
        sessionStorage.setItem("twoFactorUserId", response.userId.toString());
        sessionStorage.setItem("twoFactorEmail", email);

        Toast.info("Verification code sent to your email");

        navigateToView(ViewType.TWO_FACTOR);
      } else {
        Toast.success("Login successful!");
        navigateToView(ViewType.DASHBOARD);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      if (errorMessage.includes("email not verified")) {
        this.showEmailNotVerifiedError(email);
      } else {
        Toast.error(errorMessage);
      }
    } finally {
      this.setLoading(false);
    }
  }

  private showEmailNotVerifiedError(email: string): void {
    const errorContainer = document.createElement("div");
    errorContainer.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    errorContainer.innerHTML = `
      <div class="bg-background border border-border rounded-lg p-6 max-w-md mx-4">
        <div class="text-center">
          <div class="text-4xl mb-4">📧</div>
          <h3 class="text-xl font-bold text-foreground mb-2">Email Not Verified</h3>
          <p class="text-muted-foreground mb-6">
            Please verify your email address before logging in.
            We can send you a new verification link.
          </p>
          <div class="space-y-3">
            <button id="resend-verification" class="w-full btn btn-primary">
              Send Verification Email
            </button>
            <button id="close-modal" class="w-full btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(errorContainer);

    const resendBtn = errorContainer.querySelector(
      "#resend-verification"
    ) as HTMLButtonElement;
    const closeBtn = errorContainer.querySelector(
      "#close-modal"
    ) as HTMLButtonElement;

    resendBtn?.addEventListener("click", async () => {
      resendBtn.disabled = true;
      resendBtn.textContent = "Sending...";

      try {
        await authAPI.resendVerification({ email });
        Toast.success("Verification email sent! Check your inbox.");
        document.body.removeChild(errorContainer);
      } catch (error: any) {
        Toast.error(error.message || "Failed to send verification email");
        resendBtn.disabled = false;
        resendBtn.textContent = "Send Verification Email";
      }
    });

    closeBtn?.addEventListener("click", () => {
      document.body.removeChild(errorContainer);
    });

    errorContainer.addEventListener("click", (e) => {
      if (e.target === errorContainer) {
        document.body.removeChild(errorContainer);
      }
    });
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    const submitBtn = this.element.querySelector(
      "#login-btn"
    ) as HTMLButtonElement;
    const emailInput = this.element.querySelector("#email") as HTMLInputElement;
    const passwordInput = this.element.querySelector(
      "#password"
    ) as HTMLInputElement;

    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? "Signing In..." : "🚀 Sign In";

      if (loading) {
        submitBtn.classList.add("opacity-50");
      } else {
        submitBtn.classList.remove("opacity-50");
      }
    }

    if (emailInput) emailInput.disabled = loading;
    if (passwordInput) passwordInput.disabled = loading;
  }
}

export async function createLoginPage(): Promise<HTMLElement> {
  const page = new LoginPage();
  return page.render();
}
