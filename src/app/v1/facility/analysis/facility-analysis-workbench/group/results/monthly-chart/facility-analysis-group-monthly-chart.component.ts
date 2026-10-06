import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { ANALYSIS_CHART_METRICS, monthlyChartRows } from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';

@Component({
  selector: 'app-facility-analysis-group-monthly-chart',
  standalone: true,
  imports: [MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent],
  templateUrl: './facility-analysis-group-monthly-chart.component.html',
  styleUrls: ['./facility-analysis-group-monthly-chart.component.css']
})
export class FacilityAnalysisGroupMonthlyChartComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly chartRows = computed(() => monthlyChartRows(this.rows()));
  readonly chartMetrics = ANALYSIS_CHART_METRICS;
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
}
