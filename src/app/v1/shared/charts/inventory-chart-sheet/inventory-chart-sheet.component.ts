import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, Injector, TemplateRef, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
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
  imports: [NgTemplateOutlet, IconComponent, WorkspaceBottomSheetComponent, MeterResultsChartComponent, ChartTracePanelComponent, ModalFocusTrapDirective],
  templateUrl: './inventory-chart-sheet.component.html', styleUrls: ['./inventory-chart-sheet.component.css'] })
export class InventoryChartSheetComponent {
  private readonly injector = inject(Injector);
  readonly content = input<TemplateRef<unknown>>();
  readonly customTitle = input('');
  readonly singleTrace = input(false);
  readonly traceChoices = computed(() => this.singleTrace() ? this.charts().flatMap(chart => chart.metrics) : this.activeChart()?.metrics ?? []);
  readonly traceHiddenGuids = computed(() => this.singleTrace() ? this.traceChoices().filter(trace => trace.id !== this.activeChart()?.id).map(trace => trace.id) : this.view().hiddenGuids);
  readonly narrowTracePanel = toSignal(inject(BreakpointObserver).observe('(max-width: 52rem)').pipe(map(state => state.matches)), { initialValue: false });
  readonly tracePanelOpen = computed(() => this.view().tracePanelOpen ?? !this.narrowTracePanel());
  readonly traceVisibleCount = computed(() => this.traceChoices().filter(metric => !this.traceHiddenGuids().includes(metric.id)).length);
  readonly highlightedTrace = signal<string | undefined>(undefined);
  private readonly traceToggle = viewChild<ElementRef<HTMLButtonElement>>('traceToggle');
  readonly contextKey = input('');
  constructor() {
    effect(() => { this.contextKey(); this.highlightedTrace.set(undefined); });
  }
  readonly charts = input.required<readonly InventoryChartView[]>();
  readonly facilityName = input.required<string>();
  readonly resource = input<'meters' | 'predictors'>('meters');
  readonly singular = computed(() => this.resource() === 'meters' ? 'meter' : 'predictor');
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
    const charts = this.charts();
    return charts.find(chart => chart.id === this.view().metric) ?? charts[0];
  });
  readonly visibleMetrics = computed(() => this.activeChart()?.metrics.filter(metric => this.singleTrace() || !this.view().hiddenGuids.includes(metric.id)) ?? []);
  updateView(patch: Partial<InventoryChartSheetView>): void { this.viewChanged.emit({ ...this.view(), ...patch }); }
  chooseMetric(metric: string): void {
    this.highlightedTrace.set(undefined);
    const changed = metric !== this.activeChart()?.id;
    this.updateView({ metric });
    if (changed && this.singleTrace()) this.zoomChanged.emit({ start: 0, end: 100 });
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
