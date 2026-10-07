import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/facility/data/meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import {
  annualImprovementChartRows,
  annualImprovementChartMetrics,
  annualUseChartMetrics,
  annualUseChartRows
} from '../../presentation/facility-analysis-result.view';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultNumberPipe } from '../../presentation/number/analysis-result-number.pipe';
import { AnalysisResultColumnChooserComponent } from '../../presentation/column-chooser/analysis-result-column-chooser.component';
import { FacilityAnalysisResultsDisplayService } from '../../presentation/facility-analysis-results-display.service';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';

@Component({ selector: 'app-facility-analysis-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe], templateUrl: './facility-analysis-annual.component.html', styleUrls: ['./facility-analysis-annual.component.css'] })
export class FacilityAnalysisAnnualComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.annualColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly useChartRows = computed(() => annualUseChartRows(this.rows()));
  readonly improvementChartRows = computed(() => annualImprovementChartRows(this.rows()));
  readonly improvementChartMetrics = computed(() => annualImprovementChartMetrics(
    this.context.analysis()?.analysisCategory
  ));
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
    this.columns().totalSavingsPercentImprovement,
    this.columns().newSavings,
    this.columns().annualSavingsPercentImprovement,
    this.columns().cummulativeSavings
  ].filter(Boolean).length);
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly useChartMetrics = computed(() => annualUseChartMetrics(
    this.context.analysis()?.analysisCategory,
    this.unit()
  ));
  readonly useChartYAxisTitle = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? `Consumption${this.unit() ? ` (${this.unit()})` : ''}`
    : `Energy Use${this.unit() ? ` (${this.unit()})` : ''}`);
}
