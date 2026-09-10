import { CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  MeterCardView,
  MeterDropEvent,
  MeterGroupDropTarget,
  MeterGroupSectionView,
  meterGroupDropListId,
  meterGroupTargetFromSection
} from '../../../facility-meters.models';
import { MeterGroupCardComponent } from '../meter-group-card/meter-group-card.component';

@Component({
  selector: 'app-meter-group-lane',
  templateUrl: './meter-group-lane.component.html',
  styleUrls: ['./meter-group-lane.component.css'],
  standalone: true,
  imports: [DragDropModule, MeterGroupCardComponent]
})
export class MeterGroupLaneComponent {
  @Input({ required: true }) section!: MeterGroupSectionView;
  @Input() connectedDropListIds: string[] = [];
  @Input() canWrite = true;
  @Input() canDrop: (card: MeterCardView, target: MeterGroupDropTarget) => boolean = () => true;
  @Output() editGroup = new EventEmitter<MeterGroupSectionView>();
  @Output() meterDropped = new EventEmitter<MeterDropEvent>();
  @Output() openMeter = new EventEmitter<MeterCardView>();
  @Output() moveMeter = new EventEmitter<MeterCardView>();

  readonly enterPredicate = (drag: CdkDrag<MeterCardView>): boolean =>
    this.canWrite && this.canDrop(drag.data, this.target);

  get dropListId(): string {
    return meterGroupDropListId(this.section.id);
  }

  get target(): MeterGroupDropTarget {
    return meterGroupTargetFromSection(this.section);
  }

  onDrop(event: CdkDragDrop<readonly MeterCardView[]>): void {
    if (event.previousContainer === event.container || !this.canWrite || !this.canDrop(event.item.data, this.target)) {
      return;
    }
    this.meterDropped.emit({ card: event.item.data, target: this.target });
  }
}
