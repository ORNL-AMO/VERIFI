import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter } from '@data/models/calanderization';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { energyUseFiscalPeriod, projectEnergyUse, savedEnergyUseYears } from '@domain/calculations/energy-footprint/energy-use-projection';
import { buildFacilityEnergyUseBalance, facilityEnergyBalanceYear } from '@domain/calculations/energy-footprint/facility-energy-use-balance';
import type { ResolvedVisualizationSeries, VisualizationObservation, VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';
import { compositionData, compositionPeriodIssue, isCompositionChart, sumCompositionObservations, type CompositionContribution, type CompositionDenominator } from '../visualization-composition';
import { energyUseBuckets, energyUseSelectionMode, energyUseSeriesId } from './equipment-selection';

/** Saved annual amounts only. Meter calculations are supplied explicitly for balance/share requests. */
export function resolveEquipmentComposition(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest, unit: string,
  series: readonly ResolvedVisualizationSeries[], meters?: readonly CalanderizedMeter[]): VisualizationSourceResolution {
  const { identity, source, chart } = request;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  if (source.kind !== 'energy-use' || !isCompositionChart(chart)) return unsupported('Choose Energy Use composition.');
  const issue = compositionPeriodIssue({ sources: [source], period: request.period, comparison: request.comparison });
  if (issue) return unsupported(issue);
  const selection = energyUseBuckets(snapshot, identity.scope, source);
  if (selection.missing.length) return { identity, state: 'missing-source', references: selection.missing, message: 'Repair the selected Energy Use references.' };
  const items = [...new Map(selection.buckets.flatMap(bucket => bucket.items).map(item => [item.guid, item])).values()];
  const facilities = snapshot.facilities.filter(facility => facility.accountId === snapshot.account.guid && identity.scope.facilityGuids.includes(facility.guid));
  const balance = chart.kind === 'sankey' && chart.flow === 'energy-balance';
  if (balance && (energyUseSelectionMode(source) !== 'facility' || source.selection?.kind !== 'fixed' || source.selection.resource !== 'facility'))
    return unsupported('Energy balance requires an explicit selection of whole facilities. Choose Select by Facility.');
  if ((balance || source.denominator === 'metered-consumption') && !meters) return unsupported('Resolve current metered consumption before preparing energy balance or metered shares.');
  const selectedFacilities = facilities.filter(facility => items.some(item => item.facilityId === facility.guid)
    || selection.buckets.some(bucket => bucket.facilityGuid === facility.guid));
  const equipmentYear = savedEnergyUseYears(items).at(-1);
  const utilityYears = balance ? selectedFacilities.flatMap(facility => { const year = facilityEnergyBalanceYear(meters!, facility, snapshot.meterData); return year === undefined ? [] : [year]; }) : [];
  const latest = [...equipmentYear === undefined ? [] : [equipmentYear], ...utilityYears].sort((a, b) => a - b).at(-1);
  const year = request.period.kind === 'fiscal-year' ? request.period.year : latest;
  if (year === undefined) return { identity, state: 'empty', periods: [], message: 'No saved fiscal year is available for these Energy Uses.' };
  const intervals = selectedFacilities.map(facility => ({ facility, period: energyUseFiscalPeriod(facility, year) }));
  if (intervals.some(value => !value.period)) return unsupported('Repair the selected facilities’ fiscal calendars.');
  if (new Set(intervals.map(value => value.period!.key)).size > 1) return unsupported('Energy Use composition requires matching actual fiscal start/end dates across facilities.');
  const periods = intervals.map(({ facility, period }) => { const [start, end] = period!.key.split(' / '); return {
    role: 'primary' as const, start, end, basis: 'fiscal' as const, interval: 'yearly' as const, facilityGuid: facility.guid, fiscalYear: year
  }; });
  if (periods.some(period => period.start.startsWith('0000') || period.end.length !== 10)) return unsupported('The fiscal period is outside supported civil years 1–9999.');
  const diagnostics: string[] = [], denominators: CompositionDenominator[] = [], residuals: CompositionContribution[] = [];
  if (snapshot.energyUseEquipment.reduce((count, item) => count + Math.max(1, item.utilityData.length), 0) > 250000) return unsupported('Narrow the account equipment data before preparing this composition.');
  const projections = new Map(snapshot.energyUseEquipment.filter(item => item.accountId === snapshot.account.guid && facilities.some(facility => facility.guid === item.facilityId))
    .flatMap(item => { const row = projectEnergyUse(item, facilities.find(facility => facility.guid === item.facilityId)!, year, unit); return row ? [[item.guid, row] as const] : []; }));
  const contributions: CompositionContribution[] = selection.buckets.flatMap<CompositionContribution>(bucket => {
    const members = bucket.items.flatMap(item => {
      const row = projections.get(item.guid); if (!row) return [];
      const group = snapshot.energyUseGroups.find(group => group.guid === item.energyUseGroupId && group.facilityId === item.facilityId && group.accountId === snapshot.account.guid);
      const categories = { facility: { id: row.facility.guid, label: row.facility.name || 'Unnamed facility' },
        group: { id: group?.guid ?? `unavailable:${item.facilityId}`, label: group?.name ?? 'Group unavailable', ...(group?.color ? { color: group.color } : {}) },
        equipment: { id: item.guid, label: item.name || 'Unnamed equipment' } };
      return (row.sources.length ? row.sources : [undefined]).map(occurrence => {
        const observation: VisualizationObservation = occurrence?.amount !== null && occurrence?.amount !== undefined
          ? { state: 'observed', value: occurrence.amount, partial: false, provenance: occurrence.state === 'carried' ? 'carried-forward' : 'estimated', notes: [occurrence.description] }
          : { state: 'missing', value: null, reason: occurrence?.description ?? 'No saved utility sources.' };
        return { id: occurrence?.id ?? JSON.stringify([item.guid, 'missing']), seriesId: energyUseSeriesId(source, bucket.key), label: bucket.label,
          observation, categories: { ...categories, source: { id: occurrence?.source ?? 'unavailable', label: occurrence?.source ?? 'Source unavailable' } },
          details: [row.period.label, ...(occurrence ? [`Source occurrence ${occurrence.sourceIndex + 1}`, occurrence.description,
            `Saved: ${occurrence.originalAmount ?? 'Unavailable'} ${occurrence.originalUnit ?? ''}${occurrence.originYear ? ' · FY ' + occurrence.originYear : ''}`, occurrence.override ? 'Manual override' : 'Saved estimate'] : ['No saved sources.'])] };
      });
    });
    if (members.length) return members;
    const facility = facilities.find(facility => facility.guid === bucket.facilityGuid);
    return [{ id: `${energyUseSeriesId(source, bucket.key)}:empty`, seriesId: energyUseSeriesId(source, bucket.key), label: bucket.label,
      observation: { state: 'missing' as const, value: null, reason: 'No equipment currently matches this selection.' },
      categories: { ...(facility ? { facility: { id: facility.guid, label: facility.name } } : {}), group: { id: bucket.key, label: bucket.label } }, details: ['Empty selection; no fabricated contribution.'] }];
  });
  for (const facility of facilities) {
    const rows = [...projections.values()].filter(row => row.facility.guid === facility.guid);
    const total = rows.length ? sumCompositionObservations(rows.flatMap(row => row.sources.map(occurrence => occurrence.amount === null
      ? { state: 'missing' as const, value: null, reason: occurrence.description }
      : { state: 'observed' as const, value: occurrence.amount, partial: false, provenance: occurrence.state === 'carried' ? 'carried-forward' as const : 'estimated' as const }))) : { state: 'observed' as const, value: 0, partial: false, provenance: 'estimated' as const, notes: ['No equipment in this facility.'] };
    const noSource = rows.some(row => !row.sources.length);
    denominators.push({ kind: 'facility', facilityGuid: facility.guid, observation: total.state === 'observed' && noSource ? { ...total, partial: true } : total });
    if (!balance && source.denominator !== 'metered-consumption' || !selectedFacilities.some(value => value.guid === facility.guid)) continue;
    const convert = (value: number, from: string, to: string) => new ConvertValue(value, from, to).convertedValue;
    const sourceNames = [...new Set(rows.flatMap(row => row.sources.map(value => value.source)))];
    const equipment = { total: convert(rows.reduce((sum, row) => sum + row.amount, 0), unit, facility.energyUnit),
      sources: sourceNames.map(name => { const values = rows.flatMap(row => row.sources.filter(value => value.source === name)); return {
        source: name, total: convert(values.reduce((sum, value) => sum + (value.amount ?? 0), 0), unit, facility.energyUnit), partial: noSource || values.some(value => value.amount === null)
      }; }) };
    const result = buildFacilityEnergyUseBalance(facility, year, meters!, snapshot.meterData, equipment);
    denominators.push({ kind: 'metered-consumption', facilityGuid: facility.guid, observation: result.complete && result.consumption !== null
      ? { state: 'observed', value: convert(result.consumption, facility.energyUnit, unit), partial: false, provenance: 'measured' }
      : { state: 'missing', value: null, reason: 'Incomplete metered coverage; a metered share is unavailable.' } });
    for (const value of result.sources) {
      const prefix = `${facility.name || 'Facility'} / ${value.source}`;
      diagnostics.push(`${prefix}: Metered consumption ${value.consumption === null ? 'unavailable' : convert(value.consumption, facility.energyUnit, unit) + ' ' + unit}; equipment ${convert(value.equipment, facility.energyUnit, unit)} ${unit}. ${value.unaccounted === null ? value.coverage : `${value.unaccounted < 0 ? 'Over allocated' : 'Unaccounted'}: ${convert(Math.abs(value.unaccounted), facility.energyUnit, unit)} ${unit}.`}${value.equipmentPartial || noSource ? ' Partial equipment coverage; known values only.' : ''}`);
      if (!balance || value.unaccounted === null || value.unaccounted <= 0) continue;
      const bucket = selection.buckets.find(bucket => bucket.facilityGuid === facility.guid)!;
      residuals.push({ id: JSON.stringify(['unaccounted', facility.guid, value.source]), seriesId: energyUseSeriesId(source, bucket.key), label: `Unaccounted · ${value.source}`,
        observation: { state: 'observed', value: convert(value.unaccounted, facility.energyUnit, unit), partial: value.equipmentPartial || noSource, provenance: 'estimated', notes: ['Metered site energy minus saved equipment estimates.'] },
        categories: { facility: { id: facility.guid, label: facility.name }, source: { id: value.source, label: value.source },
          group: { id: `unaccounted:${value.source}`, label: `Unaccounted · ${value.source}` } }, details: [periods.find(period => period.facilityGuid === facility.guid)!.start + ' – ' + periods.find(period => period.facilityGuid === facility.guid)!.end, 'Metered consumption minus known equipment use.'] });
    }
  }
  const comparableAccount = facilities.length === snapshot.facilities.filter(facility => facility.accountId === snapshot.account.guid).length
    && facilities.every(facility => energyUseFiscalPeriod(facility, year)?.key === intervals[0]?.period?.key);
  denominators.push({ kind: 'account', observation: comparableAccount ? sumCompositionObservations(denominators.filter(value => value.kind === 'facility').map(value => value.observation))
    : { state: 'missing', value: null, reason: 'Full-account share requires all facilities with matching actual fiscal periods.' } });
  const composition = { contributions, denominators, diagnostics, residuals };
  return { identity, state: 'ready', resolved: { composition, data: compositionData(chart, composition),
    alignment: { kind: chart.kind === 'breakdown' ? 'category' : chart.kind === 'sankey' ? 'flow' : 'hierarchy', key: 'actual-annual-composition' }, series, periods,
    references: selection.references, provenance: [...new Set([...contributions.map(value => value.observation), ...denominators.map(value => value.observation)].flatMap(value => value.state === 'observed' ? [value.provenance] : []))],
    quality: { partial: contributions.some(value => value.observation.state !== 'observed' || value.observation.partial) || denominators.some(value => value.kind === 'metered-consumption' && (value.observation.state !== 'observed' || value.observation.partial)), warnings: diagnostics } } };
}
