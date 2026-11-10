import { Subject } from 'rxjs';
import { ElectronService } from './electron.service';

describe('ElectronService update bridge', () => {
  const original = window['electronAPI'];
  afterEach(() => { window['electronAPI'] = original; });

  function setup(available = true) {
    const listeners = new Map<string, (value: unknown) => void>();
    const cleanup = vi.fn();
    const bridge = { send: vi.fn(), on: vi.fn((channel, callback) => { listeners.set(channel, callback); return cleanup; }) };
    window['electronAPI'] = available ? bridge : undefined;
    const service = new ElectronService({ retrieve: () => true } as any, { disableNotification: new Subject() } as any);
    return { service, listeners, bridge, cleanup };
  }

  it('projects update state for existing header consumers and clears stale errors', () => {
    const { service, listeners } = setup();
    listeners.get('update-status')({ status: 'error', operation: 'check', message: 'offline' });
    expect(service.updateError.value).toBe(true);
    listeners.get('update-status')({ status: 'available', version: '1.1.0' });
    expect(service.updateAvailable.value).toBe(true);
    expect(service.updateError.value).toBe(false);
    expect(service.updateInfo.value.releaseName).toBe('1.1.0');
    listeners.get('update-status')({ status: 'downloaded', version: '1.1.0' });
    expect(service.updateAvailable.value).toBe(true);
    listeners.get('update-status')({ status: 'current' });
    expect(service.updateAvailable.value).toBe(false);
    service.ngOnDestroy();
  });

  it('registers once, removes listeners, and sends the appropriate retry command', () => {
    const { service, bridge, cleanup, listeners } = setup();
    service.listen();
    expect(bridge.on).toHaveBeenCalledTimes(6);
    listeners.get('update-status')({ status: 'error', operation: 'download' });
    service.retryUpdate();
    expect(bridge.send).toHaveBeenLastCalledWith('update');
    listeners.get('update-status')({ status: 'error', operation: 'check' });
    service.retryUpdate();
    expect(bridge.send).toHaveBeenLastCalledWith('check-for-updates');
    service.ngOnDestroy();
    expect(cleanup).toHaveBeenCalledTimes(6);
  });

  it('keeps browser behavior safe when the Electron bridge is absent', () => {
    const { service, bridge } = setup(false);
    service.sendAppReady('ready');
    service.sendUpdateSignal();
    service.retryUpdate();
    service.installUpdate();
    expect(service.isElectron).toBe(false);
    expect(bridge.send).not.toHaveBeenCalled();
    service.ngOnDestroy();
  });
});
