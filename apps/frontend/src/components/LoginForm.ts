import { authAPI, type LoginData } from "../api/auth";
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
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>

        <form class="space-y-6">
          <div>
            <label for="login-email" class="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="login-email"
              name="email"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label for="login-password" class="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <div class="flex items-center justify-between">
            <a href="#forgot-password" class="text-sm text-gray-400 hover:text-white transition-colors">
              Forgot your password?
            </a>
          </div>

          <button
            type="submit"
            class="w-full bg-white text-black py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span class="button-text">Sign In</span>
            <div class="spinner hidden ml-2"></div>
          </button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-400">Don't have an account? </span>
          <a href="#register" class="text-white hover:text-gray-300 font-medium transition-colors">
            Sign up
          </a>
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

      console.log("LoginForm elements:", {
        emailInput: this.emailInput,
        passwordInput: this.passwordInput,
        submitButton: this.submitButton,
      });
    }, 0);
  }

  private setupEventListeners(): void {
    setTimeout(() => {
      const form = this.element.querySelector("form") as HTMLFormElement;
      if (form) {
        form.addEventListener("submit", (e) => {
          console.log("Form submit event triggered");
          this.handleSubmit(e);
        });
        console.log("Form event listener added");
      } else {
        console.error("Form not found in LoginForm");
      }

      const forgotPasswordLink = this.element.querySelector(
        'a[href="#forgot-password"]'
      ) as HTMLAnchorElement;
      if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("Forgot password link clicked");
          window.dispatchEvent(
            new CustomEvent("navigate", {
              detail: { path: "/forgot-password" },
            })
          );
        });
      }

      const registerLink = this.element.querySelector(
        'a[href="#register"]'
      ) as HTMLAnchorElement;
      if (registerLink) {
        registerLink.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("Register link clicked");
          window.dispatchEvent(
            new CustomEvent("navigate", { detail: { path: "/register" } })
          );
        });
      }
    }, 0);
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    console.log("handleSubmit called");

    if (this.isLoading) {
      console.log("Already loading, returning");
      return;
    }

    if (!this.emailInput || !this.passwordInput) {
      console.error("Form inputs not found");
      Toast.error("Form not ready, please try again");
      return;
    }

    const formData: LoginData = {
      email: this.emailInput.value.trim(),
      password: this.passwordInput.value,
    };

    console.log("Form data:", {
      email: formData.email,
      hasPassword: !!formData.password,
    });

    if (!formData.email || !formData.password) {
      Toast.error("Please fill in all fields");
      return;
    }

    this.setLoading(true);

    try {
      console.log("Attempting login...");
      const response = await authAPI.login(formData);
      console.log("Login successful:", response);

      authAPI.setAuth(response.accessToken, response.user);

      try {
        const userResponse = await authAPI.getMe();
        authAPI.setAuth(response.accessToken, userResponse.user);
      } catch (error) {
        console.error("Failed to refresh user data after login:", error);
      }

      Toast.success("Login successful!");

      if (this.onLoginSuccess) {
        this.onLoginSuccess(response);
      }

      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { path: "/dashboard" } })
      );
    } catch (error) {
      console.error("Login failed:", error);
      Toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (!this.submitButton) {
      console.error("Submit button not found");
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
