import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterCardView } from '../../../../facility-meters.models';

@Component({
  selector: 'app-confirm-delete-meter-modal',
  templateUrl: './confirm-delete-meter-modal.component.html',
  styleUrls: ['./confirm-delete-meter-modal.component.css'],
  standalone: true
})
export class ConfirmDeleteMeterModalComponent {
  @Input({ required: true }) card!: MeterCardView;
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
