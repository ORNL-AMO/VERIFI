import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-meter-slideout',
  templateUrl: './meter-slideout.component.html',
  styleUrls: ['./meter-slideout.component.css'],
  standalone: true
})
export class MeterSlideoutComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() saving = false;
  @Output() closed = new EventEmitter<void>();
}
