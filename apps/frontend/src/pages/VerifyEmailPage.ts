import { VerifyEmailForm } from "../components/VerifyEmailForm";
import { navigateToView, ViewType } from "../utils/navigation";

export async function createVerifyEmailPage(): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.className =
    "min-h-screen flex items-center justify-center bg-black px-4";

  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (!token) {
    container.innerHTML = `
      <div class="w-full max-w-md mx-auto">
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-8 shadow-lg text-center">
          <h2 class="text-2xl font-bold text-white mb-6">Invalid Verification Link</h2>
          <p class="text-gray-400 mb-6">The verification link is missing or invalid.</p>
          <button id="go-to-register" class="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-200 transition-colors">
            Back to Registration
          </button>
        </div>
      </div>
    `;

    const registerBtn = container.querySelector(
      "#go-to-register"
    ) as HTMLButtonElement;
    registerBtn.addEventListener("click", () => {
      navigateToView(ViewType.REGISTER);
    });

    return container;
  }

  const verifyEmailForm = new VerifyEmailForm(token);
  container.appendChild(verifyEmailForm.render());

  return container;
}
