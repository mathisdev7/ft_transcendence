import { BaseComponent } from "../components/BaseComponent";
import { navigateToView, ViewType } from "../utils/navigation";

export class DocsPage extends BaseComponent {
  constructor() {
    super("div", "min-h-screen bg-background");
  }

  protected init(): void {
    this.renderPage();
  }

  private renderPage(): void {
    this.element.innerHTML = `
      <nav class="navbar">
        <div class="container-responsive">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-foreground text-xl font-bold">Transcendence - Documentation</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button id="back-home" class="btn btn-secondary">
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main class="container-responsive py-8">
        <div class="space-y-8">
          <div class="card">
            <div class="card-header">
              <h2 class="text-3xl font-bold text-foreground">🚀 Guide de démarrage</h2>
              <p class="text-muted-foreground">
                Ce guide vous explique comment démarrer le projet ft_transcendence avec le frontend et le backend.
              </p>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">📋 Prérequis</h3>
            </div>
            <div class="card-content">
              <div class="space-y-3">
                <div class="flex items-start space-x-3">
                  <span class="text-success mt-1">✓</span>
                  <span class="text-foreground">Node.js (version 18 ou supérieure)</span>
                </div>
                <div class="flex items-start space-x-3">
                  <span class="text-success mt-1">✓</span>
                  <span class="text-foreground">pnpm (gestionnaire de paquets)</span>
                </div>
                <div class="flex items-start space-x-3">
                  <span class="text-success mt-1">✓</span>
                  <span class="text-foreground">ts-node (pour exécuter TypeScript directement)</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
            <h3 class="text-2xl font-bold text-white mb-4">🔧 Installation initiale</h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-semibold text-white mb-2">1. Installer ts-node globalement</h4>
                <div class="bg-gray-800 rounded-md p-4">
                  <code class="text-green-400">pnpm i -g ts-node</code>
                </div>
              </div>

              <div>
                <h4 class="text-lg font-semibold text-white mb-2">2. Installer les dépendances du projet</h4>
                <div class="bg-gray-800 rounded-md p-4">
                  <code class="text-green-400">pnpm install</code>
                </div>
                <p class="text-gray-400 text-sm mt-2">
                  Exécuter cette commande à la racine du projet pour installer toutes les dépendances.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
            <h3 class="text-2xl font-bold text-white mb-4">🎯 Démarrage du Backend</h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-semibold text-white mb-2">Commandes de base</h4>
                <div class="space-y-3">
                  <div>
                    <p class="text-gray-300 mb-2">Démarrer le serveur en mode développement :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/backend && pnpm dev</code>
                    </div>
                  </div>

                  <div>
                    <p class="text-gray-300 mb-2">Compiler le projet :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/backend && pnpm build</code>
                    </div>
                  </div>

                  <div>
                    <p class="text-gray-300 mb-2">Démarrer en mode production :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/backend && pnpm start</code>
                    </div>
                  </div>

                  <div>
                    <p class="text-gray-300 mb-2">Lancer les tests :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/backend && pnpm test</code>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-blue-900/20 border border-blue-700 rounded-md p-4">
                <p class="text-blue-300">
                  <strong>💡 Astuce :</strong> Le backend utilise ts-node pour exécuter directement le code TypeScript sans compilation préalable en mode développement.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
            <h3 class="text-2xl font-bold text-white mb-4">🎨 Démarrage du Frontend</h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-semibold text-white mb-2">Commandes de base</h4>
                <div class="space-y-3">
                  <div>
                    <p class="text-gray-300 mb-2">Démarrer le serveur de développement :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/frontend && pnpm dev</code>
                    </div>
                  </div>

                  <div>
                    <p class="text-gray-300 mb-2">Compiler pour la production :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/frontend && pnpm build</code>
                    </div>
                  </div>

                  <div>
                    <p class="text-gray-300 mb-2">Prévisualiser la build de production :</p>
                    <div class="bg-gray-800 rounded-md p-4">
                      <code class="text-green-400">cd apps/frontend && pnpm preview</code>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-green-900/20 border border-green-700 rounded-md p-4">
                <p class="text-green-300">
                  <strong>✨ Info :</strong> Le frontend utilise Vite pour un rechargement à chaud ultra-rapide et TailwindCSS pour le styling.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
            <h3 class="text-2xl font-bold text-white mb-4">🔄 Démarrage complet</h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-semibold text-white mb-2">Option 1 : Terminaux séparés</h4>
                <div class="space-y-2">
                  <div class="bg-gray-800 rounded-md p-4">
                    <p class="text-gray-300 mb-2">Terminal 1 (Backend) :</p>
                    <code class="text-green-400">cd apps/backend && pnpm dev</code>
                  </div>
                  <div class="bg-gray-800 rounded-md p-4">
                    <p class="text-gray-300 mb-2">Terminal 2 (Frontend) :</p>
                    <code class="text-green-400">cd apps/frontend && pnpm dev</code>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-lg font-semibold text-white mb-2">Option 2 : Depuis la racine (si configuré)</h4>
                <div class="bg-gray-800 rounded-md p-4">
                  <code class="text-green-400">pnpm dev</code>
                </div>
                <p class="text-gray-400 text-sm mt-2">
                  Cette commande démarre les deux services simultanément si un script est configuré dans le package.json racine.
                </p>
              </div>
            </div>
          </div>

                     <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
             <h3 class="text-2xl font-bold text-white mb-4">🌐 Accès aux services</h3>
             <div class="space-y-3">
               <div class="flex justify-between items-center p-3 bg-gray-800 rounded-md">
                 <span class="text-gray-300">Frontend (Vite Dev Server)</span>
                 <span class="text-blue-400">http://localhost:5173</span>
               </div>
               <div class="flex justify-between items-center p-3 bg-gray-800 rounded-md">
                 <span class="text-gray-300">Backend API</span>
                 <span class="text-blue-400">http://localhost:3000</span>
               </div>
               <div class="flex justify-between items-center p-3 bg-gray-800 rounded-md">
                 <span class="text-gray-300">Documentation API (Swagger)</span>
                 <span class="text-blue-400">http://localhost:3000/docs</span>
               </div>
             </div>

             <div class="bg-cyan-900/20 border border-cyan-700 rounded-md p-4 mt-4">
               <p class="text-cyan-300">
                 <strong>📖 Documentation API :</strong> Le microservice auth dispose d'une documentation Swagger complète accessible à l'adresse <code class="text-cyan-200">http://localhost:3000/docs</code> une fois le backend démarré.
               </p>
             </div>
           </div>

          <div class="bg-gray-900 border border-gray-800 rounded-lg p-8">
            <h3 class="text-2xl font-bold text-white mb-4">🛠️ Dépannage</h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-lg font-semibold text-white mb-2">Problèmes courants</h4>
                <div class="space-y-3">
                  <div class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <p class="text-red-300 font-medium mb-2">Erreur : "ts-node command not found"</p>
                    <p class="text-gray-300 mb-2">Solution :</p>
                    <div class="bg-gray-800 rounded-md p-3">
                      <code class="text-green-400">pnpm i -g ts-node</code>
                    </div>
                  </div>

                  <div class="bg-yellow-900/20 border border-yellow-700 rounded-md p-4">
                    <p class="text-yellow-300 font-medium mb-2">Port déjà utilisé</p>
                    <p class="text-gray-300 mb-2">Si le port 3000 ou 5173 est occupé, vous pouvez :</p>
                    <ul class="text-gray-300 list-disc list-inside space-y-1">
                      <li>Arrêter le processus existant</li>
                      <li>Utiliser un autre port avec <code class="text-green-400">--port XXXX</code></li>
                    </ul>
                  </div>

                                     <div class="bg-purple-900/20 border border-purple-700 rounded-md p-4">
                     <p class="text-purple-300 font-medium mb-2">Problème de dépendances</p>
                     <p class="text-gray-300 mb-2">Nettoyer et réinstaller :</p>
                     <div class="bg-gray-800 rounded-md p-3">
                       <code class="text-green-400">rm -rf node_modules && pnpm install</code>
                     </div>
                   </div>

                   <div class="bg-orange-900/20 border border-orange-700 rounded-md p-4">
                     <p class="text-orange-300 font-medium mb-2">Erreur better-sqlite3</p>
                     <p class="text-gray-300 mb-2">Si vous rencontrez des problèmes avec better-sqlite3 dans le backend :</p>
                     <div class="bg-gray-800 rounded-md p-3 mb-2">
                       <code class="text-green-400">cd apps/backend/node_modules/better-sqlite3/</code>
                     </div>
                     <div class="bg-gray-800 rounded-md p-3 mb-2">
                       <code class="text-green-400">pnpm run build-release</code>
                     </div>
                     <div class="bg-gray-800 rounded-md p-3">
                       <code class="text-green-400">cd ../../ && pnpm dev</code>
                     </div>
                     <p class="text-gray-400 text-sm mt-2">
                       Cette erreur survient généralement lors de problèmes de compilation native du module SQLite.
                     </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const backHomeBtn = this.element.querySelector(
      "#back-home"
    ) as HTMLButtonElement;
    if (backHomeBtn) {
      backHomeBtn.addEventListener("click", () => {
        navigateToView(ViewType.DASHBOARD);
      });
    }
  }
}

export async function createDocsPage(): Promise<HTMLElement> {
  const docsPage = new DocsPage();
  return docsPage.render();
}
