import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { ANALYSIS_CHART_METRICS, annualChartRows } from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';
import { AnalysisResultColumnChooserComponent } from '../../../results/presentation/column-chooser/analysis-result-column-chooser.component';

@Component({ selector: 'app-facility-analysis-group-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultToolbarComponent, AnalysisResultColumnChooserComponent], templateUrl: './facility-analysis-group-annual.component.html', styleUrls: ['./facility-analysis-group-annual.component.css'] })
export class FacilityAnalysisGroupAnnualComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.columns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
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
