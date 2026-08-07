import { BackupExportCoordinator } from './backup-export-coordinator.service';

describe('BackupExportCoordinator', () => {
  it('loads an inactive account snapshot without touching the active workspace', async () => {
    const activeSnapshot = { account: { guid: 'active' } };
    const inactiveSnapshot = { account: { guid: 'inactive' } };
    const builder = {
      buildAccountBackup: vi.fn(snapshot => ({ account: snapshot.account }))
    };
    const loader = {
      load: vi.fn().mockResolvedValue(inactiveSnapshot)
    };
    const browserDownloads = {
      downloadText: vi.fn(),
      downloadBlob: vi.fn()
    };
    const serializer = {
      serialize: vi.fn(() => '{}'),
      getFileName: vi.fn(() => 'inactive.json'),
      createZip: vi.fn()
    };
    const coordinator = new BackupExportCoordinator(
      { snapshot: () => activeSnapshot } as any,
      loader as any,
      builder as any,
      serializer as any,
      browserDownloads as any
    );

    const backup = await coordinator.exportAccountByGuid('inactive');

    expect(loader.load).toHaveBeenCalledWith('inactive');
    expect(builder.buildAccountBackup).toHaveBeenCalledWith(inactiveSnapshot);
    expect(browserDownloads.downloadText).toHaveBeenCalled();
    expect(backup.account.guid).toBe('inactive');
  });
});
