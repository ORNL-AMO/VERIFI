import { BackupExportCoordinator } from './backup-export-coordinator.service';

describe('BackupExportCoordinator', () => {
  it('does not trigger a download if cancelled while creating the ZIP', async () => {
    let finish: (value: Blob) => void;
    const downloads = { downloadBlob: vi.fn(), downloadText: vi.fn() };
    const coordinator = new BackupExportCoordinator(
      {} as any, {} as any, {} as any,
      { createZip: () => new Promise<Blob>(resolve => finish = resolve) } as any,
      downloads as any
    );
    const controller = new AbortController();
    const pending = coordinator.deliverToBrowser({} as any, true, controller.signal);
    controller.abort();
    finish!(new Blob());
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(downloads.downloadBlob).not.toHaveBeenCalled();
  });

  it('rejects an already cancelled JSON delivery before serialization', async () => {
    const serialize = vi.fn();
    const coordinator = new BackupExportCoordinator({} as any, {} as any, {} as any, { serialize } as any, {} as any);
    const controller = new AbortController();
    controller.abort();
    await expect(coordinator.deliverToBrowser({} as any, false, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(serialize).not.toHaveBeenCalled();
  });

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
