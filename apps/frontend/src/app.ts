import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";

export class App {
  private container: HTMLElement;
  private currentForm: LoginForm | RegisterForm | null = null;

  constructor() {
    this.container = document.getElementById("app") as HTMLElement;
    this.init();
  }

  private init(): void {
    this.checkExistingSession();
  }

  private checkExistingSession(): void {
    const accessToken = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.showDashboard(user);
      } catch (error) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        this.showLoginForm();
      }
    } else {
      this.showLoginForm();
    }
  }

  private clearContainer(): void {
    this.container.innerHTML = "";
    this.currentForm = null;
  }

  private showLoginForm(): void {
    this.clearContainer();

    const loginForm = new LoginForm(this.container);

    loginForm.onLoginSuccess = (response) => {
      console.log("user logged in:", response.user);
      this.showDashboard(response.user);
    };

    loginForm.onSwitchToRegister = () => {
      this.showRegisterForm();
    };

    this.currentForm = loginForm;
  }

  private showRegisterForm(): void {
    this.clearContainer();

    const registerForm = new RegisterForm(this.container);

    registerForm.onRegisterSuccess = (response) => {
      console.log("user registered:", response);
      this.showSuccessMessage();
    };

    registerForm.onSwitchToLogin = () => {
      this.showLoginForm();
    };

    this.currentForm = registerForm;
  }

  private showSuccessMessage(): void {
    this.clearContainer();

    const successHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="max-w-md w-full text-center space-y-8">
          <div class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-lg font-medium text-green-800">
                  registration successful!
                </h3>
                <div class="mt-2 text-sm text-green-700">
                  <p>your account has been created successfully.</p>
                </div>
              </div>
            </div>
          </div>
          <button
            id="backToLogin"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            sign in
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = successHTML;

    const backButton = document.getElementById(
      "backToLogin"
    ) as HTMLButtonElement;
    backButton.addEventListener("click", () => {
      this.showLoginForm();
    });
  }

  private showDashboard(user: any): void {
    this.clearContainer();

    const dashboardHTML = `
      <div class="min-h-screen bg-gray-50">
        <nav class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <h1 class="text-xl font-semibold text-gray-900">
                  transcendence
                </h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-700">hello, ${user.display_name}</span>
                <button
                  id="logout"
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            <div class="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div class="text-center">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">
                  welcome to transcendence!
                </h2>
                <p class="text-gray-600">
                  your dashboard will be available soon.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.container.innerHTML = dashboardHTML;

    const logoutButton = document.getElementById("logout") as HTMLButtonElement;
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      this.showLoginForm();
    });
  }
}
