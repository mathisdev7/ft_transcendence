import { BaseComponent } from "../components/BaseComponent";
import { RegisterForm } from "../components/RegisterForm";

export class RegisterPage extends BaseComponent {
  private registerForm!: RegisterForm;

  constructor() {
    super("div", "min-h-screen flex items-center justify-center bg-black p-4");
  }

  protected init(): void {
    this.renderPage();
  }

  private renderPage(): void {
    this.registerForm = new RegisterForm();
    this.element.appendChild(this.registerForm.render());
  }

  protected cleanup(): void {
    if (this.registerForm) {
      this.registerForm.destroy();
    }
  }
}

export async function createRegisterPage(): Promise<HTMLElement> {
  const page = new RegisterPage();
  return page.render();
}
