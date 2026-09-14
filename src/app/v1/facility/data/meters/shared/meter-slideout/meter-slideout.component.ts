import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-slideout',
  templateUrl: './meter-slideout.component.html',
  styleUrls: ['./meter-slideout.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class MeterSlideoutComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() saving = false;
  @Output() closed = new EventEmitter<void>();
}
