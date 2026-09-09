import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterCardView } from '../../facility-meters.models';

@Component({
  selector: 'app-meter-browse-card',
  templateUrl: './meter-browse-card.component.html',
  styleUrls: ['./meter-browse-card.component.css'],
  standalone: true
})
export class MeterBrowseCardComponent {
  @Input({ required: true }) card!: MeterCardView;
  @Output() opened = new EventEmitter<MeterCardView>();
}
