import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Injectable({
  providedIn: 'root'
})
export class EditMeterFormService {

  constructor(private formBuilder: FormBuilder, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  getFormFromMeter(meter: IdbUtilityMeter): FormGroup {
    let fuelValidators: Array<ValidatorFn> = this.getFuelValidation(meter.source);
    let phaseValidators: Array<ValidatorFn> = this.getPhaseValidation(meter.source);
    let heatCapacityValidators: Array<ValidatorFn> = this.getHeatCapacitValidation(meter.source, meter.startingUnit);
    let siteToSourceValidators: Array<ValidatorFn> = this.getSiteToSourceValidation(meter.source, meter.startingUnit);
    let emissionsOutputRateValidators: Array<ValidatorFn> = this.getEmissionsOutputRateValidation(meter.source);
    let form: FormGroup = this.formBuilder.group({
      meterNumber: [meter.meterNumber],
      accountNumber: [meter.accountNumber],
      phase: [meter.phase, phaseValidators],
      heatCapacity: [meter.heatCapacity, heatCapacityValidators],
      siteToSource: [meter.siteToSource, siteToSourceValidators],
      name: [meter.name, Validators.required],
      location: [meter.location],
      supplier: [meter.supplier],
      notes: [meter.notes],
      source: [meter.source, Validators.required],
      group: [meter.group],
      fuel: [meter.fuel, fuelValidators],
      startingUnit: [meter.startingUnit, Validators.required],
      emissionsOutputRate: [meter.emissionsOutputRate, emissionsOutputRateValidators],
      energyUnit: [meter.energyUnit, Validators.required]
    });
    if(form.controls.source.value == 'Electricity'){
      form.controls.startingUnit.disable();
    }
    return form;
  }

  updateMeterFromForm(meter: IdbUtilityMeter, form: FormGroup): IdbUtilityMeter {
    meter.meterNumber = form.controls.meterNumber.value;
    meter.accountNumber = form.controls.accountNumber.value;
    // meter.type = form.controls.type.value;
    meter.phase = form.controls.phase.value;
    meter.heatCapacity = form.controls.heatCapacity.value;
    meter.siteToSource = form.controls.siteToSource.value;
    meter.name = form.controls.name.value;
    meter.location = form.controls.location.value;
    meter.supplier = form.controls.supplier.value;
    meter.notes = form.controls.notes.value;
    meter.source = form.controls.source.value;
    meter.group = form.controls.group.value;
    meter.fuel = form.controls.fuel.value;
    meter.startingUnit = form.controls.startingUnit.value;
    meter.emissionsOutputRate = form.controls.emissionsOutputRate.value;
    meter.energyUnit = form.controls.energyUnit.value;
    return meter;
  }

  getFuelValidation(source: MeterSource): Array<ValidatorFn> {
    if (source == 'Other Fuels' || source == 'Other Energy') {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getPhaseValidation(source: MeterSource): Array<ValidatorFn> {
    if (source == 'Other Fuels') {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getHeatCapacitValidation(source: MeterSource, startingUnit: string): Array<ValidatorFn> {
    let checkShowHeatCapacity: boolean = this.checkShowHeatCapacity(source, startingUnit);
    if (checkShowHeatCapacity) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }
  }

  getSiteToSourceValidation(source: MeterSource, startingUnit: string): Array<ValidatorFn> {
    let checkShowSiteToSource: boolean = this.checkShowSiteToSource(source, startingUnit);
    if (checkShowSiteToSource) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }
  }

  getEmissionsOutputRateValidation(source: MeterSource):Array<ValidatorFn> {
    let showEmissionsOutputRate: boolean = this.checkShowEmissionsOutputRate(source);
    if (showEmissionsOutputRate) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }

  }

  checkShowHeatCapacity(source: MeterSource, startingUnit: string): boolean {
    if (source != 'Waste Water' && source != 'Water' && source != 'Other Utility' && startingUnit) {
      return (this.energyUnitsHelperService.isEnergyUnit(startingUnit) == false);
    } else {
      return false;
    }
  }

  checkShowSiteToSource(source: MeterSource, startingUnit: string): boolean {
    if (source == "Electricity" || source == "Natural Gas") {
      return true;
    } else if (source != 'Waste Water' && source != 'Water' && source != 'Other Utility' && startingUnit) {
      return (this.energyUnitsHelperService.isEnergyUnit(startingUnit) == false);
    } else {
      return false;
    }
  }

  checkShowEmissionsOutputRate(source: MeterSource): boolean {
    if (source == "Electricity" || source == "Natural Gas" || source == "Other Fuels") {
      return true;
    } else {
      return false;
    }
  }
}
