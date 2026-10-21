import { Component, DestroyRef, ViewChild, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { GroupVisualizationFacade } from './group-visualization.facade';
import { timeSeriesOption } from './group-visualization-charts';
import { CorrelationChartComponent } from './correlation-chart/correlation-chart.component';
import { buildTimeSeriesDisplay } from './group-visualization-standardization';
import type { TimeSeriesScale } from './group-visualization.models';

@Component({
  selector: 'app-group-visualization',
  standalone: true,
  providers: [GroupVisualizationFacade],
  imports: [ReactiveFormsModule, IconComponent, EChartsChartDirective, CorrelationChartComponent],
  templateUrl: './group-visualization.component.html',
  styleUrl: './group-visualization.component.css'
})
export class GroupVisualizationComponent {
  readonly facade = inject(GroupVisualizationFacade);
  private readonly destroyRef = inject(DestroyRef);
  readonly scaleControl = new FormControl<TimeSeriesScale>('raw', { nonNullable: true });
  readonly chartActionsDisabled = computed(() => this.facade.state() !== 'ready'
    || !this.facade.filteredPoints().length);
  @ViewChild(EChartsChartDirective) private chart?: EChartsChartDirective;
  readonly seriesDisplay = computed(() => buildTimeSeriesDisplay(this.facade.filteredPoints(),
    this.facade.visiblePredictors(), this.facade.preferences().scale));
  readonly zScoreNotice = computed(() => {
    const unavailable = this.seriesDisplay().unavailableSeries;
    return unavailable.length ? `Z-scores unavailable for ${unavailable.join(', ')}. Each series needs at least two finite values that vary.` : undefined;
  });
  readonly chartLabel = computed(() => `${this.facade.groupName()} monthly group usage and selected predictors${
    this.facade.preferences().scale === 'z-score' ? ', standardized on one axis.' : ', with group usage on the left axis and predictors on the right axis.'}`);
  readonly option = computed(() => timeSeriesOption(this.facade.filteredPoints(), this.facade.visiblePredictors(),
    this.facade.usageLabel(), this.facade.preferences().zoom, this.seriesDisplay()));
  readonly legend = computed(() => {
    const visible = new Set(this.facade.preferences().visiblePredictors);
    return this.facade.predictors().map(predictor => ({ ...predictor, visible: visible.has(predictor.guid),
      dash: predictor.style.lineStyle === 'solid' ? null : Array.isArray(predictor.style.lineStyle) ? predictor.style.lineStyle.join(' ') : null }));
  });
  private readonly synchronizeScale = effect(() => {
    this.scaleControl.setValue(this.facade.preferences().scale, { emitEvent: false });
    if (this.chartActionsDisabled()) this.scaleControl.disable({ emitEvent: false });
    else this.scaleControl.enable({ emitEvent: false });
  });

  constructor() {
    this.scaleControl.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(scale => this.facade.update({ scale }));
  }

  zoom(factor: number): void {
    const range = this.facade.preferences().zoom;
    const width = Math.min(100, Math.max(1, (range.end - range.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (range.start + range.end - width) / 2));
    this.facade.update({ zoom: { start, end: start + width } });
  }

  download(): void {
    this.chart?.downloadPng(`${this.facade.groupName()}-time-series`);
  }
}
