import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { savedVisualizationFixture, visualizationBackupSnapshot } from './visualization-backup.testing';
import { transferSavedVisualization, summarizeVisualizationImport, visualizationTransferMaps } from './visualization-backup';
import { readSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';

describe('saved visualization backup preparation and transfer', () => {
  const preparation = new BackupPreparationService();
  const builder = new WorkspaceBackupSnapshotBuilder();

  it('exports all account definitions and only the owning facility definitions without mutating the snapshot', () => {
    const source = visualizationBackupSnapshot(), before = structuredClone(source);
    expect(builder.buildAccountBackup(source).savedVisualizations).toHaveLength(8);
    const facility = builder.buildFacilityBackup(source, 'facility-a');
    expect(facility.savedVisualizations).toHaveLength(7);
    expect(facility.savedVisualizations.every(item => item.facilityId === 'facility-a')).toBe(true);
    expect(source).toEqual(before);
  });

  it('defaults old backups to no visualizations without increasing the data version', () => {
    const source = builder.buildAccountBackup(visualizationBackupSnapshot());
    delete source.savedVisualizations;
    const prepared = preparation.prepare(source);
    expect(prepared.savedVisualizations).toEqual([]);
    expect(prepared.dataVersion).toBe(2);
  });

  it('retains saved comparison-model inputs when an opaque definition may reference them', () => {
    const source = { ...visualizationBackupSnapshot() };
    source.savedVisualizations = [{ ...source.savedVisualizations[0], definition: { version: 99, pinnedModel: 'model-b' } }];
    const exported = builder.buildAccountBackup(source);
    expect(exported.facilityAnalysisItems[0].groups[0].models.map(model => model.modelId)).toEqual(['model-a', 'model-b']);
    const prepared = preparation.prepare(JSON.parse(JSON.stringify(exported)));
    expect(prepared.facilityAnalysisItems[0].groups[0].models.map(model => model.modelId)).toEqual(['model-a', 'model-b']);
  });

  it('prepares repeatedly without changing definitions or its input', () => {
    const input = builder.buildAccountBackup(visualizationBackupSnapshot()), before = structuredClone(input);
    const once = preparation.prepare(input), twice = preparation.prepare(once);
    expect(twice).toEqual(once);
    expect(input).toEqual(before);
  });

  it.each([
    { guid: '' }, { accountId: 'other-account' }, { facilityId: 'missing-facility' },
    { definition: { ...utilityVisualizationFixture(), accountGuid: 'other-account' } }
  ])('rejects invalid outer identity or ownership before transfer: %j', changes => {
    const source = builder.buildAccountBackup(visualizationBackupSnapshot());
    source.savedVisualizations = [{ ...savedVisualizationFixture(utilityVisualizationFixture()), ...changes }];
    expect(() => preparation.prepare(source)).toThrow();
  });

  it('rejects duplicate definition identities', () => {
    const source = builder.buildAccountBackup(visualizationBackupSnapshot());
    source.savedVisualizations.push(structuredClone(source.savedVisualizations[0]));
    expect(() => preparation.prepare(source)).toThrow('duplicate identity');
  });

  it.each([{ version: 42, unknown: ['keep', 0] }, { name: false }, { version: 1, sources: [{ kind: 'new-provider' }] }])(
    'preserves and locks unreadable payloads through repeated transfers: %j', payload => {
      const source = savedVisualizationFixture(utilityVisualizationFixture());
      source.definition = payload;
      const first = transferSavedVisualization(source, 'destination', {}, 'first');
      const second = transferSavedVisualization(first, 'next', {}, 'second');
      expect(second.definition).toEqual(payload);
      expect(second.preservation.locked).toBe(true);
      expect(second.preservation.transfers.map(item => item.targetAccountId)).toEqual(['destination', 'next']);
      expect(readSavedVisualization(second).state).toBe('repair-required');
      expect(summarizeVisualizationImport('next', [second])).toMatchObject({ total: 1, locked: 1, repairRequired: 0 });
    });

  it('retains unresolved references despite a later transfer map offering that same identity', () => {
    const original = savedVisualizationFixture(utilityVisualizationFixture());
    const first = transferSavedVisualization(original, 'destination', {}, 'first');
    const second = transferSavedVisualization(first, 'next', { meter: { 'meter-a': 'accidental-match' } }, 'second');
    expect(second.definition).toMatchObject({ sources: [{ selection: { guids: ['meter-a'] } }], series: [{ resourceGuid: 'meter-a' }] });
    expect(second.preservation.references).toEqual(first.preservation.references);
    expect(readSavedVisualization(second).state).toBe('repair-required');
  });

  it('maps all resource families by identity and qualifies model/charge IDs by owner', () => {
    const source = builder.buildAccountBackup(visualizationBackupSnapshot());
    const target = structuredClone(source);
    for (const records of [target.facilities, target.meters, target.groups, target.predictors,
      target.facilityEnergyUseGroups, target.facilityEnergyUseEquipment, target.facilityAnalysisItems]) {
      for (const record of records) record.guid += '-new';
    }
    target.facilityAnalysisItems[0].groups[0].idbGroupId = 'group-a-new';
    const maps = visualizationTransferMaps(source, target);
    expect(maps.equipment['equipment-a']).toBe('equipment-a-new');
    expect(maps['energy-use-group']['energy-group-a']).toBe('energy-group-a-new');
    expect(Object.values(maps.charge)).toEqual(['charge-a']);
    expect(Object.values(maps.model)).toEqual(['model-a', 'model-b']);
    const model = source.savedVisualizations.find(item => (item.definition as any).sources[0].kind === 'analysis-model');
    const transferred = transferSavedVisualization(model, 'new-account', maps, 'copy');
    expect(transferred.definition).toMatchObject({ sources: [{ analysisGuid: 'analysis-a-new', groupGuid: 'group-a-new', modelId: 'model-a', comparisonModelId: 'model-b' }] });
    expect(transferred.preservation.references).toEqual([]);
  });
});
