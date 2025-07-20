import { BaseComponent } from "../components/BaseComponent";

export class PlayOnlinePage extends BaseComponent {
  constructor() {
    super("div", "w-full h-screen flex items-center justify-center bg-black");
  }

  protected init(): void {
    this.renderCanvas();
  }

  private renderCanvas(): void {
    const canvas = document.createElement("canvas");
    canvas.id = "gameCanvas";
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.backgroundColor = "black";
    canvas.style.border = "2px solid white";
    this.element.appendChild(canvas);
  }
}

export async function createOnlineGamePage(): Promise<HTMLElement> {
  const page = new PlayOnlinePage();
  return page.render();
}
