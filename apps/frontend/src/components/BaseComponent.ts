export abstract class BaseComponent {
  protected element: HTMLElement;
  protected isDestroyed = false;

  constructor(tagName: string = "div", className?: string) {
    this.element = document.createElement(tagName);
    if (className) {
      this.element.className = className;
    }
    this.init();
  }

  protected abstract init(): void;

  public render(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.cleanup();

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  protected cleanup(): void {}

  protected createElement(
    tagName: string,
    className?: string,
    textContent?: string
  ): HTMLElement {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  protected createInput(
    type: string,
    placeholder?: string,
    className?: string
  ): HTMLInputElement {
    const input = document.createElement("input");
    input.type = type;
    if (placeholder) input.placeholder = placeholder;
    if (className) input.className = className;
    return input;
  }

  protected createButton(
    text: string,
    className?: string,
    onClick?: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    if (className) button.className = className;
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  protected addClass(className: string): void {
    this.element.classList.add(className);
  }

  protected removeClass(className: string): void {
    this.element.classList.remove(className);
  }

  protected hasClass(className: string): boolean {
    return this.element.classList.contains(className);
  }

  protected show(): void {
    this.element.style.display = "";
  }

  protected hide(): void {
    this.element.style.display = "none";
  }

  protected addEventListener(event: string, handler: EventListener): void {
    this.element.addEventListener(event, handler);
  }

  protected removeEventListener(event: string, handler: EventListener): void {
    this.element.removeEventListener(event, handler);
  }
}
