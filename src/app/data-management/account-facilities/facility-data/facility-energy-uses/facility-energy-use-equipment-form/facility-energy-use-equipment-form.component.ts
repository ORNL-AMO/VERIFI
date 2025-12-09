import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EquipmentType } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EquipmentTypes } from './equipmentTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { FacilityEnergyUseEquipmentFormService } from './facility-energy-use-equipment-form.service';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  @Input({ required: true })
  form: FormGroup;

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMetersSub: Subscription;

  showLinkMeterModal: boolean = false;

  linkedMeterGroup: IdbUtilityMeterGroup;
  includedSources: Array<{ source: MeterSource, controlName: string }> = [];
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utiltiyMeterDbService: UtilityMeterdbService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService
  ) { }

  ngOnInit() {
    this.utilityMetersSub = this.utiltiyMeterDbService.facilityMeters.subscribe(meters => {
      this.utilityMeters = meters;
    });
    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(groups => {
      this.utilityMeterGroups = groups;
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
    if (meterGroup.guid != this.form.controls['utilityMeterGroupId'].value) {
      this.form.patchValue({
        utilityMeterGroupId: meterGroup.guid
      });
    } else {
      this.form.patchValue({
        utilityMeterGroupId: ''
      });
    }
    this.form.markAsDirty()
    this.setLinkedMeterGroup();
  }

  cancelLinkMeterGroup() {
    this.form.patchValue({
      utilityMeterGroupId: ''
    });
    this.showLinkMeterModal = false;
    this.form.markAsDirty()
    this.setLinkedMeterGroup();
  }

  closeLinkMeterGroup() {
    this.showLinkMeterModal = false;
    this.setLinkedMeterGroup();
  }

  setLinkedMeterGroup() {
    this.linkedMeterGroup = this.utilityMeterGroups.find(group => {
      return group.guid == this.form.controls['utilityMeterGroupId'].value;
    });
    if (this.linkedMeterGroup) {
      this.setUtilityTypes();
    }
  }

  setUtilityTypes() {
    let groupMeters: Array<IdbUtilityMeter> = this.utilityMeters.filter(meter => { return meter.groupId == this.linkedMeterGroup.guid; });
    let sources: Array<MeterSource> = groupMeters.map(meter => { return meter.source; });
    sources = _.uniq(sources);
    sources.forEach(source => {
      if (!this.form.contains('utilityData_' + source.replace(/\s+/g, '_'))) {
        this.facilityEnergyUseEquipmentFormService.addUtilityDataToForm(this.form, source);
      }
    });
    //remove any that are not in the meter group
    let formSources: Array<string> = [];
    Object.keys(this.form.controls).forEach(controlName => {
      if (controlName.startsWith('utilityData_')) {
        let source: string = controlName.replace('utilityData_', '').replace(/_/g, ' ');
        formSources.push(source);
      }
    });
    formSources.forEach(formSource => {
      if (!sources.includes(formSource as MeterSource)) {
        console.log('remove...?')
        //remove from form
        this.form.removeControl('utilityData_' + formSource.replace(/\s+/g, '_'));
      }
    });
    this.setIncludedSources();
  }

  setIncludedSources() {
    let sources: Array<{
      source: MeterSource, controlName: string
    }> = AllSources.map(source => { return { source: source, controlName: source.replace(/\s+/g, '_') }; });
    this.includedSources = [];
    for (let source of sources) {
      if (this.form.contains('utilityData_' + source.controlName)) {
        this.includedSources.push(source);
      }
    }
  }

  removeUtilityType(sourceToRemove: { source: MeterSource, controlName: string }) {
    this.facilityEnergyUseEquipmentFormService.removeUtilityDataFromForm(this.form, sourceToRemove.source);
    this.setIncludedSources();
  }
}
