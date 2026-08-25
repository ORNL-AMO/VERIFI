import { vi } from 'vitest';
import { AppearanceService } from './appearance.service';

describe('AppearanceService', () => {
  it('loads valid stored appearance settings', () => {
    const storage = createStorage({
      palette: 'aurora',
      mode: 'dark',
      cornerStyle: 'square',
      highContrast: true,
      backgroundPattern: 'aurora-flow'
    });

    const service = new AppearanceService(storage as any);

    expect(service.settings()).toEqual({
      palette: 'aurora',
      mode: 'dark',
      cornerStyle: 'square',
      highContrast: true,
      backgroundPattern: 'aurora-flow'
    });
    expect(service.isDark()).toBe(true);
    expect(service.hasSquareCorners()).toBe(true);
    expect(service.isHighContrast()).toBe(true);
  });

  it('normalizes invalid stored appearance settings and persists updates', () => {
    const storage = createStorage({
      palette: 'ocean',
      mode: 'system',
      cornerStyle: 'round',
      highContrast: 'yes',
      backgroundPattern: 'signal-rings'
    });
    const service = new AppearanceService(storage as any);

    expect(service.settings()).toEqual({
      palette: 'default',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'blueprint-grid'
    });

    service.setPalette('forest');
    service.toggleMode();
    service.setCornerStyle('square');
    service.toggleHighContrast();
    service.setBackgroundPattern('topographic-contours');

    expect(storage.store).toHaveBeenLastCalledWith('v1Appearance', {
      palette: 'forest',
      mode: 'dark',
      cornerStyle: 'square',
      highContrast: true,
      backgroundPattern: 'topographic-contours'
    });
  });

  it('loads older stored appearance objects with new defaults', () => {
    const storage = createStorage({
      palette: 'steel',
      mode: 'light',
      cornerStyle: 'soft'
    });

    const service = new AppearanceService(storage as any);

    expect(service.settings()).toEqual({
      palette: 'steel',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'blueprint-grid'
    });
  });

  it('updates the matched background pattern when the palette changes', () => {
    const storage = createStorage({});
    const service = new AppearanceService(storage as any);

    service.setPalette('neon');
    expect(service.settings().backgroundPattern).toBe('neon-grid');

    service.setPalette('aurora');
    expect(service.settings().backgroundPattern).toBe('aurora-flow');

    service.setPalette('steel');
    expect(service.settings().backgroundPattern).toBe('steel-hatch');
  });
});

function createStorage(stored: unknown) {
  return {
    retrieve: vi.fn(() => stored),
    store: vi.fn()
  };
}
