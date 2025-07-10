import { createDashboardPage } from "./pages/DashboardPage";
import { createDocsPage } from "./pages/DocsPage";
import { createForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { createLoginPage } from "./pages/LoginPage";
import { createRegisterPage } from "./pages/RegisterPage";
import { createResetPasswordPage } from "./pages/ResetPasswordPage";
import { createVerifyEmailPage } from "./pages/VerifyEmailPage";
import { Router } from "./router/Router";

export class App {
  private router: Router;

  constructor() {
    const appContainer = document.getElementById("app") as HTMLElement;
    this.router = new Router(appContainer);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.addRoutes([
      {
        path: "/",
        component: createDashboardPage,
        requiresAuth: true,
        title: "Dashboard",
      },
      {
        path: "/docs",
        component: createDocsPage,
        requiresAuth: false,
        title: "Documentation",
      },
      {
        path: "/login",
        component: createLoginPage,
        requiresAuth: false,
        title: "Sign In",
      },
      {
        path: "/register",
        component: createRegisterPage,
        requiresAuth: false,
        title: "Create Account",
      },
      {
        path: "/forgot-password",
        component: createForgotPasswordPage,
        requiresAuth: false,
        title: "Reset Password",
      },
      {
        path: "/reset-password",
        component: createResetPasswordPage,
        requiresAuth: false,
        title: "Reset Password",
      },
      {
        path: "/verify-email",
        component: createVerifyEmailPage,
        requiresAuth: false,
        title: "Verify Email",
      },
      {
        path: "/dashboard",
        component: createDashboardPage,
        requiresAuth: true,
        title: "Dashboard",
      },
      {
        path: "/404",
        component: this.create404Page,
        requiresAuth: false,
        title: "Page Not Found",
      },
    ]);
  }

  private async create404Page(): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.className =
      "min-h-screen flex items-center justify-center bg-black";
    container.innerHTML = `
      <div class="text-center">
        <h1 class="text-6xl font-bold text-white mb-4">404</h1>
        <p class="text-xl text-gray-400 mb-8">Page not found</p>
        <button id="go-home" class="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors">
          Go Home
        </button>
      </div>
    `;

    const goHomeBtn = container.querySelector("#go-home") as HTMLButtonElement;
    goHomeBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { path: "/" } })
      );
    });

    return container;
  }

  public async start(): Promise<void> {
    await this.router.start();
  }
}
