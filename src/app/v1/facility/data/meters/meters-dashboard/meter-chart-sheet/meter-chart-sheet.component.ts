import { Component, computed, input, output, signal, viewChild } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { MonthlyTrendView } from '../meters-dashboard.view';

export interface MeterChartSheetView {
  readonly metric: MonthlyTrendView['id'];
  readonly hiddenGuids: readonly string[];
  readonly legendPage: number;
}
export const DEFAULT_METER_CHART_VIEW: MeterChartSheetView = { metric: 'energy', hiddenGuids: [], legendPage: 0 };

@Component({ selector: 'app-meter-chart-sheet', standalone: true,
  imports: [IconComponent, ModalFocusTrapDirective, MeterResultsChartComponent],
  templateUrl: './meter-chart-sheet.component.html', styleUrls: ['./meter-chart-sheet.component.css'] })
export class MeterChartSheetComponent {
  readonly charts = input.required<readonly MonthlyTrendView[]>();
  readonly facilityName = input.required<string>();
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly view = input<MeterChartSheetView>(DEFAULT_METER_CHART_VIEW);
  readonly zoomRange = input<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly closed = output<void>();
  readonly closing = signal(false);
  private closeTimer?: ReturnType<typeof setTimeout>;
  requestClose(): void {
    if (this.closing()) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { this.closed.emit(); return; }
    this.closing.set(true);
    this.closeTimer = setTimeout(() => this.finishClose(), 360);
  }
  finishClose(event?: AnimationEvent): void {
    if (event && !event.animationName.endsWith('meter-charts-down')) return;
    if (!this.closing()) return;
    clearTimeout(this.closeTimer); this.closed.emit();
  }
  ngOnDestroy(): void { clearTimeout(this.closeTimer); }
  readonly viewChanged = output<MeterChartSheetView>();
  readonly zoomChanged = output<V1EChartsDataZoomRange>();
  private readonly renderer = viewChild(MeterResultsChartComponent);
  readonly activeChart = computed(() => this.charts().find(chart => chart.id === this.view().metric) ?? this.charts()[0]);
  readonly visibleMetrics = computed(() => this.activeChart()?.metrics.filter(metric => !this.view().hiddenGuids.includes(metric.id)) ?? []);
  readonly legendPages = computed(() => Math.max(1, Math.ceil((this.activeChart()?.metrics.length ?? 0) / 8)));
  readonly legendPage = computed(() => Math.min(this.view().legendPage, this.legendPages() - 1));
  readonly legendEntries = computed(() => this.activeChart()?.metrics.slice(this.legendPage() * 8, (this.legendPage() + 1) * 8).map(metric => ({
    ...metric, visible: !this.view().hiddenGuids.includes(metric.id), dash: Array.isArray(metric.lineStyle) ? metric.lineStyle.join(' ') : null
  })) ?? []);
  updateView(patch: Partial<MeterChartSheetView>): void { this.viewChanged.emit({ ...this.view(), ...patch }); }
  chooseMetric(metric: MonthlyTrendView['id']): void { this.updateView({ metric, legendPage: 0 }); }
  toggleMeter(guid: string): void {
    const hidden = new Set(this.view().hiddenGuids);
    if (hidden.has(guid)) hidden.delete(guid); else hidden.add(guid);
    this.updateView({ hiddenGuids: [...hidden] });
  }
  zoom(factor: number): void {
    const current = this.zoomRange(), width = Math.max(10, Math.min(100, (current.end - current.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (current.start + current.end - width) / 2));
    this.zoomChanged.emit({ start, end: start + width });
  }
  private pullStart?: number;
  startPull(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pullStart = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  finishPull(event: PointerEvent): void {
    if (this.pullStart !== undefined) {
      const distance = event.clientY - this.pullStart;
      if (distance >= 35) this.requestClose();
      else if (distance <= -35) this.suppressClick = true;
    }
    this.pullStart = undefined;
  }
  private suppressClick = false;
  clickHandle(): void { if (this.suppressClick) this.suppressClick = false; else this.requestClose(); }
  cancelPull(): void { this.pullStart = undefined; }
  download(): void { this.renderer()?.downloadPng(); }
}
