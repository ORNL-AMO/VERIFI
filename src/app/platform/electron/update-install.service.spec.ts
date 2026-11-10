import { BehaviorSubject } from 'rxjs';
import { ElectronUpdateState } from './electron-update.models';
import { UpdateInstallService } from './update-install.service';

function setup() {
  const router = { url: '/data-evaluation', navigateByUrl: vi.fn().mockResolvedValue(true) };
  const commands = { whenIdle: vi.fn().mockResolvedValue(undefined) };
  const backups = { flushPending: vi.fn().mockResolvedValue(undefined) };
  const electron = { isElectron: true, updateState: new BehaviorSubject<ElectronUpdateState>({ status: 'downloaded' }), installUpdate: vi.fn() };
  const loading = { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() };
  const lifecycle = { initialize: vi.fn().mockResolvedValue({ status: 'ready' }) };
  return { router, commands, backups, electron, loading, lifecycle, service: new UpdateInstallService(router as any, commands as any, backups as any, electron as any, loading as any, lifecycle as any) };
}

describe('UpdateInstallService', () => {
  it('honors canceled editor leave decisions without starting backups or installation', async () => {
    const { service, router, commands, backups, electron, loading } = setup();
    router.navigateByUrl.mockResolvedValue(false);
    await expect(service.install()).resolves.toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/welcome');
    expect(commands.whenIdle).not.toHaveBeenCalled();
    expect(backups.flushPending).not.toHaveBeenCalled();
    expect(electron.installUpdate).not.toHaveBeenCalled();
    expect(loading.setLoadingStatus).not.toHaveBeenCalled();
  });

  it('waits for writes and backups and deduplicates repeated restart clicks', async () => {
    const { service, commands, backups, electron, loading } = setup();
    let resolve!: () => void;
    backups.flushPending.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const first = service.install();
    const second = service.install();
    expect(second).toBe(first);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(commands.whenIdle).toHaveBeenCalledOnce();
    expect(backups.flushPending).toHaveBeenCalledOnce();
    expect(electron.installUpdate).not.toHaveBeenCalled();
    resolve();
    await expect(first).resolves.toBe(true);
    expect(electron.installUpdate).toHaveBeenCalledOnce();
    expect(loading.setLoadingStatus).toHaveBeenLastCalledWith(false);
  });

  it.each(['writes', 'backups'])('does not install when %s fail and permits retry', async failed => {
    const { service, commands, backups, electron } = setup();
    const dependency = failed === 'writes' ? commands.whenIdle : backups.flushPending;
    dependency.mockRejectedValueOnce(new Error('Save failed'));
    await expect(service.install()).rejects.toThrow('Save failed');
    expect(electron.installUpdate).not.toHaveBeenCalled();
    await expect(service.install()).resolves.toBe(true);
  });

  it('does nothing outside Electron or before the update is downloaded', async () => {
    const { service, electron } = setup();
    electron.isElectron = false;
    await expect(service.install()).resolves.toBe(false);
    electron.isElectron = true;
    electron.updateState.next({ status: 'downloading' });
    await expect(service.install()).resolves.toBe(false);
    expect(electron.installUpdate).not.toHaveBeenCalled();
  });

  it('waits for startup migrations and blocks installation after failed initialization', async () => {
    const { service, lifecycle, router, electron } = setup();
    let finish!: (state: { status: string }) => void;
    lifecycle.initialize.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const install = service.install();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(electron.installUpdate).not.toHaveBeenCalled();
    finish({ status: 'error' });
    await expect(install).rejects.toThrow('startup issue');
    expect(electron.installUpdate).not.toHaveBeenCalled();
  });
});
