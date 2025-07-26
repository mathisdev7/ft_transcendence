import { authAPI } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class RegisterPage extends BaseComponent {
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
            Join the Ultimate Gaming Experience
          </p>
        </div>

        <div class="card">
          <div class="card-header text-center">
            <h2 class="card-title">
              Create Account
            </h2>
            <p class="card-description">
              Start your journey in the world of Pong
            </p>
          </div>

          <div class="card-content">
            <form id="register-form" class="space-y-6">
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
                  minlength="6"
                  class="input"
                  placeholder="Create a secure password"
                />
              </div>

              <div>
                <label for="confirmPassword" class="label block mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minlength="6"
                  class="input"
                  placeholder="Confirm your password"
                />
              </div>

              <div class="card bg-muted">
                <div class="card-content">
                  <h4 class="text-sm font-semibold text-foreground mb-3">
                    🔒 Password Requirements
                  </h4>
                  <ul class="text-sm text-muted-foreground space-y-2">
                    <li class="flex items-center">
                      <span class="text-success mr-3 text-lg">✓</span>
                      At least 6 characters long
                    </li>
                    <li class="flex items-center">
                      <span class="text-success mr-3 text-lg">✓</span>
                      Must match confirmation
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="submit"
                id="register-btn"
                class="btn btn-primary w-full font-bold text-lg ${
                  this.isLoading ? "opacity-50" : ""
                }"
                ${this.isLoading ? "disabled" : ""}
              >
                ${this.isLoading ? "Creating Account..." : "🚀 Create Account"}
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
                    Already have an account?
                  </p>
                  <button
                    id="login-link"
                    class="btn btn-secondary font-semibold"
                  >
                    🔑 Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <p class="text-muted-foreground text-sm">
            © 2025 Transcendence • Built by mazeghou, nopareti, bepoisso, hduflos, mpeyre-s
          </p>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector(
      "#register-form"
    ) as HTMLFormElement;
    const loginLink = this.element.querySelector(
      "#login-link"
    ) as HTMLButtonElement;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });

    loginLink?.addEventListener("click", () => {
      navigateToView(ViewType.LOGIN);
    });
  }

  private async handleRegister(): Promise<void> {
    if (this.isLoading) return;

    const form = this.element.querySelector(
      "#register-form"
    ) as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password || !confirmPassword) {
      Toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Toast.error("Passwords do not match");
      return;
    }

    this.setLoading(true);

    try {
      const response = await authAPI.register({ email, password });

      Toast.success(
        response.message ||
          "Registration successful! Please check your email for verification."
      );
      navigateToView(ViewType.LOGIN);
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      Toast.error(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    const submitBtn = this.element.querySelector(
      "#register-btn"
    ) as HTMLButtonElement;
    const inputs = this.element.querySelectorAll(
      "input"
    ) as NodeListOf<HTMLInputElement>;

    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading
        ? "Creating Account..."
        : "🚀 Create Account";

      if (loading) {
        submitBtn.classList.add("opacity-50");
      } else {
        submitBtn.classList.remove("opacity-50");
      }
    }

    inputs.forEach((input) => {
      input.disabled = loading;
    });
  }
}

export async function createRegisterPage(): Promise<HTMLElement> {
  const page = new RegisterPage();
  return page.render();
}
