import { Component, computed, inject } from '@angular/core';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { monthlyResultChartsView } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';

@Component({
  selector: 'app-facility-analysis-group-monthly-chart',
  standalone: true,
  imports: [AnalysisChartsModule, AnalysisResultStatusComponent],
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
  readonly category = computed(() => this.groupContext.autosave.draft()?.analysisCategory);
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
  readonly charts = computed(() => monthlyResultChartsView(this.rows(), this.rows(), this.category(), this.unit(),
    this.rows().some(row => row.isBanked)));
}
