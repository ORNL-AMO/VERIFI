import { Component, computed, inject } from '@angular/core';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { monthlyResultChartsView, facilityMonthlyChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';

@Component({
  selector: 'app-facility-analysis-monthly-chart',
  standalone: true,
  imports: [AnalysisChartsModule, AnalysisResultStatusComponent],
  templateUrl: './facility-analysis-monthly-chart.component.html',
  styleUrls: ['./facility-analysis-monthly-chart.component.css']
})
export class FacilityAnalysisMonthlyChartComponent {
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
    return facilityMonthlyChartRows(this.rows(), state.state === 'ready' ? state.groups ?? [] : []);
  });
  readonly charts = computed(() => monthlyResultChartsView(this.chartRows(), this.rows(), this.category(), this.unit(),
    false));
}
