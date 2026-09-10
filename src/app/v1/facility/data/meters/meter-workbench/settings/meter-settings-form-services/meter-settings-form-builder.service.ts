import { Injectable, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { getGUID } from '@shared/sharedHelperFunctions';
import { MeterSettingsValidationService } from './meter-settings-validation.service';

@Injectable({ providedIn: 'root' })
export class MeterSettingsFormBuilderService {
  private readonly formBuilder = inject(FormBuilder);
  private readonly validation = inject(MeterSettingsValidationService);

  buildMeterSettingsForm(meter: IdbUtilityMeter): FormGroup {
    const chargesArray = this.formBuilder.array((meter.charges ?? []).map(charge => this.buildChargeGroup(charge)));
    return this.formBuilder.group({
      meterNumber: [meter.meterNumber],
      accountNumber: [meter.accountNumber],
      phase: [meter.phase, this.validation.getPhaseValidation(meter.source, meter.scope)],
      heatCapacity: [meter.heatCapacity, this.validation.getHeatCapacityValidation(meter.source, meter.startingUnit, meter.scope)],
      siteToSource: [meter.siteToSource, this.validation.getSiteToSourceValidation(meter.source, meter.includeInEnergy, meter.scope)],
      name: [meter.name, Validators.required],
      location: [meter.location],
      supplier: [meter.supplier],
      notes: [meter.notes],
      source: [meter.source, Validators.required],
      fuel: [meter.fuel, this.validation.getFuelValidation(meter.source, meter.scope)],
      startingUnit: [meter.startingUnit, Validators.required],
      energyUnit: [meter.energyUnit, Validators.required],
      scope: [meter.scope],
      agreementType: [meter.agreementType],
      includeInEnergy: [meter.includeInEnergy],
      retainRECs: [meter.retainRECs],
      directConnection: [meter.directConnection],
      greenPurchaseFraction: [(meter.greenPurchaseFraction ?? 0) * 100, [Validators.min(0), Validators.max(100)]],
      waterIntakeType: [meter.waterIntakeType, this.validation.getWaterIntakeValidation(meter.source)],
      waterDischargeType: [meter.waterDischargeType, this.validation.getWaterDischargeValidation(meter.source)],
      vehicleCategory: [meter.vehicleCategory, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleType: [meter.vehicleType, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleCollectionType: [meter.vehicleCollectionType, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleCollectionUnit: [meter.vehicleCollectionUnit, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleFuel: [meter.vehicleFuel, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleFuelEfficiency: [meter.vehicleFuelEfficiency, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleDistanceUnit: [meter.vehicleDistanceUnit, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      globalWarmingPotentialOption: [meter.globalWarmingPotentialOption, this.validation.getGlobalWarmingPotentialValidation(meter.scope)],
      demandUnit: [meter.demandUnit],
      chargesArray,
      noLongerInUse: [meter.noLongerInUse || false],
      noLongerInUseMonth: [meter.noLongerInUseMonth],
      noLongerInUseYear: [meter.noLongerInUseYear],
      canBeNegative: [meter.canBeNegative || false],
      ignoreDateStatusChecks: [meter.ignoreDateStatusChecks || false]
    });
  }

  updateMeterFromSettingsForm(meter: IdbUtilityMeter, form: FormGroup): IdbUtilityMeter {
    meter.meterNumber = form.controls.meterNumber.value;
    meter.accountNumber = form.controls.accountNumber.value;
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
    meter.greenPurchaseFraction = (form.controls.greenPurchaseFraction.value ?? 0) / 100;
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
    meter.demandUnit = form.controls.demandUnit.value;
    meter.noLongerInUse = form.controls.noLongerInUse.value;
    meter.noLongerInUseMonth = form.controls.noLongerInUseMonth.value;
    meter.noLongerInUseYear = form.controls.noLongerInUseYear.value;
    meter.canBeNegative = form.controls.canBeNegative.value;
    meter.ignoreDateStatusChecks = form.controls.ignoreDateStatusChecks.value;
    meter = this.setMultipliers(meter);
    const chargesArray = form.get('chargesArray') as FormArray;
    meter.charges = chargesArray.controls.map(chargeGroup => ({
      guid: chargeGroup.get('guid').value,
      name: chargeGroup.get('name').value,
      chargeType: chargeGroup.get('chargeType').value,
      displayUsageInTable: chargeGroup.get('displayUsageInTable').value,
      displayChargeInTable: chargeGroup.get('displayChargeInTable').value
    }));
    return meter;
  }

  addCharge(form: FormGroup): void {
    const chargesArray = form.get('chargesArray') as FormArray;
    chargesArray.push(this.buildChargeGroup({
      guid: getGUID(),
      name: 'New Charge',
      chargeType: 'consumption',
      displayChargeInTable: true,
      displayUsageInTable: true
    }));
  }

  removeCharge(form: FormGroup, index: number): void {
    const chargesArray = form.get('chargesArray') as FormArray;
    chargesArray.removeAt(index);
  }

  private buildChargeGroup(charge: MeterCharge): FormGroup {
    return this.formBuilder.group({
      guid: [charge.guid],
      name: [charge.name, Validators.required],
      chargeType: [charge.chargeType, Validators.required],
      displayUsageInTable: [charge.displayUsageInTable],
      displayChargeInTable: [charge.displayChargeInTable]
    });
  }

  private setMultipliers(meter: IdbUtilityMeter): IdbUtilityMeter {
    if (meter.source === 'Electricity') {
      const greenPurchaseFraction = meter.agreementType === 5 ? meter.greenPurchaseFraction : undefined;
      const multipliers = this.getMultipliers(meter.includeInEnergy, meter.retainRECs, meter.directConnection, greenPurchaseFraction);
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

  private getMultipliers(includeInEnergy: boolean, retainRECs: boolean, directConnection: boolean, greenPurchaseFraction?: number): {
    recsMultiplier: number;
    marketGHGMultiplier: number;
    locationGHGMultiplier: number;
  } {
    let marketGHGMultiplier = 1;
    let locationGHGMultiplier = 1;
    let recsMultiplier = retainRECs ? 1 : 0;
    if (greenPurchaseFraction !== undefined) {
      recsMultiplier = greenPurchaseFraction;
    }
    if (includeInEnergy) {
      locationGHGMultiplier = directConnection && retainRECs ? 0 : 1;
    } else {
      locationGHGMultiplier = retainRECs ? 0 : 1;
    }
    if (greenPurchaseFraction) {
      marketGHGMultiplier = 1 - greenPurchaseFraction;
    } else {
      marketGHGMultiplier = retainRECs ? 0 : 1;
    }
    return { marketGHGMultiplier, locationGHGMultiplier, recsMultiplier };
  }
}
