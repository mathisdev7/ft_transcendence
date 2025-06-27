import type { LoginData } from "../api/auth";
import { authAPI } from "../api/auth";

export class LoginForm {
  private form: HTMLFormElement;
  private emailInput: HTMLInputElement;
  private passwordInput: HTMLInputElement;
  private submitButton: HTMLButtonElement;

  constructor(container: HTMLElement) {
    this.form = this.createForm();
    this.emailInput = this.form.querySelector("#email") as HTMLInputElement;
    this.passwordInput = this.form.querySelector(
      "#password"
    ) as HTMLInputElement;
    this.submitButton = this.form.querySelector("#submit") as HTMLButtonElement;

    this.setupEventListeners();
    container.appendChild(this.form);
  }

  private createForm(): HTMLFormElement {
    const formHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full space-y-8">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              sign in
            </h2>
          </div>
          <form class="mt-8 space-y-6" id="loginForm">
            <div class="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="email address"
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="password"
                />
              </div>
            </div>

            <div>
              <button
                id="submit"
                type="submit"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                sign in
              </button>
            </div>

            <div class="text-center">
              <a href="#" id="switchToRegister" class="text-indigo-600 hover:text-indigo-500">
                don't have an account? sign up
              </a>
            </div>
          </form>
        </div>
      </div>
    `;

    const div = document.createElement("div");
    div.innerHTML = formHTML;
    return div.querySelector("form") as HTMLFormElement;
  }

  private setupEventListeners(): void {
    this.form.addEventListener("submit", this.handleSubmit.bind(this));

    const switchLink = this.form.querySelector(
      "#switchToRegister"
    ) as HTMLAnchorElement;
    switchLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.onSwitchToRegister?.();
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const formData: LoginData = {
      email: this.emailInput.value,
      password: this.passwordInput.value,
    };

    this.setLoading(true);

    try {
      const response = await authAPI.login(formData);

      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("user", JSON.stringify(response.user));

      this.onLoginSuccess?.(response);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading;
    this.submitButton.textContent = loading ? "signing in..." : "sign in";
  }

  public onLoginSuccess?: (response: any) => void;
  public onSwitchToRegister?: () => void;
}
