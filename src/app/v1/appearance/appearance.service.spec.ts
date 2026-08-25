import { vi } from 'vitest';
import { AppearanceService } from './appearance.service';

describe('AppearanceService', () => {
  it('loads valid stored appearance settings', () => {
    const storage = createStorage({
      palette: 'steel',
      mode: 'dark',
      density: 'compact',
      cornerStyle: 'square'
    });

    const service = new AppearanceService(storage as any);

    expect(service.settings()).toEqual({
      palette: 'steel',
      mode: 'dark',
      density: 'compact',
      cornerStyle: 'square'
    });
    expect(service.isDark()).toBe(true);
    expect(service.isCompact()).toBe(true);
    expect(service.hasSquareCorners()).toBe(true);
  });

  it('normalizes invalid stored appearance settings and persists updates', () => {
    const storage = createStorage({
      palette: 'neon',
      mode: 'system',
      density: 'tiny',
      cornerStyle: 'round'
    });
    const service = new AppearanceService(storage as any);

    expect(service.settings()).toEqual({
      palette: 'default',
      mode: 'light',
      density: 'comfortable',
      cornerStyle: 'soft'
    });

    service.setPalette('forest');
    service.toggleMode();
    service.setDensity('compact');
    service.setCornerStyle('square');

    expect(storage.store).toHaveBeenLastCalledWith('v1Appearance', {
      palette: 'forest',
      mode: 'dark',
      density: 'compact',
      cornerStyle: 'square'
    });
  });
});

function createStorage(stored: unknown) {
  return {
    retrieve: vi.fn(() => stored),
    store: vi.fn()
  };
}
