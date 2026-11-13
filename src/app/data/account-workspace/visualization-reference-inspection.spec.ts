import { createVisualizationDefinition, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture, analysisVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { inspectVisualizationReferences, VisualizationReferenceCatalog } from './visualization-reference-inspection';

describe('saved visualization reference inspection', () => {
  const resource = { accountId: 'account-a', facilityId: 'facility-a' };
  const catalog: VisualizationReferenceCatalog = {
    facilities: [{ guid: 'facility-a', accountId: 'account-a' }], meters: [{ ...resource, guid: 'meter-a', charges: [{ guid: 'charge-a' }] }],
    meterGroups: [{ ...resource, guid: 'group-a' }], predictors: [{ ...resource, guid: 'predictor-a' }],
    energyUseGroups: [{ ...resource, guid: 'energy-group-a' }], energyUseEquipment: [{ ...resource, guid: 'equipment-a' }],
    facilityAnalyses: [{ ...resource, guid: 'analysis-a', groups: [{ idbGroupId: 'group-a', models: [{ modelId: 'model-a' }, { modelId: 'model-b' }] }] }],
    accountAnalyses: [{ accountId: 'account-a', guid: 'account-analysis-a' }]
  };

  it('resolves GUIDs independently of labels and does not rewrite missing selection or series intent', () => {
    const definition = utilityVisualizationFixture();
    const original = structuredClone(definition);
    expect(inspectVisualizationReferences(definition, catalog)).toEqual([]);
    const issues = inspectVisualizationReferences(definition, { ...catalog, meters: [] });
    expect(issues.map(ref => [ref.path, ref.guid, ref.reason])).toEqual([
      ['sources.0.selection.guids.0', 'meter-a', 'missing'], ['series.0.resourceGuid', 'meter-a', 'missing']
    ]);
    expect(definition).toEqual(original);
  });

  it('keeps absent presentation overrides dormant while missing fixed resources still require repair', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const definition = { ...base, series: [{ ...wildcard, overrides: [{ resourceGuid: 'absent-meter', visible: false }] }] };
    expect(inspectVisualizationReferences(definition, catalog)).toEqual([]);
    expect(inspectVisualizationReferences(definition, { ...catalog, meters: [] })).toEqual([
      { path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'missing' }
    ]);
  });

  it.each([
    ['facility', 'facility-a'], ['meter', 'meter-a'], ['meter-group', 'group-a'], ['predictor', 'predictor-a'],
    ['equipment', 'equipment-a'], ['energy-use-group', 'energy-group-a']
  ] as const)('inspects %s fixed selections', (kind, guid) => {
    const definition = { ...createVisualizationDefinition('Selections', 'account-a', { kind: 'all' }, 'utility'),
      sources: [{ ...utilityVisualizationFixture().sources[0], selection: { kind: 'fixed' as const, resource: kind, guids: [guid] } }], series: [] };
    expect(inspectVisualizationReferences(definition, catalog)).toEqual([]);
  });

  it('checks both pinned models within the exact analysis/group instead of substituting another selected model', () => {
    expect(inspectVisualizationReferences(analysisVisualizationFixture(true), catalog)).toEqual([]);
    const issues = inspectVisualizationReferences(analysisVisualizationFixture(true), { ...catalog,
      facilityAnalyses: [{ ...resource, guid: 'analysis-a', groups: [{ idbGroupId: 'group-a', models: [{ modelId: 'model-b' }] }] }] });
    expect(issues).toEqual([{ path: 'sources.0.modelId', kind: 'model', guid: 'model-a', parentGuid: 'analysis-a', groupGuid: 'group-a', reason: 'missing' }]);
  });

  it.each(['analysis-a', 'group-a', 'model-a', 'model-b', 'facility-a'])(
    'resolves analysis-series identity %s in its declared namespace', resourceGuid => {
      const base = analysisVisualizationFixture(true);
      expect(inspectVisualizationReferences({ ...base, series: [{ ...base.series[0], resourceGuid }] }, catalog)).toEqual([]);
    });

  it('does not treat an existing meter group as an analysis group unless the named analysis includes it', () => {
    const issues = inspectVisualizationReferences(analysisVisualizationFixture(), { ...catalog,
      facilityAnalyses: [{ ...resource, guid: 'analysis-a', groups: [] }] });
    expect(issues).toEqual([{ path: 'sources.0.groupGuid', kind: 'meter-group', guid: 'group-a', parentGuid: 'analysis-a', reason: 'missing' }]);
  });

  it('checks charges within their owning meter and preserves transfer blocks despite a destination GUID collision', () => {
    const base = utilityVisualizationFixture();
    const source = base.sources[0] as UtilityVisualizationSource;
    const definition = { ...base, sources: [{ ...source, kind: 'utility' as const, measure: 'charge' as const,
      charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'cost' as const } }] };
    expect(inspectVisualizationReferences(definition, catalog)).toEqual([]);
    const blocked = { path: 'sources.0.charge.chargeGuid', kind: 'charge' as const, guid: 'charge-a', parentGuid: 'meter-a', reason: 'not-transferred' as const };
    expect(inspectVisualizationReferences(definition, catalog, [blocked])).toEqual([blocked]);
  });

  it('reports foreign ownership instead of returning a matching GUID as available', () => {
    const issues = inspectVisualizationReferences(utilityVisualizationFixture(), { ...catalog, meters: [{ ...resource, guid: 'meter-a', accountId: 'account-b' }] });
    expect(issues.map(ref => ref.reason)).toEqual(['foreign', 'foreign']);
    const scoped = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    expect(inspectVisualizationReferences(scoped, { ...catalog, meters: [{ ...resource, guid: 'meter-a', facilityId: 'facility-b' }] })
      .map(ref => ref.reason)).toEqual(['foreign', 'foreign']);
  });
});
