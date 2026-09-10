import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import {
  MeterCardView,
  MeterGroupDropTarget,
  UNGROUPED_DROP_TARGET_ID,
  canAssignMeterToGroup
} from '../../../facility-meters.models';
import { MeterDashboardSlideoutComponent } from '../meter-dashboard-slideout.component';

@Component({
  selector: 'app-move-meter-slideout',
  templateUrl: './move-meter-slideout.component.html',
  styleUrls: ['./move-meter-slideout.component.css'],
  standalone: true,
  imports: [MeterDashboardSlideoutComponent]
})
export class MoveMeterSlideoutComponent implements OnChanges {
  @Input({ required: true }) card!: MeterCardView;
  @Input() targets: readonly MeterGroupDropTarget[] = [];
  @Input() saving = false;
  @Output() submitted = new EventEmitter<MeterGroupDropTarget>();
  @Output() cancelled = new EventEmitter<void>();

  readonly selectedTargetId = signal<string>(UNGROUPED_DROP_TARGET_ID);
  readonly selectedTarget = computed(() =>
    this.targets.find(target => target.id === this.selectedTargetId()) ?? this.targets[0]
  );
  readonly isValid = computed(() => {
    const target = this.selectedTarget();
    return !!target && this.isTargetAllowed(target) && this.card.meter.groupId !== target.group?.guid;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card'] || changes['targets']) {
      this.selectedTargetId.set(this.card?.meter.groupId ?? UNGROUPED_DROP_TARGET_ID);
    }
  }

  setTarget(event: Event): void {
    this.selectedTargetId.set((event.target as HTMLSelectElement).value);
  }

  isTargetAllowed(target: MeterGroupDropTarget): boolean {
    return canAssignMeterToGroup(this.card.meter, target.group);
  }

  submit(): void {
    const target = this.selectedTarget();
    if (this.isValid() && target && !this.saving) {
      this.submitted.emit(target);
    }
  }
}
