import { Component, computed, input } from '@angular/core';
import { AnalysisResultChartsView } from '../chart/analysis-result-chart.view';

@Component({ selector: 'app-analysis-result-charts', standalone: false,
  templateUrl: './analysis-result-charts.component.html', styleUrls: ['./analysis-result-charts.component.css'] })
export class AnalysisResultChartsComponent {
  readonly view = input.required<AnalysisResultChartsView>();
  readonly scope = input<'facility' | 'group'>('facility');
  readonly showChartActions = input(true);
  readonly deferUntilVisible = input(false);
  readonly annual = computed(() => this.view().period === 'annual');
  readonly useYAxisTitle = computed(() => this.annual()
    ? `${this.view().category === 'water' ? 'Consumption' : 'Energy Use'}${this.view().unit ? ` (${this.view().unit})` : ''}`
    : this.view().unit);
  readonly scopeLabel = computed(() => this.scope() === 'facility' ? 'Facility' : 'Group');
  readonly useLabel = computed(() => `${this.scopeLabel()} ${this.view().period} actual and calculated use chart${this.annual() ? ''
    : '. Green indicates savings where calculated use exceeds actual use; red indicates actual use exceeds calculated use.'}`);
}
