import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, Injector, ViewChild, afterNextRender, effect, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem } from '@app/v1/status/status.models';

@Component({
  selector: 'app-support-panel',
  templateUrl: './support-panel.component.html',
  styleUrls: ['./support-panel.component.css'],
  standalone: false,
  host: { '[class.is-requested]': 'navigation.supportPanelRequested()' }
})
export class SupportPanelComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);

  @ViewChild('todoRegion', { read: ElementRef }) private readonly todoRegion?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (this.navigation.todosFocusRequested()) this.focusTodoRegion(true);
    });
  }

  async discardWarning(item: StatusItem): Promise<void> {
    if (await this.status.discardWarning(item)) {
      this.focusTodoRegion();
    }
  }

  async restoreWarning(item: StatusItem): Promise<void> {
    if (await this.status.restoreWarning(item)) {
      this.focusTodoRegion();
    }
  }

  private focusTodoRegion(requested = false): void {
    afterNextRender(() => {
      if (this.todoRegion && (!requested || this.navigation.todosFocusRequested())) {
        if (requested) this.navigation.completeTodosFocus();
        this.focusMonitor.focusVia(this.todoRegion, 'program');
      }
    }, { injector: this.injector });
  }
}
