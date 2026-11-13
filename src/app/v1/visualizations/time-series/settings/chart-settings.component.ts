import { Component, DestroyRef, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationDefinition, VisualizationSeries, VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import type { ResolvedVisualizationSeries } from '@domain/visualizations/visualization-source-provider';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';

export interface ChartSettingsContext {
  readonly definition: VisualizationDefinition;
  readonly disabled: boolean;
  readonly changed: (definition: VisualizationDefinition) => void;
  readonly resolvedSeries?: readonly ResolvedVisualizationSeries[];
  /** Optional immutable saved identity resets controls between routed visualizations. */
  readonly identity?: string;
}
type SeriesForm = FormGroup<{
  label: FormControl<string>; axis: FormControl<'left' | 'right'>; visible: FormControl<boolean>;
  customColor: FormControl<boolean>; color: FormControl<string>; lineStyle: FormControl<'solid' | 'dashed' | 'dotted'>;
}>;
interface SeriesEditorRow {
  readonly key: string;
  readonly selectedId: string;
  readonly resourceGuid?: string;
  readonly seriesId?: string;
  readonly label: string;
  readonly unit: string;
  readonly form: SeriesForm;
}

@Component({ selector: 'app-visualization-chart-settings', standalone: false,
  templateUrl: './chart-settings.component.html', styleUrls: ['./chart-settings.component.css'] })
export class ChartSettingsComponent implements OnChanges {
  @Input({ required: true }) context!: ChartSettingsContext;
  private readonly destroy = inject(DestroyRef);
  private identity = '';
  private readonly subscriptions = new Map<string, { unsubscribe(): void }>();
  readonly rows = signal<readonly SeriesEditorRow[]>([]);
  readonly chartForm = new FormGroup({
    type: new FormControl<'line' | 'bar' | 'unsupported'>('line', { nonNullable: true }),
    interval: new FormControl<'monthly' | 'yearly' | 'native'>('monthly', { nonNullable: true })
  });
  readonly hasDiscovery = signal(false);
  readonly noSeries = computed(() => !this.rows().length);

  constructor() {
    this.chartForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.context || this.context.disabled) return;
      const { type, interval } = this.chartForm.getRawValue();
      if (type === 'unsupported') return;
      this.context.changed({ ...this.context.definition, chart: { kind: 'time-series', type, interval, stack: 'none' } });
    });
    this.destroy.onDestroy(() => { for (const subscription of this.subscriptions.values()) subscription.unsubscribe(); });
  }

  ngOnChanges(): void {
    if (!this.context) return;
    const definition = this.context.definition, chart = definition.chart;
    const identity = this.context.identity ?? `${definition.accountGuid}:${definition.sources.map(source => source.id).join(',')}`;
    const sameIdentity = this.identity === identity;
    this.identity = identity;
    this.chartForm.setValue({ type: chart?.kind === 'time-series' && ['line', 'bar'].includes(chart.type) ? chart.type as 'line' | 'bar' : 'unsupported',
      interval: chart?.kind === 'time-series' ? chart.interval : 'monthly' }, { emitEvent: false });
    this.context.disabled ? this.chartForm.disable({ emitEvent: false }) : this.chartForm.enable({ emitEvent: false });
    const metadata = this.context.resolvedSeries ?? [];
    this.hasDiscovery.set(metadata.length > 0);
    const effective = resolveVisualizationSeries(definition, metadata, true);
    const candidates = metadata.length ? effective.map(item => ({ key: item.metadata.id, selected: item.selected, metadata: item.metadata }))
      : definition.series.map(selected => ({ key: selected.id, selected, metadata: undefined }));
    const previous = sameIdentity ? new Map(this.rows().map(row => [row.key, row])) : new Map<string, SeriesEditorRow>();
    const rows = candidates.map(item => {
      const selected = item.selected, metadata = item.metadata;
      const values = { label: selected.label ?? '', axis: selected.axis, visible: selected.visible !== false,
        customColor: !!selected.color && /^#[\da-f]{6}$/i.test(selected.color), color: selected.color && /^#[\da-f]{6}$/i.test(selected.color) ? selected.color : '#f26a21',
        lineStyle: selected.lineStyle ?? 'solid' as const };
      const old = previous.get(item.key);
      const form = old?.form ?? new FormGroup({
        label: new FormControl(values.label, { nonNullable: true }), axis: new FormControl<'left' | 'right'>(values.axis, { nonNullable: true }),
        visible: new FormControl(values.visible, { nonNullable: true }), customColor: new FormControl(values.customColor, { nonNullable: true }),
        color: new FormControl(values.color, { nonNullable: true }), lineStyle: new FormControl<'solid' | 'dashed' | 'dotted'>(values.lineStyle, { nonNullable: true })
      });
      form.setValue(values, { emitEvent: false });
      this.context.disabled ? form.disable({ emitEvent: false }) : form.enable({ emitEvent: false });
      const resourceGuid = metadata?.resourceGuid ?? selected.resourceGuid;
      const row: SeriesEditorRow = { key: item.key, selectedId: selected.id, ...(resourceGuid ? { resourceGuid } : metadata ? { seriesId: metadata.id } : {}),
        label: metadata?.label ?? selected.label ?? selected.metric, unit: metadata?.unit ?? '', form };
      if (!old) {
        this.subscriptions.get(item.key)?.unsubscribe();
        this.subscriptions.set(item.key, form.valueChanges.subscribe(() => this.editSeries(item.key)));
      }
      return row;
    });
    const keys = new Set(rows.map(row => row.key));
    for (const [key, subscription] of this.subscriptions) if (!keys.has(key)) { subscription.unsubscribe(); this.subscriptions.delete(key); }
    this.rows.set(rows);
  }

  private editSeries(key: string): void {
    if (!this.context || this.context.disabled) return;
    const row = this.rows().find(item => item.key === key);
    if (!row) return;
    const value = row.form.getRawValue(), definition = this.context.definition;
    const original = definition.series.find(series => series.id === row.selectedId);
    if (!original) return;
    const effective = resolveVisualizationSeries(definition, this.context.resolvedSeries ?? [], true).find(item => item.metadata.id === row.key)?.selected ?? original;
    const customChanged = row.form.controls.customColor.dirty;
    const appearance = { ...(value.label.trim() ? { label: value.label.trim() } : {}), axis: value.axis, visible: value.visible,
      ...(row.form.controls.lineStyle.dirty || effective.lineStyle ? { lineStyle: row.form.controls.lineStyle.dirty ? value.lineStyle : effective.lineStyle } : {}),
      ...(value.customColor ? { color: value.color } : !customChanged && effective.color ? { color: effective.color } : {}) };
    const next = definition.series.map(series => {
      if (series.id !== row.selectedId) return series;
      const target = overrideTarget(row);
      if (!series.resourceGuid && target) {
        const overrides = [...(series.overrides ?? [])], index = overrides.findIndex(item => overrideKey(item) === overrideKey(target) && (item.accountGuid ?? definition.accountGuid) === definition.accountGuid);
        const order = index >= 0 ? overrides[index].order : undefined;
        const override: VisualizationSeriesOverride = { ...target, accountGuid: definition.accountGuid, ...(order !== undefined ? { order } : {}), ...appearance };
        if (index < 0) overrides.push(override); else overrides[index] = override;
        return { ...series, overrides };
      }
      const { label: _label, color: _color, lineStyle: _lineStyle, ...base } = series;
      return { ...base, ...appearance };
    });
    this.context.changed({ ...definition, series: next });
  }

  move(key: string, direction: -1 | 1): void {
    if (!this.context || this.context.disabled) return;
    const rows = [...this.rows()], index = rows.findIndex(row => row.key === key), target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;
    if (rows[index].selectedId !== rows[target].selectedId) {
      const series = [...this.context.definition.series];
      const left = series.findIndex(item => item.id === rows[index].selectedId), right = series.findIndex(item => item.id === rows[target].selectedId);
      [series[left], series[right]] = [series[right], series[left]];
      this.context.changed({ ...this.context.definition, series });
      return;
    }
    [rows[index], rows[target]] = [rows[target], rows[index]];
    const definition = this.context.definition;
    const series = definition.series.map(selected => {
      if (selected.resourceGuid) return selected;
      const targets = rows.filter(row => row.selectedId === selected.id).flatMap(row => { const target = overrideTarget(row); return target ? [target] : []; });
      if (!targets.length) return selected;
      const existing = selected.overrides ?? [];
      const keys = new Set(targets.map(overrideKey));
      const overrides = targets.map((target, order) => ({ ...(existing.find(item => overrideKey(item) === overrideKey(target) && (item.accountGuid ?? definition.accountGuid) === definition.accountGuid)
        ?? { ...target, accountGuid: definition.accountGuid }), order }));
      const dormant = existing.filter(item => !keys.has(overrideKey(item)) || (item.accountGuid ?? definition.accountGuid) !== definition.accountGuid);
      // A move orders the current members first. Retain dormant appearance and its relative
      // explicit order after them, without creating ranks for appearance-only/foreign entries.
      const orderedDormant = dormant.filter(item => (item.accountGuid ?? definition.accountGuid) === definition.accountGuid && item.order !== undefined)
        .sort((left, right) => left.order! - right.order!);
      const retained = dormant.map(item => {
        const rank = orderedDormant.indexOf(item);
        return rank < 0 ? item : { ...item, order: targets.length + rank };
      });
      return { ...selected, overrides: [...overrides, ...retained] };
    });
    this.context.changed({ ...definition, series });
  }
}

type OverrideTarget = { readonly resourceGuid: string; readonly seriesId?: never } | { readonly seriesId: string; readonly resourceGuid?: never };
function overrideTarget(row: SeriesEditorRow): OverrideTarget | undefined {
  return row.resourceGuid ? { resourceGuid: row.resourceGuid } : row.seriesId ? { seriesId: row.seriesId } : undefined;
}
function overrideKey(target: OverrideTarget): string { return target.resourceGuid !== undefined ? `resource:${target.resourceGuid}` : `series:${target.seriesId}`; }
