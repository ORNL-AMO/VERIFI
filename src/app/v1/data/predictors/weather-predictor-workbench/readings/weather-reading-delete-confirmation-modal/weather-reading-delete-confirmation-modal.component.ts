import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';

@Component({
  selector: 'app-weather-reading-delete-confirmation-modal',
  templateUrl: './weather-reading-delete-confirmation-modal.component.html',
  styleUrls: ['./weather-reading-delete-confirmation-modal.component.css'],
  standalone: true,
  imports: [ConfirmationDialogComponent, IconComponent]
})
export class WeatherReadingDeleteConfirmationModalComponent {
  @Input({ required: true }) monthLabel = '';
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
