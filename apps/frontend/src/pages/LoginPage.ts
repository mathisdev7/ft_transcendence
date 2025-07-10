import { BaseComponent } from "../components/BaseComponent";
import { LoginForm } from "../components/LoginForm";

export class LoginPage extends BaseComponent {
  private loginForm!: LoginForm;

  constructor() {
    super("div", "min-h-screen flex items-center justify-center bg-black p-4");
  }

  protected init(): void {
    this.renderPage();
  }

  private renderPage(): void {
    this.loginForm = new LoginForm();
    this.element.appendChild(this.loginForm.render());
  }

  protected cleanup(): void {
    if (this.loginForm) {
      this.loginForm.destroy();
    }
  }
}

export async function createLoginPage(): Promise<HTMLElement> {
  const page = new LoginPage();
  return page.render();
}
