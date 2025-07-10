import { BaseComponent } from "../components/BaseComponent";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export class ForgotPasswordPage extends BaseComponent {
  private forgotPasswordForm!: ForgotPasswordForm;

  constructor() {
    super("div", "min-h-screen flex items-center justify-center bg-black p-4");
  }

  protected init(): void {
    this.renderPage();
  }

  private renderPage(): void {
    this.forgotPasswordForm = new ForgotPasswordForm();
    this.element.appendChild(this.forgotPasswordForm.render());
  }

  protected cleanup(): void {
    if (this.forgotPasswordForm) {
      this.forgotPasswordForm.destroy();
    }
  }
}

export async function createForgotPasswordPage(): Promise<HTMLElement> {
  const page = new ForgotPasswordPage();
  return page.render();
}
