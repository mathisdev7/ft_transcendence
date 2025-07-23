import { activityAPI, type ActivityItem } from "../api/activity";
import { BaseComponent } from "./BaseComponent";
import { Toast } from "./Toast";

export class RecentActivityWidget extends BaseComponent {
  private activities: ActivityItem[] = [];
  private isLoading = false;
  private limit = 10;

  constructor() {
    super("div", "card");
  }

  protected init(): void {
    this.loadActivities();
  }

  private async loadActivities(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.renderWidget();

    try {
      const response = await activityAPI.getAllRecentActivities(this.limit);
      this.activities = response.activities;
    } catch (error) {
      console.error("Failed to load recent activities:", error);
      Toast.error("Failed to load recent activities");
    } finally {
      this.isLoading = false;
      this.renderWidget();
    }
  }

  public async refresh(): Promise<void> {
    await this.loadActivities();
  }

  private renderWidget(): void {
    this.element.innerHTML = `
      <div class="card-header">
        <div class="flex items-center justify-between">
          <h3 class="card-title">📈 Recent Activity</h3>
          <button id="refresh-activity-btn" class="btn btn-ghost btn-sm" ${
            this.isLoading ? "disabled" : ""
          }>
            <svg class="w-4 h-4 ${
              this.isLoading ? "animate-spin" : ""
            }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-content">
        ${this.renderContent()}
      </div>
    `;

    this.setupEventListeners();
  }

  public render(): HTMLElement {
    this.renderWidget();
    return this.element;
  }

  private renderContent(): string {
    if (this.isLoading) {
      return `
        <div class="flex items-center justify-center py-8">
          <div class="spinner"></div>
          <span class="ml-2 text-muted-foreground">Loading activities...</span>
        </div>
      `;
    }

    if (this.activities.length === 0) {
      return `
        <div class="text-center py-8">
          <div class="text-4xl mb-4">🎯</div>
          <p class="text-muted-foreground">No recent activities</p>
          <p class="text-sm text-muted-foreground mt-2">Start playing games or updating your profile to see activities here!</p>
        </div>
      `;
    }

    return `
      <div class="space-y-3">
        ${this.activities
          .map((activity) => this.renderActivityItem(activity))
          .join("")}
      </div>
      ${
        this.activities.length >= this.limit
          ? `
        <div class="mt-4 pt-4 border-t border-border">
          <button id="view-all-activity-btn" class="btn btn-ghost btn-sm w-full">
            View All Activity
          </button>
        </div>
      `
          : ""
      }
    `;
  }

  private renderActivityItem(activity: ActivityItem): string {
    const icon = activityAPI.getActivityIcon(activity);
    const description = activityAPI.formatActivityDescription(activity);
    const timestamp = activityAPI.formatTimestamp(activity.timestamp);
    const source = this.getSourceBadge(activity.source);

    return `
      <div class="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <div class="flex-shrink-0">
          <span class="text-lg">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-foreground truncate">
              ${description}
            </p>
            ${source}
          </div>
          <div class="flex items-center justify-between mt-1">
            <p class="text-xs text-muted-foreground">
              ${timestamp}
            </p>
            ${
              activity.metadata?.score
                ? `
              <span class="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                ${activity.metadata.score}
              </span>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  private getSourceBadge(source?: string): string {
    if (!source) return "";

    const badges = {
      auth: '<span class="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">Auth</span>',
      game: '<span class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">Game</span>',
      tournament:
        '<span class="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">Tournament</span>',
    };

    return badges[source as keyof typeof badges] || "";
  }

  private setupEventListeners(): void {
    const refreshBtn = this.element.querySelector("#refresh-activity-btn");
    refreshBtn?.addEventListener("click", () => {
      this.refresh();
    });

    const viewAllBtn = this.element.querySelector("#view-all-activity-btn");
    viewAllBtn?.addEventListener("click", () => {
      this.showAllActivitiesModal();
    });
  }

  private showAllActivitiesModal(): void {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4";
    modal.innerHTML = `
      <div class="card w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div class="card-header flex-row justify-between items-center">
          <h3 class="card-title">📈 All Recent Activity</h3>
          <button id="close-activity-modal" class="btn btn-ghost btn-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto max-h-96 px-6 pb-6">
          <div id="all-activities-content">
            <div class="flex items-center justify-center py-8">
              <div class="spinner"></div>
              <span class="ml-2 text-muted-foreground">Loading all activities...</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#close-activity-modal");
    closeBtn?.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    this.loadAllActivitiesForModal(modal);
  }

  private async loadAllActivitiesForModal(modal: HTMLElement): Promise<void> {
    try {
      const response = await activityAPI.getAllRecentActivities(50);
      const content = modal.querySelector("#all-activities-content");

      if (!content) return;

      if (response.activities.length === 0) {
        content.innerHTML = `
          <div class="text-center py-8">
            <div class="text-4xl mb-4">🎯</div>
            <p class="text-muted-foreground">No activities found</p>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="space-y-3">
          ${response.activities
            .map((activity) => this.renderActivityItem(activity))
            .join("")}
        </div>
      `;
    } catch (error) {
      console.error("Failed to load all activities:", error);
      const content = modal.querySelector("#all-activities-content");
      if (content) {
        content.innerHTML = `
          <div class="text-center py-8">
            <div class="text-4xl mb-4">❌</div>
            <p class="text-error">Failed to load activities</p>
          </div>
        `;
      }
    }
  }
}
