import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';
import {
  buildP1MeterGroupBuckets,
  P1MeterGroupView,
  summarizeP1GroupMeters
} from '../facility-meters-workbench.helpers';

@Component({
  selector: 'app-p1-facility-meter-groups',
  templateUrl: './meter-groups.component.html',
  styleUrls: ['./meter-groups.component.css'],
  standalone: false
})
export class P1FacilityMeterGroupsComponent implements OnChanges {
  @Input({ required: true }) meters: IdbUtilityMeter[] = [];
  @Input({ required: true }) meterData: IdbUtilityMeterData[] = [];
  @Input({ required: true }) groups: IdbUtilityMeterGroup[] = [];
  @Input() activeEditor?: { view: P1MeterGroupView; group?: IdbUtilityMeterGroup };
  @Input() canWrite = false;
  @Output() addGroup = new EventEmitter<void>();
  @Output() openGroupView = new EventEmitter<{ view: P1MeterGroupView; group?: IdbUtilityMeterGroup }>();
  @Output() saveGroup = new EventEmitter<{
    group: IdbUtilityMeterGroup;
    oldGroupType: 'Energy' | 'Water' | 'Other';
    metersToAdd: IdbUtilityMeter[];
    metersToRemove: IdbUtilityMeter[];
  }>();
  @Output() deleteGroup = new EventEmitter<IdbUtilityMeterGroup>();

  readonly selectedMeterGuids = signal<Set<string>>(new Set<string>());
  form: FormGroup;
  editingGroup?: IdbUtilityMeterGroup;
  oldGroupType: 'Energy' | 'Water' | 'Other';

  constructor(private formBuilder: FormBuilder) { }

  ngOnChanges(): void {
    if (this.activeEditor?.view === 'edit' && this.activeEditor.group?.guid !== this.editingGroup?.guid) {
      this.startEdit(this.activeEditor.group);
    }
  }

  groupSummary(group?: IdbUtilityMeterGroup) {
    return summarizeP1GroupMeters(group, this.meters, this.meterData);
  }

  buckets() {
    return buildP1MeterGroupBuckets(this.meters, this.groups);
  }

  groupMeterCount(group: IdbUtilityMeterGroup): number {
    return this.meters.filter(meter => meter.groupId === group.guid).length;
  }

  canUseType(type: 'Energy' | 'Water' | 'Other'): boolean {
    if (type === 'Energy') {
      return this.meters.some(meter => getIsEnergyMeter(meter.source));
    }
    if (type === 'Water') {
      return this.meters.some(meter => meter.source === 'Water Intake' || meter.source === 'Water Discharge');
    }
    return true;
  }

  groupOptions(): IdbUtilityMeter[] {
    const groupType = this.form?.controls.groupType.value;
    if (groupType === 'Energy') {
      return this.meters.filter(meter => getIsEnergyMeter(meter.source));
    }
    if (groupType === 'Water') {
      return this.meters.filter(meter => meter.source === 'Water Intake' || meter.source === 'Water Discharge');
    }
    return this.meters;
  }

  isInAnotherGroup(meter: IdbUtilityMeter): boolean {
    return !!meter.groupId && meter.groupId !== this.editingGroup?.guid;
  }

  otherGroupName(meter: IdbUtilityMeter): string {
    return this.groups.find(group => group.guid === meter.groupId)?.name || 'another group';
  }

  isSelected(meter: IdbUtilityMeter): boolean {
    return this.selectedMeterGuids().has(meter.guid);
  }

  setSelected(meter: IdbUtilityMeter, checked: boolean): void {
    const next = new Set(this.selectedMeterGuids());
    if (checked) {
      next.add(meter.guid);
    } else {
      next.delete(meter.guid);
    }
    this.selectedMeterGuids.set(next);
  }

  submitGroup(): void {
    if (!this.form.valid || !this.editingGroup || !this.canWrite) {
      this.form.markAllAsTouched();
      return;
    }
    const selected = this.selectedMeterGuids();
    const group = {
      ...structuredClone(this.editingGroup),
      name: this.form.controls.name.value,
      groupType: this.form.controls.groupType.value,
      description: this.form.controls.description.value
    };
    const metersToAdd = this.groupOptions()
      .filter(meter => selected.has(meter.guid) && meter.groupId !== group.guid)
      .map(meter => structuredClone(meter));
    const metersToRemove = this.meters
      .filter(meter => !selected.has(meter.guid) && meter.groupId === group.guid)
      .map(meter => structuredClone(meter));
    this.saveGroup.emit({
      group,
      oldGroupType: this.oldGroupType,
      metersToAdd,
      metersToRemove
    });
  }

  openManage(): void {
    this.editingGroup = undefined;
    this.form = undefined;
    this.openGroupView.emit({ view: 'manage' });
  }

  private startEdit(group?: IdbUtilityMeterGroup): void {
    if (!group) {
      return;
    }
    this.editingGroup = structuredClone(group);
    this.oldGroupType = group.groupType;
    this.form = this.formBuilder.group({
      name: [group.name, Validators.required],
      groupType: [group.groupType, Validators.required],
      description: [group.description]
    });
    if (this.groupMeterCount(group) > 0) {
      this.form.controls.groupType.disable();
    }
    this.selectedMeterGuids.set(new Set(this.meters.filter(meter => meter.groupId === group.guid).map(meter => meter.guid)));
  }
}
