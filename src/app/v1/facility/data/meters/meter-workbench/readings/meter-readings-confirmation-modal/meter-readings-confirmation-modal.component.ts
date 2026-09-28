import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { MeterReadingsConfirmation } from '../meter-workbench-readings.models';

@Component({
  selector: 'app-meter-readings-confirmation-modal',
  templateUrl: './meter-readings-confirmation-modal.component.html',
  styleUrls: ['./meter-readings-confirmation-modal.component.css'],
  standalone: true,
  imports: [ConfirmationDialogComponent]
})
export class MeterReadingsConfirmationModalComponent {
  @Input({ required: true }) confirmation!: MeterReadingsConfirmation;
  @Input() saving = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get title(): string {
    return this.confirmation.kind === 'fill-missing' ? 'Fill Missing Meter Data' : 'Delete Meter Data';
  }

  get confirmLabel(): string {
    if (this.confirmation.kind === 'fill-missing') return 'Fill with Zeros';
    return this.confirmation.kind === 'delete-many' ? 'Delete Selected' : 'Delete';
  }
}
