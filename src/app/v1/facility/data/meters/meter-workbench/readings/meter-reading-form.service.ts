import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { maxDateValidator, minDateValidator } from '@shared/customFormValidators';
import { getMeterDataDateString } from '@shared/dateHelperFunctions';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';

export interface MeterReadingFormContext {
  readonly displayVolumeInput: boolean;
  readonly displayEnergyUse: boolean;
  readonly displayHeatCapacity: boolean;
  readonly displayVehicleFuelEfficiency: boolean;
}

@Injectable({ providedIn: 'root' })
export class MeterReadingFormService {
  constructor(private readonly formBuilder: FormBuilder) { }

  buildForm(meter: IdbUtilityMeter, meterData: IdbUtilityMeterData, existingReadings: readonly IdbUtilityMeterData[] = []): FormGroup {
    if (meter.source === 'Electricity') {
      return this.buildElectricityForm(meter, meterData, existingReadings);
    }
    return this.buildGeneralForm(meter, meterData, this.contextForMeter(meter), existingReadings);
  }

  contextForMeter(meter: IdbUtilityMeter): MeterReadingFormContext {
    return {
      displayVolumeInput: meter.source === 'Other'
        ? getIsEnergyUnit(meter.startingUnit) === false
        : getIsEnergyUnit(meter.startingUnit) === false,
      displayEnergyUse: meter.source === 'Other'
        ? getIsEnergyUnit(meter.startingUnit) === true
        : getIsEnergyMeter(meter.source),
      displayHeatCapacity: checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope),
      displayVehicleFuelEfficiency: meter.scope === 2 && meter.vehicleCategory === 2
    };
  }

  updateReadingFromForm(meter: IdbUtilityMeter, meterData: IdbUtilityMeterData, form: FormGroup): IdbUtilityMeterData {
    const draft = structuredClone(meterData);
    const dateData: string[] = form.controls['readDate'].value.split('-');
    draft.year = parseInt(dateData[0], 10);
    draft.month = parseInt(dateData[1], 10);
    draft.day = parseInt(dateData[2], 10);
    draft.totalEnergyUse = enabledControlValue(form, 'totalEnergyUse');
    draft.totalCost = enabledControlValue(form, 'totalCost');
    draft.isEstimated = form.controls['isEstimated'].value;

    if (meter.source === 'Electricity') {
      draft.totalRealDemand = enabledControlValue(form, 'totalRealDemand');
      draft.totalBilledDemand = enabledControlValue(form, 'totalBilledDemand');
      draft.powerFactor = enabledControlValue(form, 'powerFactor');
    } else {
      draft.totalVolume = enabledControlValue(form, 'totalVolume');
      draft.heatCapacity = enabledControlValue(form, 'heatCapacity');
      draft.vehicleFuelEfficiency = enabledControlValue(form, 'vehicleFuelEfficiency');
    }

    draft.charges = this.getChargesArray(form).controls.map(chargeGroup => ({
      chargeGuid: chargeGroup.get('chargeGuid')?.value,
      chargeAmount: chargeGroup.get('chargeAmount')?.value,
      chargeUsage: chargeGroup.get('chargeUsage')?.value
    }));
    return draft;
  }

  private buildElectricityForm(meter: IdbUtilityMeter, meterData: IdbUtilityMeterData, existingReadings: readonly IdbUtilityMeterData[]): FormGroup {
    return this.formBuilder.group({
      readDate: [getMeterDataDateString(meterData), [Validators.required, maxDateValidator(), minDateValidator(), duplicateReadingDateValidator(meter, meterData, existingReadings)]],
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required]],
      totalCost: [meterData.totalCost, [Validators.min(0)]],
      totalRealDemand: [meterData.totalRealDemand, [Validators.min(0)]],
      totalBilledDemand: [meterData.totalBilledDemand, [Validators.min(0)]],
      powerFactor: [meterData.powerFactor, [Validators.min(0), Validators.max(1)]],
      isEstimated: [meterData.isEstimated || false],
      chargesArray: this.buildChargesArray(meterData)
    });
  }

  private buildGeneralForm(meter: IdbUtilityMeter, meterData: IdbUtilityMeterData, context: MeterReadingFormContext, existingReadings: readonly IdbUtilityMeterData[]): FormGroup {
    const totalVolumeValidators: ValidatorFn[] = context.displayVolumeInput ? [Validators.required, Validators.min(0)] : [];
    const totalEnergyUseValidators: ValidatorFn[] = context.displayEnergyUse
      ? [Validators.required, ...((meter.source === 'Natural Gas' || meter.source === 'Other Energy' || meter.source === 'Other Fuels') ? [] : [Validators.min(0)])]
      : [];
    const heatCapacityValidators: ValidatorFn[] = context.displayHeatCapacity ? [Validators.required, Validators.min(0)] : [];
    const fuelEfficiencyValidators: ValidatorFn[] = context.displayVehicleFuelEfficiency ? [Validators.required, Validators.min(0)] : [];
    const form = this.formBuilder.group({
      readDate: [getMeterDataDateString(meterData), [Validators.required, maxDateValidator(), minDateValidator(), duplicateReadingDateValidator(meter, meterData, existingReadings)]],
      totalVolume: [meterData.totalVolume, totalVolumeValidators],
      totalEnergyUse: [meterData.totalEnergyUse, totalEnergyUseValidators],
      totalCost: [meterData.totalCost],
      heatCapacity: [meterData.heatCapacity ?? meter.heatCapacity, heatCapacityValidators],
      vehicleFuelEfficiency: [meterData.vehicleFuelEfficiency ?? meter.vehicleFuelEfficiency, fuelEfficiencyValidators],
      isEstimated: [meterData.isEstimated || false],
      chargesArray: this.buildChargesArray(meterData)
    });
    if (context.displayVolumeInput) {
      form.controls['totalEnergyUse'].disable();
    }
    form.controls['heatCapacity'].disable();
    form.controls['vehicleFuelEfficiency'].disable();
    return form;
  }

  private buildChargesArray(meterData: IdbUtilityMeterData): FormArray {
    return this.formBuilder.array((meterData.charges ?? []).map(charge => this.formBuilder.group({
      chargeGuid: [charge.chargeGuid],
      chargeAmount: [charge.chargeAmount],
      chargeUsage: [charge.chargeUsage]
    })));
  }

  private getChargesArray(form: FormGroup): FormArray {
    return form.get('chargesArray') as FormArray;
  }
}

function enabledControlValue(form: FormGroup, controlName: string): any {
  return form.getRawValue()[controlName];
}

function duplicateReadingDateValidator(
  meter: IdbUtilityMeter,
  currentReading: IdbUtilityMeterData,
  existingReadings: readonly IdbUtilityMeterData[]
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const dateParts = parseDateParts(control.value);
    if (!dateParts) {
      return null;
    }
    const duplicate = existingReadings.find(reading => {
      return reading.meterId === meter.guid
        && reading.guid !== currentReading.guid
        && reading.year === dateParts.year
        && reading.month === dateParts.month
        && reading.day === dateParts.day;
    });
    return duplicate ? { duplicateReadingDate: true } : null;
  };
}

function parseDateParts(value: unknown): { year: number; month: number; day: number } | undefined {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate()
    };
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const parts = value.split('-').map(part => Number(part));
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
    return undefined;
  }
  return {
    year: parts[0],
    month: parts[1],
    day: parts[2]
  };
}
