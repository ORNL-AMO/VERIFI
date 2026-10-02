import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisResultsService } from '../../../results/calculation/facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { ANALYSIS_CHART_METRICS, monthlyChartRows } from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';

@Component({ selector: 'app-facility-analysis-group-monthly', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent], templateUrl: './facility-analysis-group-monthly.component.html', styleUrls: ['./facility-analysis-group-monthly.component.css'] })
export class FacilityAnalysisGroupMonthlyComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly displayKey = computed(() => `group:${this.groupContext.groupGuid()}:monthly`);
  readonly display = computed(() => this.displaySettings.display(this.displayKey()));
  readonly columns = this.displaySettings.columns;
  readonly groupResult = computed(() => this.results.selectedGroup(this.groupContext.groupGuid()));
  readonly rows = computed(() => this.groupResult()?.monthlyAnalysisSummaryData ?? []);
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    predictors: Object.fromEntries((row.predictorUsage ?? []).map(item => [item.predictorId, item.usage]))
  })));
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly predictorColumns = computed(() => this.group()?.predictorVariables.filter(variable => variable.productionInAnalysis) ?? []);
  readonly group = this.groupContext.group;
  readonly chartRows = computed(() => monthlyChartRows(this.rows()));
  readonly chartMetrics = ANALYSIS_CHART_METRICS;
  readonly columnOptions = [
    { id: 'actualEnergy', label: 'Actual' }, { id: 'modeledEnergy', label: 'Modeled' },
    { id: 'adjusted', label: 'Adjusted' }, { id: 'baselineAdjustment', label: 'Baseline adjustment' },
    { id: 'productionVariables', label: 'Predictors' }, { id: 'SEnPI', label: 'SEnPI' },
    { id: 'savings', label: 'Savings' }, { id: 'yearToDateSavings', label: 'Year-to-date savings' },
    { id: 'rollingSavings', label: 'Rolling savings' }, { id: 'rolling12MonthImprovement', label: 'Rolling improvement' },
    { id: 'bankedSavings', label: 'Banked savings' }, { id: 'savingsUnbanked', label: 'Unbanked savings' }
  ] as const;
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
}
