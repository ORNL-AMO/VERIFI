import { getNewIdbHomeDashboard, getNewIdbHomeOwner } from '@data/models/idbModels/homeDashboard';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { chartWidget, homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { readHomeWidget } from '@data/home/home-record';
import { homeOwnerResolutionState } from '@data/home/home-references';
import { homeBackupRelationshipsError, HomeTransferMaps, transferHomeDashboard, transferHomeOwner } from './home-backup';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { visualizationBackupSnapshot } from './visualization-backup.testing';

describe('Home backup contracts and verified mappings', () => {
  const owner = { kind: 'facility' as const, guid: 'facility-a' };
  const definition = homeDefinition([
    chartWidget('shared', 'first'), chartWidget('shared', 'second'),
    { id: 'note', kind: 'note', size: 'full', visibility: 'always', text: 'shared and facility-a remain plain text' },
    { id: 'follow', kind: 'goal', size: 'half', visibility: 'always', binding: { kind: 'reporting', owner: homeAccountOwner, category: 'energy' } },
    { id: 'exact', kind: 'goal', size: 'half', visibility: 'always', binding: { kind: 'exact', analysisGuid: 'analysis-a' } },
    { id: 'link', kind: 'shortcut', size: 'full', visibility: 'always', destination: { area: 'data', owner, resource: { kind: 'meter', guid: 'meter-a' } } }
  ]);
  const maps: HomeTransferMaps = { account: { 'account-a': 'account-b' }, facility: { 'facility-a': 'facility-b' },
    visualization: { shared: 'shared-copy' }, dashboard: { dashboard: 'dashboard-copy' }, analysis: { 'analysis-a': 'analysis-copy' }, meter: { 'meter-a': 'meter-copy' } };
  function record() {
    const value = { ...getNewIdbHomeDashboard('account-a', owner, definition), guid: 'dashboard', id: 42 };
    value.template = { template: 'home', version: 1, automatic: true, customized: false, baseline: definition, chartBaselines: [{ guid: 'shared', revision: 5 }] };
    return value;
  }
  const chart = { ...getNewIdbSavedVisualization(createVisualizationDefinition('Chart', 'account-a', { kind: 'all' }, 'utility')), guid: 'shared', revision: 5 };

  it('maps each typed namespace, retains shared chart identity, defaults/order and local widget IDs without editing notes', () => {
    const source = record(), before = structuredClone(source);
    const result = transferHomeDashboard(source, 'account-b', maps, 'dashboard-copy', [chart]);
    expect(result.id).toBeUndefined(); expect(result.accountId).toBe('account-b'); expect(result.facilityId).toBe('facility-b');
    expect(result.template?.chartBaselines).toEqual([{ guid: 'shared-copy', revision: 1 }]); expect(result.template?.customized).toBe(false);
    const widgets = (result.definition as typeof definition).widgets;
    expect(widgets.slice(0, 2)).toEqual([chartWidget('shared-copy', 'first'), chartWidget('shared-copy', 'second')]);
    expect(widgets[2]).toEqual(definition.widgets[2]);
    expect(widgets[3]).toMatchObject({ binding: { kind: 'reporting', owner: { kind: 'account', guid: 'account-b' }, category: 'energy' } });
    expect(widgets[4]).toMatchObject({ binding: { kind: 'exact', analysisGuid: 'analysis-copy' } });
    expect(widgets[5]).toMatchObject({ destination: { owner: { kind: 'facility', guid: 'facility-b' }, resource: { kind: 'meter', guid: 'meter-copy' } } });
    const state = getNewIdbHomeOwner('account-a', owner, { ...homeOwnerState(['dashboard']), deletedStarters: ['water'] });
    expect(transferHomeOwner(state, 'account-b', maps, 'owner-copy', [source]).state).toEqual({ ...homeOwnerState(['dashboard-copy']), deletedStarters: ['water'] });
    expect(source).toEqual(before);
  });
  it('keeps missing chart/account bindings unavailable through repeated transfers and coincident later maps', () => {
    const first = transferHomeDashboard(record(), 'account-b', { facility: maps.facility, analysis: maps.analysis, meter: maps.meter }, 'copy', [chart]);
    expect(readHomeWidget(first, 'first').state).toBe('repair-required'); expect(readHomeWidget(first, 'follow').state).toBe('repair-required');
    const second = transferHomeDashboard(first, 'account-c', { ...maps, account: { 'account-a': 'account-c', 'account-b': 'account-c' },
      facility: { 'facility-b': 'facility-c' }, visualization: { shared: 'coincident-chart' } }, 'second-copy', [chart]);
    expect((second.definition as typeof definition).widgets[0]).toMatchObject({ visualizationGuid: 'shared' });
    expect((second.definition as typeof definition).widgets[3]).toMatchObject({ binding: { owner: { guid: 'account-a' } } });
    expect(readHomeWidget(second, 'first').state).toBe('repair-required'); expect(second.preservation?.transfers).toHaveLength(2);
    expect(second.preservation?.references).toContainEqual(expect.objectContaining({ path: 'widgets.follow.binding.owner.guid', guid: 'account-a' }));
  });
  it('retains sticky customization and recognizes edits even when imported provenance flags are incomplete', () => {
    const source = record();
    expect(transferHomeDashboard({ ...source, template: { ...source.template, customized: true } }, 'account-b', maps, 'copy', [chart]).template?.customized).toBe(true);
    expect(transferHomeDashboard(source, 'account-b', maps, 'copy', [{ ...chart, revision: 6 }]).template?.customized).toBe(true);
    expect(transferHomeDashboard({ ...source, definition: { ...definition, name: 'Edited' } }, 'account-b', maps, 'copy', [chart]).template?.customized).toBe(true);
  });
  it('preserves opaque payloads/lineage and initialized empty sets without normalizing embedded identities', () => {
    const source = { ...record(), recordVersion: 90, definition: { version: 91, source: 'facility-a', unknown: [null, 0, 'shared'] }, template: { future: 'lineage' } as any };
    const first = transferHomeDashboard(source, 'account-b', maps, 'copy', [chart]);
    expect(first.definition).toEqual(source.definition); expect(first.template).toEqual(source.template); expect(first.preservation?.locked).toBe(true);
    const second = transferHomeDashboard(first, 'account-c', { facility: { 'facility-b': 'facility-c' } }, 'copy-2', []);
    expect(second.definition).toEqual(source.definition); expect(second.preservation?.transfers).toHaveLength(2);
    const empty = getNewIdbHomeOwner('account-a', homeAccountOwner, { ...homeOwnerState(), deletedStarters: ['home', 'water'] });
    expect(transferHomeOwner(empty, 'account-b', maps, 'owner-copy', []).state).toEqual(empty.state);
  });
  it('retains invalid defaults without verifying a coincident dashboard or changing hydration intent', () => {
    const source = getNewIdbHomeOwner('account-a', owner, { ...homeOwnerState(['missing', 'dashboard']), defaultDashboardGuid: 'missing' });
    const first = transferHomeOwner(source, 'account-b', maps, 'owner-copy', [record()]);
    const second = transferHomeOwner(first, 'account-c', { facility: { 'facility-b': 'facility-c' }, dashboard: { missing: 'coincident', 'dashboard-copy': 'third' } }, 'owner-2', []);
    expect((second.state as any).defaultDashboardGuid).toBe('missing');
    expect(homeOwnerResolutionState(second, second.state as any).defaultDashboardGuid).toBeUndefined();
    expect(homeOwnerResolutionState(second, second.state as any).dashboardOrder).not.toContain('missing');
  });
  it('rejects malformed ownership, duplicate markers and invalid collection/envelope data before restore', () => {
    const snapshot = visualizationBackupSnapshot(), builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const backup = builder.buildAccountBackup(snapshot), ownerRecord = getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState());
    expect(homeBackupRelationshipsError('account-a', snapshot.facilities, [record(), record()], [])).toContain('duplicate');
    expect(homeBackupRelationshipsError('account-a', snapshot.facilities, [], [ownerRecord, { ...ownerRecord, guid: 'second-marker' }])).toContain('configuration');
    for (const patch of [{ homeDashboards: null }, { homeOwners: {} }, { homeDashboards: [{ ...record(), accountId: 'foreign' }] },
      { homeDashboards: [{ ...record(), guid: 5 }] }, { homeOwners: [{ ...ownerRecord, preservation: { references: [], transfers: [null] } }] }])
      expect(() => preparation.prepare({ ...backup, ...patch })).toThrow();
    const legacy = { ...backup }; delete legacy.homeDashboards; delete legacy.homeOwners; delete legacy.dataVersion;
    const before = structuredClone(legacy), prepared = preparation.prepare(legacy);
    expect(prepared.homeDashboards).toEqual([]); expect(prepared.homeOwners).toEqual([]); expect(legacy).toEqual(before);
  });
});
