import type { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';

/** Recorded quantities follow the existing v0/v1 bill editors, not energy conversion units. */
export function recordedChargeUsageUnit(charge: MeterCharge | undefined, meter: IdbUtilityMeter): string | undefined {
  if (charge?.chargeType === 'demand' && meter.source === 'Electricity') return meter.demandUnit || 'kW';
  if (charge?.chargeType === 'consumption' || charge?.chargeType === 'sewer') return meter.startingUnit;
  // Other categories expose an amount, but the bill editors establish no quantity unit.
  return undefined;
}
