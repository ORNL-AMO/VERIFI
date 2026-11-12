import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter } from '@data/models/calanderization';
import type { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type { VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import { meter, reading, calendarizedMeter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { resolveCalendarizedUtility } from './utility-calendarized';
import { utilityMeasureKey } from './utility-selection';
import { buildWorkspaceCalendarizationRequest } from '@app/v1/shared/calendarization/workspace-calendarization-request';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';

describe('calendarized utility projections', () => {
  function setup(options: Partial<UtilityVisualizationSource> = {}, overrides: Partial<AccountWorkspaceSnapshot> = {}) {
    const definition = utilityVisualizationFixture();
    const source: UtilityVisualizationSource = { ...definition.sources[0] as UtilityVisualizationSource,
      settings: { unit: { kind: 'owner' }, energyTreatment: { kind: 'pinned', value: 'site' } }, ...options };
    const original = visualizationSnapshot();
    const snapshot: AccountWorkspaceSnapshot = { ...original, account: { ...original.account, energyUnit: 'kWh', volumeLiquidUnit: 'gal', fiscalYear: 'calendarYear' },
      facilities: original.facilities.map(facility => ({ ...facility, eGridSubregion: 'US' })),
      customEmissions: [{ ...getNewAccountEmissionsItem('account-a'), subregion: 'US',
        locationEmissionRates: [{ year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 }], residualEmissionRates: [{ year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 }] }],
      meters: [meter({ meterReadingDataApplication: 'fullMonth' })], meterData: [reading({})], ...overrides };
    const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid, workspaceRevision: 1, definitionGuid: 'visualization-a', definitionRevision: 1,
      requestId: 'monthly-a', scope: definition.scope, sourceId: source.id }, source,
      chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' }, period: { kind: 'all-history' }, comparison: { kind: 'none' },
      series: [{ id: 'shown', sourceId: source.id, metric: utilityMeasureKey(source), axis: 'left' }], dateContext: { calendarDate: '2026-11-12', latestDataDate: '2026-03-31' } };
    return { source, snapshot, request };
  }
  function ready(resolution: VisualizationSourceResolution) {
    expect(resolution.state, 'message' in resolution ? resolution.message : undefined).toBe('ready');
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected ready time-series.');
    return { ...resolution.resolved, rows: resolution.resolved.data.rows };
  }
  function project(snapshot: AccountWorkspaceSnapshot, values = [10], meterIndex = 0): CalanderizedMeter {
    return calendarizedMeter(snapshot.meters[meterIndex], values.map((value, index) => monthlyData({ monthNumValue: index, year: 2026,
      date: new Date(2026, index, 1), energyUse: value, energyConsumption: value, energyCost: value })), { energyUnit: 'kWh', consumptionUnit: 'kWh' });
  }
  function canonicalProjection(snapshot: AccountWorkspaceSnapshot, includeEmissions: boolean, emissionsRates?: readonly SubregionEmissions[]) {
    const built = buildWorkspaceCalendarizationRequest(snapshot), p = built.payload;
    const ratesUsed = emissionsRates ?? p.co2Emissions;
    const calculated = getCalanderizedMeterData(p.meters, p.allMeterData, p.accountOrFacility, p.monthDisplayShort,
      p.calanderizationOptions, [...ratesUsed], p.customFuels, p.facilities, p.assessmentReportVersion, p.customGWPs);
    const projection = projectWorkspaceCalendarization({ state: 'ready', accountGuid: snapshot.account.guid, inputFingerprint: built.inputFingerprint, meters: calculated }, snapshot,
      { context: { kind: 'account', guid: snapshot.account.guid }, meterGuids: snapshot.meters.map(item => item.guid), energyIsSource: false, includeEmissions });
    expect(projection.state).toBe('ready');
    expect(projection.projection?.includeEmissions).toBe(includeEmissions);
    return { ...projection, emissionsRates: ratesUsed };
  }
  function firstValue(resolution: VisualizationSourceResolution) { return Object.values(ready(resolution).rows[0].values)[0]; }

  it('retains authoritative values and explicit source identities without mutating inputs', () => {
    const { snapshot, request } = setup();
    const meters = [project(snapshot)], before = structuredClone({ snapshot, meters });
    const result = resolveCalendarizedUtility(snapshot, request, meters), actual = ready(result);
    expect(result.identity).toBe(request.identity);
    expect(actual.rows[0]).toMatchObject({ periodKey: '2026-01', start: '2026-01-01', end: '2026-01-31' });
    expect(Object.values(actual.rows[0].values)[0]).toEqual({ state: 'observed', value: 10, provenance: 'measured', partial: false });
    expect(actual.series[0]).toMatchObject({ resourceGuid: 'meter-a', unit: 'kWh', dimension: 'energy' });
    expect(actual.references).toContainEqual(expect.objectContaining({ kind: 'meter', id: 'meter-a' }));
    expect({ snapshot, meters }).toEqual(before);
  });
  it('matches the actual canonical full-month workspace request and owner projection', () => {
    const { snapshot, request } = setup();
    const built = buildWorkspaceCalendarizationRequest(snapshot), p = built.payload;
    const calculated = getCalanderizedMeterData(p.meters, p.allMeterData, p.accountOrFacility, p.monthDisplayShort,
      p.calanderizationOptions, p.co2Emissions, p.customFuels, p.facilities, p.assessmentReportVersion, p.customGWPs);
    const projection = projectWorkspaceCalendarization({ state: 'ready', accountGuid: snapshot.account.guid, inputFingerprint: built.inputFingerprint, meters: calculated }, snapshot,
      { context: { kind: 'account', guid: snapshot.account.guid }, meterGuids: ['meter-a'], energyIsSource: false, includeEmissions: false });
    expect(projection.state).toBe('ready');
    const result = firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters));
    expect(result.state).toBe('observed'); if (result.state === 'observed') expect(result.value).toBeCloseTo(10, 10);
  });
  it.each(['energy', 'cost'] as const)('isolates an invalid saved energy unit while preserving independent %s contributions', measure => {
    const { snapshot, request } = setup({ measure, groupBy: 'total', selection: { kind: 'rule', resource: 'meter', filter: {} } }, {
      meters: [meter({ guid: 'good', name: 'Valid meter', meterReadingDataApplication: 'fullMonth' }),
        meter({ guid: 'bad', name: 'Invalid unit meter', energyUnit: 'invalid-unit', meterReadingDataApplication: 'fullMonth' })],
      meterData: [reading({ guid: 'good-bill', meterId: 'good', totalEnergyUse: 10, totalCost: 20 }), reading({ guid: 'bad-bill', meterId: 'bad', totalEnergyUse: 10, totalCost: 20 })]
    });
    const projection = canonicalProjection(snapshot, false), actual = ready(resolveCalendarizedUtility(snapshot, request, projection.meters));
    const observation = Object.values(actual.rows[0].values)[0];
    expect(observation).toMatchObject({ state: 'observed', partial: measure === 'energy' });
    if (observation.state === 'observed') expect(observation.value).toBeCloseTo(measure === 'energy' ? 10 : 40, 10);
    if (measure === 'energy') expect(actual.quality.warnings).toContainEqual(expect.stringContaining('Invalid unit meter (bad): Invalid or incompatible saved invalid-unit'));
  });
  it.each(['water', 'other', 'mobile-volume', 'mobile-distance'] as const)('rejects failed saved-unit conversions in canonical %s consumption', kind => {
    const selected = kind === 'water' ? meter({ source: 'Water Intake', startingUnit: 'invalid-unit', meterReadingDataApplication: 'fullMonth' })
      : kind === 'other' ? meter({ source: 'Other', startingUnit: 'invalid-unit', meterReadingDataApplication: 'fullMonth' })
        : meter({ source: 'Other Fuels', scope: 2, vehicleCategory: 2, vehicleType: 1, vehicleFuel: 'Diesel', startingUnit: 'gal',
          vehicleCollectionType: kind === 'mobile-volume' ? 1 : 2, vehicleCollectionUnit: kind === 'mobile-volume' ? 'invalid-unit' : 'gal',
          vehicleDistanceUnit: kind === 'mobile-distance' ? 'invalid-unit' : 'mi', meterReadingDataApplication: 'fullMonth' });
    const unit = kind === 'mobile-distance' ? 'mi' : 'gal';
    const { snapshot, request } = setup({ measure: 'consumption', settings: { unit: { kind: 'pinned', value: unit } } },
      { meters: [selected], meterData: [reading({ totalVolume: 100, totalEnergyUse: 10, vehicleFuelEfficiency: 25 })] });
    const projection = canonicalProjection(snapshot, false);
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters))).toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('saved invalid-unit') });
  });

  it.each([undefined, NaN, Infinity])('does not publish a normalized cost zero when saved input is %s', invalid => {
    const { snapshot, request } = setup({ measure: 'cost' }, { meterData: [reading({ totalCost: invalid })] });
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [project(snapshot, [0])]))).toMatchObject({ state: 'missing', value: null });
  });

  it('preserves actual zero and negative bill credits', () => {
    for (const value of [0, -10]) {
      const { snapshot, request } = setup({ measure: 'cost' }, { meterData: [reading({ totalCost: value })] });
      expect(firstValue(resolveCalendarizedUtility(snapshot, request, [project(snapshot, [value])]))).toMatchObject({ state: 'observed', value, partial: false });
    }
  });
  it.each([
    { label: 'water ignores unrelated negative energy', measure: 'consumption', utility: 'Water Intake', energy: -1, volume: 100, permitted: false, available: true, expected: 100 },
    { label: 'energy ignores unrelated negative volume', measure: 'energy', utility: 'Electricity', energy: 10, volume: -1, permitted: false, available: true, expected: 10 },
    { label: 'water rejects negative required volume', measure: 'consumption', utility: 'Water Intake', energy: 10, volume: -100, permitted: false, available: false, expected: -100 },
    { label: 'energy rejects negative required energy', measure: 'energy', utility: 'Electricity', energy: -10, volume: 100, permitted: false, available: false, expected: -10 },
    { label: 'water retains permitted signed volume', measure: 'consumption', utility: 'Water Intake', energy: 10, volume: -100, permitted: true, available: true, expected: -100 },
    { label: 'energy retains permitted signed energy', measure: 'energy', utility: 'Electricity', energy: -10, volume: 100, permitted: true, available: true, expected: -10 }
  ] as const)('$label in the real canonical monthly pipeline', item => {
    const selected = meter({ source: item.utility, startingUnit: item.utility === 'Water Intake' ? 'gal' : 'kWh',
      canBeNegative: item.permitted, meterReadingDataApplication: 'fullMonth' });
    const { snapshot, request } = setup({ measure: item.measure }, { meters: [selected], meterData: [reading({ totalEnergyUse: item.energy, totalVolume: item.volume })] });
    const projection = canonicalProjection(snapshot, false);
    const actual = firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters));
    if (!item.available) expect(actual).toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('Negative') });
    else {
      expect(actual.state).toBe('observed');
      if (actual.state === 'observed') expect(actual.value).toBeCloseTo(item.expected, 10);
    }
  });

  it('uses real missing observations for absent months and preserves estimated coverage', () => {
    const { snapshot, request } = setup({}, { meterData: [reading({}), reading({ guid: 'march', month: 3, isEstimated: true })] });
    const meterProjection = project(snapshot, [10, 0, 10]);
    const actual = ready(resolveCalendarizedUtility(snapshot, request, [{ ...meterProjection, monthlyData: meterProjection.monthlyData.map((data, index) => ({ ...data, readingType: index === 2 ? 'estimated' : 'metered' })) }]));
    expect(actual.rows).toHaveLength(3);
    expect(Object.values(actual.rows[1].values)[0]).toMatchObject({ state: 'missing', value: null });
    expect(Object.values(actual.rows[2].values)[0]).toMatchObject({ state: 'observed', provenance: 'estimated' });
    expect(actual.quality.warnings).toContainEqual(expect.stringContaining('2026-02'));
  });

  it('qualifies valid source subtotals and identifies omitted meter periods', () => {
    const { snapshot, request } = setup({ groupBy: 'total', selection: { kind: 'rule', resource: 'meter', filter: {} } },
      { meters: [meter({ guid: 'a', name: 'Good', meterReadingDataApplication: 'fullMonth' }), meter({ guid: 'b', name: 'Missing', meterReadingDataApplication: 'fullMonth' })], meterData: [reading({ meterId: 'a' })] });
    const actual = ready(resolveCalendarizedUtility(snapshot, request, [project(snapshot, [10], 0), project(snapshot, [0], 1)]));
    expect(Object.values(actual.rows[0].values)[0]).toMatchObject({ state: 'observed', value: 10, partial: true });
    expect(actual.quality.warnings).toContainEqual(expect.stringContaining('Missing (b)'));
    expect(actual.series[0].contributionKeys).toHaveLength(2);
  });

  it('does not fabricate total zero when every selected contribution is invalid', () => {
    const { snapshot, request } = setup({ measure: 'cost', groupBy: 'total' }, { meterData: [reading({ totalCost: NaN })] });
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [project(snapshot, [0])]))).toMatchObject({ state: 'missing', value: null });
  });

  it('validates physical consumption conversions and rejects mixed utility totals', () => {
    const water = meter({ source: 'Water Intake', startingUnit: 'gal', meterReadingDataApplication: 'fullMonth' });
    const { snapshot, request } = setup({ measure: 'consumption', settings: { unit: { kind: 'pinned', value: 'kgal' } } },
      { meters: [water], meterData: [reading({ totalVolume: 1000 })] });
    const projected = { ...project(snapshot, [1000]), consumptionUnit: 'gal' };
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [projected]))).toMatchObject({ state: 'observed', value: 1 });
    expect(resolveCalendarizedUtility(snapshot, { ...request, source: { ...request.source, settings: { unit: { kind: 'pinned', value: 'kWh' } } } }, [projected]).state).toBe('unsupported');
    const mixed = { ...snapshot, meters: [water, meter({ guid: 'gas', source: 'Natural Gas', startingUnit: 'SCF' })] };
    expect(resolveCalendarizedUtility(mixed, { ...request, source: { ...request.source, groupBy: 'total', selection: { kind: 'rule', resource: 'meter', filter: {} } } as UtilityVisualizationSource }, [projected]).state).toBe('unsupported');
  });

  it('rolls up complete actual fiscal intervals and marks missing months partial', () => {
    const original = visualizationSnapshot();
    const { snapshot, request } = setup({}, { account: { ...original.account, energyUnit: 'kWh', fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true } });
    const actual = ready(resolveCalendarizedUtility(snapshot, { ...request, chart: { kind: 'time-series', type: 'bar', interval: 'yearly', stack: 'none' }, period: { kind: 'fiscal-year', year: 2026 } }, [project(snapshot)]));
    expect(actual.rows).toHaveLength(1);
    expect(actual.rows[0]).toMatchObject({ periodKey: 'FY2026', start: '2025-07-01', end: '2026-06-30' });
    expect(actual.periods[0]).toMatchObject({ fiscalYear: 2026, basis: 'fiscal', interval: 'yearly' });
    expect(Object.values(actual.rows[0].values)[0]).toMatchObject({ state: 'observed', value: 10, partial: true });
  });

  it('retains original comparison dates, including a missing comparison year', () => {
    const { snapshot, request } = setup();
    const actual = ready(resolveCalendarizedUtility(snapshot, { ...request, period: { kind: 'fixed', start: '2026-01-01', end: '2026-01-31', basis: 'calendar' }, comparison: { kind: 'previous-year', basis: 'calendar' } }, [project(snapshot)]));
    expect(actual.rows.map(row => [row.role, row.start, row.end])).toEqual([['primary', '2026-01-01', '2026-01-31'], ['comparison', '2025-01-01', '2025-01-31']]);
    expect(Object.values(actual.rows[1].values)[0]).toMatchObject({ state: 'missing', value: null });
  });

  it.each(['energy', 'cost'] as const)('matches canonical full-year %s totals rather than redistributing them again', measure => {
    const selectedMeter = meter({ meterReadingDataApplication: 'fullYear' });
    const { snapshot, request } = setup({ measure }, { meters: [selectedMeter], meterData: [reading({ totalEnergyUse: 120, totalCost: 240 })] });
    const canonical = getCalanderizedMeterData([...snapshot.meters], structuredClone([...snapshot.meterData]), snapshot.account, false, { energyIsSource: false, neededUnits: 'kWh' },
      [...snapshot.customEmissions], [...snapshot.customFuels], [...snapshot.facilities], snapshot.account.assessmentReportVersion, [...snapshot.customGWPs]);
    const actual = ready(resolveCalendarizedUtility(snapshot, { ...request, chart: { kind: 'time-series', type: 'line', interval: 'yearly', stack: 'none' } }, canonical));
    expect(Object.values(actual.rows[0].values)[0]).toMatchObject({ state: 'observed', value: measure === 'energy' ? 120 : 240, partial: false });
  });
  it.each(['energy', 'cost'] as const)('retains full multi-year backward %s history beyond the four help-illustration markers', measure => {
    const selectedMeter = meter({ meterReadingDataApplication: 'backward' });
    const bills = Array.from({ length: 27 }, (_, index) => reading({ guid: `bill-${index}`, year: 2023 + Math.floor(index / 12), month: index % 12 + 1,
      day: 15, totalEnergyUse: 100 + index, totalCost: 1000 + index }));
    const { snapshot, request } = setup({ measure }, { meters: [selectedMeter], meterData: bills });
    const canonical = getCalanderizedMeterData([...snapshot.meters], structuredClone([...snapshot.meterData]), snapshot.account, false,
      { energyIsSource: false, neededUnits: 'kWh' }, [...snapshot.customEmissions], [...snapshot.customFuels], [...snapshot.facilities], snapshot.account.assessmentReportVersion, [...snapshot.customGWPs]);
    const actual = ready(resolveCalendarizedUtility(snapshot, request, canonical));
    expect(actual.rows.length).toBeGreaterThan(24);
    expect(actual.rows.map(row => Object.values(row.values)[0])).toEqual(canonical[0].monthlyData.map(month => ({ state: 'observed',
      value: measure === 'energy' ? month.energyUse : month.energyCost, provenance: 'measured', partial: false })));
    expect(actual.quality.partial).toBe(false);
  });

  it.each(['location-emissions', 'market-emissions'] as const)('projects canonical %s only when calculation inputs and explicit inclusion evidence are present', measure => {
    const { snapshot, request } = setup({ measure });
    const projected = project(snapshot);
    const included = { ...projected, showElectricalEmissions: true, monthlyData: projected.monthlyData.map(data => ({ ...data, totalWithLocationEmissions: 2, totalWithMarketEmissions: 3 })) };
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [included], { includeEmissions: true }))).toMatchObject({ state: 'observed', value: measure === 'location-emissions' ? 2 : 3 });
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [included]))).toMatchObject({ state: 'missing', reason: expect.stringContaining('not included') });
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [included], { includeEmissions: false }))).toMatchObject({ state: 'missing', reason: expect.stringContaining('not included') });
    expect(firstValue(resolveCalendarizedUtility({ ...snapshot, meters: [{ ...snapshot.meters[0],
      ...(measure === 'location-emissions' ? { locationGHGMultiplier: undefined } : { marketGHGMultiplier: undefined }) }] }, request, [included], { includeEmissions: true })))
      .toMatchObject({ state: 'missing', reason: expect.stringContaining('multipliers') });
  });
  it.each(['location-emissions', 'market-emissions'] as const)('requires actual grid coverage for canonical %s, including fallback and true zero', measure => {
    const original = visualizationSnapshot();
    const { snapshot, request } = setup({ measure }, { customEmissions: [], facilities: original.facilities.map(item => ({ ...item, eGridSubregion: 'AKGD' })) });
    const rates: SubregionEmissions[] = [{ subregion: 'AKGD', locationEmissionRates: [{ year: 2025, CO2: 400, CH4: 0, N2O: 0 }],
      residualEmissionRates: [{ year: 2025, CO2: 700, CH4: 0, N2O: 0 }] }];
    const projection = canonicalProjection(snapshot, true, rates);
    const actual = firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters, { includeEmissions: true, emissionsRates: projection.emissionsRates }));
    expect(actual.state).toBe('observed');
    if (actual.state === 'observed') expect(actual.value).toBeCloseTo(measure === 'location-emissions' ? 0.004 : 0.007, 10);
    const fallback = canonicalProjection(snapshot, true, []);
    expect(fallback.meters[0].monthlyData[0].totalWithLocationEmissions).toBe(0);
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, fallback.meters, { includeEmissions: true, emissionsRates: fallback.emissionsRates })))
      .toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('coverage') });
    const zero = { year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 };
    const zeroProjection = canonicalProjection(snapshot, true, [{ subregion: 'AKGD', locationEmissionRates: [zero], residualEmissionRates: [zero] }]);
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, zeroProjection.meters, { includeEmissions: true, emissionsRates: zeroProjection.emissionsRates })))
      .toMatchObject({ state: 'observed', value: 0, partial: false });
  });

  it.each([
    ['location-emissions', 10], ['market-emissions', 10], ['location-emissions', 0], ['market-emissions', 0]
  ] as const)('retains canonical purchased-steam %s at energy %s despite absent display flags', (measure, energy) => {
    const steam = meter({ source: 'Other Energy', fuel: 'Purchased Steam', startingUnit: 'lb', energyUnit: 'MMBtu', meterReadingDataApplication: 'fullMonth' });
    const { snapshot, request } = setup({ measure }, { meters: [steam], meterData: [reading({ totalEnergyUse: energy, totalVolume: energy * 100 })] });
    const before = structuredClone(snapshot), included = canonicalProjection(snapshot, true);
    const selected = included.meters[0];
    expect([selected.showElectricalEmissions, selected.showOtherScope2Emissions, selected.showStationaryEmissions,
      selected.showFugitiveEmissions, selected.showProcessEmissions, selected.showMobileEmissions].some(Boolean)).toBe(false);
    const actual = firstValue(resolveCalendarizedUtility(snapshot, request, included.meters, { includeEmissions: included.projection!.includeEmissions }));
    expect(actual.state).toBe('observed');
    if (actual.state === 'observed') expect(actual.value).toBeCloseTo(energy * 66.3985 / 1000, 10);
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, included.meters))).toMatchObject({ state: 'missing', reason: expect.stringContaining('not included') });
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, included.meters, { includeEmissions: false }))).toMatchObject({ state: 'missing', reason: expect.stringContaining('not included') });
    const omitted = canonicalProjection(snapshot, false);
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, omitted.meters, { includeEmissions: omitted.projection!.includeEmissions }))).toMatchObject({ state: 'missing', value: null });
    expect(snapshot).toEqual(before);
  });

  it.each([
    [5, 'location-emissions'], [5, 'market-emissions'], [6, 'location-emissions'], [6, 'market-emissions']
  ] as const)('projects canonical scope-%s %s from required volume without unrelated saved energy', (scope, measure) => {
    const process = meter({ source: 'Other', scope, globalWarmingPotentialOption: 101, startingUnit: 'kg', meterReadingDataApplication: 'fullMonth' });
    const { snapshot, request } = setup({ measure }, { meters: [process], meterData: [reading({ totalEnergyUse: undefined, totalVolume: 100, isEstimated: true })] });
    const projection = canonicalProjection(snapshot, true);
    const actual = firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters, { includeEmissions: projection.projection!.includeEmissions }));
    expect(actual).toMatchObject({ state: 'observed', provenance: 'estimated', partial: false });
    if (actual.state === 'observed') expect(actual.value).toBeCloseTo(0.1, 10);
    const missing = { ...snapshot, meterData: [{ ...snapshot.meterData[0], totalVolume: undefined }] };
    const missingProjection = canonicalProjection(missing, true);
    expect(firstValue(resolveCalendarizedUtility(missing, request, missingProjection.meters, { includeEmissions: true }))).toMatchObject({ state: 'missing', value: null });
    const negative = { ...snapshot, meterData: [{ ...snapshot.meterData[0], totalVolume: -100 }] };
    expect(firstValue(resolveCalendarizedUtility(negative, request, canonicalProjection(negative, true).meters, { includeEmissions: true }))).toMatchObject({ state: 'missing', reason: expect.stringContaining('Negative') });
    const retired = { ...snapshot, meters: [{ ...process, noLongerInUse: true, noLongerInUseYear: 2025, noLongerInUseMonth: 11 }] };
    expect(firstValue(resolveCalendarizedUtility(retired, request, canonicalProjection(retired, true).meters, { includeEmissions: true }))).toMatchObject({ state: 'excluded', reason: expect.stringContaining('Retired') });
  });

  it.each(['location-emissions', 'market-emissions'] as const)('projects canonical mobile %s from fuel volume without an unrelated saved energy field', measure => {
    const mobile = meter({ source: 'Other Fuels', scope: 2, vehicleCategory: 1, vehicleFuel: 'Diesel', vehicleCollectionType: 1,
      vehicleCollectionUnit: 'gal', startingUnit: 'gal', energyUnit: 'MMBtu', meterReadingDataApplication: 'fullMonth' });
    const { snapshot, request } = setup({ measure }, { meters: [mobile], meterData: [reading({ totalEnergyUse: undefined, totalVolume: 100 })] });
    const projection = canonicalProjection(snapshot, true);
    const actual = firstValue(resolveCalendarizedUtility(snapshot, request, projection.meters, { includeEmissions: projection.projection!.includeEmissions }));
    const reference = projection.meters[0].monthlyData[0];
    expect(actual.state).toBe('observed');
    if (actual.state === 'observed') {
      expect(actual.value).toBeGreaterThan(1);
      expect(actual.value).toBeCloseTo(measure === 'location-emissions' ? reference.totalWithLocationEmissions : reference.totalWithMarketEmissions, 10);
    }
  });

  it('keeps retirement and unsafe duplicate monthly results visible', () => {
    const retired = meter({ meterReadingDataApplication: 'fullMonth', noLongerInUse: true, noLongerInUseYear: 2026, noLongerInUseMonth: 0 });
    const { snapshot, request } = setup({}, { meters: [retired], meterData: [reading({})] });
    const projected = project(snapshot, [10, 0]);
    const actual = ready(resolveCalendarizedUtility(snapshot, request, [projected]));
    expect(Object.values(actual.rows[1].values)[0]).toMatchObject({ state: 'excluded', reason: expect.stringContaining('Retired') });
    const duplicate = { ...projected, monthlyData: [...projected.monthlyData, projected.monthlyData[0]] };
    expect(firstValue(resolveCalendarizedUtility(snapshot, request, [duplicate]))).toMatchObject({ state: 'missing', reason: expect.stringContaining('Duplicate') });
  });

  it('blocks missing anchors and bounds dense projection work', () => {
    const { snapshot, request } = setup();
    expect(resolveCalendarizedUtility({ ...snapshot, meters: [] }, request, []).state).toBe('missing-source');
    expect(resolveCalendarizedUtility(snapshot, { ...request, period: { kind: 'fixed', start: '1000-01-01', end: '9999-12-31', basis: 'calendar' } }, [project(snapshot)]).state).toBe('unsupported');
  });

  it('requires an explicit matching fiscal basis for yearly comparisons rather than silently reinterpreting calendar years', () => {
    const original = visualizationSnapshot();
    const { snapshot, request } = setup({}, { account: { ...original.account, energyUnit: 'kWh', fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true } });
    expect(resolveCalendarizedUtility(snapshot, { ...request, chart: { kind: 'time-series', type: 'line', interval: 'yearly', stack: 'none' }, comparison: { kind: 'previous-year', basis: 'calendar' } }, [project(snapshot)]))
      .toMatchObject({ state: 'unsupported', message: expect.stringContaining('same calendar or fiscal basis') });
  });
});
