import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterReadingsConfirmation } from '../meter-workbench-readings.models';

@Component({
  selector: 'app-meter-readings-confirmation-modal',
  templateUrl: './meter-readings-confirmation-modal.component.html',
  styleUrls: ['./meter-readings-confirmation-modal.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class MeterReadingsConfirmationModalComponent {
  @Input({ required: true }) confirmation!: MeterReadingsConfirmation;
  @Input() saving = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
