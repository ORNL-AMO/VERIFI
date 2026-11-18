import { Component, DestroyRef, Input, OnChanges, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, AbstractControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VisualizationChart, VisualizationDefinition, VisualizationSeriesSelector } from '@domain/visualizations/visualization-definition';
import { isExplorationChart } from '@domain/visualizations/visualization-interval';
import type { VisualizationDecisionItem } from '../../decisions/decision-types';

const selectorKey = (selector: VisualizationSeriesSelector) => JSON.stringify([selector.sourceId, selector.resourceGuid !== undefined ? 'resource' : 'series', selector.resourceGuid ?? selector.seriesId]);

@Component({ selector: 'app-exploration-settings', standalone: false, templateUrl: './exploration-settings.component.html', styleUrls: ['./exploration-settings.component.css'] })
export class ExplorationSettingsComponent implements OnChanges {
  private readonly destroy = inject(DestroyRef);
  @Input({ required: true }) definition!: VisualizationDefinition;
  @Input() items: readonly VisualizationDecisionItem[] = [];
  @Input() disabled = false;
  readonly requested = output<VisualizationChart>();
  readonly kind = signal('');
  readonly missingX = signal(false); readonly missingY = signal(false);
  readonly choices = signal<readonly { key: string; label: string; selector: VisualizationSeriesSelector; declarationId: string }[]>([]);
  readonly form = new FormGroup({
    interval: new FormControl<'monthly' | 'yearly'>('monthly', { nonNullable: true }),
    view: new FormControl<'pairs' | 'matrix'>('pairs', { nonNullable: true }),
    statistic: new FormControl<'r' | 'r-squared'>('r', { nonNullable: true }),
    grouping: new FormControl<'none' | 'year' | 'month'>('none', { nonNullable: true }),
    scale: new FormControl<'raw' | 'z-score'>('raw', { nonNullable: true }),
    showFit: new FormControl(true, { nonNullable: true }),
    dimension: new FormControl<'month-year' | 'series-period'>('month-year', { nonNullable: true }),
    colorScale: new FormControl<'linear' | 'diverging'>('linear', { nonNullable: true }),
    normalization: new FormControl<'raw' | 'z-score'>('raw', { nonNullable: true }),
    x: new FormControl('', { nonNullable: true }), y: new FormControl('', { nonNullable: true })
  });
  constructor() {
    for (const field of ['interval', 'view', 'statistic', 'grouping', 'scale', 'showFit', 'dimension'] as const)
      (this.form.controls[field] as AbstractControl).valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(value => this.patch({ [field]: value }));
    this.form.controls.colorScale.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(scale => this.patch({ scale }));
    this.form.controls.normalization.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(normalization => this.patch({ normalization, scale: normalization === 'z-score' ? 'diverging' : 'linear' }));
    for (const axis of ['x', 'y'] as const) this.form.controls[axis].valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(key => {
      const choice = this.choices().find(choice => choice.key === key); if (choice) this.patch({ [axis]: choice.selector });
    });
  }
  ngOnChanges(): void {
    const chart = this.definition.chart; if (!isExplorationChart(chart)) return;
    this.kind.set(chart.kind);
    const choices = this.items.filter(item => item.appearance.visible).map(item => {
      const selector = { sourceId: item.sourceId, ...item.identity } as VisualizationSeriesSelector;
      return { key: selectorKey(selector), label: `${item.label}${item.unit ? ' (' + item.unit + ')' : ''}${item.detail ? ' · ' + item.detail : ''}`, selector, declarationId: item.selectedId };
    });
    this.choices.set(choices);
    const axisKey = (axis: 'x' | 'y') => {
      if (chart.kind !== 'scatter') return '';
      const selector = chart[axis];
      if (selector) return selectorKey(selector);
      const matches = choices.filter(choice => choice.declarationId === (axis === 'x' ? chart.xSeriesId : chart.ySeriesId));
      return matches.length === 1 ? matches[0].key : '';
    };
    this.form.patchValue({ interval: chart.interval ?? 'monthly', view: chart.kind === 'correlation' ? chart.view ?? 'pairs' : 'pairs', statistic: chart.kind === 'correlation' ? chart.statistic : 'r',
      grouping: chart.kind !== 'heatmap' ? chart.grouping ?? 'none' : 'none', scale: chart.kind !== 'heatmap' ? chart.scale ?? 'raw' : 'raw', showFit: chart.kind !== 'heatmap' ? chart.showFit ?? true : true,
      dimension: chart.kind === 'heatmap' ? chart.dimension : 'month-year', colorScale: chart.kind === 'heatmap' ? chart.scale : 'linear', normalization: chart.kind === 'heatmap' ? chart.normalization ?? 'raw' : 'raw', x: axisKey('x'), y: axisKey('y') }, { emitEvent: false });
    this.missingX.set(!!this.form.controls.x.value && !choices.some(choice => choice.key === this.form.controls.x.value));
    this.missingY.set(!!this.form.controls.y.value && !choices.some(choice => choice.key === this.form.controls.y.value));
    this.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
  private patch(change: Record<string, unknown>): void {
    const chart = this.definition.chart; if (this.disabled || !isExplorationChart(chart)) return;
    const next = { ...chart, ...change } as VisualizationChart;
    if (JSON.stringify(next) !== JSON.stringify(chart)) this.requested.emit(next);
  }
}
