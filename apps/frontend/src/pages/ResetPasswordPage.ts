import { ResetPasswordForm } from "../components/ResetPasswordForm";

export async function createResetPasswordPage(): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.className =
    "min-h-screen flex items-center justify-center bg-black px-4";

  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (!token) {
    container.innerHTML = `
      <div class="w-full max-w-md mx-auto">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg text-center">
          <h2 class="text-2xl font-bold text-white mb-6">Invalid Reset Link</h2>
          <p class="text-gray-400 mb-6">The password reset link is missing or invalid.</p>
          <button id="go-to-forgot" class="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors">
            Request New Reset Link
          </button>
        </div>
      </div>
    `;

    const forgotBtn = container.querySelector(
      "#go-to-forgot"
    ) as HTMLButtonElement;
    forgotBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { path: "/forgot-password" } })
      );
    });

    return container;
  }

  const resetPasswordForm = new ResetPasswordForm(token);
  container.appendChild(resetPasswordForm.render());

  return container;
}
