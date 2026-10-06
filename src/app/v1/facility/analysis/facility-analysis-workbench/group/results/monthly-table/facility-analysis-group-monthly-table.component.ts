import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';
import { AnalysisResultColumnChooserComponent } from '../../../results/presentation/column-chooser/analysis-result-column-chooser.component';

@Component({
  selector: 'app-facility-analysis-group-monthly-table',
  standalone: true,
  imports: [CommonModule, AnalysisResultStatusComponent, AnalysisResultToolbarComponent, AnalysisResultColumnChooserComponent],
  templateUrl: './facility-analysis-group-monthly-table.component.html',
  styleUrls: ['./facility-analysis-group-monthly-table.component.css']
})
export class FacilityAnalysisGroupMonthlyTableComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.columns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    predictors: Object.fromEntries((row.predictorUsage ?? []).map(item => [item.predictorId, item.usage]))
  })));
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly predictorColumns = computed(() => this.group()?.predictorVariables.filter(variable => variable.productionInAnalysis) ?? []);
  readonly group = this.groupContext.group;
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
