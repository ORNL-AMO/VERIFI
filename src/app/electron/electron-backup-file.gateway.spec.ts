import { ElectronBackupFileGateway } from './electron-backup-file.gateway';

describe('ElectronBackupFileGateway', () => {
  const originalElectronApi = window['electronAPI'];

  afterEach(() => {
    window['electronAPI'] = originalElectronApi;
  });

  it('falls back cleanly when Electron invoke is unavailable', async () => {
    window['electronAPI'] = undefined;
    const gateway = new ElectronBackupFileGateway();

    await expect(gateway.chooseSavePath('Account.json')).resolves.toBeUndefined();
    await expect(gateway.exists('Account.json')).resolves.toBe(false);
  });

  it('delegates request-response operations through the allowlisted invoke API', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'backup:exists') {
        return { ok: true, exists: true };
      }
      if (channel === 'backup:read') {
        return { ok: true, data: { origin: 'VERIFI' } };
      }
      return { ok: true };
    });
    window['electronAPI'] = { invoke } as any;
    const gateway = new ElectronBackupFileGateway();

    await expect(gateway.exists('/tmp/account.json')).resolves.toBe(true);
    await expect(gateway.read('/tmp/account.json')).resolves.toEqual({ origin: 'VERIFI' });
    await expect(gateway.write('/tmp/account.json', { origin: 'VERIFI' } as any)).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith('backup:exists', { path: '/tmp/account.json' });
    expect(invoke).toHaveBeenCalledWith('backup:read', { path: '/tmp/account.json' });
    expect(invoke).toHaveBeenCalledWith('backup:write', {
      path: '/tmp/account.json',
      backup: { origin: 'VERIFI' }
    });
  });
});
