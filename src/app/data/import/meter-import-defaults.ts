import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

export function getDefaultMeterScope(source: MeterSource): number | undefined {
  if (source === 'Electricity') return 3;
  if (source === 'Other Energy') return 4;
  if (source === 'Natural Gas' || source === 'Other Fuels') return 1;
  if (source === 'Other') return 100;
  return undefined;
}

export function applyMeterMultipliers(meter: IdbUtilityMeter): IdbUtilityMeter {
  if (meter.source !== 'Electricity') {
    meter.locationGHGMultiplier = 1;
    meter.marketGHGMultiplier = 1;
    meter.recsMultiplier = 0;
    return meter;
  }

  const greenPurchaseFraction = meter.agreementType === 5
    ? meter.greenPurchaseFraction
    : undefined;
  meter.recsMultiplier = greenPurchaseFraction ?? (meter.retainRECs ? 1 : 0);
  meter.locationGHGMultiplier = meter.retainRECs &&
    (meter.directConnection || !meter.includeInEnergy) ? 0 : 1;
  meter.marketGHGMultiplier = greenPurchaseFraction
    ? 1 - greenPurchaseFraction
    : (meter.retainRECs ? 0 : 1);
  return meter;
}
