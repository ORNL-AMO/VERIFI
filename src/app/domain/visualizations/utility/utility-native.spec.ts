import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type { VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { getEmissions } from '@domain/calculations/emissions-calculations/emissions';
import type { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import type { MeterChargeType } from '@data/models/meter-charges-options';
import { resolveNativeUtility } from './utility-native';
import { utilityMeasureKey, utilitySeriesId } from './utility-selection';

describe('native utility observations', () => {
  function setup(options: Partial<UtilityVisualizationSource> = {}, overrides: Partial<AccountWorkspaceSnapshot> = {}) {
    const definition = utilityVisualizationFixture();
    const source: UtilityVisualizationSource = { ...definition.sources[0] as UtilityVisualizationSource, dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter',
      settings: { unit: { kind: 'owner' }, energyTreatment: { kind: 'pinned', value: 'site' } }, ...options };
    const snapshot = visualizationSnapshot();
    const saved: AccountWorkspaceSnapshot = { ...snapshot, account: { ...snapshot.account, energyUnit: 'kWh', volumeLiquidUnit: 'gal' },
      facilities: snapshot.facilities.map(facility => ({ ...facility, eGridSubregion: 'US' })),
      customEmissions: [{ ...getNewAccountEmissionsItem('account-a'), subregion: 'US',
        locationEmissionRates: [{ year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 }], residualEmissionRates: [{ year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 }] }],
      meters: [meter({})], meterData: [reading({})], ...overrides };
    const request: VisualizationSourceRequest = { identity: { accountGuid: saved.account.guid, workspaceRevision: 3, definitionGuid: 'visualization-a', definitionRevision: 2,
      requestId: 'native-a', scope: definition.scope, sourceId: source.id }, source,
      chart: { kind: 'time-series', type: 'line', interval: 'native', stack: 'none' }, period: { kind: 'all-history' }, comparison: { kind: 'none' },
      series: [{ id: 'display', sourceId: source.id, metric: utilityMeasureKey(source), axis: 'left' }], dateContext: { calendarDate: '2026-11-12', latestDataDate: '2026-01-01' } };
    return { source, saved, request };
  }
  function ready(result: VisualizationSourceResolution) {
    expect(result.state).toBe('ready');
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected ready native time series.');
    return { resolved: result.resolved, rows: result.resolved.data.rows, first: Object.values(result.resolved.data.rows[0].values)[0] };
  }

  it('preserves bill identities and read dates without inventing monthly coverage or mutating saved data', () => {
    const { saved, request, source } = setup();
    const before = structuredClone(saved), result = resolveNativeUtility(saved, request), actual = ready(result);
    expect(result.identity).toBe(request.identity);
    expect(actual.rows[0]).toMatchObject({ periodKey: 'meter-a:reading-a', start: '2026-01-01', end: '2026-01-01' });
    expect(actual.resolved.alignment).toEqual({ kind: 'billing-occurrence', key: 'meter:meter-a:bill-guid' });
    expect(actual.resolved.series[0]).toMatchObject({ id: utilitySeriesId(source.id, 'meter-a'), resourceGuid: 'meter-a', metric: utilityMeasureKey(source), unit: 'kWh' });
    expect(actual.first).toEqual({ state: 'observed', value: 10, provenance: 'measured', partial: false });
    expect(actual.resolved.quality.warnings).toContainEqual(expect.stringContaining('duration is not inferred'));
    expect(saved).toEqual(before);
  });

  it.each([0, -20, 100])('retains recorded cost %s including true zero and credits', value => {
    const { saved, request } = setup({ measure: 'cost' }, { meterData: [reading({ totalCost: value })] });
    const actual = ready(resolveNativeUtility(saved, request));
    expect(actual.first).toMatchObject({ state: 'observed', value });
    expect(actual.resolved.series[0]).toMatchObject({ unit: 'USD', currency: 'USD', dimension: 'currency' });
  });

  it.each([undefined, NaN, Infinity])('does not turn missing or invalid %s into a cost zero', value => {
    const { saved, request } = setup({ measure: 'cost' }, { meterData: [reading({ totalCost: value })] });
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'missing', value: null });
  });
  it.each([
    { label: 'water ignores unrelated negative energy', measure: 'consumption', utility: 'Water Intake', energy: -1, volume: 100, permitted: false, available: true, expected: 100 },
    { label: 'energy ignores unrelated negative volume', measure: 'energy', utility: 'Electricity', energy: 10, volume: -1, permitted: false, available: true, expected: 10 },
    { label: 'water rejects negative required volume', measure: 'consumption', utility: 'Water Intake', energy: 10, volume: -100, permitted: false, available: false, expected: -100 },
    { label: 'energy rejects negative required energy', measure: 'energy', utility: 'Electricity', energy: -10, volume: 100, permitted: false, available: false, expected: -10 },
    { label: 'water retains permitted signed volume', measure: 'consumption', utility: 'Water Intake', energy: 10, volume: -100, permitted: true, available: true, expected: -100 },
    { label: 'energy retains permitted signed energy', measure: 'energy', utility: 'Electricity', energy: -10, volume: 100, permitted: true, available: true, expected: -10 }
  ] as const)('$label for native bill observations', item => {
    const selected = meter({ source: item.utility, startingUnit: item.utility === 'Water Intake' ? 'gal' : 'kWh', canBeNegative: item.permitted });
    const { saved, request } = setup({ measure: item.measure }, { meters: [selected], meterData: [reading({ totalEnergyUse: item.energy, totalVolume: item.volume })] });
    const actual = ready(resolveNativeUtility(saved, request)).first;
    if (!item.available) expect(actual).toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('Negative') });
    else {
      expect(actual.state).toBe('observed');
      if (actual.state === 'observed') expect(actual.value).toBeCloseTo(item.expected, 10);
    }
  });

  it('uses canonical energy conversion and applicable site/source treatment', () => {
    const { saved, request } = setup({ settings: { unit: { kind: 'pinned', value: 'MWh' }, energyTreatment: { kind: 'pinned', value: 'source' } } },
      { meterData: [reading({ totalEnergyUse: 1000 })] });
    const actual = ready(resolveNativeUtility(saved, request));
    expect(actual.first).toMatchObject({ state: 'observed', value: 3 });
    expect(actual.resolved.series[0]).toMatchObject({ unit: 'MWh', energyTreatment: 'source' });
  });

  it('converts water consumption using its physical unit and rejects an incompatible energy unit', () => {
    const water = meter({ source: 'Water Intake', startingUnit: 'gal' });
    const { saved, request } = setup({ measure: 'consumption', settings: { unit: { kind: 'pinned', value: 'kgal' } } },
      { meters: [water], meterData: [reading({ totalVolume: 2000 })] });
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'observed', value: 2 });
    expect(resolveNativeUtility(saved, { ...request, source: { ...request.source, settings: { unit: { kind: 'pinned', value: 'kWh' } } } }).state).toBe('unsupported');
  });

  it.each(['location-emissions', 'market-emissions'] as const)('uses canonical raw %s without trusting stale stored result fields', measure => {
    const { saved, request } = setup({ measure }, { meterData: [reading({ totalWithLocationEmissions: 987, totalWithMarketEmissions: 654 })] });
    const [selectedMeter] = saved.meters, [bill] = saved.meterData;
    const reference = getEmissions(selectedMeter, bill.totalEnergyUse, selectedMeter.energyUnit, bill.year, false,
      [...saved.facilities], [...saved.customEmissions], [...saved.customFuels], bill.totalVolume,
      selectedMeter.vehicleCollectionUnit, selectedMeter.vehicleDistanceUnit, bill.heatCapacity,
      saved.account.assessmentReportVersion, [...saved.customGWPs]);
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'observed', value: measure === 'location-emissions' ? reference.totalWithLocationEmissions : reference.totalWithMarketEmissions });
  });
  it.each(['location-emissions', 'market-emissions'] as const)('uses the provided actual grid catalog for nonzero native %s', measure => {
    const rates: SubregionEmissions[] = [{ subregion: 'AKGD', locationEmissionRates: [{ year: 2020, CO2: 900, CH4: 0, N2O: 0 }, { year: 2025, CO2: 400, CH4: 0, N2O: 0 }],
      residualEmissionRates: [{ year: 2025, CO2: 700, CH4: 0, N2O: 0 }] }];
    const original = visualizationSnapshot();
    const { saved, request } = setup({ measure }, { customEmissions: [], facilities: original.facilities.map(item => ({ ...item, eGridSubregion: 'AKGD' })) });
    const before = structuredClone(saved);
    const actual = ready(resolveNativeUtility(saved, request, rates)).first;
    expect(actual.state).toBe('observed');
    if (actual.state === 'observed') expect(actual.value).toBeCloseTo(measure === 'location-emissions' ? 0.004 : 0.007, 10);
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'missing', reason: expect.stringContaining('coverage') });
    expect(ready(resolveNativeUtility(saved, request, [])).first).toMatchObject({ state: 'missing', reason: expect.stringContaining('coverage') });
    expect(saved).toEqual(before);
  });
  it('distinguishes a genuine zero grid factor from missing coverage', () => {
    const { saved, request } = setup({ measure: 'location-emissions' });
    const zero = { year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 };
    expect(ready(resolveNativeUtility(saved, request, [{ subregion: 'US', directEmissionsRate: true, locationEmissionRates: [zero], residualEmissionRates: [zero] }])).first)
      .toMatchObject({ state: 'observed', value: 0 });
    expect(ready(resolveNativeUtility(saved, request, [{ subregion: 'US', locationEmissionRates: [], residualEmissionRates: [] }])).first)
      .toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('coverage') });
  });
  it.each(['location-emissions', 'market-emissions'] as const)('keeps compressed-air %s unavailable when the unchanged canonical formula is nonfinite', measure => {
    const { saved, request } = setup({ measure }, { meters: [meter({ source: 'Other Energy', fuel: 'Purchased Compressed Air', startingUnit: 'SCF' })] });
    const rates: SubregionEmissions[] = [{ subregion: 'US', locationEmissionRates: [{ year: 2026, CO2: 400, CH4: 0, N2O: 0 }], residualEmissionRates: [] }];
    expect(ready(resolveNativeUtility(saved, request, rates)).first).toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('Authoritative emissions') });
  });

  it('keeps named charge amounts, actual zero, and missing occurrences separate', () => {
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: 'meter-a', chargeGuid: 'tax', measure: 'cost' } },
      { meters: [meter({ charges: [{ guid: 'tax', name: 'Sales tax', chargeType: 'tax', displayChargeInTable: true, displayUsageInTable: false }] })],
        meterData: [reading({ charges: [{ chargeGuid: 'tax', chargeAmount: 0, chargeUsage: 0 }] }), reading({ guid: 'feb', month: 2, charges: [] })] });
    const actual = ready(resolveNativeUtility(saved, request));
    expect(actual.first).toMatchObject({ state: 'observed', value: 0 });
    expect(Object.values(actual.rows[1].values)[0]).toMatchObject({ state: 'missing', reason: expect.stringContaining('no recorded value') });
    expect(actual.resolved.references).toContainEqual(expect.objectContaining({ kind: 'charge', id: 'tax' }));
    expect(actual.resolved.series[0]).toMatchObject({ unit: 'USD', additive: true });
  });

  it.each(['consumption', 'demand', 'tax', 'lateFee', 'flatFee', 'other', 'demandMDQ', 'usage', 'sewer'] as MeterChargeType[])('retains recorded %s charge amounts without reinterpreting their category', chargeType => {
    const selectedMeter = meter({ source: chargeType === 'sewer' ? 'Water Intake' : ['demandMDQ', 'usage'].includes(chargeType) ? 'Natural Gas' : 'Electricity',
      charges: [{ guid: 'named', name: 'Named charge', chargeType, displayChargeInTable: true, displayUsageInTable: true }] });
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: selectedMeter.guid, chargeGuid: 'named', measure: 'cost' } },
      { meters: [selectedMeter], meterData: [reading({ charges: [{ chargeGuid: 'named', chargeAmount: -2, chargeUsage: 99 }] })] });
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'observed', value: -2 });
  });

  it.each([
    ['consumption', 'Electricity', 'kWh', 'MWh', 'kW', 'kWh', true],
    ['demand', 'Electricity', 'kWh', 'kWh', 'kW', 'kW', false],
    ['sewer', 'Water Intake', 'gal', 'MMBtu', 'kW', 'gal', true]
  ] as const)('preserves the recorded %s usage unit and additivity', (chargeType, source, startingUnit, energyUnit, demandUnit, unit, additive) => {
    const selectedMeter = meter({ source, startingUnit, energyUnit, demandUnit, charges: [{ guid: 'named', name: 'Named charge', chargeType, displayChargeInTable: true, displayUsageInTable: true }] });
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: selectedMeter.guid, chargeGuid: 'named', measure: 'usage' } },
      { meters: [selectedMeter], meterData: [reading({ charges: [{ chargeGuid: 'named', chargeAmount: 99, chargeUsage: 7 }] })] });
    const actual = ready(resolveNativeUtility(saved, request));
    expect(actual.first).toMatchObject({ state: 'observed', value: 7 });
    expect(actual.resolved.series[0]).toMatchObject({ unit, additive });
  });

  it('retains recorded demand as non-additive and refuses meaningless fee usage', () => {
    const charge = { guid: 'demand', name: 'Peak demand', chargeType: 'demand' as const, displayChargeInTable: true, displayUsageInTable: true };
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: 'meter-a', chargeGuid: charge.guid, measure: 'usage' } },
      { meters: [meter({ demandUnit: 'kW', charges: [charge] })], meterData: [reading({ charges: [{ chargeGuid: charge.guid, chargeAmount: 100, chargeUsage: 42 }] })] });
    const actual = ready(resolveNativeUtility(saved, request));
    expect(actual.first).toMatchObject({ state: 'observed', value: 42 });
    expect(actual.resolved.series[0]).toMatchObject({ unit: 'kW', additive: false });
    expect(resolveNativeUtility({ ...saved, meters: [meter({ charges: [{ ...charge, chargeType: 'flatFee' }] })] }, request).state).toBe('unsupported');
  });
  it.each(['usage', 'demandMDQ'] as const)('keeps %s charge amounts available without inventing an unsupported recorded quantity unit', chargeType => {
    const selectedMeter = meter({ source: 'Natural Gas', startingUnit: 'SCF', energyUnit: 'MMBtu', demandUnit: 'kW',
      charges: [{ guid: 'named', name: 'Named charge', chargeType, displayChargeInTable: true, displayUsageInTable: true }] });
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: selectedMeter.guid, chargeGuid: 'named', measure: 'usage' } },
      { meters: [selectedMeter], meterData: [reading({ charges: [{ chargeGuid: 'named', chargeAmount: 99, chargeUsage: 7 }] })] });
    expect(resolveNativeUtility(saved, request)).toMatchObject({ state: 'unsupported', message: expect.stringContaining('no authoritative physical') });
    expect(ready(resolveNativeUtility(saved, { ...request, source: { ...request.source, charge: { meterGuid: selectedMeter.guid, chargeGuid: 'named', measure: 'cost' } } as UtilityVisualizationSource })).first)
      .toMatchObject({ state: 'observed', value: 99 });
  });

  it('does not sum duplicate named-charge entries or duplicate bill dates', () => {
    const charge = { guid: 'fee', name: 'Fee', chargeType: 'flatFee' as const, displayChargeInTable: true, displayUsageInTable: false };
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: 'meter-a', chargeGuid: charge.guid, measure: 'cost' } },
      { meters: [meter({ charges: [charge] })], meterData: [reading({ charges: [{ chargeGuid: 'fee', chargeAmount: 1, chargeUsage: 0 }, { chargeGuid: 'fee', chargeAmount: 2, chargeUsage: 0 }] })] });
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ state: 'missing', reason: expect.stringContaining('Duplicate charge') });
    expect(ready(resolveNativeUtility({ ...saved, meterData: [reading({}), reading({ guid: 'duplicate' })] }, { ...request, source: { ...request.source, measure: 'cost' } as UtilityVisualizationSource })).first)
      .toMatchObject({ state: 'missing', reason: expect.stringContaining('Duplicate bill dates') });
  });

  it('retains estimated provenance, identifies invalid negative readings, and excludes post-retirement occurrences', () => {
    const { saved, request } = setup({}, { meterData: [reading({ isEstimated: true })] });
    expect(ready(resolveNativeUtility(saved, request)).first).toMatchObject({ provenance: 'estimated' });
    expect(ready(resolveNativeUtility({ ...saved, meterData: [reading({ totalEnergyUse: -10 })] }, request)).first).toMatchObject({ state: 'missing', reason: expect.stringContaining('Negative') });
    expect(ready(resolveNativeUtility({ ...saved, meters: [meter({ noLongerInUse: true, noLongerInUseYear: 2025, noLongerInUseMonth: 11 })] }, request)).first)
      .toMatchObject({ state: 'excluded', reason: expect.stringContaining('retirement') });
  });

  it('filters native occurrences by their actual dates and exposes the resolved requested period', () => {
    const { saved, request } = setup({}, { meterData: [reading({}), reading({ guid: 'feb', day: 28, month: 2 })] });
    const result = ready(resolveNativeUtility(saved, { ...request, period: { kind: 'fixed', start: '2026-02-01', end: '2026-02-28', basis: 'calendar' } }));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ periodKey: 'meter-a:feb', start: '2026-02-28', end: '2026-02-28' });
    expect(result.resolved.periods[0]).toMatchObject({ start: '2026-02-01', end: '2026-02-28', interval: 'billing-period' });
  });

  it('requires repair for missing named resources and blocks mixed-meter native alignment', () => {
    const { saved, request } = setup({ measure: 'charge', charge: { meterGuid: 'meter-a', chargeGuid: 'deleted-charge', measure: 'cost' } });
    expect(resolveNativeUtility(saved, request)).toMatchObject({ state: 'missing-source', references: expect.arrayContaining([{ kind: 'charge', id: 'deleted-charge' }]) });
    const multi = { ...request, source: { ...request.source, measure: 'cost', selection: { kind: 'rule', resource: 'meter', filter: {} } } as UtilityVisualizationSource };
    expect(resolveNativeUtility({ ...saved, meters: [meter({}), meter({ guid: 'second' })] }, multi).state).toBe('unsupported');
  });

  it('does not align native bills to comparison dates, calendarized intervals, or grouped totals', () => {
    const { saved, request } = setup();
    expect(resolveNativeUtility(saved, { ...request, comparison: { kind: 'previous-period' } }).state).toBe('unsupported');
    expect(resolveNativeUtility(saved, { ...request, chart: { kind: 'time-series', type: 'bar', interval: 'monthly', stack: 'none' } }).state).toBe('unsupported');
    expect(resolveNativeUtility(saved, { ...request, source: { ...request.source, aggregation: 'sum' } as UtilityVisualizationSource }).state).toBe('unsupported');
    expect(resolveNativeUtility(saved, { ...request, identity: { ...request.identity, accountGuid: 'other' } }).state).toBe('unsupported');
  });
});
