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
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>

        <form class="space-y-6">
          <div>
            <label for="register-email" class="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="register-email"
              name="email"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label for="register-password" class="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="register-password"
              name="password"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Enter your password (min 8 characters)"
            />
          </div>

          <div>
            <label for="register-confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="register-confirmPassword"
              name="confirmPassword"
              required
              class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          <div class="text-xs text-gray-400">
            By creating an account, you agree to our terms of service and privacy policy.
          </div>

          <button
            type="submit"
            class="w-full bg-white text-black py-2 px-4 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span class="button-text">Create Account</span>
            <div class="spinner hidden ml-2"></div>
          </button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-400">Already have an account? </span>
          <a href="#login" class="text-white hover:text-gray-300 font-medium transition-colors">
            Sign in
          </a>
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

      console.log("RegisterForm elements:", {
        emailInput: this.emailInput,
        passwordInput: this.passwordInput,
        confirmPasswordInput: this.confirmPasswordInput,
        submitButton: this.submitButton,
      });
    }, 0);
  }

  private setupEventListeners(): void {
    setTimeout(() => {
      const form = this.element.querySelector("form") as HTMLFormElement;
      if (form) {
        form.addEventListener("submit", (e) => {
          console.log("Register form submit event triggered");
          this.handleSubmit(e);
        });
        console.log("Register form event listener added");
      } else {
        console.error("Form not found in RegisterForm");
      }

      const loginLink = this.element.querySelector(
        'a[href="#login"]'
      ) as HTMLAnchorElement;
      if (loginLink) {
        loginLink.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("Login link clicked");
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
    console.log("Register handleSubmit called");

    if (this.isLoading) {
      console.log("Already loading, returning");
      return;
    }

    if (!this.emailInput || !this.passwordInput || !this.confirmPasswordInput) {
      console.error("Form inputs not found");
      Toast.error("Form not ready, please try again");
      return;
    }

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;

    console.log("Register form data:", {
      email,
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword,
    });

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
      console.log("Attempting registration...");
      const response = await authAPI.register(formData);
      console.log("Registration successful:", response);

      Toast.success(
        "Account created successfully! Please check your email to verify your account."
      );

      if (this.onRegisterSuccess) {
        this.onRegisterSuccess(response);
      }

      navigateToView(ViewType.LOGIN);
    } catch (error) {
      console.error("Registration failed:", error);
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
    if (this.confirmPasswordInput) this.confirmPasswordInput.value = "";
    this.setLoading(false);
    if (this.passwordInput)
      this.passwordInput.classList.remove("border-red-500");
    if (this.confirmPasswordInput)
      this.confirmPasswordInput.classList.remove("border-red-500");
  }
}
