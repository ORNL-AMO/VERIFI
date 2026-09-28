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
      backgroundPattern: 'skyline-rocket'
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
      backgroundPattern: 'skyline-rocket'
    });
  });

  it('preserves legacy generated backgrounds and new skyline selections', () => {
    const legacyService = new AppearanceService(createStorage({ backgroundPattern: 'blueprint-grid' }) as any);
    const nightService = new AppearanceService(createStorage({ backgroundPattern: 'skyline-rocket-night' }) as any);

    expect(legacyService.settings().backgroundPattern).toBe('blueprint-grid');
    expect(nightService.settings().backgroundPattern).toBe('skyline-rocket-night');
  });

  it('updates the matched background pattern when the palette changes', () => {
    const storage = createStorage({});
    const service = new AppearanceService(storage as any);

    service.setPalette('neon');
    expect(service.settings().backgroundPattern).toBe('skyline-neon');

    service.setPalette('aurora');
    expect(service.settings().backgroundPattern).toBe('skyline-aurora');

    service.setPalette('steel');
    expect(service.settings().backgroundPattern).toBe('skyline-steel');

    service.setPalette('blueprint');
    expect(service.settings().backgroundPattern).toBe('skyline-blueprint');

    service.setPalette('forest');
    expect(service.settings().backgroundPattern).toBe('skyline-green');

    service.setPalette('default');
    expect(service.settings().backgroundPattern).toBe('skyline-rocket');
  });

  it('resets every appearance setting to the skyline background default', () => {
    const storage = createStorage({
      palette: 'forest',
      mode: 'dark',
      cornerStyle: 'square',
      highContrast: true,
      backgroundPattern: 'topographic-contours'
    });
    const service = new AppearanceService(storage as any);

    service.reset();

    expect(service.settings().backgroundPattern).toBe('skyline-rocket');
    expect(storage.store).toHaveBeenLastCalledWith('v1Appearance', {
      palette: 'default',
      mode: 'light',
      cornerStyle: 'soft',
      highContrast: false,
      backgroundPattern: 'skyline-rocket'
    });
  });
});

function createStorage(stored: unknown) {
  return {
    retrieve: vi.fn(() => stored),
    store: vi.fn()
  };
}
