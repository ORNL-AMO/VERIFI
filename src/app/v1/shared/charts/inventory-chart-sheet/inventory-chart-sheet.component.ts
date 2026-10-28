import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceBottomSheetComponent } from '@app/v1/shared/workspace-bottom-sheet/workspace-bottom-sheet.component';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { InventoryChartView, InventoryChartSheetView, DEFAULT_INVENTORY_CHART_VIEW } from './inventory-chart-sheet.models';
import { ChartTracePanelComponent } from '../chart-trace-panel/chart-trace-panel.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';

@Component({ selector: 'app-inventory-chart-sheet', standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, IconComponent, WorkspaceBottomSheetComponent, MeterResultsChartComponent, ChartTracePanelComponent, ModalFocusTrapDirective],
  templateUrl: './inventory-chart-sheet.component.html', styleUrls: ['./inventory-chart-sheet.component.css'] })
export class InventoryChartSheetComponent {
  private readonly injector = inject(Injector);
  readonly traceBrowser = input(false);
  readonly singleTrace = input(false);
  readonly traceChoices = computed(() => this.singleTrace() ? this.charts().flatMap(chart => chart.metrics) : this.activeChart()?.metrics ?? []);
  readonly traceHiddenGuids = computed(() => this.singleTrace() ? this.traceChoices().filter(trace => trace.id !== this.activeChart()?.id).map(trace => trace.id) : this.view().hiddenGuids);
  readonly narrowTracePanel = toSignal(inject(BreakpointObserver).observe('(max-width: 52rem)').pipe(map(state => state.matches)), { initialValue: false });
  readonly tracePanelOpen = computed(() => this.view().tracePanelOpen ?? !this.narrowTracePanel());
  readonly traceVisibleCount = computed(() => this.traceChoices().filter(metric => !this.traceHiddenGuids().includes(metric.id)).length);
  readonly highlightedTrace = signal<string | undefined>(undefined);
  private readonly traceToggle = viewChild<ElementRef<HTMLButtonElement>>('traceToggle');
  readonly modal = input(true);
  readonly showHeader = input(true);
  readonly showSeriesSearch = input(true);
  readonly contextKey = input('');
  readonly searchableCharts = input(false);
  readonly chartSearch = new FormControl('', { nonNullable: true });
  readonly traceSearch = new FormControl('', { nonNullable: true });
  private readonly chartQuery = toSignal(this.chartSearch.valueChanges, { initialValue: '' });
  private readonly traceQuery = toSignal(this.traceSearch.valueChanges, { initialValue: '' });
  private readonly requestedPage = signal(0);
  readonly chartPage = computed(() => Math.min(this.requestedPage(), this.chartPages() - 1));
  readonly filteredCharts = computed(() => this.charts().filter(c => c.title.toLocaleLowerCase().includes(this.chartQuery().trim().toLocaleLowerCase())));
  readonly chartPages = computed(() => Math.max(1, Math.ceil(this.filteredCharts().length / 8)));
  readonly visibleCharts = computed(() => this.searchableCharts() ? this.filteredCharts().slice(this.chartPage() * 8, (this.chartPage() + 1) * 8) : this.charts());
  private readonly filteredMetrics = computed(() => this.activeChart()?.metrics.filter(m => !this.showSeriesSearch() || m.label.toLocaleLowerCase().includes(this.traceQuery().trim().toLocaleLowerCase())) ?? []);
  constructor() {
    effect(() => { this.chartQuery(); this.requestedPage.set(0); });
    effect(() => { this.contextKey(); this.chartSearch.setValue(''); this.traceSearch.setValue(''); this.highlightedTrace.set(undefined); });
  }
  changeChartPage(page: number): void {
    const bounded = Math.max(0, Math.min(page, this.chartPages() - 1));
    this.requestedPage.set(bounded);
    const first = this.filteredCharts()[bounded * 8];
    if (first) this.chooseMetric(first.id);
  }
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
  readonly activeChart = computed(() => {
    const charts = this.searchableCharts() ? this.filteredCharts() : this.charts();
    return charts.find(chart => chart.id === this.view().metric) ?? charts[0];
  });
  readonly activeTabVisible = computed(() => this.visibleCharts().some(chart => chart.id === this.activeChart()?.id));
  readonly visibleMetrics = computed(() => this.activeChart()?.metrics.filter(metric => this.singleTrace() || !this.showTraceControls() || !this.view().hiddenGuids.includes(metric.id)) ?? []);
  readonly legendPages = computed(() => Math.max(1, Math.ceil(this.filteredMetrics().length / 8)));
  readonly legendPage = computed(() => Math.min(this.view().legendPage, this.legendPages() - 1));
  readonly legendEntries = computed(() => this.filteredMetrics().slice(this.legendPage() * 8, (this.legendPage() + 1) * 8).map(metric => ({
    ...metric, visible: !this.view().hiddenGuids.includes(metric.id), dash: Array.isArray(metric.lineStyle) ? metric.lineStyle.join(' ') : null
  })) ?? []);
  updateView(patch: Partial<InventoryChartSheetView>): void { this.viewChanged.emit({ ...this.view(), ...patch }); }
  chooseMetric(metric: string): void {
    this.highlightedTrace.set(undefined);
    const changed = metric !== this.activeChart()?.id;
    this.updateView({ metric, legendPage: 0 });
    if (changed && (this.scrollableTabs() || this.singleTrace())) this.zoomChanged.emit({ start: 0, end: 100 });
  }
  tabKey(event: KeyboardEvent, id: string): void {
    if (!this.scrollableTabs()) return;
    const charts = this.visibleCharts(), index = charts.findIndex(chart => chart.id === id);
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
  toggleTracePanel(): void {
    this.highlightedTrace.set(undefined);
    this.updateView({ tracePanelOpen: !this.tracePanelOpen() });
  }
  closeTracePanel(): void {
    this.highlightedTrace.set(undefined);
    this.updateView({ tracePanelOpen: false });
    afterNextRender(() => this.traceToggle()?.nativeElement.focus(), { injector: this.injector });
  }
  zoom(factor: number): void {
    const current = this.zoomRange(), width = Math.max(10, Math.min(100, (current.end - current.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (current.start + current.end - width) / 2));
    this.zoomChanged.emit({ start, end: start + width });
  }
  download(): void { this.renderer()?.downloadPng(); }
}
