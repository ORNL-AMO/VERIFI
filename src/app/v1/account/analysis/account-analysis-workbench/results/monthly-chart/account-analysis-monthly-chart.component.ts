import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { MONTHLY_USE_COMPARISON_BAND, monthlySavingsChartView, monthlyUseChartMetrics, monthlyUseChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';

@Component({
  selector: 'app-account-analysis-monthly-chart',
  standalone: true,
  imports: [MeterResultsChartComponent, AnalysisResultStatusComponent],
  templateUrl: './account-analysis-monthly-chart.component.html',
  styleUrls: ['./account-analysis-monthly-chart.component.css']
})
export class AccountAnalysisMonthlyChartComponent {
  readonly useComparisonBand = MONTHLY_USE_COMPARISON_BAND;
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  readonly rows = computed(() => { const state = this.results.state(); return state.state === 'ready' ? state.monthly : []; });
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly category = computed(() => this.context.analysis()?.analysisCategory);
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly useChartRows = computed(() => monthlyUseChartRows(this.rows()));
  readonly useChartMetrics = computed(() => monthlyUseChartMetrics(this.category(), this.unit()));
  readonly savingsChart = computed(() => monthlySavingsChartView(this.rows(), false));
}
