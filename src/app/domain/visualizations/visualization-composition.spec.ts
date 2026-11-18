import { compositionHierarchy, compositionPeriodIssue } from './visualization-composition';
import { compositionFixture, equipmentCompositionEvidence } from './testing/composition-fixtures';
import { checkVisualizationCompatibility } from './visualization-capabilities';
import { decodeVisualizationDefinition } from './visualization-validation';
import { createVisualizationSetupDefinition } from './visualization-definition';
import type { VisualizationDefinition, EnergyUseVisualizationSource } from './visualization-definition';
import { equipmentFixture } from './testing/equipment-fixtures';
import { resolveEquipment } from './energy-use/equipment-source';
import { meter, reading, calendarizedMeter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';

describe('composition contracts and annual projections', () => {
  it.each(['treemap', 'sunburst'] as const)('round-trips %s and approves actual source evidence with carried, zero and missing contributions', kind => {
    const { snapshot, definition } = compositionFixture({ kind, hierarchy: ['group', 'equipment'], values: 'percent' });
    const before = structuredClone(snapshot), evidence = equipmentCompositionEvidence(snapshot, definition);
    expect(decodeVisualizationDefinition(JSON.parse(JSON.stringify(definition))).state).toBe('valid');
    expect(checkVisualizationCompatibility(definition, [evidence])).toMatchObject({ state: 'compatible' });
    if (evidence.resolution.state !== 'ready') throw new Error(JSON.stringify(evidence.resolution));
    const composition = evidence.resolution.resolved.composition!;
    expect(composition.contributions.find(row => row.categories.equipment?.id === 'equipment-a')?.observation).toMatchObject({ state: 'observed', value: 10, provenance: 'carried-forward' });
    expect(composition.contributions.find(row => row.categories.equipment?.id === 'zero')?.observation).toMatchObject({ state: 'observed', value: 0 });
    expect(composition.contributions.find(row => row.categories.equipment?.id === 'missing')?.observation.state).toBe('missing');
    expect(compositionHierarchy(composition.contributions, ['group', 'equipment'])[0].observation).toMatchObject({ value: 10.01, partial: true });
    expect(snapshot).toEqual(before);
  });
  it('initializes compatible utility and Energy Use hierarchies without changing schema versions', () => {
    for (const sourceKind of ['utility', 'energy-use'] as const) {
      const definition = createVisualizationSetupDefinition({ name: 'Hierarchy', accountGuid: 'account-a', facilitySelection: { kind: 'all' }, chart: { kind: 'sunburst', hierarchy: [], values: 'absolute' }, sourceKinds: [sourceKind] });
      expect(definition.version).toBe(2);
      expect(definition.chart).toMatchObject({ hierarchy: ['facility', ...(sourceKind === 'utility' ? ['source', 'meter'] : ['group', 'equipment'])] });
    }
  });
  it('keeps every duplicate source occurrence without double counting hierarchy parents or grouped links', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'sankey', flow: 'source-to-equipment' });
    const item = equipmentFixture(); item.utilityData.push(structuredClone(item.utilityData[0]));
    const evidence = equipmentCompositionEvidence({ ...snapshot, energyUseEquipment: [item] }, { ...definition, sources: [{ ...definition.sources[0] as EnergyUseVisualizationSource,
      selectionMode: 'facility', aggregation: 'sum', selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a'] } }] });
    expect(evidence.resolution.state).toBe('ready'); if (evidence.resolution.state !== 'ready') return;
    const result = evidence.resolution.resolved;
    expect(new Set(result.composition!.contributions.map(row => row.id)).size).toBe(2);
    const flow = result.data; if (flow.kind !== 'flow') throw new Error('Expected flow');
    expect(flow.links).toHaveLength(1); expect(flow.links[0].observation).toMatchObject({ value: 20 });
  });
  it('rejects multiyear snapshots, mismatched fiscal intervals, unsupported sources and invalid negative equipment amounts', () => {
    const { snapshot, definition } = compositionFixture();
    expect(compositionPeriodIssue({ ...definition, period: { kind: 'all-history' } })).toContain('cannot be summed');
    const other = equipmentFixture({ guid: 'other', facilityId: 'other' });
    const changed = { ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'other', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6 }], energyUseEquipment: [...snapshot.energyUseEquipment, other] };
    const incompatible: VisualizationDefinition = { ...definition, facilitySelection: { kind: 'all' }, sources: [{ ...definition.sources[0] as EnergyUseVisualizationSource, selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a', 'other'] } }] };
    expect(equipmentCompositionEvidence(changed, incompatible).resolution).toMatchObject({ state: 'unsupported', message: expect.stringContaining('actual fiscal') });
    const negative = equipmentFixture(); negative.utilityData[0].energyUse[0].energyUse = -10;
    const result = equipmentCompositionEvidence({ ...snapshot, energyUseEquipment: [negative] }, { ...definition, sources: [{ ...definition.sources[0] as EnergyUseVisualizationSource, selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }] }).resolution;
    if (result.state !== 'ready') throw new Error(JSON.stringify(result));
    expect(result.resolved.composition!.contributions[0].observation).toMatchObject({ state: 'missing', reason: expect.stringContaining('Invalid saved consumption') });
  });
  it('retains signed over-allocation while drawing only positive allocation and residual links', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'sankey', flow: 'energy-balance' });
    const item = equipmentFixture(), def: VisualizationDefinition = { ...definition, period: { kind: 'fiscal-year', year: 2024 }, sources: [{ ...definition.sources[0] as EnergyUseVisualizationSource,
      selectionMode: 'facility', aggregation: 'sum', selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a'] } }] };
    const utility = meter({ meterReadingDataApplication: 'fullMonth' });
    const readings = Array.from({ length: 12 }, (_, month) => reading({ guid: `reading-${month}`, year: 2024, month: month + 1, totalEnergyUse: .5 }));
    const changed = { ...snapshot, meters: [utility], meterData: readings, energyUseEquipment: [item] };
    const request = equipmentCompositionEvidence(changed, def).request;
    const projected = calendarizedMeter(utility, readings.map((row, month) => monthlyData({ year: 2024, monthNumValue: month, energyUse: .5 })), { energyUnit: 'kWh' });
    const result = resolveEquipment(changed, request, [projected]);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'flow') throw new Error(JSON.stringify(result));
    expect(result.resolved.composition!.diagnostics.join(' ')).toContain('Over allocated: 4 kWh');
    expect(result.resolved.composition!.residuals).toEqual([]);
    expect(result.resolved.data.links.every(link => link.observation.state === 'observed' && link.observation.value > 0)).toBe(true);
    const incomplete = resolveEquipment({ ...changed, meterData: readings.slice(1) }, request, [projected]);
    if (incomplete.state !== 'ready') throw new Error(JSON.stringify(incomplete));
    expect(incomplete.resolved.composition!.denominators.find(row => row.kind === 'metered-consumption')?.observation.state).toBe('missing');
  });
});
