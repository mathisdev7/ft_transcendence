import { authAPI } from "../api/auth";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class VerifyEmailForm extends BaseComponent {
  private token: string;

  constructor(token: string) {
    super("div", "w-full max-w-md mx-auto");
    this.token = token;

    setTimeout(() => {
      this.verifyEmail();
    }, 0);
  }

  protected init(): void {
    this.renderForm();
  }

  private renderForm(): void {
    this.element.innerHTML = `
      <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-white mb-6">Email Verification</h2>

          <div id="verification-content">
            <div class="flex items-center justify-center mb-4">
              <div class="spinner"></div>
            </div>
            <p class="text-gray-400">Verifying your email address...</p>
          </div>

          <div id="success-content" class="hidden">
            <div class="text-green-400 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-white font-medium mb-2">Email Verified Successfully!</p>
            <p class="text-gray-400 mb-6">Your email has been verified. You can now sign in to your account.</p>
            <button id="go-to-login" class="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors">
              Go to Sign In
            </button>
          </div>

          <div id="error-content" class="hidden">
            <div class="text-red-400 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p class="text-white font-medium mb-2">Verification Failed</p>
            <p class="text-gray-400 mb-6" id="error-message">The verification link is invalid or has expired.</p>
            <div class="space-y-3">
              <button id="resend-verification" class="w-full bg-gray-700 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                <span class="resend-text">Resend Verification Email</span>
                <div class="spinner hidden ml-2"></div>
              </button>
              <button id="go-to-register" class="w-full bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors">
                Back to Registration
              </button>
            </div>
          </div>

          <div id="resend-form" class="hidden">
            <div class="text-yellow-400 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <p class="text-white font-medium mb-2">Resend Verification Email</p>
            <p class="text-gray-400 mb-6">Enter your email address to receive a new verification link.</p>

            <div class="space-y-4">
              <input
                type="email"
                id="resend-email"
                placeholder="Enter your email"
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              />
              <div class="flex space-x-3">
                <button id="send-verification" class="flex-1 bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                  <span class="send-text">Send Email</span>
                  <div class="spinner hidden ml-2"></div>
                </button>
                <button id="cancel-resend" class="flex-1 bg-gray-700 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const loginBtn = this.element.querySelector(
      "#go-to-login"
    ) as HTMLButtonElement;
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        window.dispatchEvent(
          new CustomEvent("navigate", { detail: { path: "/login" } })
        );
      });
    }

    const registerBtn = this.element.querySelector(
      "#go-to-register"
    ) as HTMLButtonElement;
    if (registerBtn) {
      registerBtn.addEventListener("click", () => {
        window.dispatchEvent(
          new CustomEvent("navigate", { detail: { path: "/register" } })
        );
      });
    }

    const resendBtn = this.element.querySelector(
      "#resend-verification"
    ) as HTMLButtonElement;
    if (resendBtn) {
      resendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showResendForm();
      });
    }

    const sendBtn = this.element.querySelector(
      "#send-verification"
    ) as HTMLButtonElement;
    if (sendBtn) {
      sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleResendVerification();
      });
    }

    const cancelBtn = this.element.querySelector(
      "#cancel-resend"
    ) as HTMLButtonElement;
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showError("The verification link is invalid or has expired.");
      });
    }

    const emailInput = this.element.querySelector(
      "#resend-email"
    ) as HTMLInputElement;
    if (emailInput) {
      emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleResendVerification();
        }
      });
    }
  }

  private async verifyEmail(): Promise<void> {
    if (!this.token) {
      this.showError("No verification token found");
      return;
    }

    try {
      await authAPI.verifyEmail({ token: this.token });
      this.showSuccess();
      Toast.success("Email verified successfully!");
    } catch (error) {
      console.error("Email verification failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Verification failed";
      this.showError(errorMessage);
      Toast.error(errorMessage);
    }
  }

  private showResendForm(): void {
    const errorContent = this.element.querySelector(
      "#error-content"
    ) as HTMLElement;
    const resendForm = this.element.querySelector(
      "#resend-form"
    ) as HTMLElement;

    if (errorContent) {
      errorContent.classList.add("hidden");
    }
    if (resendForm) {
      resendForm.classList.remove("hidden");
    }

    const emailInput = this.element.querySelector(
      "#resend-email"
    ) as HTMLInputElement;
    if (emailInput) {
      emailInput.focus();
    } else {
    }
  }

  private async handleResendVerification(): Promise<void> {
    const emailInput = this.element.querySelector(
      "#resend-email"
    ) as HTMLInputElement;
    const sendBtn = this.element.querySelector(
      "#send-verification"
    ) as HTMLButtonElement;
    const sendText = sendBtn?.querySelector(".send-text") as HTMLElement;
    const spinner = sendBtn?.querySelector(".spinner") as HTMLElement;

    if (!emailInput || !sendBtn || !sendText || !spinner) {
      return;
    }

    const email = emailInput.value.trim();

    if (!email) {
      Toast.error("Please enter your email address");
      emailInput.focus();
      return;
    }

    if (!this.isValidEmail(email)) {
      Toast.error("Please enter a valid email address");
      emailInput.focus();
      return;
    }

    sendText.classList.add("hidden");
    spinner.classList.remove("hidden");
    sendBtn.disabled = true;

    try {
      const response = await authAPI.resendVerification({ email });
      Toast.success(response.message);

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("navigate", { detail: { path: "/login" } })
        );
      }, 2000);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send email";
      Toast.error(errorMessage);
    } finally {
      sendText.classList.remove("hidden");
      spinner.classList.add("hidden");
      sendBtn.disabled = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showSuccess(): void {
    const verificationContent = this.element.querySelector(
      "#verification-content"
    ) as HTMLElement;
    const successContent = this.element.querySelector(
      "#success-content"
    ) as HTMLElement;
    const errorContent = this.element.querySelector(
      "#error-content"
    ) as HTMLElement;
    const resendForm = this.element.querySelector(
      "#resend-form"
    ) as HTMLElement;

    verificationContent.classList.add("hidden");
    errorContent.classList.add("hidden");
    resendForm.classList.add("hidden");
    successContent.classList.remove("hidden");
  }

  private showError(message: string): void {
    const verificationContent = this.element.querySelector(
      "#verification-content"
    ) as HTMLElement;
    const successContent = this.element.querySelector(
      "#success-content"
    ) as HTMLElement;
    const errorContent = this.element.querySelector(
      "#error-content"
    ) as HTMLElement;
    const resendForm = this.element.querySelector(
      "#resend-form"
    ) as HTMLElement;
    const errorMessage = this.element.querySelector(
      "#error-message"
    ) as HTMLElement;

    verificationContent.classList.add("hidden");
    successContent.classList.add("hidden");
    resendForm.classList.add("hidden");
    errorContent.classList.remove("hidden");

    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }
}
