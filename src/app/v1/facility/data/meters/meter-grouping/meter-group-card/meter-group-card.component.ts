import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MeterCardView } from '@app/v1/facility/data/meters/models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-group-card',
  templateUrl: './meter-group-card.component.html',
  styleUrls: ['./meter-group-card.component.css'],
  standalone: true,
  imports: [DragDropModule, IconComponent]
})
export class MeterGroupCardComponent {
  @Input({ required: true }) card!: MeterCardView;
  @Input() canMove = true;
  @Output() opened = new EventEmitter<MeterCardView>();
  @Output() moveRequested = new EventEmitter<MeterCardView>();
}
