import { createVisualizationDefinition, createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { DEFAULT_VISUALIZATION_FILTERS, VISUALIZATION_FAMILIES, buildVisualizationLibrary, filterVisualizationLibrary, visualizationLibraryTile } from './visualization-library.models';
import { VISUALIZATION_CHART_CHOICES, createVisualizationChart } from '../visualization-charts';
import { libraryRecord, librarySnapshot } from './testing/library-testing';

describe('visualization library projections', () => {
  it.each(VISUALIZATION_FAMILIES)('shows saved incomplete $value intent without source calculations', family => {
    const snapshot = { ...librarySnapshot(), savedVisualizations: [getNewIdbSavedVisualization(createVisualizationDefinition('Setup', 'account-a', { kind: 'portfolio' }, family.value))] };
    const [entry] = buildVisualizationLibrary(snapshot);
    expect(entry.status).toBe('setup-required'); expect(entry.familyLabel).toBe(family.label);
    expect(entry.periodLabel).toBe(family.value === 'energy-use' ? 'Latest saved fiscal year' : 'All saved history');
    expect(entry.editable).toBe(true); expect(entry.issues.length).toBeGreaterThan(0);
  });
  it.each(VISUALIZATION_CHART_CHOICES)('shows the concrete $label chart with every selected family and matches either filter', choice => {
    const definition = createVisualizationSetupDefinition({ name: 'Mixed sources', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: createVisualizationChart(choice.value), sourceKinds: ['utility', 'weather'] });
    const snapshot = { ...librarySnapshot(), savedVisualizations: [getNewIdbSavedVisualization(definition)] };
    const entries = buildVisualizationLibrary(snapshot); expect(entries[0].chartLabel).toBe(choice.label);
    expect(entries[0].familyLabel).toBe('Utility, Weather');
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['library']).visualizationSnapshot?.chartLabel).toBe(choice.label);
    for (const family of ['utility', 'weather'] as const) expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, family })).toHaveLength(1);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, family: 'predictor' })).toEqual([]);
  });
  it('filters account ownership and searches source labels without replacing missing references', () => {
    const snapshot = { ...librarySnapshot(), meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Boiler steam' }] as any };
    const record = getNewIdbSavedVisualization(utilityVisualizationFixture());
    snapshot.savedVisualizations = [record, { ...libraryRecord(), guid: 'foreign', accountId: 'account-b' }];
    const entries = buildVisualizationLibrary(snapshot);
    expect(entries).toHaveLength(1); expect(entries[0].status).toBe('configured');
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
    expect(entries[1].name).toBe('Transferred'); expect(entries[1].familyLabel).toBe('Utility');
    expect(unknown.definition).toEqual({ version: 999, payload: ['preserved'] });
    expect(visualizationLibraryTile(entries[0], ['workbench'], ['library']).visualizationSnapshot?.scopeLabel).toBe('Portfolio');
  });
  it('sorts and filters family, scope, attention, and owner independently', () => {
    const snapshot = { ...librarySnapshot(), savedVisualizations: [libraryRecord('Zebra', 'z'), getNewIdbSavedVisualization(createVisualizationDefinition('Alpha', 'account-a',
      { kind: 'facility', facilityGuid: 'facility-a' }, 'weather'), { guid: 'a', createdDate: new Date('2026-01-01'), modifiedDate: new Date('2026-01-01') })] };
    const entries = buildVisualizationLibrary(snapshot);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, sort: 'name' }).map(entry => entry.name)).toEqual(['Alpha', 'Zebra']);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, search: 'Facility A', family: 'weather', scope: 'facility' }).map(entry => entry.name)).toEqual(['Alpha']);
    expect(filterVisualizationLibrary(entries, { ...DEFAULT_VISUALIZATION_FILTERS, status: 'configured' })).toEqual([]);
  });
});
