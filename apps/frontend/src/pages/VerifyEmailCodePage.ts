import { authAPI } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class VerifyEmailCodePage extends BaseComponent {
  private email: string = "";

  constructor() {
    super("div", "min-h-screen flex items-center justify-center bg-black px-4");
  }

  protected init(): void {
    const storedEmail = sessionStorage.getItem("verificationEmail");

    if (!storedEmail) {
      Toast.error("No email found for verification");
      navigateToView(ViewType.LOGIN);
      return;
    }

    this.email = storedEmail;
    this.renderPage();
    this.setupEventListeners();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="w-full max-w-md mx-auto">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
            <p class="text-gray-400">Enter the 6-digit code sent to</p>
            <p class="text-white font-medium">${this.email}</p>
          </div>

          <form id="verify-email-form" class="space-y-6">
            <div>
              <input
                type="text"
                id="verification-code"
                placeholder="Enter 6-digit code"
                maxlength="6"
                class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 text-center text-2xl tracking-wider focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              id="verify-button"
              class="w-full bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Verify Email
            </button>
          </form>

          <div class="text-center mt-6 space-y-3">
            <button
              id="resend-code"
              class="text-gray-400 hover:text-white transition-colors"
            >
              Resend Code
            </button>
            <button
              id="back-to-login"
              class="block w-full text-gray-400 hover:text-white transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector(
      "#verify-email-form"
    ) as HTMLFormElement;
    const codeInput = this.element.querySelector(
      "#verification-code"
    ) as HTMLInputElement;
    const resendButton = this.element.querySelector(
      "#resend-code"
    ) as HTMLButtonElement;
    const backButton = this.element.querySelector(
      "#back-to-login"
    ) as HTMLButtonElement;

    codeInput?.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, "");

      if (target.value.length === 6) {
        form?.requestSubmit();
      }
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleVerifyCode();
    });

    resendButton?.addEventListener("click", () => {
      this.handleResendCode();
    });

    backButton?.addEventListener("click", () => {
      navigateToView(ViewType.LOGIN);
    });
  }

  private async handleVerifyCode(): Promise<void> {
    const codeInput = this.element.querySelector(
      "#verification-code"
    ) as HTMLInputElement;
    const verifyButton = this.element.querySelector(
      "#verify-button"
    ) as HTMLButtonElement;
    const code = codeInput.value.trim();

    if (code.length !== 6) {
      Toast.error("Please enter a 6-digit code");
      return;
    }

    verifyButton.disabled = true;
    verifyButton.textContent = "Verifying...";

    try {
      await authAPI.verifyEmailCode({
        email: sessionStorage.getItem("verificationEmail") || "",
        code,
      });

      sessionStorage.removeItem("verificationEmail");
      Toast.success("Email verified successfully!");

      setTimeout(() => {
        navigateToView(ViewType.LOGIN);
      }, 1000);
    } catch (error: any) {
      Toast.error(error.message || "Invalid verification code");
      codeInput.value = "";
      codeInput.focus();
    } finally {
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify Email";
    }
  }

  private async handleResendCode(): Promise<void> {
    const resendButton = this.element.querySelector(
      "#resend-code"
    ) as HTMLButtonElement;

    resendButton.disabled = true;
    resendButton.textContent = "Sending...";

    try {
      await authAPI.resendVerification({
        email: sessionStorage.getItem("verificationEmail") || "",
      });
      Toast.success("New verification code sent");
    } catch (error: any) {
      Toast.error(error.message || "Failed to resend code");
    } finally {
      resendButton.disabled = false;
      resendButton.textContent = "Resend Code";
    }
  }
}

export async function createVerifyEmailCodePage(): Promise<HTMLElement> {
  const page = new VerifyEmailCodePage();
  return page.render();
}
