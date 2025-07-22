import { authAPI, type RegisterData } from "../api/auth";
import { navigateToView, ViewType } from "../utils/navigation";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class RegisterForm extends BaseComponent {
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private confirmPasswordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private isLoading = false;

  public onRegisterSuccess?: (response: any) => void;

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
          <h2 class="card-title">Create Account</h2>
          <p class="card-description">Join the Transcendence community</p>
        </div>

        <div class="card-content">
          <form class="space-y-6">
            <div>
              <label for="register-email" class="label block mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="register-email"
                name="email"
                required
                class="input"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label for="register-password" class="label block mb-2">
                Password
              </label>
              <input
                type="password"
                id="register-password"
                name="password"
                required
                class="input"
                placeholder="Enter your password (min 8 characters)"
              />
            </div>

            <div>
              <label for="register-confirmPassword" class="label block mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="register-confirmPassword"
                name="confirmPassword"
                required
                class="input"
                placeholder="Confirm your password"
              />
            </div>

            <div class="text-xs text-muted-foreground">
              By creating an account, you agree to our terms of service and privacy policy.
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
            >
              <span class="button-text">✨ Create Account</span>
              <div class="spinner hidden ml-2"></div>
            </button>
          </form>
        </div>

        <div class="card-footer">
          <p class="text-center text-muted-foreground text-sm">
            Already have an account?
            <a href="#login" class="text-foreground hover:underline font-medium ml-1">
              Sign in
            </a>
          </p>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.emailInput = this.element.querySelector(
        "#register-email"
      ) as HTMLInputElement;
      this.passwordInput = this.element.querySelector(
        "#register-password"
      ) as HTMLInputElement;
      this.confirmPasswordInput = this.element.querySelector(
        "#register-confirmPassword"
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
        console.error("Form not found in RegisterForm");
      }

      const loginLink = this.element.querySelector(
        'a[href="#login"]'
      ) as HTMLAnchorElement;
      if (loginLink) {
        loginLink.addEventListener("click", (e) => {
          e.preventDefault();
          navigateToView(ViewType.LOGIN);
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

    if (this.isLoading) {
      return;
    }

    if (!this.emailInput || !this.passwordInput || !this.confirmPasswordInput) {
      Toast.error("Form not ready, please try again");
      return;
    }

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;

    if (!email || !password || !confirmPassword) {
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

    const formData: RegisterData = {
      email,
      password,
    };

    this.setLoading(true);

    try {
      const response = await authAPI.register(formData);

      Toast.success(
        "Account created successfully! Please check your email to verify your account."
      );

      if (this.onRegisterSuccess) {
        this.onRegisterSuccess(response);
      }

      navigateToView(ViewType.LOGIN);
    } catch (error) {
      Toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
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
    if (this.confirmPasswordInput) this.confirmPasswordInput.value = "";
    this.setLoading(false);
    if (this.passwordInput)
      this.passwordInput.classList.remove("border-red-500");
    if (this.confirmPasswordInput)
      this.confirmPasswordInput.classList.remove("border-red-500");
  }
}
