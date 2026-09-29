import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { ModalFocusTrapDirective } from './modal-focus-trap.directive';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css'],
  standalone: true,
  imports: [IconComponent, ModalFocusTrapDirective]
})
export class ConfirmationDialogComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) titleId = '';
  @Input({ required: true }) cancelAriaLabel = '';
  @Input({ required: true }) confirmLabel = '';
  @Input() confirmClass = 'v1-btn--danger';
  @Input() confirmIcon?: IconName;
  @Input() size: 'default' | 'wide' = 'default';
  @Input() bodySpacing: 'compact' | 'spacious' = 'compact';
  @Input() hideCancel = false;
  @Input() busy = false;
  @Input() disabled = false;
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  cancel(): void {
    if (!this.disabled) this.cancelled.emit();
  }

  confirm(): void {
    if (!this.disabled) this.confirmed.emit();
  }
}
