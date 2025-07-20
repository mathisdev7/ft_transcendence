import type { User } from "../api/auth";
import { BaseComponent } from "../components/BaseComponent";

export class PlayMenuPage extends BaseComponent {
  constructor() {
    super("div", "min-h-screen bg-black text-white flex items-center justify-center");
  }

  protected init(): void {
    this.renderPage();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <div class="w-full max-w-md text-center">
        <h1 class="text-3xl font-bold mb-8">Transcendence - Menu</h1>
        <div class="space-y-4">
          <button id="local-mode" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            🎮 Jouer en local
          </button>
          <button id="online-mode" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            🌐 Jouer en ligne
          </button>
        </div>
      </div>
    `;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const localBtn = this.element.querySelector("#local-mode") as HTMLButtonElement;
    const onlineBtn = this.element.querySelector("#online-mode") as HTMLButtonElement;
  
    if (localBtn) {
      localBtn.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("navigate", { detail: { path: "/game/local" } }));
      });
    }
  
    if (onlineBtn) {
      onlineBtn.addEventListener("click", async () => {
        try {
          const accessToken = localStorage.getItem("accessToken");
          const user = localStorage.getItem("user") as unknown as User;
          if (!user && !user.id) {
            return;
          }
          const joinRequest = fetch('http://localhost:3000/games/join', {method: "POST", headers: {"Authorization": `Bearer ${accessToken}`}, body: JSON.stringify({userId: user.id})});
          window.dispatchEvent(new CustomEvent("navigate", {
            detail: { path: `/play/online` }
          }));
        } catch (err) {
          console.error("Erreur lors de la création du serveur :", err);
          alert("Erreur serveur, impossible de créer la partie.");
        }
      });
    }
   }
}

export async function createPlayMenuPage(): Promise<HTMLElement> {
  const playMenu = new PlayMenuPage();
  return playMenu.render();
}
