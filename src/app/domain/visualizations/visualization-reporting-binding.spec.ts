import { createVisualizationDefinition, AnalysisResultVisualizationSource } from './visualization-definition';
import { decodeVisualizationDefinition } from './visualization-validation';
import { serializeVisualizationDefinition } from './visualization-source-groups';
import { remapVisualizationDefinition, visualizationReferences } from './visualization-references';

describe('serialized Active for reporting rules', () => {
  const definition = createVisualizationDefinition('Reporting', 'account-a', { kind: 'all' }, 'analysis');
  const source = definition.sources[0] as AnalysisResultVisualizationSource;
  it.each(['account', 'facility'] as const)('retains an explicit %s owner/category through grouping and verified mapping', kind => {
    const value = { ...definition, sources: [{ ...source, reporting: { kind: 'reporting' as const,
      owner: { kind, guid: kind === 'account' ? 'account-a' : 'facility-a' }, category: 'water' as const } }] };
    const decoded = decodeVisualizationDefinition(serializeVisualizationDefinition(value));
    expect('definition' in decoded && (decoded.definition.sources[0] as AnalysisResultVisualizationSource).reporting).toEqual(value.sources[0].reporting);
    const mapped = remapVisualizationDefinition(value, 'account-b', { account: { 'account-a': 'account-b' }, facility: { 'facility-a': 'facility-b' } });
    expect((mapped.definition.sources[0] as AnalysisResultVisualizationSource).reporting).toEqual({ kind: 'reporting',
      owner: { kind, guid: kind === 'account' ? 'account-b' : 'facility-b' }, category: 'water' });
    expect(mapped.issues).toEqual([]);
    expect(visualizationReferences(value).some(ref => ref.kind === 'analysis')).toBe(false);
  });
  it('keeps unmapped facility rules blocked on repeated transfers, even with coincident later maps', () => {
    const value = { ...definition, sources: [{ ...source, reporting: { kind: 'reporting' as const,
      owner: { kind: 'facility' as const, guid: 'missing' }, category: 'energy' as const } }] };
    const first = remapVisualizationDefinition(value, 'b', {});
    expect(first.issues).toContainEqual(expect.objectContaining({ path: 'sources.0.reporting.owner.guid', guid: 'missing', reason: 'not-transferred' }));
    const again = remapVisualizationDefinition(first.definition, 'c', { facility: { missing: 'coincident' } }, first.issues);
    expect((again.definition.sources[0] as AnalysisResultVisualizationSource).reporting?.owner.guid).toBe('missing');
    expect(again.issues).toEqual(first.issues);
  });
  it('blocks account-reporting intent on facility-only transfer and retains the original owner evidence across hops', () => {
    const value = { ...definition, sources: [{ ...source, reporting: { kind: 'reporting' as const,
      owner: { kind: 'account' as const, guid: 'account-a' }, category: 'energy' as const } }] };
    const first = remapVisualizationDefinition(value, 'destination', {});
    expect(first.issues).toEqual([{ path: 'sources.0.reporting.owner.guid', kind: 'account', guid: 'account-a', reason: 'not-transferred' }]);
    expect(decodeVisualizationDefinition(first.definition).state).not.toBe('invalid');
    const second = remapVisualizationDefinition(first.definition, 'third', { account: { destination: 'third', 'account-a': 'third' } }, first.issues);
    expect(second.issues).toEqual(first.issues);
  });
  it('rejects ambiguous exact/rule bindings and keeps old named-analysis bindings exact', () => {
    expect(decodeVisualizationDefinition({ ...definition, sources: [{ ...source, analysisGuid: 'exact', reporting: {
      kind: 'reporting', owner: { kind: 'account', guid: 'account-a' }, category: 'energy' } }] }).state).toBe('invalid');
    const exact = { ...definition, sources: [{ ...source, analysisGuid: 'exact' }] };
    const mapped = remapVisualizationDefinition(exact, 'b', { analysis: { exact: 'exact-copy' } });
    expect(mapped.definition.sources[0]).toEqual({ ...source, analysisGuid: 'exact-copy' });
    expect(decodeVisualizationDefinition({ ...definition, sources: [{ ...source, reporting: {
      kind: 'reporting', owner: { kind: 'account', guid: 'foreign' }, category: 'energy' } }] }).state).toBe('invalid');
  });
});
