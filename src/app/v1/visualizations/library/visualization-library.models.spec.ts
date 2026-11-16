import { createVisualizationDefinition, createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { analysisVisualizationFixture, utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { DEFAULT_VISUALIZATION_FILTERS, VISUALIZATION_DATA_SOURCES, buildVisualizationLibrary, filterVisualizationLibrary, visualizationLibraryTile } from './visualization-library.models';
import { VISUALIZATION_CHART_CHOICES, createVisualizationChart } from '../visualization-charts';
import { libraryRecord, librarySnapshot } from './testing/library-testing';

describe('visualization library projections', () => {
  it('derives live All ownership from current facilities without trusting stale envelope metadata', () => {
    const snapshot = librarySnapshot(), definition = utilityVisualizationFixture();
    const record = { ...getNewIdbSavedVisualization(definition), facilityId: 'stale-facility' };
    const one = buildVisualizationLibrary({ ...snapshot, savedVisualizations: [record] })[0];
    expect(one.scope).toBe('facility'); expect(one.facilityGuid).toBe('facility-a');
    const second = { ...snapshot.facilities[0], guid: 'facility-b' };
    const two = buildVisualizationLibrary({ ...snapshot, facilities: [...snapshot.facilities, second], savedVisualizations: [record] })[0];
    expect(two.scope).toBe('portfolio'); expect(two.facilityGuid).toBeUndefined();
    expect(record.facilityId).toBe('stale-facility'); expect(record.definition).toEqual(definition);
  });
  it('deduplicates repeated data-source categories and matches each Dashboard filter', () => {
    const base = createVisualizationSetupDefinition({ name: 'All sources', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: createVisualizationChart('line'), sourceKinds: ['utility', 'predictor', 'energy-use', 'analysis'] });
    const definition = { ...base, sources: [...base.sources, { ...base.sources[1], id: 'predictor-2' },
      { ...analysisVisualizationFixture(true).sources[0], id: 'analysis-model' }] };
    const entries = buildVisualizationLibrary({ ...librarySnapshot(), savedVisualizations: [getNewIdbSavedVisualization(definition)] });
    expect(entries[0].dataSourceLabel).toBe('Meters, Predictors, Energy Use, Analysis');
    expect(entries[0].sourceKinds).toEqual(['utility', 'predictor', 'energy-use', 'analysis']);
    for (const option of VISUALIZATION_DATA_SOURCES)
      expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, sourceKind: option.value })).toHaveLength(1);
    expect(visualizationLibraryTile(entries[0], [], []).visualizationSnapshot?.dataSources).toEqual([
      { label: 'Meters', icon: 'meter' }, { label: 'Predictors', icon: 'predictor' },
      { label: 'Energy Use', icon: 'energyUseGroup' }, { label: 'Analysis', icon: 'analysis' }
    ]);
  });
  it.each(VISUALIZATION_DATA_SOURCES)('shows saved incomplete $value intent without source calculations', sourceKind => {
    const snapshot = { ...librarySnapshot(), savedVisualizations: [getNewIdbSavedVisualization(createVisualizationDefinition('Setup', 'account-a', { kind: 'all' }, sourceKind.value))] };
    const [entry] = buildVisualizationLibrary(snapshot);
    expect(entry.status).toBe('setup-required'); expect(entry.dataSourceLabel).toBe(sourceKind.label);
    expect(entry.periodLabel).toBe(sourceKind.value === 'energy-use' ? 'Latest saved fiscal year' : 'All saved history');
    expect(entry.editable).toBe(true); expect(entry.issues.length).toBeGreaterThan(0);
  });
  it.each(VISUALIZATION_CHART_CHOICES)('shows the concrete $label chart with every selected sourceKind and matches either filter', choice => {
    const definition = createVisualizationSetupDefinition({ name: 'Mixed sources', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: createVisualizationChart(choice.value), sourceKinds: ['utility', 'predictor'] });
    const snapshot = { ...librarySnapshot(), savedVisualizations: [getNewIdbSavedVisualization(definition)] };
    const entries = buildVisualizationLibrary(snapshot); expect(entries[0].chartLabel).toBe(choice.label);
    expect(entries[0].dataSourceLabel).toBe('Meters, Predictors');
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).visualizationSnapshot?.chartLabel).toBe(choice.label);
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).icon).toBe(choice.icon);
    for (const sourceKind of ['utility', 'predictor'] as const) expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, sourceKind })).toHaveLength(1);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, sourceKind: 'analysis' })).toEqual([]);
  });
  it('filters account membership and searches source labels without replacing missing references', () => {
    const snapshot = { ...librarySnapshot(), meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Boiler steam' }] as any };
    const record = getNewIdbSavedVisualization(utilityVisualizationFixture());
    snapshot.savedVisualizations = [record, { ...libraryRecord(), guid: 'foreign', accountId: 'account-b' }];
    const entries = buildVisualizationLibrary(snapshot);
    expect(entries).toHaveLength(1); expect(entries[0].status).toBe('configured');
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).status)
      .toEqual({ tone: 'success', icon: 'success', label: 'Setup valid' });
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).location).toBeUndefined();
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).visualizationSnapshot?.scope).toBe('facility');
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, search: 'BOILER STEAM' })).toHaveLength(1);
    snapshot.meters = [];
    const [missing] = buildVisualizationLibrary(snapshot);
    expect(missing.status).toBe('repair-required'); expect(missing.issues.join()).toContain('meter-a');
    expect(record.definition).toEqual(utilityVisualizationFixture());
  });
  it('preserves unknown and transfer-locked payloads as visible read-only records', () => {
    const unknown = { ...libraryRecord(), definition: { version: 999, payload: ['preserved'] } };
    const locked = { ...libraryRecord('Transferred', 'locked'), preservation: { locked: true, references: [], transfers: [] } };
    const snapshot = { ...librarySnapshot(), savedVisualizations: [unknown, locked] };
    const entries = buildVisualizationLibrary(snapshot);
    expect(entries.map(entry => entry.status)).toEqual(['unsupported', 'repair-required']);
    expect(entries.every(entry => !entry.editable)).toBe(true);
    expect(entries[1].name).toBe('Transferred'); expect(entries[1].dataSourceLabel).toBe('Meters');
    expect(unknown.definition).toEqual({ version: 999, payload: ['preserved'] });
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).visualizationSnapshot?.scopeLabel).toBe('Portfolio');
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['dashboard']).icon).toBe('dataVisualization');
  });
  it('sorts and filters sourceKind, scope, attention, and owner independently', () => {
    const initial = librarySnapshot();
    const snapshot = { ...initial, facilities: [...initial.facilities, { ...initial.facilities[0], guid: 'facility-b', name: 'Facility B' }], savedVisualizations: [libraryRecord('Zebra', 'z'), getNewIdbSavedVisualization(createVisualizationDefinition('Alpha', 'account-a',
      { kind: 'fixed', facilityGuids: ['facility-a'] }, 'predictor'), { guid: 'a', createdDate: new Date('2026-01-01'), modifiedDate: new Date('2026-01-01') })] };
    const entries = buildVisualizationLibrary(snapshot);
    const facilityTile = visualizationLibraryTile(entries.find(entry => entry.facilityGuid === 'facility-a')!, ['workbench'], ['dashboard']);
    expect(facilityTile.owner?.label).toBe('Facility A'); expect(facilityTile.location).toBeUndefined();
    expect(facilityTile.visualizationSnapshot?.scope).toBe('facility');
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, sort: 'name' }).map(entry => entry.name)).toEqual(['Alpha', 'Zebra']);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, search: 'Facility A', sourceKind: 'predictor', scope: 'facility' }).map(entry => entry.name)).toEqual(['Alpha']);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, status: 'configured' })).toEqual([]);
  });
});
