import { createDashboardPage } from "./pages/DashboardPage";
import { createDocsPage } from "./pages/DocsPage";
import { createForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { createLoginPage } from "./pages/LoginPage";
import { createLocalGamePage } from "./pages/PlayLocal";
import { createPlayMenuPage } from "./pages/PlayMenu";
import { createOnlineGamePage } from "./pages/PlayOnline";
import { createRegisterPage } from "./pages/RegisterPage";
import { createResetPasswordPage } from "./pages/ResetPasswordPage";
import { createTournamentGamePage } from "./pages/TournamentGame";
import { createTournamentPage } from "./pages/TournamentPage";
import { createTwoFactorPage } from "./pages/TwoFactorPage";
import { createVerifyEmailPage } from "./pages/VerifyEmailPage";
import { Router, ViewType } from "./router/Router";

export class App {
  private router: Router;

  constructor() {
    const appContainer = document.getElementById("app") as HTMLElement;
    this.router = new Router(appContainer);
    this.setupViews();
  }

  private setupViews(): void {
    this.router.addViews([
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
        type: ViewType.TWO_FACTOR,
        component: createTwoFactorPage,
        requiresAuth: false,
        title: "Two-Factor Authentication",
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
      {
        type: ViewType.TOURNAMENT,
        component: createTournamentPage,
        requiresAuth: false,
        title: "Tournament",
      },
      {
        type: ViewType.TOURNAMENT_GAME,
        component: createTournamentGamePage,
        requiresAuth: false,
        title: "Tournament Match",
      },
    ]);
  }

  public async start(): Promise<void> {
    await this.router.start();
  }
}
