import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterCardView } from '../../../facility-meters.models';

@Component({
  selector: 'app-meter-group-card',
  templateUrl: './meter-group-card.component.html',
  styleUrls: ['./meter-group-card.component.css'],
  standalone: true,
  imports: [DragDropModule]
})
export class MeterGroupCardComponent {
  @Input({ required: true }) card!: MeterCardView;
  @Input() canMove = true;
  @Output() opened = new EventEmitter<MeterCardView>();
  @Output() moveRequested = new EventEmitter<MeterCardView>();
}
