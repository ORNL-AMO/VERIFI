import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StatusItem } from '@app/v1/status/status.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-readings-status',
  templateUrl: './meter-readings-status.component.html',
  styleUrls: ['./meter-readings-status.component.css'],
  standalone: true,
  imports: [CommonModule, IconComponent]
})
export class MeterReadingsStatusComponent {
  @Input() findings: readonly StatusItem[] = [];
  @Input() state: 'idle' | 'evaluating' | 'ready' | 'error' = 'idle';
  @Input() canAct = true;
  @Input() canManageWarnings = true;
  @Output() settingsRequested = new EventEmitter<void>();
  @Output() qualityRequested = new EventEmitter<void>();
  @Output() fillMissingRequested = new EventEmitter<void>();
  @Output() discardRequested = new EventEmitter<StatusItem>();
}
