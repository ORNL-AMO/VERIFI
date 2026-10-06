import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import {
  annualImprovementChartRows,
  annualImprovementChartMetrics,
  annualUseChartMetrics,
  annualUseChartRows
} from '../../../results/presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultColumnChooserComponent } from '../../../results/presentation/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultNumberPipe } from '../../../results/presentation/number/analysis-result-number.pipe';

@Component({ selector: 'app-facility-analysis-group-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe], templateUrl: './facility-analysis-group-annual.component.html', styleUrls: ['./facility-analysis-group-annual.component.css'] })
export class FacilityAnalysisGroupAnnualComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.columns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    predictors: Object.fromEntries((row.predictorUsage ?? []).map(item => [item.predictorId, item.usage]))
  })));
  readonly predictorScopeId = computed(() => this.groupContext.group()?.idbGroupId ?? '');
  readonly availablePredictors = computed(() => this.groupContext.group()?.predictorVariables ?? []);
  readonly predictorColumns = computed(() => {
    if (!this.columns().productionVariables) return [];
    const scopeId = this.predictorScopeId();
    const columns = this.columns();
    if (columns.predictorGroupId !== scopeId) return this.availablePredictors().filter(variable => variable.productionInAnalysis);
    const visible = new Set(columns.predictors.filter(item => item.display).map(item => item.predictor.id));
    return this.availablePredictors().filter(variable => visible.has(variable.id));
  });
  readonly useChartRows = computed(() => annualUseChartRows(this.rows()));
  readonly improvementChartRows = computed(() => annualImprovementChartRows(this.rows()));
  readonly improvementChartMetrics = computed(() => annualImprovementChartMetrics(
    this.groupContext.autosave.draft()?.analysisCategory
  ));
  readonly hasBanking = computed(() => this.groupContext.autosave.draft()?.hasBanking === true);
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
    this.columns().totalSavingsPercentImprovement,
    this.columns().newSavings,
    this.columns().annualSavingsPercentImprovement,
    this.columns().cummulativeSavings
  ].filter(Boolean).length);
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
  readonly useChartMetrics = computed(() => annualUseChartMetrics(
    this.groupContext.autosave.draft()?.analysisCategory,
    this.unit()
  ));
  readonly useChartYAxisTitle = computed(() => this.groupContext.autosave.draft()?.analysisCategory === 'water'
    ? `Consumption${this.unit() ? ` (${this.unit()})` : ''}`
    : `Energy Use${this.unit() ? ` (${this.unit()})` : ''}`);
}
