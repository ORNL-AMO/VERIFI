import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../presentation/facility-analysis-results-display.service';
import { ANALYSIS_CHART_METRICS, monthlyChartRows } from '../../presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../presentation/toolbar/analysis-result-toolbar.component';

@Component({ selector: 'app-facility-analysis-monthly', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent], templateUrl: './facility-analysis-monthly.component.html', styleUrls: ['./facility-analysis-monthly.component.css'] })
export class FacilityAnalysisMonthlyComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly display = computed(() => this.displaySettings.display('facility:monthly'));
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly chartRows = computed(() => monthlyChartRows(this.rows()));
  readonly chartMetrics = ANALYSIS_CHART_METRICS;
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
}
