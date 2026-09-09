import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterCardView } from '../../../../facility-meters.models';

@Component({
  selector: 'app-confirm-copy-meter-modal',
  templateUrl: './confirm-copy-meter-modal.component.html',
  styleUrls: ['./confirm-copy-meter-modal.component.css'],
  standalone: true
})
export class ConfirmCopyMeterModalComponent {
  @Input({ required: true }) card!: MeterCardView;
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
