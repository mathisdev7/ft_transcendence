import { authAPI } from "../api/auth";

export interface Route {
  path: string;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
  title?: string;
}

export class Router {
  private routes: Route[] = [];
  private currentPath = "/";
  private appContainer: HTMLElement;

  constructor(appContainer: HTMLElement) {
    this.appContainer = appContainer;
    this.setupEventListeners();
  }

  public addRoute(route: Route): void {
    this.routes.push(route);
  }

  public addRoutes(routes: Route[]): void {
    this.routes.push(...routes);
  }

  private setupEventListeners(): void {
    window.addEventListener("popstate", () => {
      this.navigate(window.location.pathname, false);
    });

    window.addEventListener("navigate", (event: any) => {
      const { path } = event.detail;
      this.navigate(path);
    });

    window.addEventListener("auth:login", () => {
      if (this.currentPath === "/login" || this.currentPath === "/register") {
        this.navigate("/dashboard");
      }
    });

    window.addEventListener("auth:logout", () => {
      this.navigate("/login");
    });
  }

  public async navigate(
    path: string,
    pushState: boolean = true
  ): Promise<void> {
    const pathname = path.includes("?") ? path.split("?")[0] : path;
    const route = this.findRoute(pathname);

    if (!route) {
      console.warn(`Route not found: ${pathname}`);
      this.navigate("/404");
      return;
    }

    if (route.requiresAuth && !authAPI.isAuthenticated()) {
      this.navigate("/login");
      return;
    }

    if (
      !route.requiresAuth &&
      authAPI.isAuthenticated() &&
      (pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password")
    ) {
      this.navigate("/dashboard");
      return;
    }

    this.currentPath = pathname;

    if (pushState) {
      window.history.pushState({}, "", path);
    }

    document.title = route.title
      ? `${route.title} - Transcendence`
      : "Transcendence";

    this.appContainer.innerHTML = "";

    try {
      const component = await route.component();
      this.appContainer.appendChild(component);
    } catch (error) {
      console.error("Error loading component:", error);
      this.appContainer.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-white mb-4">Error</h1>
            <p class="text-gray-400">Failed to load page</p>
          </div>
        </div>
      `;
    }
  }

  private findRoute(path: string): Route | undefined {
    return this.routes.find((route) => route.path === path);
  }

  public getCurrentPath(): string {
    return this.currentPath;
  }

  public async start(): Promise<void> {
    const initialPath = window.location.pathname + window.location.search;
    await this.navigate(initialPath, false);
  }
}
