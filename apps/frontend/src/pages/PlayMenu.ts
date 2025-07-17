import { BaseComponent } from "../components/BaseComponent";
import { createGameServer } from "../api/lobby-api";

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
          const data = await createGameServer(); // Appel au backend
          const port = data.port;
          const gameId = data.gameId;
          
          window.dispatchEvent(new CustomEvent("navigate", {
            detail: { path: `/play/online?port=${port}&id=${gameId}` }
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
