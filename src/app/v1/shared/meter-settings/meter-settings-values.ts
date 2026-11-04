import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';

export const METER_SETTINGS_FIELDS = [
  'meterNumber', 'accountNumber', 'phase', 'heatCapacity', 'siteToSource', 'name',
  'location', 'supplier', 'notes', 'source', 'groupId', 'meterReadingDataApplication', 'fuel',
  'startingUnit', 'energyUnit', 'scope', 'agreementType', 'includeInEnergy',
  'retainRECs', 'directConnection', 'greenPurchaseFraction', 'waterIntakeType',
  'waterDischargeType', 'vehicleCategory', 'vehicleType', 'vehicleCollectionType',
  'vehicleCollectionUnit', 'vehicleFuel', 'vehicleFuelEfficiency', 'vehicleDistanceUnit',
  'globalWarmingPotentialOption', 'demandUnit', 'noLongerInUse', 'noLongerInUseMonth',
  'noLongerInUseYear', 'canBeNegative', 'ignoreDateStatusChecks'
] as const satisfies readonly (keyof IdbUtilityMeter)[];

type MeterSettingsField = typeof METER_SETTINGS_FIELDS[number];
type ScalarValues = { [K in MeterSettingsField]-?: Exclude<IdbUtilityMeter[K], undefined> | null };
export type MeterChargeValues = Omit<MeterCharge, 'chargeType'> & { chargeType: MeterCharge['chargeType'] | null };
export type MeterChargeForm = FormGroup<{ [K in keyof MeterChargeValues]: FormControl<MeterChargeValues[K]> }>;
export type MeterSettingsValues = ScalarValues & { chargesArray: MeterChargeValues[] };
export type MeterSettingsForm = FormGroup<{
  [K in MeterSettingsField]: FormControl<MeterSettingsValues[K]>
} & { chargesArray: FormArray<MeterChargeForm> }>;

const BOOLEAN_FIELDS = ['includeInEnergy', 'retainRECs', 'directConnection', 'noLongerInUse', 'canBeNegative', 'ignoreDateStatusChecks'] as const;

/** Form-space values only: percentages stay percentages; no derived record fields are written. */
export function normalizeMeterSettings(values: MeterSettingsValues): MeterSettingsValues {
  const normalized = Object.fromEntries(METER_SETTINGS_FIELDS.map(key => [key, values[key] ?? null])) as ScalarValues;
  for (const key of BOOLEAN_FIELDS) normalized[key] = values[key] ?? false;
  normalized.groupId = values.groupId || null;
  return { ...normalized, chargesArray: values.chargesArray.map(charge => ({
    guid: charge.guid, name: charge.name ?? '', chargeType: charge.chargeType ?? null,
    displayChargeInTable: charge.displayChargeInTable ?? false,
    displayUsageInTable: charge.displayUsageInTable ?? false
  })) };
}

export function readMeterSettings(meter: IdbUtilityMeter): MeterSettingsValues {
  const values = Object.fromEntries(METER_SETTINGS_FIELDS.map(key => [key, meter[key] ?? null])) as ScalarValues;
  values.greenPurchaseFraction = (meter.greenPurchaseFraction ?? 0) * 100;
  return normalizeMeterSettings({ ...values, chargesArray: (meter.charges ?? []).map(charge => ({ ...charge })) });
}

/** Apply only settings fields, preserving current identity, display preferences, and other metadata. */
export function applyMeterSettings(meter: IdbUtilityMeter, input: MeterSettingsValues): IdbUtilityMeter {
  const values = normalizeMeterSettings(input);
  const settings = Object.fromEntries(METER_SETTINGS_FIELDS.map(key => [key, values[key] ?? undefined]));
  const updated = { ...structuredClone(meter), ...settings,
    greenPurchaseFraction: (values.greenPurchaseFraction ?? 0) / 100,
    charges: values.chargesArray.map(charge => ({ ...charge, chargeType: charge.chargeType ?? undefined }))
  } as IdbUtilityMeter;
  if (updated.source !== 'Electricity') {
    updated.locationGHGMultiplier = 1; updated.marketGHGMultiplier = 1; updated.recsMultiplier = 0;
    return updated;
  }
  const fraction = updated.agreementType === 5 ? updated.greenPurchaseFraction : undefined;
  updated.recsMultiplier = fraction ?? (updated.retainRECs ? 1 : 0);
  updated.locationGHGMultiplier = updated.includeInEnergy
    ? (updated.directConnection && updated.retainRECs ? 0 : 1) : (updated.retainRECs ? 0 : 1);
  updated.marketGHGMultiplier = fraction ? 1 - fraction : (updated.retainRECs ? 0 : 1);
  return updated;
}
