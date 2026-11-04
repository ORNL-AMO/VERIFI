import { Component, HostListener, computed, effect, input, output, signal } from '@angular/core';
import type { StatusEvaluationState } from '@app/v1/status/status.models';

@Component({
  selector: 'app-workspace-check-indicator',
  standalone: false,
  templateUrl: './workspace-check-indicator.component.html',
  styleUrls: ['./workspace-check-indicator.component.css']
})
export class WorkspaceCheckIndicatorComponent {
  readonly state = input.required<StatusEvaluationState>();
  readonly accountGuid = input.required<string>();
  readonly announce = input(true);
  readonly openTodos = output<void>();
  private readonly delayedAccount = signal<string | undefined>(undefined);
  readonly focusReleased = output<void>();
  private readonly focused = signal(false);
  private readonly hovered = signal(false);
  private readonly tooltipDismissed = signal(false);
  readonly tooltipOpen = computed(() => !!this.indicator() && !this.tooltipDismissed()
    && (this.focused() || this.hovered()));
  readonly indicator = computed(() => this.state() === 'error' ? 'error'
    : this.state() === 'evaluating' && this.delayedAccount() === this.accountGuid() ? 'evaluating' : undefined);
  readonly label = computed(() => this.indicator() === 'error'
    ? 'Data checks unavailable. Open To-dos' : 'Updating data checks. Open To-dos');
  readonly announcement = computed(() => !this.announce() || !this.indicator() ? ''
    : this.indicator() === 'error' ? 'Data checks unavailable.' : 'Updating data checks.');

  constructor() {
    effect(onCleanup => {
      const state = this.state();
      const accountGuid = this.accountGuid();
      this.delayedAccount.set(undefined);
      if (state === 'evaluating') {
        const timeout = setTimeout(() => this.delayedAccount.set(accountGuid), 1000);
        onCleanup(() => clearTimeout(timeout));
      }
    });
    effect(() => {
      if (!this.indicator()) {
        this.hovered.set(false);
        this.tooltipDismissed.set(false);
        if (this.focused()) {
          this.focused.set(false);
          this.focusReleased.emit();
        }
      }
    });
  }

  setFocused(focused: boolean): void {
    this.focused.set(focused);
    if (focused) this.tooltipDismissed.set(false);
  }

  setHovered(hovered: boolean): void {
    this.hovered.set(hovered);
    if (hovered) this.tooltipDismissed.set(false);
  }

  @HostListener('document:keydown.escape')
  closeTooltip(): void {
    this.tooltipDismissed.set(true);
  }
}
