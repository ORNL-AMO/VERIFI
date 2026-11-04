import { ConflictChoices, DraftMerge, reconcileFields, reconcileKeyedItems } from '@app/v1/data/editing/draft-reconciliation';
import { MeterSettingsValues } from '@app/v1/shared/meter-settings/meter-settings-values';

export function reconcileMeterSettings(base: MeterSettingsValues, local: MeterSettingsValues, saved: MeterSettingsValues, choices?: ConflictChoices): DraftMerge<MeterSettingsValues> {
  const fields = reconcileFields(base, local, saved, { choices, exclude: ['chargesArray'], groups: [{
    id: 'setup', label: 'Meter setup', keys: [
      'source', 'groupId', 'scope', 'phase', 'fuel', 'startingUnit', 'energyUnit', 'heatCapacity', 'siteToSource',
      'agreementType', 'includeInEnergy', 'retainRECs', 'directConnection', 'greenPurchaseFraction',
      'waterIntakeType', 'waterDischargeType', 'vehicleCategory', 'vehicleType', 'vehicleCollectionType',
      'vehicleCollectionUnit', 'vehicleFuel', 'vehicleFuelEfficiency', 'vehicleDistanceUnit', 'globalWarmingPotentialOption', 'demandUnit'
    ]
  }, { id: 'inactive', label: 'Inactive date', keys: ['noLongerInUse', 'noLongerInUseMonth', 'noLongerInUseYear'] }] });
  const charges = reconcileKeyedItems(base.chargesArray, local.chargesArray, saved.chargesArray,
    charge => charge.guid, (before, draft, current, prefix) => reconcileFields(before, draft, current, { choices, prefix }), choices, 'charges');
  return { value: { ...fields.value, chargesArray: [...charges.value] },
    baseline: { ...(fields.baseline ?? saved), chargesArray: [...(charges.baseline ?? saved.chargesArray)] },
    conflicts: [...fields.conflicts, ...charges.conflicts] };
}
