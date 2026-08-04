import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { DataManagementService } from './data-management.service';

describe('DataManagementService', () => {
  function setup(storedValues: Record<string, number | undefined> = {}) {
    const storage = {
      retrieve: vi.fn((key: string) => storedValues[key]),
      store: vi.fn()
    };
    const service = new DataManagementService(
      storage as unknown as LocalStorageService
    );

    return { service, storage };
  }

  it('uses open panels and 200 pixel widths when no preferences are stored', () => {
    const { service } = setup();

    expect(service.helpWidth).toBe(200);
    expect(service.sidebarWidth).toBe(200);
    expect(service.helpPanelOpen.getValue()).toBe(true);
    expect(service.sidebarOpen.getValue()).toBe(true);
  });

  it('restores stored widths and treats a 50 pixel panel as closed', () => {
    const { service } = setup({ helpWidth: 50, sidebarWidth: 320 });

    expect(service.helpWidth).toBe(50);
    expect(service.sidebarWidth).toBe(320);
    expect(service.helpPanelOpen.getValue()).toBe(false);
    expect(service.sidebarOpen.getValue()).toBe(true);
  });

  it('persists updated panel widths', () => {
    const { service, storage } = setup();

    service.setHelpWidth(280);
    service.setSidebarWidth(50);

    expect(service.helpWidth).toBe(280);
    expect(service.sidebarWidth).toBe(50);
    expect(storage.store).toHaveBeenCalledWith('helpWidth', 280);
    expect(storage.store).toHaveBeenCalledWith('sidebarWidth', 50);
  });
});
