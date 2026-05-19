import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EquipmentTypes } from './equipmentTypes';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import * as _ from 'lodash';
import { UtilityDataForm } from '../facility-energy-use-equipment-form.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-equipment-details-form',
  standalone: false,
  templateUrl: './equipment-details-form.component.html',
  styleUrl: './equipment-details-form.component.css',
})
export class EquipmentDetailsFormComponent {
  @Input({ required: true })
  equipmentDetailsForm: FormGroup;
  @Input({ required: true })
  utilityDataForms: Array<UtilityDataForm>;
  @Input({ required: true })
  annualOperatingConditionsDataForms: Array<FormGroup>;

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;
  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMetersSub: Subscription;

  showLinkMeterModal: boolean = false;

  linkedMeterGroups: Array<IdbUtilityMeterGroup>;
  linkedMeterGroupIds: Array<string>;
  linkedMeterGroupSources: Array<MeterSource>;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utiltiyMeterDbService: UtilityMeterdbService
  ) { }

  ngOnInit() {
    this.linkedMeterGroupIds = this.equipmentDetailsForm.controls['utilityMeterGroupIds'].value.map(id => id);
    this.utilityMetersSub = this.utiltiyMeterDbService.facilityMeters.subscribe(meters => {
      this.utilityMeters = meters;
    });
    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(groups => {
      this.utilityMeterGroups = groups.filter(group => { return group.groupType == 'Energy' });
      this.setLinkedMeterGroupSources();
      this.setLinkedMeterGroup();
    });
  }

  ngOnDestroy() {
    this.utilityMeterGroupsSub.unsubscribe();
    this.utilityMetersSub.unsubscribe();
  }

  openLinkMeterTable() {
    this.showLinkMeterModal = true;
  }

  changeLinkedMeterGroup(meterGroup: IdbUtilityMeterGroup) {
    if (!this.linkedMeterGroupIds.includes(meterGroup.guid)) {
      let meterGroupMeters: Array<IdbUtilityMeter> = this.utilityMeters.filter(meter => meter.groupId == meterGroup.guid);
      let meterGroupSources: Array<MeterSource> = meterGroupMeters.map(meter => meter.source);
      let hasConflict: boolean = meterGroupSources.some(source => this.linkedMeterGroupSources.includes(source));
      if (!hasConflict) {
        this.linkedMeterGroupIds.push(meterGroup.guid);
      }
    } else {
      this.linkedMeterGroupIds.splice(this.linkedMeterGroupIds.findIndex(id => id == meterGroup.guid), 1);
    }
    this.equipmentDetailsForm.markAsDirty()
    this.setLinkedMeterGroupSources();
  }
  setLinkedMeterGroupSources() {
    let linkedMeters: Array<IdbUtilityMeter> = this.linkedMeterGroupIds.flatMap(id => {
      return this.utilityMeters.filter(meter => meter.groupId == id);
    });
    let sources: Array<MeterSource> = linkedMeters.map(meter => meter.source);
    this.linkedMeterGroupSources = _.uniq(sources);
  }

  cancelLinkMeterGroup() {
    this.linkedMeterGroupIds = this.equipmentDetailsForm.controls['utilityMeterGroupIds'].value;
    this.showLinkMeterModal = false;
    this.equipmentDetailsForm.markAsDirty()
  }

  closeLinkMeterGroup() {
    this.showLinkMeterModal = false;
    this.setLinkedMeterGroup();
  }

  setLinkedMeterGroup() {
    this.linkedMeterGroups = this.utilityMeterGroups.filter(group => {
      return this.linkedMeterGroupIds.includes(group.guid);
    });

    if (!_.isEqual(this.linkedMeterGroupIds, this.equipmentDetailsForm.controls['utilityMeterGroupIds'].value)) {
      this.equipmentDetailsForm.patchValue({
        utilityMeterGroupIds: this.linkedMeterGroupIds.map(id => id)
      });
    }
  }
}
