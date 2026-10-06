import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../../results/presentation/toolbar/analysis-result-toolbar.component';
import { AnalysisResultColumnChooserComponent } from '../../../results/presentation/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultNumberPipe } from '../../../results/presentation/number/analysis-result-number.pipe';

@Component({
  selector: 'app-facility-analysis-group-monthly-table',
  standalone: true,
  imports: [CommonModule, AnalysisResultStatusComponent, AnalysisResultToolbarComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe],
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
  readonly hasBanking = computed(() => this.groupContext.autosave.draft()?.hasBanking === true);
  readonly group = this.groupContext.group;
  readonly predictorScopeId = computed(() => this.group()?.idbGroupId ?? '');
  readonly availablePredictors = computed(() => this.group()?.predictorVariables ?? []);
  readonly predictorColumns = computed(() => {
    if (!this.columns().productionVariables) return [];
    const scopeId = this.predictorScopeId();
    const columns = this.columns();
    if (columns.predictorGroupId !== scopeId) return this.availablePredictors().filter(variable => variable.productionInAnalysis);
    const visible = new Set(columns.predictors.filter(item => item.display).map(item => item.predictor.id));
    return this.availablePredictors().filter(variable => visible.has(variable.id));
  });
  readonly useColumnCount = computed(() => [
    this.columns().actualEnergy,
    this.columns().modeledEnergy,
    this.columns().adjusted,
    this.columns().baselineAdjustmentForNormalization,
    this.columns().baselineAdjustmentForOther,
    this.columns().baselineAdjustment
  ].filter(Boolean).length);
  readonly predictorColumnCount = computed(() => this.columns().productionVariables ? this.predictorColumns().length : 0);
  readonly improvementColumnCount = computed(() => [
    this.columns().SEnPI,
    this.hasBanking() && this.columns().bankedSavings,
    this.hasBanking() && this.columns().savingsUnbanked,
    this.columns().savings,
    this.columns().rollingSavings,
    this.columns().rolling12MonthImprovement
  ].filter(Boolean).length);
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
}
