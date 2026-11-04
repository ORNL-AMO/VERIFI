import { ConflictChoices, DraftMerge, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { MeterReadingValues } from './meter-reading-form.service';

export function meterReadingContextKey(meter: IdbUtilityMeter): string {
  return JSON.stringify([meter.source, meter.startingUnit, meter.energyUnit, meter.scope, meter.heatCapacity,
    meter.vehicleCategory, meter.vehicleCollectionUnit, meter.vehicleDistanceUnit, meter.vehicleFuelEfficiency, meter.demandUnit]);
}
export function reconcileMeterReading(base: MeterReadingValues, local: MeterReadingValues, saved: MeterReadingValues, choices?: ConflictChoices): DraftMerge<MeterReadingValues> {
  const fields = reconcileFields(base, local, saved, { choices, exclude: ['chargesArray'] });
  const charges = reconcileKeyedItems(base.chargesArray, local.chargesArray, saved.chargesArray, charge => charge.chargeGuid,
    (before, draft, current, prefix) => reconcileFields(before, draft, current, { choices, prefix }), choices, 'charges');
  return { value: { ...fields.value, chargesArray: [...charges.value] },
    baseline: { ...(fields.baseline ?? saved), chargesArray: [...(charges.baseline ?? saved.chargesArray)] },
    conflicts: [...fields.conflicts, ...charges.conflicts] };
}
