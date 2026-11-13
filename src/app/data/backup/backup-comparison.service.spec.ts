import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupComparisonService } from './backup-comparison.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { visualizationBackupSnapshot } from './visualization-backup.testing';

describe('saved visualizations in facility backup comparison', () => {
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
