import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PredictorReadingsConfirmation } from '../../../models';

@Component({
  selector: 'app-predictor-readings-confirmation-modal',
  templateUrl: './predictor-readings-confirmation-modal.component.html',
  styleUrls: ['./predictor-readings-confirmation-modal.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class PredictorReadingsConfirmationModalComponent {
  @Input({ required: true }) confirmation!: PredictorReadingsConfirmation;
  @Input() isWeather = false;
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
