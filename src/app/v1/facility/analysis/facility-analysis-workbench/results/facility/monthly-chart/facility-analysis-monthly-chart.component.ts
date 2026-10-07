import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import {
  MONTHLY_USE_COMPARISON_BAND,
  monthlySavingsChartView,
  monthlyUseChartMetrics,
  monthlyUseChartRows
} from '../../presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { monthlyResultMarkers, orderedUniqueResultMarkers } from '../../presentation/result-markers/analysis-result-markers';

@Component({
  selector: 'app-facility-analysis-monthly-chart',
  standalone: true,
  imports: [MeterResultsChartComponent, AnalysisResultStatusComponent],
  templateUrl: './facility-analysis-monthly-chart.component.html',
  styleUrls: ['./facility-analysis-monthly-chart.component.css']
})
export class FacilityAnalysisMonthlyChartComponent {
  readonly useComparisonBand = MONTHLY_USE_COMPARISON_BAND;
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly category = computed(() => this.context.analysis()?.analysisCategory);
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
  readonly chartRows = computed(() => {
    const state = this.results.state();
    if (state.state !== 'ready') return [];
    return this.rows().map(row => {
      const target = new Date(row.date).getTime();
      const markers = orderedUniqueResultMarkers((state.groups ?? []).flatMap(result => {
        const groupRow = result.monthlyAnalysisSummaryData.find(item => new Date(item.date).getTime() === target);
        return groupRow ? monthlyResultMarkers(groupRow) : [];
      }));
      return { ...row, isIntermediateBanked: markers.includes('transition') };
    });
  });
  readonly useChartRows = computed(() => monthlyUseChartRows(this.chartRows()));
  readonly useChartMetrics = computed(() => monthlyUseChartMetrics(this.category(), this.unit()));
  readonly savingsChart = computed(() => monthlySavingsChartView(this.rows(), false));
}
