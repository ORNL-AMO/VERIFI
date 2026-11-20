import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

export type WorkspacePanel = 'navigation' | 'support';
export type PanelWidths = Readonly<Record<WorkspacePanel, number>>;
export interface WorkspaceGeometry {
  readonly width: number;
  readonly rail: number;
  readonly rem: number;
  readonly viewport: number;
  readonly supportOpen: boolean;
}

const STORAGE_KEY = 'v1WorkspaceLayout';
const DEFAULT_WIDTHS: PanelWidths = { navigation: 17, support: 22 };
const MIN_WIDTHS: PanelWidths = { navigation: 14, support: 18 };
const MAX_WIDTHS: PanelWidths = { navigation: 26, support: 36 };

/** Device preferences are in rem; measured and interactive widths are in CSS pixels. */
@Injectable({ providedIn: 'root' })
export class WorkspaceLayoutService {
  private readonly storage = inject(LocalStorageService);
  private readonly preferred = signal<PanelWidths>(this.readPreferences());
  private readonly geometry = signal<WorkspaceGeometry>({ width: 0, rail: 0, rem: 16, viewport: 0, supportOpen: true });
  // Retain the other panel's rendered width after an edit until the available space changes.
  private readonly placement = signal<PanelWidths | undefined>(undefined);
  private gesture?: { panel: WorkspacePanel; before: PanelWidths | undefined };
  private readonly resizingState = signal(false);
  private readonly navigationCollapsed = signal(false);
  readonly resizing = this.resizingState.asReadonly();
  readonly preferredWidths = this.preferred.asReadonly();
  readonly widths = computed(() => this.placement() ?? this.fit());
  readonly navigationBounds = computed(() => this.bounds('navigation'));
  readonly supportBounds = computed(() => this.bounds('support'));

  setSupportOpen(supportOpen: boolean): void { this.updateGeometry({ ...this.geometry(), supportOpen }); }

  updateGeometry(next: WorkspaceGeometry): void {
    const previous = this.geometry();
    if (Object.keys(next).every(key => next[key as keyof WorkspaceGeometry] === previous[key as keyof WorkspaceGeometry])) return;
    this.cancel();
    this.placement.set(undefined);
    this.geometry.set(next);
  }

  begin(panel: WorkspacePanel): void {
    this.cancel();
    if (!this.bounds(panel).enabled) return;
    this.gesture = { panel, before: this.placement() };
    this.resizingState.set(true);
  }

  preview(panel: WorkspacePanel, width: number): void {
    if (this.gesture?.panel !== panel || !Number.isFinite(width)) return;
    const { expandedMin, max } = this.bounds(panel);
    const snapped = width < expandedMin / 2 ? 0 : clamp(width, expandedMin, max);
    this.placement.set({ ...this.widths(), [panel]: snapped });
  }

  /** Returns true when the committed gesture closes the panel. */
  commit(panel: WorkspacePanel): boolean {
    if (this.gesture?.panel !== panel) return false;
    const changed = this.placement() !== this.gesture.before;
    const width = this.widths()[panel];
    this.gesture = undefined;
    this.resizingState.set(false);
    if (!changed) return false;
    if (panel === 'navigation') this.navigationCollapsed.set(width === 0);
    // A closed panel retains its last expanded preference for reopening.
    if (width === 0) return true;
    this.save({ ...this.preferred(), [panel]: width / this.geometry().rem });
    return false;
  }

  cancel(): void {
    if (!this.gesture) return;
    this.placement.set(this.gesture.before);
    this.gesture = undefined;
    this.resizingState.set(false);
  }

  setWidth(panel: WorkspacePanel, width: number): boolean {
    this.begin(panel);
    this.preview(panel, width);
    return this.commit(panel);
  }

  reset(panel: WorkspacePanel): void {
    this.cancel();
    if (panel === 'navigation') this.navigationCollapsed.set(false);
    this.placement.set(undefined);
    this.save({ ...this.preferred(), [panel]: DEFAULT_WIDTHS[panel] });
  }

  private bounds(panel: WorkspacePanel): { min: number; expandedMin: number; reopenWidth: number; max: number; enabled: boolean } {
    const g = this.geometry(), widths = this.widths();
    const docked = g.viewport > 1160 && g.supportOpen;
    const other = panel === 'navigation' ? (docked ? widths.support : 0) : widths.navigation;
    const navigationMinimum = panel === 'navigation' || !this.navigationCollapsed() ? MIN_WIDTHS.navigation : 0;
    const minimums = (navigationMinimum + (docked ? MIN_WIDTHS.support : 0)) * g.rem;
    const main = Math.min(24 * g.rem, Math.max(0, g.width - g.rail - minimums));
    const available = Math.max(0, g.width - g.rail - other - main);
    const expandedMin = Math.min(MIN_WIDTHS[panel] * g.rem, available);
    const max = Math.max(expandedMin, Math.min(MAX_WIDTHS[panel] * g.rem, available));
    return {
      min: 0, expandedMin, max,
      reopenWidth: clamp(this.preferred()[panel] * g.rem, expandedMin, max),
      enabled: g.width > 0 && (panel === 'navigation' ? g.viewport > 820 : docked)
    };
  }

  private fit(): PanelWidths {
    const g = this.geometry(), preferred = this.preferred();
    const desired = { navigation: preferred.navigation * g.rem, support: preferred.support * g.rem };
    if (!g.width || g.viewport <= 820) return desired;
    if (this.navigationCollapsed()) desired.navigation = 0;
    const support = g.viewport > 1160 && g.supportOpen;
    const available = Math.max(0, g.width - g.rail);
    const navMin = this.navigationCollapsed() ? 0 : MIN_WIDTHS.navigation * g.rem, supportMin = support ? MIN_WIDTHS.support * g.rem : 0;
    const minimum = navMin + supportMin;
    if (available < minimum) return { navigation: available * navMin / minimum, support: support ? available * supportMin / minimum : desired.support };
    const extra = desired.navigation - navMin + (support ? desired.support - supportMin : 0);
    const budget = Math.max(minimum, available - 24 * g.rem);
    const ratio = extra > 0 ? Math.min(1, (budget - minimum) / extra) : 1;
    return {
      navigation: navMin + (desired.navigation - navMin) * ratio,
      support: support ? supportMin + (desired.support - supportMin) * ratio : desired.support
    };
  }

  private readPreferences(): PanelWidths {
    try {
      const stored: unknown = this.storage.retrieve(STORAGE_KEY);
      if (!stored || typeof stored !== 'object' || !('version' in stored) || stored.version !== 1) return DEFAULT_WIDTHS;
      const value = stored as { navigation?: unknown; support?: unknown };
      return { navigation: normalize(value.navigation, 'navigation'), support: normalize(value.support, 'support') };
    } catch { return DEFAULT_WIDTHS; }
  }

  private save(widths: PanelWidths): void {
    const normalized = { navigation: normalize(widths.navigation, 'navigation'), support: normalize(widths.support, 'support') };
    this.preferred.set(normalized);
    try { this.storage.store(STORAGE_KEY, { version: 1, ...normalized }); } catch { /* Layout remains usable without device storage. */ }
  }
}

function normalize(value: unknown, panel: WorkspacePanel): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, MIN_WIDTHS[panel], MAX_WIDTHS[panel]) : DEFAULT_WIDTHS[panel];
}
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
