import { ViewType } from "../router/Router";

export function navigateToView(view: ViewType): void {
  window.dispatchEvent(
    new CustomEvent("navigate", {
      detail: { view },
    })
  );
}

export { ViewType };
