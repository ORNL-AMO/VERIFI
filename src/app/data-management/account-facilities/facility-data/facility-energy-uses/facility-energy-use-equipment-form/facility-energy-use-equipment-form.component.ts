import { Component, Input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { EquipmentType, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { EquipmentTypes } from '../calculations/equipmentTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AllSources, EnergySources, MeterSource } from 'src/app/models/constantsAndTypes';
import * as _ from 'lodash';
import { FacilityEnergyUseEquipmentFormService } from './facility-energy-use-equipment-form.service';
import { calculateTotalEnergyUse } from 'src/app/calculations/energy-footprint/energyFootprintCalculations';
import { getIncludedSources } from '../calculations/facilityEnergyUse';

@Component({
  selector: 'app-facility-energy-use-equipment-form',
  standalone: false,
  templateUrl: './facility-energy-use-equipment-form.component.html',
  styleUrl: './facility-energy-use-equipment-form.component.css'
})
export class FacilityEnergyUseEquipmentFormComponent {
  @Input({ required: true })
  form: FormGroup;
  @Input()
  energyUseEquipment: IdbFacilityEnergyUseEquipment;

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  utilityMeterGroups: Array<IdbUtilityMeterGroup>;
  utilityMeterGroupsSub: Subscription;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMetersSub: Subscription;

  showLinkMeterModal: boolean = false;

  linkedMeterGroup: IdbUtilityMeterGroup;
  includedSources: Array<{ source: MeterSource, controlName: string }> = [];
  showUtilityTypeModal: boolean = false;
  availableSources: Array<MeterSource>;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utiltiyMeterDbService: UtilityMeterdbService,
    private facilityEnergyUseEquipmentFormService: FacilityEnergyUseEquipmentFormService
  ) { }

  ngOnInit() {
    this.utilityMetersSub = this.utiltiyMeterDbService.facilityMeters.subscribe(meters => {
      this.utilityMeters = meters;
    });
    this.utilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(groups => {
      this.utilityMeterGroups = groups.filter(group => { return group.groupType == 'Energy' });
      this.setLinkedMeterGroup();
    });
  }

  ngOnDestroy() {
    this.utilityMeterGroupsSub.unsubscribe();
    this.utilityMetersSub.unsubscribe();
  }

  ngOnChanges() {
    this.setIncludedSources();
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
        let energyUse: Array<{ year: number, energyUse: number, overrideEnergyUse: boolean }> = [];
        if (this.energyUseEquipment) {
          this.energyUseEquipment.operatingConditionsData.forEach(opCond => {
            energyUse.push({
              year: opCond.year,
              energyUse: 0,
              overrideEnergyUse: false
            });
          });
        }
        this.facilityEnergyUseEquipmentFormService.addUtilityDataToForm(this.form, { energySource: source, size: 0, numberOfEquipment: 1, units: '', energyUse: energyUse });
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
        //remove from form
        this.form.removeControl('utilityData_' + formSource.replace(/\s+/g, '_'));
      }
    });
    this.setIncludedSources();
  }

  setIncludedSources() {
    // let sources: Array<{
    //   source: MeterSource, controlName: string
    // }> = EnergySources.map(source => { return { source: source, controlName: source.replace(/\s+/g, '_') }; });
    // this.includedSources = [];
    // for (let source of sources) {
    //   if (this.form.contains('utilityData_' + source.controlName)) {
    //     this.includedSources.push(source);
    //   }
    // }
    this.includedSources = getIncludedSources(this.form);
    this.setAvailableSources();
  }

  removeUtilityType(sourceToRemove: { source: MeterSource, controlName: string }) {
    this.facilityEnergyUseEquipmentFormService.removeUtilityDataFromForm(this.form, sourceToRemove.source);
    this.setIncludedSources();
  }

  openAddUtilityModal() {
    this.showUtilityTypeModal = true;
  }

  closeAddUtilityModal() {
    this.showUtilityTypeModal = false;
  }

  setAvailableSources() {
    let selectedSources: Array<MeterSource> = this.includedSources.map(sourceObj => { return sourceObj.source; });
    this.availableSources = EnergySources.filter(source => {
      return !selectedSources.includes(source);
    });
  }

  addUtilityType(sourceToAdd: MeterSource) {
    let energyUse: Array<{ year: number, energyUse: number, overrideEnergyUse: boolean }> = [];
    if (this.energyUseEquipment) {
      this.energyUseEquipment.operatingConditionsData.forEach(opCond => {
        energyUse.push({
          year: opCond.year,
          energyUse: 0,
          overrideEnergyUse: false
        });
      });
    }
    this.facilityEnergyUseEquipmentFormService.addUtilityDataToForm(this.form, { energySource: sourceToAdd, size: 0, numberOfEquipment: 1, units: '', energyUse: energyUse });
    this.setIncludedSources();
    this.closeAddUtilityModal();
  }

  toggleOverride(energyUseGroup: FormGroup, utilityDataForm: FormGroup, source: MeterSource) {
    console.log(energyUseGroup);
    energyUseGroup.controls.overrideEnergyUse.setValue(!energyUseGroup.controls.overrideEnergyUse.value);
    if (!energyUseGroup.controls.overrideEnergyUse.value) {
      energyUseGroup.controls.energyUse.disable();
      let utilityData = {
        energySource: source,
        size: utilityDataForm.controls.size.value,
        numberOfEquipment: utilityDataForm.controls.numberOfEquipment.value,
        units: utilityDataForm.controls.units.value,
        energyUse: []
      };
      let operatingConditions = this.energyUseEquipment.operatingConditionsData.find(opCond => { return opCond.year == energyUseGroup.controls.year.value });
      let energyUse: number = calculateTotalEnergyUse(operatingConditions, utilityData);
      energyUseGroup.controls.energyUse.setValue(energyUse);
    } else {
      energyUseGroup.controls.energyUse.enable();
    }
  }

  calculateEnergyUse() {
    for (let sourceObj of this.includedSources) {
      let utilityDataForm = this.form.controls['utilityData_' + sourceObj.controlName] as FormGroup;
      let utilityData = {
        energySource: sourceObj.source,
        size: utilityDataForm.controls.size.value,
        numberOfEquipment: utilityDataForm.controls.numberOfEquipment.value,
        units: utilityDataForm.controls.units.value,
        energyUse: []
      };
      if (utilityData) {
        let energyUseFormArray = utilityDataForm.controls.energyUse as FormArray;
        if (energyUseFormArray) {
          energyUseFormArray.controls.forEach((energyUseGroup: FormGroup) => {
            if (!energyUseGroup.controls.overrideEnergyUse.value) {
              let operatingConditions = this.energyUseEquipment.operatingConditionsData.find(opCond => { return opCond.year == energyUseGroup.controls.year.value });
              let energyUse: number = calculateTotalEnergyUse(operatingConditions, utilityData);
              console.log(energyUse)
              energyUseGroup.controls.energyUse.setValue(energyUse);
            }
          });
        }
      }
    }
  }
}
