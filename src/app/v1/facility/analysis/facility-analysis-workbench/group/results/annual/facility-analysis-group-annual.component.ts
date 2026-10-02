import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisResultsService } from '../../../results/calculation/facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { ANALYSIS_CHART_METRICS, annualChartRows } from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';

@Component({ selector: 'app-facility-analysis-group-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent], templateUrl: './facility-analysis-group-annual.component.html', styleUrls: ['./facility-analysis-group-annual.component.css'] })
export class FacilityAnalysisGroupAnnualComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly displayKey = computed(() => `group:${this.groupContext.groupGuid()}:annual`);
  readonly display = computed(() => this.displaySettings.display(this.displayKey()));
  readonly columns = this.displaySettings.columns;
  readonly groupResult = computed(() => this.results.selectedGroup(this.groupContext.groupGuid()));
  readonly rows = computed(() => this.groupResult()?.annualAnalysisSummaryData ?? []);
  readonly chartRows = computed(() => annualChartRows(this.rows()));
  readonly chartMetrics = ANALYSIS_CHART_METRICS;
  readonly columnOptions = [
    { id: 'actualEnergy', label: 'Actual' }, { id: 'adjusted', label: 'Adjusted' },
    { id: 'baselineAdjustment', label: 'Baseline adjustment' }, { id: 'SEnPI', label: 'SEnPI' },
    { id: 'savings', label: 'Savings' }, { id: 'bankedSavings', label: 'Banked savings' },
    { id: 'savingsUnbanked', label: 'Unbanked savings' },
    { id: 'totalSavingsPercentImprovement', label: 'Total improvement' },
    { id: 'cummulativeSavings', label: 'Cumulative savings' }
  ] as const;
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
}
