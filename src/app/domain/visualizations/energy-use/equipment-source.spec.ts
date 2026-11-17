import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '../testing/equipment-fixtures';
import { equipmentCapabilities, equipmentChartSupport, equipmentSeriesId, resolveEquipment } from './equipment-source';
import type { EnergyUseVisualizationSource, VisualizationDefinition, VisualizationPeriod } from '../visualization-definition';
import type { VisualizationSourceRequest } from '../visualization-source-provider';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { resolveVisualizationFacilities } from '../visualization-facilities';
import { remapVisualizationDefinition } from '../visualization-references';

function request(snapshot = equipmentSnapshot(), definition: VisualizationDefinition = equipmentDefinition()): VisualizationSourceRequest {
  return { identity: { accountGuid: snapshot.account.guid, workspaceRevision: 1, definitionGuid: 'saved', definitionRevision: 1, requestId: 'test',
    sourceId: definition.sources[0].id, scope: resolveVisualizationFacilities(definition, snapshot.facilities).scope }, source: definition.sources[0], chart: definition.chart!,
    period: definition.period, comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: '2026-11-16' } };
}
function resolved(snapshot = equipmentSnapshot(), definition: VisualizationDefinition = equipmentDefinition()) {
  const req = request(snapshot, definition), result = resolveEquipment(snapshot, req);
  if (result.state !== 'ready') throw new Error(JSON.stringify(result));
  expect(checkVisualizationCompatibility(definition, [{ request: req, capabilities: equipmentCapabilities(),
    chartSupport: equipmentChartSupport(req.source as EnergyUseVisualizationSource, req.chart), resolution: result }])).toEqual(expect.objectContaining({ state: 'compatible' }));
  if (result.resolved.data.kind !== 'time-series') throw new Error('Expected annual rows');
  return { ...result.resolved, rows: result.resolved.data.rows };
}
const point = (result: ReturnType<typeof resolved>, row = 0, guid = 'equipment-a') => result.rows[row].values[equipmentSeriesId('source-1', guid)];

describe('saved equipment annual visualization', () => {
  it('uses selected saved years, independent occurrences, saved units and full precision without mutating history', () => {
    const item = equipmentFixture(); item.utilityData.push({ ...item.utilityData[0], energyUse: [{ year: 2022, energyUse: 3.6, energyUseUnit: 'MJ', overrideEnergyUse: false }] });
    item.operatingConditionsData = [{ year: 2025, hoursOfOperation: 999, loadFactor: 50, dutyFactor: 50, efficiency: 50 }];
    const snapshot = equipmentSnapshot([item, equipmentFixture({ guid: 'unselected', utilityData: [{ ...item.utilityData[0], energyUse: [{ ...item.utilityData[0].energyUse[0], year: 2030 }] }] })]);
    const before = structuredClone(snapshot), result = resolved(snapshot);
    expect(result.rows).toHaveLength(1); expect(result.rows[0]).toMatchObject({ periodKey: 'FY 2025', start: '2025-01-01', end: '2025-12-31' });
    expect(point(result)).toMatchObject({ state: 'observed', value: 11, provenance: 'carried-forward', partial: false });
    const text = JSON.stringify(point(result)); expect(text).toContain('Source FY 2022'); expect(text).toContain('Saved 3.6 MJ'); expect(text).toContain('Manual override');
    expect(text).toContain('occurrence 2'); expect(snapshot).toEqual(before);
  });
  it('includes intervening years, no backward inference, and known partial totals', () => {
    const a = equipmentFixture(), b = equipmentFixture({ guid: 'equipment-b', utilityData: [{ ...a.utilityData[0], energyUse: [{ year: 2022, energyUse: 2, energyUseUnit: 'kWh', overrideEnergyUse: false }] }] });
    a.utilityData.push({ ...a.utilityData[0], energyUse: [] });
    const result = resolved(equipmentSnapshot([a, b]), { ...equipmentDefinition([a.guid, b.guid]), period: { kind: 'all-history' } });
    expect(result.rows.map(row => row.periodKey)).toEqual(['FY 2022', 'FY 2023', 'FY 2024']);
    expect(point(result)).toMatchObject({ state: 'missing', value: null });
    expect(point(result, 2)).toMatchObject({ state: 'observed', value: 10, partial: true });
    expect(point(result, 1, b.guid)).toMatchObject({ state: 'observed', value: 2, provenance: 'carried-forward' });
  });
  it.each(['nonfinite', 'negative', 'duplicate', 'invalid-unit', 'invalid-year'] as const)('never falls back past %s saved data', kind => {
    const item = equipmentFixture(), source = item.utilityData[0];
    source.energyUse.unshift({ year: 2022, energyUse: 100, energyUseUnit: 'kWh', overrideEnergyUse: false });
    const row = source.energyUse[1];
    if (kind === 'nonfinite') row.energyUse = NaN;
    if (kind === 'negative') row.energyUse = -1;
    if (kind === 'duplicate') source.energyUse.push({ ...row });
    if (kind === 'invalid-unit') row.energyUseUnit = 'kg';
    if (kind === 'invalid-year') row.year = 0;
    const result = resolveEquipment(equipmentSnapshot([item]), { ...request(), period: { kind: 'fiscal-year', year: 2025 } });
    expect(result.state).toBe('empty'); expect(JSON.stringify(result)).toMatch(/Invalid|Repeated|Cannot convert/);
  });
  it('retains explicit zero, stops after retirement, retains later history and resumes after reinstatement', () => {
    const item = equipmentFixture({ noLongerInUse: { isNoLongerInUse: true, year: 2024 } });
    item.utilityData[0].energyUse.push({ year: 2026, energyUse: 0, energyUseUnit: 'kWh', overrideEnergyUse: false });
    const snapshot = equipmentSnapshot([item]);
    const at = (year: number) => point(resolved(snapshot, { ...equipmentDefinition(), period: { kind: 'fiscal-year', year } }));
    expect(at(2024)).toMatchObject({ value: 10, provenance: 'estimated' });
    expect(at(2025)).toMatchObject({ value: 0, notes: [expect.stringContaining('Inactive after FY 2024')] });
    expect(at(2026)).toMatchObject({ value: 0, notes: expect.arrayContaining([expect.stringContaining('Entered in FY 2026'), 'Explicit saved history after retirement FY 2024']) });
    item.noLongerInUse.isNoLongerInUse = false;
    expect(at(2027)).toMatchObject({ value: 0, provenance: 'carried-forward' });
  });
  it('uses owner units and converts compatible pinned units while retaining original evidence', () => {
    let snapshot = equipmentSnapshot();
    snapshot = { ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'other', energyUnit: 'MMBtu' }] };
    expect(point(resolved(snapshot))).toMatchObject({ value: 36 });
    const definition = equipmentDefinition();
    const pinned = { ...definition, sources: definition.sources.map(source => ({ ...source, settings: { unit: { kind: 'pinned' as const, value: 'MWh' } } })) };
    expect(point(resolved(snapshot, pinned))).toMatchObject({ value: 0.01, notes: [expect.stringContaining('Saved 10 kWh')] });
    const invalid = { ...pinned, sources: pinned.sources.map(source => ({ ...source, settings: { unit: { kind: 'pinned' as const, value: 'kg' } } })) };
    expect(resolveEquipment(snapshot, request(snapshot, invalid)).state).toBe('unsupported');
  });
  it.each([true, false])('retains actual fiscal intervals with end-label convention %s and rejects incompatible periods', endLabel => {
    let snapshot = equipmentSnapshot(); Object.assign(snapshot.facilities[0], { fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: endLabel });
    const row = resolved(snapshot).rows[0];
    expect(row.start).toBe(endLabel ? '2023-07-01' : '2024-07-01');
    expect(row.end).toBe(endLabel ? '2024-06-30' : '2025-06-30');
    snapshot = { ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'b', fiscalYear: 'calendarYear' }] };
    snapshot = { ...snapshot, energyUseEquipment: [...snapshot.energyUseEquipment, equipmentFixture({ guid: 'equipment-b', facilityId: 'b' })] };
    expect(resolveEquipment(snapshot, request(snapshot, equipmentDefinition(['equipment-a', 'equipment-b'])))).toMatchObject({ state: 'unsupported', message: expect.stringContaining('different actual fiscal intervals') });
    snapshot = { ...snapshot, facilities: snapshot.facilities.map(f => ({ ...f, fiscalYearMonth: 12 })) };
    expect(resolveEquipment(snapshot, request(snapshot)).state).toBe('unsupported');
  });
  it.each<VisualizationPeriod>([{ kind: 'all-history' }, { kind: 'latest-saved-year', basis: 'fiscal' }, { kind: 'fiscal-year', year: 2020 }])('explains empty histories and pinned years before history: %j', period => {
    const snapshot = equipmentSnapshot([equipmentFixture({ utilityData: [] })]);
    expect(resolveEquipment(snapshot, { ...request(), period }).state).toBe('empty');
    expect(resolveEquipment(equipmentSnapshot(), { ...request(), period: { kind: 'fiscal-year', year: 2020 } }).state).toBe('empty');
  });
  it('requires exact owned identities and explains unsupported source and chart settings', () => {
    const snapshot = equipmentSnapshot([equipmentFixture({ accountId: 'foreign' })]), req = request();
    expect(resolveEquipment(snapshot, req)).toMatchObject({ state: 'missing-source', references: [{ kind: 'equipment', id: 'equipment-a' }] });
    expect(resolveEquipment(equipmentSnapshot(), { ...req, chart: { kind: 'time-series', defaultTraceType: 'line', stack: 'none', interval: 'monthly' } }).state).toBe('unsupported');
    expect(resolveEquipment(equipmentSnapshot(), { ...req, comparison: { kind: 'previous-period' } }).state).toBe('unsupported');
    expect(equipmentCapabilities().allowMultipleSources).toBe(false);
  });
  it('explains overflowing totals and fiscal intervals outside supported civil years', () => {
    const item = equipmentFixture(); item.utilityData[0].energyUse[0].energyUse = Number.MAX_VALUE;
    item.utilityData.push(structuredClone(item.utilityData[0]));
    expect(resolveEquipment(equipmentSnapshot([item]), request())).toMatchObject({ state: 'empty', reasons: [expect.stringContaining('annual total is nonfinite')] });
    const snapshot = equipmentSnapshot();
    const invalid = { ...snapshot, facilities: [{ ...snapshot.facilities[0], fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true }] };
    expect(resolveEquipment(invalid, { ...request(), period: { kind: 'fiscal-year', year: 1 } }).state).toBe('unsupported');
  });
  it('maps provider appearance identities with colon source IDs and retains unknown or blocked ownership', () => {
    const base = equipmentDefinition();
    const definition: VisualizationDefinition = { ...base, sources: base.sources.map(source => ({ ...source, id: 'energy:source' })), series: [{ ...base.series[0], sourceId: 'energy:source',
      overrides: [{ seriesId: 'energy:source:equipment:equipment-a', color: '#123456' }, { seriesId: 'unknown-format', label: 'Dormant' }] }] };
    const maps = { facility: { 'facility-a': 'b' }, equipment: { 'equipment-a': 'equipment-b' } };
    const mapped = remapVisualizationDefinition(definition, 'account-b', maps).definition;
    expect(mapped.series[0].overrides).toEqual([{ seriesId: 'energy:source:equipment:equipment-b', accountGuid: 'account-b', color: '#123456' }, { seriesId: 'unknown-format', accountGuid: 'account-a', label: 'Dormant' }]);
    const blocked = remapVisualizationDefinition(definition, 'account-b', maps, [{ path: 'sources.0.selection.guids.0', kind: 'equipment', guid: 'equipment-a', reason: 'missing' }]).definition;
    expect(blocked.series[0].overrides?.[0]).toMatchObject({ seriesId: 'energy:source:equipment:equipment-a', accountGuid: 'account-a' });
  });
});
