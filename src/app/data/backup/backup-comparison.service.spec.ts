import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupComparisonService } from './backup-comparison.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { visualizationBackupSnapshot } from './visualization-backup.testing';
import { getNewIdbHomeDashboard, getNewIdbHomeOwner } from '@data/models/idbModels/homeDashboard';
import { homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';

describe('saved visualizations in facility backup comparison', () => {
  it('identifies layout/default changes and their removal by an older replacement backup', () => {
    const store = new AccountWorkspaceStore(), owner = { kind: 'facility' as const, guid: 'facility-a' };
    const layout = getNewIdbHomeDashboard('account-a', owner, homeDefinition());
    const snapshot = { ...visualizationBackupSnapshot(), homeDashboards: [layout], homeOwners: [getNewIdbHomeOwner('account-a', owner, homeOwnerState([layout.guid]))] };
    store.publish(snapshot);
    const service = new BackupComparisonService(store, new AccountWorkspaceQueryService(store));
    const backup = new WorkspaceBackupSnapshotBuilder().buildAccountBackup(snapshot);
    expect(service.comparePreparedAccountBackup(backup)[0].differences).not.toContain('Home Dashboards');
    backup.homeDashboards[0].definition = { ...homeDefinition(), name: 'Edited layout' };
    backup.homeOwners[0].state = homeOwnerState();
    expect(service.comparePreparedAccountBackup(backup)[0].differences).toEqual(expect.arrayContaining(['Home Dashboards', 'Home Defaults']));
    delete backup.homeDashboards; delete backup.homeOwners;
    expect(service.comparePreparedAccountBackup(backup)[0].differences).toEqual(expect.arrayContaining(['Home Dashboards', 'Home Defaults']));
    expect(store.homeOwners()[0].state).toEqual(homeOwnerState([layout.guid]));
  });
  it('identifies changed saved intent and definitions removed by an older facility replacement', () => {
    const store = new AccountWorkspaceStore();
    const snapshot = visualizationBackupSnapshot();
    store.publish(snapshot);
    const service = new BackupComparisonService(store, new AccountWorkspaceQueryService(store));
    const backup = new WorkspaceBackupSnapshotBuilder().buildAccountBackup(snapshot);
    expect(service.comparePreparedAccountBackup(backup)[0].differences).not.toContain('Saved Visualizations');
    const original = backup.savedVisualizations[0].definition as { name: string };
    backup.savedVisualizations[0].definition = { ...original, name: 'Changed chart' };
    expect(service.comparePreparedAccountBackup(backup)[0].differences).toContain('Saved Visualizations');
    delete backup.savedVisualizations;
    expect(service.comparePreparedAccountBackup(backup)[0].differences).toContain('Saved Visualizations');
    expect((store.savedVisualizations()[0].definition as { name: string }).name).not.toBe('Changed chart');
  });
});
