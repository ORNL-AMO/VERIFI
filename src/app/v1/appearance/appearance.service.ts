import { computed, Injectable, signal } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

const STORAGE_KEY = 'v1Appearance';

export type Palette = 'default' | 'steel' | 'blueprint' | 'forest';
export type ThemeMode = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type CornerStyle = 'soft' | 'square';

export interface AppearanceSettings {
  readonly palette: Palette;
  readonly mode: ThemeMode;
  readonly density: Density;
  readonly cornerStyle: CornerStyle;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  palette: 'default',
  mode: 'light',
  density: 'comfortable',
  cornerStyle: 'soft'
};

const VALID_PALETTES: ReadonlyArray<Palette> = ['default', 'steel', 'blueprint', 'forest'];
const VALID_MODES: ReadonlyArray<ThemeMode> = ['light', 'dark'];
const VALID_DENSITIES: ReadonlyArray<Density> = ['comfortable', 'compact'];
const VALID_CORNER_STYLES: ReadonlyArray<CornerStyle> = ['soft', 'square'];

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private readonly writableSettings = signal<AppearanceSettings>(DEFAULT_APPEARANCE);

  readonly settings = this.writableSettings.asReadonly();
  readonly isDark = computed(() => this.settings().mode === 'dark');
  readonly isCompact = computed(() => this.settings().density === 'compact');
  readonly hasSquareCorners = computed(() => this.settings().cornerStyle === 'square');

  constructor(private localStorage: LocalStorageService) {
    this.writableSettings.set(readStoredAppearance(this.localStorage.retrieve(STORAGE_KEY)));
  }

  setPalette(palette: Palette): void {
    this.update({ palette });
  }

  setMode(mode: ThemeMode): void {
    this.update({ mode });
  }

  toggleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  setDensity(density: Density): void {
    this.update({ density });
  }

  setCornerStyle(cornerStyle: CornerStyle): void {
    this.update({ cornerStyle });
  }

  reset(): void {
    this.writableSettings.set(DEFAULT_APPEARANCE);
    this.localStorage.store(STORAGE_KEY, DEFAULT_APPEARANCE);
  }

  private update(patch: Partial<AppearanceSettings>): void {
    const next = normalizeAppearance({ ...this.settings(), ...patch });
    this.writableSettings.set(next);
    this.localStorage.store(STORAGE_KEY, next);
  }
}

function readStoredAppearance(stored: unknown): AppearanceSettings {
  return normalizeAppearance(isRecord(stored) ? stored : {});
}

function normalizeAppearance(value: Partial<AppearanceSettings>): AppearanceSettings {
  return {
    palette: isValid(value.palette, VALID_PALETTES) ? value.palette : DEFAULT_APPEARANCE.palette,
    mode: isValid(value.mode, VALID_MODES) ? value.mode : DEFAULT_APPEARANCE.mode,
    density: isValid(value.density, VALID_DENSITIES) ? value.density : DEFAULT_APPEARANCE.density,
    cornerStyle: isValid(value.cornerStyle, VALID_CORNER_STYLES)
      ? value.cornerStyle
      : DEFAULT_APPEARANCE.cornerStyle
  };
}

function isValid<T extends string>(value: unknown, allowed: ReadonlyArray<T>): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function isRecord(value: unknown): value is Partial<AppearanceSettings> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
