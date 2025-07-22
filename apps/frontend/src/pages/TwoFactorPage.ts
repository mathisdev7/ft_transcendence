import { authAPI } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";
import { Toast } from "../components/Toast";
import { navigateToView, ViewType } from "../utils/navigation";

export class TwoFactorPage extends BaseComponent {
  private userId: number | null = null;
  private email: string = "";

  constructor() {
    super("div", "min-h-screen bg-background");
  }

  protected init(): void {
    let storedUserId = sessionStorage.getItem("twoFactorUserId");
    let storedEmail = sessionStorage.getItem("twoFactorEmail");

    if (!storedUserId || !storedEmail) {
      const hash = window.location.hash;

      if (hash.includes("?")) {
        const queryString = hash.split("?")[1];
        const urlParams = new URLSearchParams(queryString);
        const userIdParam = urlParams.get("userId");
        const emailParam = urlParams.get("email");

        if (userIdParam && emailParam) {
          storedUserId = userIdParam;
          storedEmail = emailParam;
          sessionStorage.setItem("twoFactorUserId", userIdParam);
          sessionStorage.setItem("twoFactorEmail", emailParam);
        }
      }
    }

    if (storedUserId && storedEmail) {
      this.userId = parseInt(storedUserId);
      this.email = storedEmail;
    } else {
      Toast.error("Session expired. Please login again.");
      navigateToView(ViewType.LOGIN);
      return;
    }

    this.renderPage();
    this.setupEventListeners();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="container-responsive py-8 px-4">
        <div class="max-w-md mx-auto">
          <div class="card">
            <div class="card-header text-center">
              <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-2">Two-Factor Authentication</h1>
              <p class="text-muted-foreground">Enter the verification code sent to your email</p>
            </div>
            <div class="card-content">
              <div class="text-center mb-6">
                <div class="text-4xl mb-4">📧</div>
                <p class="text-sm text-muted-foreground">
                  We've sent a 6-digit code to <br>
                  <span class="font-semibold text-foreground">${this.email}</span>
                </p>
              </div>

              <form id="two-factor-form" class="space-y-6">
                <div>
                  <label for="verification-code" class="block text-sm font-medium text-foreground mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="verification-code"
                    class="w-full px-4 py-3 border border-border rounded-md bg-background text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="000000"
                    maxlength="6"
                    pattern="[0-9]{6}"
                    autocomplete="one-time-code"
                    required
                  >
                  <p class="text-xs text-muted-foreground mt-2">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <button
                  type="submit"
                  id="verify-button"
                  class="w-full btn btn-primary font-semibold text-lg"
                >
                  Verify Code
                </button>
              </form>

              <div class="text-center mt-6 space-y-3">
                <p class="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <div class="flex flex-col sm:flex-row gap-3">
                  <button
                    id="resend-code"
                    class="btn btn-secondary flex-1 text-sm"
                  >
                    Resend Code
                  </button>
                  <button
                    id="back-to-login"
                    class="btn btn-ghost flex-1 text-sm"
                  >
                    Back to Login
                  </button>
                </div>
              </div>

              <div class="mt-6 p-4 bg-muted rounded-lg">
                <div class="flex items-start space-x-3">
                  <div class="text-primary mt-0.5">ℹ️</div>
                  <div class="text-sm text-muted-foreground">
                    <p class="font-semibold text-foreground mb-1">Security Notice</p>
                    <p>This code will expire in 10 minutes. If you didn't request this login, please ignore the email and consider changing your password.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector(
      "#two-factor-form"
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
    });

    codeInput?.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
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
      this.handleBackToLogin();
    });
  }

  private async handleVerifyCode(): Promise<void> {
    if (!this.userId) {
      const storedUserId = sessionStorage.getItem("twoFactorUserId");
      if (storedUserId) {
        this.userId = parseInt(storedUserId);
      }
    }

    if (!this.userId) {
      Toast.error("Session expired. Please login again.");
      navigateToView(ViewType.LOGIN);
      return;
    }

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
      await authAPI.verifyTwoFactor(this.userId, code);

      sessionStorage.removeItem("twoFactorUserId");
      sessionStorage.removeItem("twoFactorEmail");

      Toast.success("Login successful!");

      setTimeout(() => {
        navigateToView(ViewType.DASHBOARD);
      }, 100);
    } catch (error: any) {
      Toast.error(error.message || "Invalid verification code");
      codeInput.value = "";
      codeInput.focus();
    } finally {
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify Code";
    }
  }

  private async handleResendCode(): Promise<void> {
    if (!this.userId) {
      Toast.error("Session expired. Please login again.");
      navigateToView(ViewType.LOGIN);
      return;
    }

    const resendButton = this.element.querySelector(
      "#resend-code"
    ) as HTMLButtonElement;

    resendButton.disabled = true;
    resendButton.textContent = "Sending...";

    try {
      Toast.info(
        "Please return to login page and try signing in again to receive a new code"
      );

      setTimeout(() => {
        navigateToView(ViewType.LOGIN);
      }, 2000);
    } catch (error: any) {
      Toast.error(error.message || "Failed to resend code");
    } finally {
      resendButton.disabled = false;
      resendButton.textContent = "Resend Code";
    }
  }

  private handleBackToLogin(): void {
    sessionStorage.removeItem("twoFactorUserId");
    sessionStorage.removeItem("twoFactorEmail");

    navigateToView(ViewType.LOGIN);
  }
}

export async function createTwoFactorPage(): Promise<HTMLElement> {
  const page = new TwoFactorPage();
  return page.render();
}
