import { authAPI } from "../api/auth";

export enum ViewType {
  LOGIN = "login",
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
  RESET_PASSWORD = "reset-password",
  VERIFY_EMAIL = "verify-email",
  VERIFY_EMAIL_CODE = "verify-email-code",
  TWO_FACTOR = "two-factor",
  DASHBOARD = "dashboard",
  PLAY_MENU = "play-menu",
  PLAY_LOCAL = "play-local",
  PLAY_ONLINE = "play-online",
  TOURNAMENT = "tournament",
  TOURNAMENT_GAME = "tournament-game",
  DOCS = "docs",
}

export interface View {
  type: ViewType;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
  title?: string;
}

export class Router {
  private views: Map<ViewType, View> = new Map();
  private currentView: ViewType = ViewType.LOGIN;
  private appContainer: HTMLElement;
  private isNavigating = false;

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
        this.currentView === ViewType.REGISTER ||
        this.currentView === ViewType.TWO_FACTOR
      ) {
        this.navigateToView(ViewType.DASHBOARD);
      }
    });

    window.addEventListener("auth:logout", () => {
      this.navigateToView(ViewType.LOGIN);
    });

    window.addEventListener("hashchange", (_event) => {
      if (!this.isNavigating) {
        const viewType = this.getViewFromHash(window.location.hash);
        this.loadView(viewType, false);
      }
    });
  }

  public async navigateToView(
    viewType: ViewType,
    updateHash: boolean = true
  ): Promise<void> {
    await this.loadView(viewType, updateHash);
  }

  private async loadView(
    viewType: ViewType,
    updateHash: boolean = true
  ): Promise<void> {
    const view = this.views.get(viewType);

    if (!view) {
      console.warn(`Vue non trouvée: ${viewType}`);
      return;
    }

    if (view.requiresAuth && !authAPI.isAuthenticated()) {
      this.navigateToView(ViewType.LOGIN, updateHash);
      return;
    }

    if (
      !view.requiresAuth &&
      authAPI.isAuthenticated() &&
      (viewType === ViewType.LOGIN ||
        viewType === ViewType.REGISTER ||
        viewType === ViewType.FORGOT_PASSWORD)
    ) {
      this.navigateToView(ViewType.DASHBOARD, updateHash);
      return;
    }

    this.currentView = viewType;

    if (updateHash) {
      this.isNavigating = true;
      const hash = this.getHashFromView(viewType);
      window.location.hash = hash;
      this.isNavigating = false;
    }

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
            <h1 class="text-2xl font-bold text-foreground mb-4">Erreur</h1>
            <p class="text-muted-foreground">Impossible de charger la vue</p>
          </div>
        </div>
      `;
    }
  }

  private getHashFromView(viewType: ViewType): string {
    const hashMap: Record<ViewType, string> = {
      [ViewType.LOGIN]: "#/login",
      [ViewType.REGISTER]: "#/register",
      [ViewType.FORGOT_PASSWORD]: "#/forgot-password",
      [ViewType.RESET_PASSWORD]: "#/reset-password",
      [ViewType.VERIFY_EMAIL]: "#/verify-email",
      [ViewType.VERIFY_EMAIL_CODE]: "#/verify-email-code",
      [ViewType.TWO_FACTOR]: "#/two-factor",
      [ViewType.DASHBOARD]: "#/dashboard",
      [ViewType.PLAY_MENU]: "#/play",
      [ViewType.PLAY_LOCAL]: "#/play/local",
      [ViewType.PLAY_ONLINE]: "#/play/online",
      [ViewType.TOURNAMENT]: "#/tournament",
      [ViewType.TOURNAMENT_GAME]: "#/tournament/game",
      [ViewType.DOCS]: "#/docs",
    };
    return hashMap[viewType] || "#/login";
  }

  private getViewFromHash(hash: string): ViewType {
    const cleanHash = hash.startsWith("#") ? hash : `#${hash}`;
    const pathOnly = cleanHash.split("?")[0];

    const viewMap: Record<string, ViewType> = {
      "#/login": ViewType.LOGIN,
      "#/register": ViewType.REGISTER,
      "#/forgot-password": ViewType.FORGOT_PASSWORD,
      "#/reset-password": ViewType.RESET_PASSWORD,
      "#/verify-email": ViewType.VERIFY_EMAIL,
      "#/verify-email-code": ViewType.VERIFY_EMAIL_CODE,
      "#/two-factor": ViewType.TWO_FACTOR,
      "#/dashboard": ViewType.DASHBOARD,
      "#/play": ViewType.PLAY_MENU,
      "#/play/local": ViewType.PLAY_LOCAL,
      "#/play/online": ViewType.PLAY_ONLINE,
      "#/tournament": ViewType.TOURNAMENT,
      "#/tournament/game": ViewType.TOURNAMENT_GAME,
      "#/docs": ViewType.DOCS,
      "#/": ViewType.LOGIN,
      "#": ViewType.LOGIN,
      "": ViewType.LOGIN,
    };
    return viewMap[pathOnly] || ViewType.LOGIN;
  }

  public getCurrentView(): ViewType {
    return this.currentView;
  }

  public async start(): Promise<void> {
    const currentHash = window.location.hash;
    const viewFromUrl = this.getViewFromHash(currentHash);

    let initialView: ViewType;

    if (authAPI.isAuthenticated()) {
      initialView = viewFromUrl;

      if (
        [ViewType.LOGIN, ViewType.REGISTER, ViewType.FORGOT_PASSWORD].includes(
          viewFromUrl
        )
      ) {
        initialView = ViewType.DASHBOARD;
      }
    } else {
      const allowedUnauthenticatedViews = [
        ViewType.LOGIN,
        ViewType.REGISTER,
        ViewType.FORGOT_PASSWORD,
        ViewType.RESET_PASSWORD,
        ViewType.VERIFY_EMAIL,
      ];

      initialView = allowedUnauthenticatedViews.includes(viewFromUrl)
        ? viewFromUrl
        : ViewType.LOGIN;
    }

    await this.navigateToView(initialView, true);
  }
}
