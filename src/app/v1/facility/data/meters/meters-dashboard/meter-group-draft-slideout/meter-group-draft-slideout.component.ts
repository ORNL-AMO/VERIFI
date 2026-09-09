import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import {
  METER_GROUP_TYPES,
  MeterGroupDraft,
  MeterGroupType
} from '../../facility-meters.models';
import { MeterDashboardSlideoutComponent } from '../meter-dashboard-slideout/meter-dashboard-slideout.component';

@Component({
  selector: 'app-meter-group-draft-slideout',
  templateUrl: './meter-group-draft-slideout.component.html',
  styleUrls: ['./meter-group-draft-slideout.component.css'],
  standalone: true,
  imports: [MeterDashboardSlideoutComponent]
})
export class MeterGroupDraftSlideoutComponent implements OnChanges {
  @Input() group?: IdbUtilityMeterGroup;
  @Input() assignedMeterCount = 0;
  @Input() saving = false;
  @Output() submitted = new EventEmitter<MeterGroupDraft>();
  @Output() deleteRequested = new EventEmitter<IdbUtilityMeterGroup>();
  @Output() cancelled = new EventEmitter<void>();

  readonly groupTypes = METER_GROUP_TYPES;
  readonly draft = signal<MeterGroupDraft>({
    name: '',
    groupType: 'Energy',
    description: undefined
  });
  readonly isEdit = computed(() => !!this.group);
  readonly isValid = computed(() => this.draft().name.trim().length > 0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group']) {
      this.draft.set({
        name: this.group?.name ?? '',
        groupType: this.group?.groupType ?? 'Energy',
        description: this.group?.description
      });
    }
  }

  setName(event: Event): void {
    this.patch({ name: (event.target as HTMLInputElement).value });
  }

  setGroupType(event: Event): void {
    this.patch({ groupType: (event.target as HTMLSelectElement).value as MeterGroupType });
  }

  setDescription(event: Event): void {
    this.patch({ description: (event.target as HTMLTextAreaElement).value });
  }

  submit(): void {
    if (this.isValid() && !this.saving) {
      this.submitted.emit(this.draft());
    }
  }

  requestDelete(): void {
    if (this.group && !this.saving) {
      this.deleteRequested.emit(this.group);
    }
  }

  private patch(update: Partial<MeterGroupDraft>): void {
    this.draft.update(current => ({ ...current, ...update }));
  }
}
