import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import {
  MONTHLY_USE_COMPARISON_BAND,
  monthlySavingsChartView,
  monthlyUseChartMetrics,
  monthlyUseChartRows
} from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';

@Component({
  selector: 'app-facility-analysis-group-monthly-chart',
  standalone: true,
  imports: [MeterResultsChartComponent, AnalysisResultStatusComponent],
  templateUrl: './facility-analysis-group-monthly-chart.component.html',
  styleUrls: ['./facility-analysis-group-monthly-chart.component.css']
})
export class FacilityAnalysisGroupMonthlyChartComponent {
  readonly useComparisonBand = MONTHLY_USE_COMPARISON_BAND;
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly category = computed(() => this.groupContext.autosave.draft()?.analysisCategory);
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
  readonly useChartRows = computed(() => monthlyUseChartRows(this.rows()));
  readonly useChartMetrics = computed(() => monthlyUseChartMetrics(this.category(), this.unit()));
  readonly savingsChart = computed(() => monthlySavingsChartView(
    this.rows(),
    this.rows().some(row => row.isBanked)
  ));
}
