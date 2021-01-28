import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Injectable({
  providedIn: 'root'
})
export class EditMeterFormService {

  constructor(private formBuilder: FormBuilder, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  getFormFromMeter(meter: IdbUtilityMeter): FormGroup {
    let fuelValidators: Array<ValidatorFn> = this.getFuelValidation(meter.source);
    let phaseValidators: Array<ValidatorFn> = this.getPhaseValidation(meter.source);
    let heatCapacityAndSiteToSourceValidators: Array<ValidatorFn> = this.getHeatCapacityAndSiteToSourceValidation(meter.source, meter.startingUnit);
    return this.formBuilder.group({
      meterNumber: [meter.meterNumber],
      accountNumber: [meter.accountNumber],
      type: [meter.type],
      phase: [meter.phase || 'Gas', phaseValidators],
      heatCapacity: [meter.heatCapacity, heatCapacityAndSiteToSourceValidators],
      siteToSource: [meter.siteToSource, heatCapacityAndSiteToSourceValidators],
      name: [meter.name, Validators.required],
      location: [meter.location],
      supplier: [meter.supplier],
      notes: [meter.notes],
      source: [meter.source || 'Electricity', Validators.required],
      group: [meter.group],
      fuel: [meter.fuel, fuelValidators],
      startingUnit: [meter.startingUnit, Validators.required],
    });
  }

  updateMeterFromForm(meter: IdbUtilityMeter, form: FormGroup): IdbUtilityMeter {
    meter.meterNumber = form.controls.meterNumber.value;
    meter.accountNumber = form.controls.accountNumber.value;
    meter.type = form.controls.type.value;
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
    return meter;
  }

  getFuelValidation(source: string): Array<ValidatorFn> {
    if (source == 'Other Fuels' || source == 'Other Energy') {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getPhaseValidation(source: string): Array<ValidatorFn> {
    if (source == 'Other Fuels') {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getHeatCapacityAndSiteToSourceValidation(source: string, startingUnit: string): Array<ValidatorFn> {
    let checkShowHeatCapacity: boolean = this.checkShowHeatCapacity(source, startingUnit);
    if (checkShowHeatCapacity) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }
  }

  checkShowHeatCapacity(source: string, startingUnit: string): boolean {
    if (source != 'Waste Water' && source != 'Water' && source != 'Other Utility') {
      return (this.energyUnitsHelperService.isEnergyUnit(startingUnit) == false);
    } else {
      return false;
    }
  }
}
