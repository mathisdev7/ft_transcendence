import { ViewManager, ViewType } from "./core/ViewManager";
import { createDashboardPage } from "./pages/DashboardPage";
import { createDocsPage } from "./pages/DocsPage";
import { createForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { createLoginPage } from "./pages/LoginPage";
import { createLocalGamePage } from "./pages/PlayLocal";
import { createPlayMenuPage } from "./pages/PlayMenu";
import { createOnlineGamePage } from "./pages/PlayOnline";
import { createRegisterPage } from "./pages/RegisterPage";
import { createResetPasswordPage } from "./pages/ResetPasswordPage";
import { createVerifyEmailPage } from "./pages/VerifyEmailPage";

export class App {
  private viewManager: ViewManager;

  constructor() {
    const appContainer = document.getElementById("app") as HTMLElement;
    this.viewManager = new ViewManager(appContainer);
    this.setupViews();
  }

  private setupViews(): void {
    this.viewManager.addViews([
      {
        type: ViewType.DASHBOARD,
        component: createDashboardPage,
        requiresAuth: true,
        title: "Dashboard",
      },
      {
        type: ViewType.DOCS,
        component: createDocsPage,
        requiresAuth: false,
        title: "Documentation",
      },
      {
        type: ViewType.LOGIN,
        component: createLoginPage,
        requiresAuth: false,
        title: "Sign In",
      },
      {
        type: ViewType.REGISTER,
        component: createRegisterPage,
        requiresAuth: false,
        title: "Create Account",
      },
      {
        type: ViewType.FORGOT_PASSWORD,
        component: createForgotPasswordPage,
        requiresAuth: false,
        title: "Reset Password",
      },
      {
        type: ViewType.RESET_PASSWORD,
        component: createResetPasswordPage,
        requiresAuth: false,
        title: "Reset Password",
      },
      {
        type: ViewType.VERIFY_EMAIL,
        component: createVerifyEmailPage,
        requiresAuth: false,
        title: "Verify Email",
      },
      {
        type: ViewType.PLAY_MENU,
        component: createPlayMenuPage,
        requiresAuth: false,
        title: "Play",
      },
      {
        type: ViewType.PLAY_LOCAL,
        component: createLocalGamePage,
        requiresAuth: false,
        title: "Local Game",
      },
      {
        type: ViewType.PLAY_ONLINE,
        component: createOnlineGamePage,
        requiresAuth: true,
        title: "Online Game",
      },
    ]);
  }

  public async start(): Promise<void> {
    await this.viewManager.start();
  }
}
