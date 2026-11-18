import { analysisDefinition, analysisFixture } from './testing/analysis-fixtures';
import { utilityVisualizationFixture } from './testing/visualization-fixtures';
import { projectVisualizationDisplaySettings, visualizationAnalysisBasisIssue } from './visualization-display-settings';
import { decodeVisualizationDefinition } from './visualization-validation';
import type { UtilityVisualizationSource } from './visualization-definition';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { discoverUtilitySeries } from './utility/utility-catalog';
import { resolveVisualizationFacilities } from './visualization-facilities';
import { visualizationSourceQuantities } from './visualization-display-settings';

describe('chart-wide quantity settings', () => {
  it('applies one energy unit and treatment to every utility measure projection without changing cost or saved inputs', () => {
    const initial = utilityVisualizationFixture(), source = initial.sources[0] as UtilityVisualizationSource;
    const definition = { ...initial, sources: [source, { ...source, id: 'energy-b' }, { ...source, id: 'cost', measure: 'cost' as const, settings: {} }],
      displaySettings: { units: { energy: { kind: 'pinned' as const, value: 'MMBtu' } }, energyTreatment: { kind: 'pinned' as const, value: 'source' as const } } };
    const before = structuredClone(definition), projected = projectVisualizationDisplaySettings(definition, analysisFixture().snapshot);
    expect(projected.sources.slice(0, 2).map(item => item.settings)).toEqual([definition.displaySettings, definition.displaySettings].map(() => ({ unit: { kind: 'pinned', value: 'MMBtu' }, energyTreatment: { kind: 'pinned', value: 'source' } })));
    expect(projected.sources[2].settings).toEqual({}); expect(definition).toEqual(before);
  });
  it('rejects wrong-dimension and unknown quantity bindings before saving', () => {
    const definition = utilityVisualizationFixture();
    for (const units of [{ energy: { kind: 'pinned', value: 'gal' } }, { imaginary: { kind: 'owner' } }])
      expect(decodeVisualizationDefinition({ ...definition, displaySettings: { units } }).state).toBe('invalid');
  });
  it('pins energy and water independently when one consumption selection contains both physical quantities', () => {
    const data = analysisFixture(), initial = utilityVisualizationFixture();
    const source: UtilityVisualizationSource = { ...initial.sources[0] as UtilityVisualizationSource, measure: 'consumption', settings: {}, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'water'] } };
    const snapshot = { ...data.snapshot, meters: [meter({ startingUnit: 'kWh', energyUnit: 'kWh' }), meter({ guid: 'water', source: 'Water Intake', startingUnit: 'gal' })] };
    const definition = { ...initial, sources: [source], displaySettings: { units: { energy: { kind: 'pinned' as const, value: 'MWh' }, volume: { kind: 'pinned' as const, value: 'gal' } } } };
    expect(visualizationSourceQuantities(definition, source, snapshot)).toEqual(['energy', 'volume']);
    const compiled = projectVisualizationDisplaySettings(definition, snapshot);
    expect(discoverUtilitySeries(snapshot, resolveVisualizationFacilities(compiled, snapshot.facilities).scope, compiled.sources[0] as UtilityVisualizationSource).map(item => item.unit)).toEqual(['MWh', 'gal']);
  });
  it('requires a common saved Analysis energy basis, including percentage measures', () => {
    const data = analysisFixture(), definition = analysisDefinition('savings');
    const other = { ...data.analysis, guid: 'other', energyIsSource: !data.analysis.energyIsSource };
    const combined = { ...definition, sources: [...definition.sources, { ...definition.sources[0], id: 'other', analysisGuid: 'other' }] };
    expect(visualizationAnalysisBasisIssue(combined, { ...data.snapshot, facilityAnalyses: [data.analysis, other] })).toContain('different Site/Source');
    expect(visualizationAnalysisBasisIssue(combined, { ...data.snapshot, facilityAnalyses: [data.analysis, { ...other, energyIsSource: data.analysis.energyIsSource }] })).toBeUndefined();
  });
});
