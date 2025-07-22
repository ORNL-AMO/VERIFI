import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { checkShowHeatCapacity, checkShowSiteToSource, getGUID } from 'src/app/shared/sharedHelperFuntions';

@Injectable({
  providedIn: 'root'
})
export class EditMeterFormService {

  constructor(private formBuilder: FormBuilder) { }

  getFormFromMeter(meter: IdbUtilityMeter): FormGroup {
    let fuelValidators: Array<ValidatorFn> = this.getFuelValidation(meter.source, meter.scope);
    let phaseValidators: Array<ValidatorFn> = this.getPhaseValidation(meter.source, meter.scope);
    let heatCapacityValidators: Array<ValidatorFn> = this.getHeatCapacitValidation(meter.source, meter.startingUnit, meter.scope);
    let siteToSourceValidators: Array<ValidatorFn> = this.getSiteToSourceValidation(meter.source, meter.includeInEnergy, meter.scope);
    let waterIntakeValidation: Array<ValidatorFn> = this.getWaterIntakeValidation(meter.source);
    let waterDischargeValidation: Array<ValidatorFn> = this.getWaterDischargeValidation(meter.source);
    let basicVehicleValidation: Array<ValidatorFn> = this.getBasicVehicleValidation(meter.scope);
    let additionalVehicleValidation: Array<ValidatorFn> = this.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)
    let globalWarmingPotentialValidation: Array<ValidatorFn> = this.getGlobalWarmingPotentialValidation(meter.scope);

    let chargesArray: FormArray = this.formBuilder.array(meter.charges ? meter.charges.map(charge => {
      return this.formBuilder.group({
        guid: [charge.guid],
        name: [charge.name, Validators.required],
        chargeType: [charge.chargeType, Validators.required],
        chargeUnit: [charge.chargeUnit, Validators.required],
        displayUsageInTable: [charge.displayUsageInTable],
        displayChargeInTable: [charge.displayChargeInTable]
      });
    }) : []);


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
      fuel: [meter.fuel, fuelValidators],
      startingUnit: [meter.startingUnit, Validators.required],
      energyUnit: [meter.energyUnit, Validators.required],
      scope: [meter.scope],
      agreementType: [meter.agreementType],
      includeInEnergy: [meter.includeInEnergy],
      retainRECs: [meter.retainRECs],
      directConnection: [meter.directConnection],
      greenPurchaseFraction: [meter.greenPurchaseFraction * 100, [Validators.min(0), Validators.max(100)]],
      waterIntakeType: [meter.waterIntakeType, waterIntakeValidation],
      waterDischargeType: [meter.waterDischargeType, waterDischargeValidation],
      vehicleCategory: [meter.vehicleCategory, basicVehicleValidation],
      vehicleType: [meter.vehicleType, additionalVehicleValidation],
      vehicleCollectionType: [meter.vehicleCollectionType, additionalVehicleValidation],
      vehicleCollectionUnit: [meter.vehicleCollectionUnit, basicVehicleValidation],
      vehicleFuel: [meter.vehicleFuel, basicVehicleValidation],
      vehicleFuelEfficiency: [meter.vehicleFuelEfficiency, additionalVehicleValidation],
      vehicleDistanceUnit: [meter.vehicleDistanceUnit, additionalVehicleValidation],
      globalWarmingPotentialOption: [meter.globalWarmingPotentialOption, globalWarmingPotentialValidation],
      globalWarmingPotential: [meter.globalWarmingPotential, globalWarmingPotentialValidation],
      chargesArray: chargesArray
    });
    // if(form.controls.source.value == 'Electricity'){
    //   form.controls.startingUnit.disable();
    // }
    form.controls.globalWarmingPotential.disable();
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
    meter.fuel = form.controls.fuel.value;
    meter.startingUnit = form.controls.startingUnit.value;
    meter.energyUnit = form.controls.energyUnit.value;
    meter.scope = form.controls.scope.value;
    meter.agreementType = form.controls.agreementType.value;
    meter.includeInEnergy = form.controls.includeInEnergy.value;
    meter.retainRECs = form.controls.retainRECs.value;
    meter.directConnection = form.controls.directConnection.value;
    meter.greenPurchaseFraction = form.controls.greenPurchaseFraction.value / 100;
    meter.waterDischargeType = form.controls.waterDischargeType.value;
    meter.waterIntakeType = form.controls.waterIntakeType.value;
    meter.vehicleCategory = form.controls.vehicleCategory.value;
    meter.vehicleType = form.controls.vehicleType.value;
    meter.vehicleCollectionType = form.controls.vehicleCollectionType.value;
    meter.vehicleCollectionUnit = form.controls.vehicleCollectionUnit.value;
    meter.vehicleFuel = form.controls.vehicleFuel.value;
    meter.vehicleFuelEfficiency = form.controls.vehicleFuelEfficiency.value;
    meter.vehicleDistanceUnit = form.controls.vehicleDistanceUnit.value;
    meter.globalWarmingPotentialOption = form.controls.globalWarmingPotentialOption.value;
    meter.globalWarmingPotential = form.controls.globalWarmingPotential.value;
    //set multipliers
    meter = this.setMultipliers(meter);

    let chargesArray: FormArray = form.get('chargesArray') as FormArray;
    if (!meter.charges) {
      meter.charges = [];
    }
    meter.charges = chargesArray.controls.map(chargeGroup => {
      return {
        guid: chargeGroup.get('guid').value,
        name: chargeGroup.get('name').value,
        chargeType: chargeGroup.get('chargeType').value,
        chargeUnit: chargeGroup.get('chargeUnit').value,
        displayUsageInTable: chargeGroup.get('displayUsageInTable').value,
        displayChargeInTable: chargeGroup.get('displayChargeInTable').value
      };
    });

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


  getFuelValidation(source: MeterSource, scope: number): Array<ValidatorFn> {
    if ((source == 'Other Fuels' && scope != 2) || source == 'Other Energy') {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getPhaseValidation(source: MeterSource, scope: number): Array<ValidatorFn> {
    if (source == 'Other Fuels' && scope != 2) {
      return [Validators.required];
    } else {
      return [];
    }
  }

  getHeatCapacitValidation(source: MeterSource, startingUnit: string, scope: number): Array<ValidatorFn> {
    let _checkShowHeatCapacity: boolean = checkShowHeatCapacity(source, startingUnit, scope);
    if (_checkShowHeatCapacity) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }
  }

  getSiteToSourceValidation(source: MeterSource, includeInEnergy: boolean, scope: number): Array<ValidatorFn> {
    let _checkShowSiteToSource: boolean = checkShowSiteToSource(source, includeInEnergy, scope);
    if (_checkShowSiteToSource) {
      return [Validators.required, Validators.min(0)];
    } else {
      return [];
    }
  }

  getWaterIntakeValidation(source: MeterSource): Array<ValidatorFn> {
    if (source == 'Water Intake') {
      return [Validators.required]
    }
    return [];
  }

  getWaterDischargeValidation(source: MeterSource): Array<ValidatorFn> {
    if (source == 'Water Discharge') {
      return [Validators.required]
    }
    return [];
  }

  getBasicVehicleValidation(scope: number): Array<ValidatorFn> {
    if (scope == 2) {
      return [Validators.required]
    }
    return [];
  }

  getGlobalWarmingPotentialValidation(scope: number): Array<ValidatorFn> {
    if (scope == 5 || scope == 6) {
      return [Validators.required]
    }
    return [];
  }

  getAdditionalVehicleValidation(scope: number, vehicleCategory: number): Array<ValidatorFn> {
    if (scope == 2 && vehicleCategory != 1) {
      return [Validators.required]
    }
    return [];
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
    } else if (source == 'Other') {
      return 100;
    } else {
      return undefined;
    }
  }

  addCharge(form: FormGroup) {
    const chargesArray = form.get('chargesArray') as FormArray;
    let newCharge = this.formBuilder.group({
      guid: [getGUID()],
      name: ['New Charge', Validators.required],
      chargeType: ['consumption', Validators.required],
      chargeUnit: ['dollarsPerKilowattHour', Validators.required],
      displayChargeInTable: [true],
      displayUsageInTable: [true]
    });
    chargesArray.push(newCharge);
  }
}
