import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
export interface MeterReadingChargeValues { chargeGuid: string; chargeAmount: number | null; chargeUsage: number | null; }
export interface MeterReadingValues {
  readDate: string;
  totalVolume: number | null;
  totalEnergyUse: number | null;
  totalCost: number | null;
  totalRealDemand: number | null;
  totalBilledDemand: number | null;
  powerFactor: number | null;
  heatCapacity: number | null;
  vehicleFuelEfficiency: number | null;
  isEstimated: boolean;
  chargesArray: MeterReadingChargeValues[];
}
export type MeterReadingChargeForm = FormGroup<{ [K in keyof MeterReadingChargeValues]: FormControl<MeterReadingChargeValues[K]> }>;
export type MeterReadingForm = FormGroup<{
  [K in Exclude<keyof MeterReadingValues, 'chargesArray'>]: FormControl<MeterReadingValues[K]>
} & { chargesArray: FormArray<MeterReadingChargeForm> }>;
const NUMERIC_FIELDS = ['totalVolume', 'totalEnergyUse', 'totalCost', 'totalRealDemand', 'totalBilledDemand', 'powerFactor', 'heatCapacity', 'vehicleFuelEfficiency'] as const;
export function normalizeMeterReading(value: MeterReadingValues): MeterReadingValues {
  return { ...value, ...Object.fromEntries(NUMERIC_FIELDS.map(key => [key, value[key] ?? null])),
    chargesArray: value.chargesArray.map(charge => ({ chargeGuid: charge.chargeGuid, chargeAmount: charge.chargeAmount ?? null, chargeUsage: charge.chargeUsage ?? null })) };
}
export function readMeterReading(meter: IdbUtilityMeter, reading: IdbUtilityMeterData): MeterReadingValues {
  return normalizeMeterReading({
    readDate: getMeterDataDateString(reading), totalVolume: reading.totalVolume ?? null,
    totalEnergyUse: reading.totalEnergyUse ?? null, totalCost: reading.totalCost ?? null,
    totalRealDemand: reading.totalRealDemand ?? null, totalBilledDemand: reading.totalBilledDemand ?? null,
    powerFactor: reading.powerFactor ?? null, heatCapacity: reading.heatCapacity ?? meter.heatCapacity ?? null,
    vehicleFuelEfficiency: reading.vehicleFuelEfficiency ?? meter.vehicleFuelEfficiency ?? null,
    isEstimated: reading.isEstimated ?? false,
    chargesArray: (reading.charges ?? []).map(charge => ({ chargeGuid: charge.chargeGuid, chargeAmount: charge.chargeAmount ?? null, chargeUsage: charge.chargeUsage ?? null }))
  });
}
export function applyMeterReading(meter: IdbUtilityMeter, reading: IdbUtilityMeterData, value: MeterReadingValues): IdbUtilityMeterData {
  const [year, month, day] = value.readDate.split('-').map(Number);
  const updated = { ...structuredClone(reading), year, month, day, totalEnergyUse: value.totalEnergyUse ?? undefined,
    totalCost: value.totalCost ?? undefined, isEstimated: value.isEstimated,
    charges: value.chargesArray.map(charge => ({ chargeGuid: charge.chargeGuid, chargeAmount: charge.chargeAmount ?? undefined, chargeUsage: charge.chargeUsage ?? undefined })) };
  if (meter.source === 'Electricity') {
    updated.totalRealDemand = value.totalRealDemand ?? undefined;
    updated.totalBilledDemand = value.totalBilledDemand ?? undefined;
    updated.powerFactor = value.powerFactor ?? undefined;
  } else {
    updated.totalVolume = value.totalVolume ?? undefined;
    updated.heatCapacity = value.heatCapacity ?? undefined;
    updated.vehicleFuelEfficiency = value.vehicleFuelEfficiency ?? undefined;
  }
  return updated;
}

@Injectable({ providedIn: 'root' })
export class MeterReadingFormService {
  constructor(private readonly formBuilder: FormBuilder) { }
  buildForm(meter: IdbUtilityMeter, reading: IdbUtilityMeterData, existingReadings: readonly IdbUtilityMeterData[] = []): MeterReadingForm {
    const context = this.contextForMeter(meter);
    const value = readMeterReading(meter, reading);
    const energyValidators = context.displayEnergyUse ? [Validators.required,
      ...(['Natural Gas', 'Other Energy', 'Other Fuels'].includes(meter.source) ? [] : [Validators.min(0)])] : [];
    const form = this.formBuilder.group({
      readDate: this.formBuilder.nonNullable.control(value.readDate, [Validators.required, maxDateValidator(), minDateValidator(), duplicateReadingDateValidator(meter, reading, existingReadings)]),
      totalVolume: this.formBuilder.control(value.totalVolume, context.displayVolumeInput ? [Validators.required, Validators.min(0)] : []),
      totalEnergyUse: this.formBuilder.control(value.totalEnergyUse, meter.source === 'Electricity' ? [Validators.required] : energyValidators),
      totalCost: this.formBuilder.control(value.totalCost, meter.source === 'Electricity' ? [Validators.min(0)] : []),
      totalRealDemand: this.formBuilder.control(value.totalRealDemand, [Validators.min(0)]),
      totalBilledDemand: this.formBuilder.control(value.totalBilledDemand, [Validators.min(0)]),
      powerFactor: this.formBuilder.control(value.powerFactor, [Validators.min(0), Validators.max(1)]),
      heatCapacity: this.formBuilder.control(value.heatCapacity, context.displayHeatCapacity ? [Validators.required, Validators.min(0)] : []),
      vehicleFuelEfficiency: this.formBuilder.control(value.vehicleFuelEfficiency, context.displayVehicleFuelEfficiency ? [Validators.required, Validators.min(0)] : []),
      isEstimated: this.formBuilder.nonNullable.control(value.isEstimated),
      chargesArray: this.formBuilder.array(value.chargesArray.map(charge => this.formBuilder.group({
        chargeGuid: this.formBuilder.nonNullable.control(charge.chargeGuid),
        chargeAmount: this.formBuilder.control(charge.chargeAmount), chargeUsage: this.formBuilder.control(charge.chargeUsage)
      })))
    });
    this.setEnabled(form, meter, true);
    return form;
  }
  contextForMeter(meter: IdbUtilityMeter): MeterReadingFormContext {
    return { displayVolumeInput: getIsEnergyUnit(meter.startingUnit) === false,
      displayEnergyUse: meter.source === 'Other' ? getIsEnergyUnit(meter.startingUnit) === true : getIsEnergyMeter(meter.source),
      displayHeatCapacity: checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope),
      displayVehicleFuelEfficiency: meter.scope === 2 && meter.vehicleCategory === 2 };
  }
  setEnabled(form: MeterReadingForm, meter: IdbUtilityMeter, enabled: boolean): void {
    if (!enabled) { form.disable({ emitEvent: false }); return; }
    form.enable({ emitEvent: false });
    if (meter.source !== 'Electricity') {
      if (this.contextForMeter(meter).displayVolumeInput) form.controls.totalEnergyUse.disable({ emitEvent: false });
      form.controls.heatCapacity.disable({ emitEvent: false });
      form.controls.vehicleFuelEfficiency.disable({ emitEvent: false });
      for (const field of ['totalRealDemand', 'totalBilledDemand', 'powerFactor'] as const) form.controls[field].disable({ emitEvent: false });
    }
  }
  refreshValidation(form: MeterReadingForm, meter: IdbUtilityMeter, reading: IdbUtilityMeterData, existing: readonly IdbUtilityMeterData[]): void {
    const fresh = this.buildForm(meter, reading, existing);
    for (const key of Object.keys(fresh.controls) as (keyof MeterReadingForm['controls'])[]) {
      form.controls[key].setValidators(fresh.controls[key].validator);
      form.controls[key].updateValueAndValidity({ emitEvent: false });
    }
  }
  hydrate(form: MeterReadingForm, value: MeterReadingValues): void {
    const { chargesArray, ...fields } = value;
    form.patchValue(fields, { emitEvent: false });
    const existing = new Map(form.controls.chargesArray.controls.map(control => [control.controls.chargeGuid.value, control]));
    const controls = chargesArray.map(charge => {
      const control = existing.get(charge.chargeGuid) ?? this.formBuilder.group({
        chargeGuid: this.formBuilder.nonNullable.control(charge.chargeGuid),
        chargeAmount: this.formBuilder.control(charge.chargeAmount), chargeUsage: this.formBuilder.control(charge.chargeUsage)
      });
      control.patchValue(charge, { emitEvent: false });
      return control;
    });
    if (controls.length !== form.controls.chargesArray.length || controls.some((control, index) => form.controls.chargesArray.at(index) !== control)) {
      form.controls.chargesArray.clear({ emitEvent: false });
      for (const control of controls) form.controls.chargesArray.push(control, { emitEvent: false });
    }
  }
  updateReadingFromForm(meter: IdbUtilityMeter, reading: IdbUtilityMeterData, form: MeterReadingForm): IdbUtilityMeterData {
    return applyMeterReading(meter, reading, form.getRawValue());
  }
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
