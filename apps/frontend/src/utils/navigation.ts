import { ViewType } from "../core/ViewManager";

export function navigateToView(view: ViewType): void {
  window.dispatchEvent(
    new CustomEvent("navigate", {
      detail: { view },
    })
  );
}

export { ViewType };
