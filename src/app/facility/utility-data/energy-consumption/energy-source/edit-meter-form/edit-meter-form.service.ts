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
    let siteToSourceValidators: Array<ValidatorFn> = this.getSiteToSourceValidation(meter.source, meter.startingUnit, meter.includeInEnergy);
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
      energyUnit: [meter.energyUnit, Validators.required],
      scope: [meter.scope],
      agreementType: [meter.agreementType],
      includeInEnergy: [meter.includeInEnergy],
      retainRECs: [meter.retainRECs],
      directConnection: [meter.directConnection],
      greenPurchaseFraction: [meter.greenPurchaseFraction * 100, [Validators.min(0), Validators.max(100)]]
    });
    // if(form.controls.source.value == 'Electricity'){
    //   form.controls.startingUnit.disable();
    // }
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
    meter.energyUnit = form.controls.energyUnit.value;
    meter.scope = form.controls.scope.value;
    meter.agreementType = form.controls.agreementType.value;
    meter.includeInEnergy = form.controls.includeInEnergy.value;
    meter.retainRECs = form.controls.retainRECs.value;
    meter.directConnection = form.controls.directConnection.value;
    meter.greenPurchaseFraction = form.controls.greenPurchaseFraction.value / 100;

    //set multipliers
    meter = this.setMultipliers(meter);
    return meter;
  }

  setMultipliers(meter: IdbUtilityMeter): IdbUtilityMeter {
    if (meter.source == 'Electricity') {
      let greenPurchaseFraction: number;
      if (meter.agreementType == 5) {
        //Green Product
        greenPurchaseFraction = meter.greenPurchaseFraction;
      }

      let multipliers: {
        recsMultiplier: number,
        marketGHGMultiplier: number,
        locationGHGMultiplier: number
      } = this.getMultipliers(meter.includeInEnergy, meter.retainRECs, meter.directConnection, greenPurchaseFraction);

      meter.locationGHGMultiplier = multipliers.locationGHGMultiplier;
      meter.marketGHGMultiplier = multipliers.marketGHGMultiplier;
      meter.recsMultiplier = multipliers.recsMultiplier;
    } else {
      meter.locationGHGMultiplier = 1;
      meter.marketGHGMultiplier = 1;
      meter.recsMultiplier = 0;
    }
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

  getSiteToSourceValidation(source: MeterSource, startingUnit: string, includeInEnergy: boolean): Array<ValidatorFn> {
    let checkShowSiteToSource: boolean = this.checkShowSiteToSource(source, startingUnit, includeInEnergy);
    if (checkShowSiteToSource) {
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

  checkShowSiteToSource(source: MeterSource, startingUnit: string, includeInEnergy: boolean): boolean {
    if (!includeInEnergy) {
      return false;
    } else if (source == "Electricity" || source == "Natural Gas") {
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

  getMultipliers(includeInEnergy: boolean, retainRECs: boolean, directConnection: boolean, greenPurchaseFraction?: number): {
    // GHGMultiplier: number,
    recsMultiplier: number,
    marketGHGMultiplier: number,
    locationGHGMultiplier: number
  } {
    let marketGHGMultiplier: number = 1;
    let locationGHGMultiplier: number = 1;
    let recsMultiplier: number = 0;

    if (retainRECs) {
      recsMultiplier = 1;
    }

    if (greenPurchaseFraction != undefined) {
      recsMultiplier = greenPurchaseFraction;
    }

    if (includeInEnergy) {
      if (directConnection && retainRECs) {
        locationGHGMultiplier = 0;
      } else {
        locationGHGMultiplier = 1;
      }
    } else {
      if (retainRECs) {
        locationGHGMultiplier = 0;
      } else {
        locationGHGMultiplier = 1;
      }
    }


    if (greenPurchaseFraction) {
      marketGHGMultiplier = 1 - greenPurchaseFraction;
    } else {
      if (retainRECs) {
        marketGHGMultiplier = 0;
      } else {
        marketGHGMultiplier = 1;
      }
    }

    return {
      marketGHGMultiplier: marketGHGMultiplier,
      locationGHGMultiplier: locationGHGMultiplier,
      recsMultiplier: recsMultiplier
    }
  }

  getDefaultScope(source: MeterSource) {
    if (source == 'Electricity') {
      return 3;
    } else if (source == 'Other Energy') {
      return 4;
    } else if (source == 'Natural Gas') {
      return 1;
    } else if (source == 'Other Fuels') {
      return 1;
    } else {
      return undefined;
    }
  }
}
