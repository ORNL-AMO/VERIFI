import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, Input, NgZone, OnChanges, ViewChild, computed, inject, signal } from '@angular/core';
import { EChartsChartDirective, type V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import type { ExplorationModel, ExplorationPair } from '@domain/visualizations/visualization-exploration';
import { pairOption } from '../exploration-options';

@Component({ selector: 'app-exploration-pair-panel', standalone: false, templateUrl: './pair-panel.component.html', styleUrls: ['./pair-panel.component.css'] })
export class PairPanelComponent implements OnChanges, AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly change = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly activated = signal(false);
  private readonly printing = signal(false);
  @ViewChild(EChartsChartDirective) private renderer?: EChartsChartDirective;
  @Input({ required: true }) model!: ExplorationModel;
  @Input({ required: true }) pair!: ExplorationPair;
  private readonly value = signal<{ model: ExplorationModel; pair: ExplorationPair } | undefined>(undefined);
  readonly zoom = signal<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly option = computed(() => {
    const value = this.value(); if (!value || !this.activated()) return undefined;
    const option = pairOption(value.model, value.pair, this.printing() ? { start: 0, end: 100 } : this.zoom());
    return this.printing() ? { ...option, dataZoom: [] } : option;
  });
  readonly summary = computed(() => {
    const pair = this.value()?.pair; if (!pair) return '';
    const stats = pair.statistics, format = (value: number | undefined) => value === undefined ? 'Unavailable' : Number(value.toPrecision(5)).toString();
    return `r = ${format(stats.r)} · R² = ${format(stats.rSquared)}`;
  });
  readonly equation = computed(() => {
    const pair = this.value()?.pair, stats = pair?.statistics;
    return pair && stats?.slope !== undefined && stats.intercept !== undefined ? `${pair.y.label}${pair.y.unit ? ' (' + pair.y.unit + ')' : ''} = ${Number(stats.slope.toPrecision(5))} × ${pair.x.label}${pair.x.unit ? ' (' + pair.x.unit + ')' : ''} ${stats.intercept < 0 ? '−' : '+'} ${Number(Math.abs(stats.intercept).toPrecision(5))}` : '';
  });
  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') { this.activated.set(true); return; }
    this.zone.runOutsideAngular(() => {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); this.zone.run(() => this.activated.set(true)); }
      });
      observer.observe(this.host.nativeElement);
      this.destroy.onDestroy(() => observer.disconnect());
    });
  }
  @HostListener('window:beforeprint')
  preparePrint(): void { this.printing.set(true); this.activated.set(true); this.change.detectChanges(); this.renderer?.renderForPrint(); }
  @HostListener('window:afterprint')
  finishPrint(): void { this.printing.set(false); }
  ngOnChanges(): void {
    const old = this.value();
    if (old && (old.model.windowKey !== this.model.windowKey || old.pair.id !== this.pair.id)) this.resetZoom();
    this.value.set({ model: this.model, pair: this.pair });
  }
  updateZoom(range: V1EChartsDataZoomRange): void {
    if (Number.isFinite(range.start) && Number.isFinite(range.end)) this.zoom.set({ start: Math.max(0, Math.min(100, range.start)), end: Math.max(0, Math.min(100, range.end)) });
  }
  resetZoom(): void { this.zoom.set({ start: 0, end: 100 }); }
}
