import { computed, Injectable, signal } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

const STORAGE_KEY = 'v1Appearance';

export type Palette = 'default' | 'steel' | 'blueprint' | 'neon' | 'aurora' | 'forest';
export type ThemeMode = 'light' | 'dark';
export type CornerStyle = 'soft' | 'square';
export type BackgroundPattern = 'blueprint-grid' | 'steel-hatch' | 'neon-grid' | 'aurora-flow' | 'topographic-contours';

export interface AppearanceSettings {
  readonly palette: Palette;
  readonly mode: ThemeMode;
  readonly cornerStyle: CornerStyle;
  readonly highContrast: boolean;
  readonly backgroundPattern: BackgroundPattern;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  palette: 'default',
  mode: 'light',
  cornerStyle: 'soft',
  highContrast: false,
  backgroundPattern: 'blueprint-grid'
};

const VALID_PALETTES: ReadonlyArray<Palette> = ['default', 'steel', 'blueprint', 'neon', 'aurora', 'forest'];
const VALID_MODES: ReadonlyArray<ThemeMode> = ['light', 'dark'];
const VALID_CORNER_STYLES: ReadonlyArray<CornerStyle> = ['soft', 'square'];
const VALID_BACKGROUND_PATTERNS: ReadonlyArray<BackgroundPattern> = [
  'blueprint-grid',
  'steel-hatch',
  'neon-grid',
  'aurora-flow',
  'topographic-contours'
];
const PALETTE_BACKGROUND_PATTERNS: Readonly<Record<Palette, BackgroundPattern>> = {
  default: 'blueprint-grid',
  steel: 'steel-hatch',
  blueprint: 'blueprint-grid',
  neon: 'neon-grid',
  aurora: 'aurora-flow',
  forest: 'topographic-contours'
};

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private readonly writableSettings = signal<AppearanceSettings>(DEFAULT_APPEARANCE);

  readonly settings = this.writableSettings.asReadonly();
  readonly isDark = computed(() => this.settings().mode === 'dark');
  readonly hasSquareCorners = computed(() => this.settings().cornerStyle === 'square');
  readonly isHighContrast = computed(() => this.settings().highContrast);

  constructor(private localStorage: LocalStorageService) {
    this.writableSettings.set(readStoredAppearance(this.localStorage.retrieve(STORAGE_KEY)));
  }

  setPalette(palette: Palette): void {
    this.update({ palette, backgroundPattern: PALETTE_BACKGROUND_PATTERNS[palette] });
  }

  setMode(mode: ThemeMode): void {
    this.update({ mode });
  }

  toggleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  setCornerStyle(cornerStyle: CornerStyle): void {
    this.update({ cornerStyle });
  }

  setHighContrast(highContrast: boolean): void {
    this.update({ highContrast });
  }

  toggleHighContrast(): void {
    this.setHighContrast(!this.isHighContrast());
  }

  setBackgroundPattern(backgroundPattern: BackgroundPattern): void {
    this.update({ backgroundPattern });
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
    cornerStyle: isValid(value.cornerStyle, VALID_CORNER_STYLES)
      ? value.cornerStyle
      : DEFAULT_APPEARANCE.cornerStyle,
    highContrast: typeof value.highContrast === 'boolean' ? value.highContrast : DEFAULT_APPEARANCE.highContrast,
    backgroundPattern: isValid(value.backgroundPattern, VALID_BACKGROUND_PATTERNS)
      ? value.backgroundPattern
      : DEFAULT_APPEARANCE.backgroundPattern
  };
}

function isValid<T extends string>(value: unknown, allowed: ReadonlyArray<T>): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function isRecord(value: unknown): value is Partial<AppearanceSettings> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
