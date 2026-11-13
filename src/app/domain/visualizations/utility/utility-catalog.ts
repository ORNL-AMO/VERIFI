import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getConsumptionUnit, getUnitFromMeter } from '@domain/calculations/calanderization/calanderizationHelpers';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getIsEnergyMeter, getIsEnergyUnit } from '@shared/sharedHelperFunctions';
import type { UtilityVisualizationSource, VisualizationScope } from '../visualization-definition';
import type { ResolvedVisualizationSeries } from '../visualization-source-provider';
import { resolveUtilitySelection, utilityBuckets, utilityMeasureKey, utilityOwner, utilitySeriesId } from './utility-selection';
import { recordedChargeUsageUnit } from './utility-charge-semantics';

export function utilityMeterEligible(meter: IdbUtilityMeter, source: UtilityVisualizationSource): boolean {
  if (source.measure === 'energy') return meter.source === 'Other' ? getIsEnergyUnit(meter.startingUnit) : getIsEnergyMeter(meter.source);
  if (source.measure.endsWith('emissions')) return ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'].includes(meter.source)
    || meter.source === 'Other' && [5, 6].includes(meter.scope);
  return true;
}

export function utilityUnit(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: UtilityVisualizationSource, meter: IdbUtilityMeter): string {
  const owner = utilityOwner(snapshot, scope);
  if (!owner) return '';
  if (source.measure === 'cost' || source.measure === 'charge' && source.charge?.measure === 'cost') return 'USD';
  if (source.measure.endsWith('emissions')) return 'tonne CO2e';
  if (source.measure === 'charge') {
    const charge = meter.charges?.find(c => c.guid === source.charge?.chargeGuid);
    return recordedChargeUsageUnit(charge, meter) ?? '';
  }
  if (source.settings?.unit?.kind === 'pinned') return source.settings.unit.value;
  try { return source.measure === 'energy' ? getConsumptionUnit(meter, owner) : getUnitFromMeter(meter, owner); } catch { return ''; }
}

/** Cheap metadata for editing: no calculation demand and no discovered GUIDs written to intent. */
export function discoverUtilitySeries(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: UtilityVisualizationSource): readonly ResolvedVisualizationSeries[] {
  const selection = resolveUtilitySelection(snapshot, scope, source), owner = utilityOwner(snapshot, scope);
  const eligible = selection.meters.filter(m => utilityMeterEligible(m, source));
  return utilityBuckets(snapshot, source, eligible).flatMap(bucket => {
    const units = [...new Set(bucket.meters.map(m => utilityUnit(snapshot, scope, source, m)))];
    if (units.length !== 1 || !units[0]) return [];
    const unit = units[0], metric = utilityMeasureKey(source);
    const physical = new ConvertValue(undefined, '', '').getUnit(unit)?.measure ?? unit;
    const dimension = source.measure.endsWith('emissions') ? 'emissions' : unit === 'USD' ? 'currency'
      : source.measure === 'energy' ? 'energy' : `consumption:${physical}`;
    const charge = source.measure === 'charge' ? bucket.meters[0].charges?.find(c => c.guid === source.charge?.chargeGuid) : undefined;
    const treatment = source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value : owner?.energyIsSource ? 'source' as const : 'site' as const;
    const measureLabel = source.measure === 'energy' ? `${treatment === 'source' ? 'Source' : 'Site'} energy`
      : source.measure === 'cost' ? 'Cost' : source.measure === 'location-emissions' ? 'Location-based emissions'
      : source.measure === 'market-emissions' ? 'Market-based emissions' : 'Consumption';
    return [{ id: utilitySeriesId(source.id, bucket.key), sourceId: source.id, metric,
      ...(bucket.resourceGuid ? { resourceGuid: bucket.resourceGuid } : {}),
      label: charge ? `${bucket.label} / ${charge.name} / ${source.charge?.measure === 'cost' ? 'Recorded amount' : 'Recorded usage / demand'}` : `${bucket.label} / ${measureLabel}`, unit, dimension,
      ...(unit === 'USD' ? { currency: 'USD' } : {}),
      ...(source.measure === 'energy' ? { energyTreatment: treatment } : {}),
      additive: !charge || source.charge?.measure === 'cost' || !['demand', 'demandMDQ'].includes(charge.chargeType),
      contributionKeys: bucket.meters.map(m => `meter:${m.guid}:${metric}`) }];
  });
}
