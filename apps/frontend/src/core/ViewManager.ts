import { authAPI } from "../api/auth";

export enum ViewType {
  LOGIN = "login",
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
  RESET_PASSWORD = "reset-password",
  VERIFY_EMAIL = "verify-email",
  DASHBOARD = "dashboard",
  PLAY_MENU = "play-menu",
  PLAY_LOCAL = "play-local",
  PLAY_ONLINE = "play-online",
  DOCS = "docs",
}

export interface View {
  type: ViewType;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
  title?: string;
}

export class ViewManager {
  private views: Map<ViewType, View> = new Map();
  private currentView: ViewType = ViewType.LOGIN;
  private appContainer: HTMLElement;

  constructor(appContainer: HTMLElement) {
    this.appContainer = appContainer;
    this.setupEventListeners();
  }

  public addView(view: View): void {
    this.views.set(view.type, view);
  }

  public addViews(views: View[]): void {
    views.forEach((view) => this.addView(view));
  }

  private setupEventListeners(): void {
    window.addEventListener("navigate", (event: any) => {
      const { view } = event.detail;
      this.navigateToView(view);
    });

    window.addEventListener("auth:login", () => {
      if (
        this.currentView === ViewType.LOGIN ||
        this.currentView === ViewType.REGISTER
      ) {
        this.navigateToView(ViewType.DASHBOARD);
      }
    });

    window.addEventListener("auth:logout", () => {
      this.navigateToView(ViewType.LOGIN);
    });
  }

  public async navigateToView(viewType: ViewType): Promise<void> {
    const view = this.views.get(viewType);

    if (!view) {
      console.warn(`Vue non trouvée: ${viewType}`);
      return;
    }

    if (view.requiresAuth && !authAPI.isAuthenticated()) {
      this.navigateToView(ViewType.LOGIN);
      return;
    }

    if (
      !view.requiresAuth &&
      authAPI.isAuthenticated() &&
      (viewType === ViewType.LOGIN ||
        viewType === ViewType.REGISTER ||
        viewType === ViewType.FORGOT_PASSWORD)
    ) {
      this.navigateToView(ViewType.DASHBOARD);
      return;
    }

    this.currentView = viewType;

    document.title = view.title
      ? `${view.title} - Transcendence`
      : "Transcendence";

    this.appContainer.innerHTML = "";

    try {
      const component = await view.component();
      this.appContainer.appendChild(component);
    } catch (error) {
      console.error("Erreur lors du chargement du composant:", error);
      this.appContainer.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-white mb-4">Erreur</h1>
            <p class="text-gray-400">Impossible de charger la vue</p>
          </div>
        </div>
      `;
    }
  }

  public getCurrentView(): ViewType {
    return this.currentView;
  }

  public async start(): Promise<void> {
    const initialView = authAPI.isAuthenticated()
      ? ViewType.DASHBOARD
      : ViewType.LOGIN;
    await this.navigateToView(initialView);
  }
}
