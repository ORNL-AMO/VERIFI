import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DrawerFocusTrapDirective } from '@app/v1/welcome/shared/drawer-focus-trap.directive';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-workspace-slideout',
  templateUrl: './workspace-slideout.component.html',
  styleUrls: ['./workspace-slideout.component.css'],
  standalone: true,
  imports: [DrawerFocusTrapDirective, IconComponent]
})
export class WorkspaceSlideoutComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() saving = false;
  @Input() size: 'default' | 'large' = 'default';
  @Output() closed = new EventEmitter<void>();

  requestClose(): void {
    if (!this.saving) {
      this.closed.emit();
    }
  }
}
