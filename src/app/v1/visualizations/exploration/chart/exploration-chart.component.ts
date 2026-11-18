import { Component, Input, OnChanges, computed, signal } from '@angular/core';
import type { ExplorationModel } from '@domain/visualizations/visualization-exploration';
import { heatmapOption, heatmapPanels } from '../exploration-options';

@Component({ selector: 'app-visualization-exploration', standalone: false, templateUrl: './exploration-chart.component.html', styleUrls: ['./exploration-chart.component.css'] })
export class ExplorationChartComponent implements OnChanges {
  @Input({ required: true }) model!: ExplorationModel;
  readonly value = signal<ExplorationModel | undefined>(undefined);
  readonly matrix = computed(() => { const chart = this.value()?.chart; return chart?.kind === 'correlation' && chart.view === 'matrix'; });
  readonly panels = computed(() => {
    const model = this.value();
    return model && (model.chart.kind === 'heatmap' || this.matrix()) ? heatmapPanels(model).map(panel => ({
      ...panel, empty: panel.cells.every(cell => cell.value === null), option: heatmapOption(panel),
      height: Math.max(320, panel.rows.length * 28 + 140), width: Math.max(500, panel.columns.length * 48)
    })) : [];
  });
  ngOnChanges(): void { this.value.set(this.model); }
}
