import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-readings-status',
  templateUrl: './meter-readings-status.component.html',
  styleUrls: ['./meter-readings-status.component.css'],
  standalone: true,
  imports: [CommonModule, IconComponent]
})
export class MeterReadingsStatusComponent {
  @Input() status?: MeterStatusCheck;
  @Input() canAct = true;
  @Output() settingsRequested = new EventEmitter<void>();
  @Output() qualityRequested = new EventEmitter<void>();
  @Output() fillMissingRequested = new EventEmitter<void>();
}
