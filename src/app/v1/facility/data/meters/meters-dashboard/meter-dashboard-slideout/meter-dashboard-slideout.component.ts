import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-meter-dashboard-slideout',
  templateUrl: './meter-dashboard-slideout.component.html',
  styleUrls: ['./meter-dashboard-slideout.component.css'],
  standalone: true
})
export class MeterDashboardSlideoutComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() saving = false;
  @Output() closed = new EventEmitter<void>();
}
