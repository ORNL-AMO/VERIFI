import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import {
  METER_SOURCES,
  MeterDraft,
  canAssignSourceToGroup
} from '../../facility-meters.models';
import { MeterDashboardSlideoutComponent } from '../meter-dashboard-slideout/meter-dashboard-slideout.component';

@Component({
  selector: 'app-meter-draft-slideout',
  templateUrl: './meter-draft-slideout.component.html',
  styleUrls: ['./meter-draft-slideout.component.css'],
  standalone: true,
  imports: [MeterDashboardSlideoutComponent]
})
export class MeterDraftSlideoutComponent {
  @Input() groups: readonly IdbUtilityMeterGroup[] = [];
  @Input() saving = false;
  @Output() submitted = new EventEmitter<MeterDraft>();
  @Output() cancelled = new EventEmitter<void>();

  readonly sources = METER_SOURCES;
  readonly draft = signal<MeterDraft>({
    name: '',
    source: 'Electricity',
    groupId: undefined
  });
  readonly selectedGroup = computed(() => this.groups.find(group => group.guid === this.draft().groupId));
  readonly isValid = computed(() =>
    this.draft().name.trim().length > 0
    && canAssignSourceToGroup(this.draft().source, this.selectedGroup())
  );

  setName(event: Event): void {
    this.patch({ name: (event.target as HTMLInputElement).value });
  }

  setSource(event: Event): void {
    const source = (event.target as HTMLSelectElement).value as MeterSource;
    const group = this.selectedGroup();
    this.patch({
      source,
      groupId: canAssignSourceToGroup(source, group) ? this.draft().groupId : undefined
    });
  }

  setGroup(event: Event): void {
    const value = (event.target as HTMLSelectElement).value || undefined;
    this.patch({ groupId: value });
  }

  isGroupAllowed(group: IdbUtilityMeterGroup): boolean {
    return canAssignSourceToGroup(this.draft().source, group);
  }

  submit(): void {
    if (this.isValid() && !this.saving) {
      this.submitted.emit(this.draft());
    }
  }

  private patch(update: Partial<MeterDraft>): void {
    this.draft.update(current => ({ ...current, ...update }));
  }
}
