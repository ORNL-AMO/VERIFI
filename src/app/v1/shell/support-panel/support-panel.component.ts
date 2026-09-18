import { Component, ElementRef, inject } from '@angular/core';
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
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  async discardWarning(item: StatusItem): Promise<void> {
    if (await this.status.discardWarning(item)) {
      this.focusWarningAction('restore', item.id);
    }
  }

  async restoreWarning(item: StatusItem): Promise<void> {
    if (await this.status.restoreWarning(item)) {
      this.focusWarningAction('discard', item.id);
    }
  }

  private focusWarningAction(action: 'discard' | 'restore', findingId: string): void {
    setTimeout(() => {
      const buttons = this.elementRef.nativeElement.querySelectorAll<HTMLButtonElement>(
        `button[data-warning-action="${action}"]`
      );
      Array.from(buttons).find(button => button.dataset['findingId'] === findingId)?.focus();
    });
  }
}
