import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MeterSettingsForm, MeterSettingsValues, MeterChargeForm, readMeterSettings, applyMeterSettings } from '../meter-settings-values';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { getGUID } from '@shared/sharedHelperFunctions';
import { MeterSettingsValidationService } from './meter-settings-validation.service';

@Injectable({ providedIn: 'root' })
export class MeterSettingsFormBuilderService {
  private readonly formBuilder = inject(FormBuilder);
  private readonly validation = inject(MeterSettingsValidationService);

  buildMeterSettingsForm(meter: IdbUtilityMeter): MeterSettingsForm {
    const values = readMeterSettings(meter);
    const chargesArray = this.formBuilder.array((meter.charges ?? []).map(charge => this.buildChargeGroup(charge)));
    return this.formBuilder.group({
      meterNumber: [values.meterNumber],
      accountNumber: [values.accountNumber],
      phase: [values.phase, this.validation.getPhaseValidation(meter.source, meter.scope)],
      heatCapacity: [values.heatCapacity, this.validation.getHeatCapacityValidation(meter.source, meter.startingUnit, meter.scope)],
      siteToSource: [values.siteToSource, this.validation.getSiteToSourceValidation(meter.source, meter.includeInEnergy, meter.scope)],
      name: [values.name, [Validators.required, Validators.pattern(/\S/)]],
      location: [values.location],
      supplier: [values.supplier],
      notes: [values.notes],
      source: [values.source, Validators.required],
      groupId: [values.groupId],
      meterReadingDataApplication: [values.meterReadingDataApplication, Validators.required],
      fuel: [values.fuel, this.validation.getFuelValidation(meter.source, meter.scope)],
      startingUnit: [values.startingUnit, Validators.required],
      energyUnit: [values.energyUnit, Validators.required],
      scope: [values.scope],
      agreementType: [values.agreementType],
      includeInEnergy: [values.includeInEnergy],
      retainRECs: [values.retainRECs],
      directConnection: [values.directConnection],
      greenPurchaseFraction: [values.greenPurchaseFraction, [Validators.min(0), Validators.max(100)]],
      waterIntakeType: [values.waterIntakeType, this.validation.getWaterIntakeValidation(meter.source)],
      waterDischargeType: [values.waterDischargeType, this.validation.getWaterDischargeValidation(meter.source)],
      vehicleCategory: [values.vehicleCategory, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleType: [values.vehicleType, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleCollectionType: [values.vehicleCollectionType, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleCollectionUnit: [values.vehicleCollectionUnit, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleFuel: [values.vehicleFuel, this.validation.getBasicVehicleValidation(meter.scope)],
      vehicleFuelEfficiency: [values.vehicleFuelEfficiency, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      vehicleDistanceUnit: [values.vehicleDistanceUnit, this.validation.getAdditionalVehicleValidation(meter.scope, meter.vehicleCategory)],
      globalWarmingPotentialOption: [values.globalWarmingPotentialOption, this.validation.getGlobalWarmingPotentialValidation(meter.scope)],
      demandUnit: [values.demandUnit],
      chargesArray,
      noLongerInUse: [values.noLongerInUse],
      noLongerInUseMonth: [values.noLongerInUseMonth],
      noLongerInUseYear: [values.noLongerInUseYear],
      canBeNegative: [values.canBeNegative],
      ignoreDateStatusChecks: [values.ignoreDateStatusChecks]
    });
  }

  updateMeterFromSettingsForm(meter: IdbUtilityMeter, form: MeterSettingsForm): IdbUtilityMeter {
    return applyMeterSettings(meter, form.getRawValue());
  }

  hydrate(form: MeterSettingsForm, values: MeterSettingsValues): void {
    const { chargesArray, ...fields } = values;
    form.patchValue(fields, { emitEvent: false });
    const existing = new Map(form.controls.chargesArray.controls.map(control => [control.controls.guid.value, control]));
    const controls = chargesArray.map(charge => {
      const control = existing.get(charge.guid) ?? this.buildChargeGroup({ ...charge, chargeType: charge.chargeType ?? undefined });
      control.patchValue(charge, { emitEvent: false });
      return control;
    });
    if (controls.some((control, index) => form.controls.chargesArray.at(index) !== control) || controls.length !== form.controls.chargesArray.length) {
      form.controls.chargesArray.clear({ emitEvent: false });
      for (const control of controls) form.controls.chargesArray.push(control, { emitEvent: false });
    }
  }

  addCharge(form: MeterSettingsForm): void {
    const chargesArray = form.controls.chargesArray;
    chargesArray.push(this.buildChargeGroup({
      guid: getGUID(),
      name: 'New Charge',
      chargeType: 'consumption',
      displayChargeInTable: true,
      displayUsageInTable: true
    }));
  }

  removeCharge(form: MeterSettingsForm, index: number): void {
    const chargesArray = form.controls.chargesArray;
    chargesArray.removeAt(index);
  }

  private buildChargeGroup(charge: MeterCharge): MeterChargeForm {
    return this.formBuilder.group({
      guid: [charge.guid],
      name: [charge.name, [Validators.required, Validators.pattern(/\S/)]],
      chargeType: [charge.chargeType, Validators.required],
      displayUsageInTable: [charge.displayUsageInTable],
      displayChargeInTable: [charge.displayChargeInTable]
    });
  }

}
