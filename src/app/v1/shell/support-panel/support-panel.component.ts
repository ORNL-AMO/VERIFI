import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, Injector, ViewChild, afterNextRender, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem } from '@app/v1/status/status.models';

@Component({
  selector: 'app-support-panel',
  templateUrl: './support-panel.component.html',
  styleUrls: ['./support-panel.component.css'],
  standalone: false
})
export class SupportPanelComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);

  @ViewChild('todoRegion', { read: ElementRef }) private readonly todoRegion?: ElementRef<HTMLElement>;

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

  private focusTodoRegion(): void {
    afterNextRender(() => {
      if (this.todoRegion) {
        this.focusMonitor.focusVia(this.todoRegion, 'program');
      }
    }, { injector: this.injector });
  }
}
