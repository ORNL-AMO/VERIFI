import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PredictorCardView } from '../../../models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';

@Component({
  selector: 'app-confirm-delete-predictor-modal',
  templateUrl: './confirm-delete-predictor-modal.component.html',
  styleUrls: ['./confirm-delete-predictor-modal.component.css'],
  standalone: true,
  imports: [ConfirmationDialogComponent, IconComponent]
})
export class ConfirmDeletePredictorModalComponent {
  @Input({ required: true }) card!: PredictorCardView;
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
