import { Component, computed, input, output, viewChild } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceBottomSheetComponent } from '@app/v1/shared/workspace-bottom-sheet/workspace-bottom-sheet.component';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { InventoryChartView, InventoryChartSheetView, DEFAULT_INVENTORY_CHART_VIEW } from './inventory-chart-sheet.models';

@Component({ selector: 'app-inventory-chart-sheet', standalone: true,
  imports: [IconComponent, WorkspaceBottomSheetComponent, MeterResultsChartComponent],
  templateUrl: './inventory-chart-sheet.component.html', styleUrls: ['./inventory-chart-sheet.component.css'] })
export class InventoryChartSheetComponent {
  readonly charts = input.required<readonly InventoryChartView[]>();
  readonly facilityName = input.required<string>();
  readonly resource = input<'meters' | 'predictors'>('meters');
  readonly singular = computed(() => this.resource() === 'meters' ? 'meter' : 'predictor');
  readonly smoothLines = input(true);
  readonly showPointSymbols = input(false);
  readonly scrollableTabs = input(false);
  readonly showTraceControls = input(true);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly view = input<InventoryChartSheetView>(DEFAULT_INVENTORY_CHART_VIEW);
  readonly zoomRange = input<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly closed = output<void>();
  private readonly sheet = viewChild(WorkspaceBottomSheetComponent);
  readonly closing = computed(() => this.sheet()?.closing() ?? false);
  requestClose(): void { this.sheet()?.requestClose(); }
  readonly viewChanged = output<InventoryChartSheetView>();
  readonly zoomChanged = output<V1EChartsDataZoomRange>();
  private readonly renderer = viewChild(MeterResultsChartComponent);
  readonly activeChart = computed(() => this.charts().find(chart => chart.id === this.view().metric) ?? this.charts()[0]);
  readonly visibleMetrics = computed(() => this.activeChart()?.metrics.filter(metric => !this.showTraceControls() || !this.view().hiddenGuids.includes(metric.id)) ?? []);
  readonly legendPages = computed(() => Math.max(1, Math.ceil((this.activeChart()?.metrics.length ?? 0) / 8)));
  readonly legendPage = computed(() => Math.min(this.view().legendPage, this.legendPages() - 1));
  readonly legendEntries = computed(() => this.activeChart()?.metrics.slice(this.legendPage() * 8, (this.legendPage() + 1) * 8).map(metric => ({
    ...metric, visible: !this.view().hiddenGuids.includes(metric.id), dash: Array.isArray(metric.lineStyle) ? metric.lineStyle.join(' ') : null
  })) ?? []);
  updateView(patch: Partial<InventoryChartSheetView>): void { this.viewChanged.emit({ ...this.view(), ...patch }); }
  chooseMetric(metric: string): void {
    const changed = metric !== this.activeChart()?.id;
    this.updateView({ metric, legendPage: 0 });
    if (changed && this.scrollableTabs()) this.zoomChanged.emit({ start: 0, end: 100 });
  }
  tabKey(event: KeyboardEvent, id: string): void {
    if (!this.scrollableTabs()) return;
    const charts = this.charts(), index = charts.findIndex(chart => chart.id === id);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? charts.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % charts.length
        : event.key === 'ArrowLeft' ? (index + charts.length - 1) % charts.length : undefined;
    if (next === undefined) return;
    event.preventDefault(); this.chooseMetric(charts[next].id);
    const button = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('button')[next];
    button?.focus(); button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  toggleTrace(guid: string): void {
    const hidden = new Set(this.view().hiddenGuids);
    if (hidden.has(guid)) hidden.delete(guid); else hidden.add(guid);
    this.updateView({ hiddenGuids: [...hidden] });
  }
  zoom(factor: number): void {
    const current = this.zoomRange(), width = Math.max(10, Math.min(100, (current.end - current.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (current.start + current.end - width) / 2));
    this.zoomChanged.emit({ start, end: start + width });
  }
  download(): void { this.renderer()?.downloadPng(); }
}
