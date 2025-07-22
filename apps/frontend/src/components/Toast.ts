export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export class Toast {
  private static container: HTMLElement | null = null;
  private element: HTMLElement;
  private timer: number | null = null;

  constructor(options: ToastOptions) {
    this.element = this.createElement(options);
    this.show(options.duration || 5000);
  }

  private static getContainer(): HTMLElement {
    if (!Toast.container) {
      Toast.container = document.createElement("div");
      Toast.container.className =
        "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none";
      document.body.appendChild(Toast.container);
    }
    return Toast.container;
  }

  private createElement(options: ToastOptions): HTMLElement {
    const toast = document.createElement("div");
    toast.className = `
      pointer-events-auto transform transition-all duration-300 ease-in-out
      card rounded-lg shadow-lg p-4 max-w-sm
      opacity-0 translate-x-full
    `;

    const iconMap = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    const colorMap = {
      success: "text-success",
      error: "text-error",
      warning: "text-warning",
      info: "text-info",
    };

    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <span class="text-lg ${colorMap[options.type]}">${
      iconMap[options.type]
    }</span>
        </div>
        <div class="flex-1">
          <p class="text-sm text-foreground">${options.message}</p>
        </div>
        <button class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <span class="text-lg">×</span>
        </button>
      </div>
    `;

    const closeButton = toast.querySelector("button");
    closeButton?.addEventListener("click", () => this.hide());

    return toast;
  }

  private show(duration: number): void {
    const container = Toast.getContainer();
    container.appendChild(this.element);

    requestAnimationFrame(() => {
      this.element.classList.remove("opacity-0", "translate-x-full");
      this.element.classList.add("opacity-100", "translate-x-0");
    });

    if (duration > 0) {
      this.timer = window.setTimeout(() => this.hide(), duration);
    }
  }

  private hide(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.element.classList.remove("opacity-100", "translate-x-0");
    this.element.classList.add("opacity-0", "translate-x-full");

    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);
  }

  public static show(options: ToastOptions): Toast {
    return new Toast(options);
  }

  public static success(message: string, duration?: number): Toast {
    return Toast.show({ message, type: "success", duration });
  }

  public static error(message: string, duration?: number): Toast {
    return Toast.show({ message, type: "error", duration });
  }

  public static warning(message: string, duration?: number): Toast {
    return Toast.show({ message, type: "warning", duration });
  }

  public static info(message: string, duration?: number): Toast {
    return Toast.show({ message, type: "info", duration });
  }
}
