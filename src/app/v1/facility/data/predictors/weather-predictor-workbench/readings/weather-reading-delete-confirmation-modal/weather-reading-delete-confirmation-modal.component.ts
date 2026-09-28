import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-weather-reading-delete-confirmation-modal',
  templateUrl: './weather-reading-delete-confirmation-modal.component.html',
  styleUrls: ['./weather-reading-delete-confirmation-modal.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class WeatherReadingDeleteConfirmationModalComponent {
  @Input({ required: true }) monthLabel = '';
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
