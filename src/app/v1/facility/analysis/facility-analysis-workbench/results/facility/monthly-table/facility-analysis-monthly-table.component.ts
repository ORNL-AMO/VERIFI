import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultToolbarComponent } from '../../presentation/toolbar/analysis-result-toolbar.component';
import { AnalysisResultNumberPipe } from '../../presentation/number/analysis-result-number.pipe';
import { AnalysisResultColumnChooserComponent } from '../../presentation/column-chooser/analysis-result-column-chooser.component';
import { FacilityAnalysisResultsDisplayService } from '../../presentation/facility-analysis-results-display.service';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';

@Component({
  selector: 'app-facility-analysis-monthly-table',
  standalone: true,
  imports: [CommonModule, AnalysisResultStatusComponent, AnalysisResultToolbarComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe],
  templateUrl: './facility-analysis-monthly-table.component.html',
  styleUrls: ['./facility-analysis-monthly-table.component.css']
})
export class FacilityAnalysisMonthlyTableComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.columns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly hasBanking = computed(() => this.context.analysis()?.hasBanking === true);
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    predictors: Object.fromEntries((row.predictorUsage ?? []).map(item => [item.predictorId, item.usage]))
  })));
  readonly predictorScopeId = computed(() => `facility:${this.context.analysisGuid()}`);
  readonly availablePredictors = computed<AnalysisGroupPredictorVariable[]>(() => this.context.workspace.facilityPredictors().map(predictor => ({
    id: predictor.guid,
    name: predictor.name,
    unit: predictor.unit,
    production: predictor.production,
    productionInAnalysis: false,
    regressionCoefficient: predictor.regressionCoefficient
  })));
  readonly predictorColumns = computed(() => {
    if (!this.columns().productionVariables || this.columns().predictorGroupId !== this.predictorScopeId()) return [];
    const visible = new Set(this.columns().predictors.filter(item => item.display).map(item => item.predictor.id));
    return this.availablePredictors().filter(variable => visible.has(variable.id));
  });
  readonly useColumnCount = computed(() => [
    this.columns().actualEnergy,
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
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
}
