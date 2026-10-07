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
import { annualResultMarkers, AnalysisResultMarker } from '../../../banking/facility-analysis-banking';
import { AnalysisResultMarkerLegendComponent, AnalysisResultMarkersComponent } from '../../presentation/result-markers/analysis-result-markers.component';

@Component({ selector: 'app-facility-analysis-annual', standalone: true, imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe, AnalysisResultMarkersComponent, AnalysisResultMarkerLegendComponent], templateUrl: './facility-analysis-annual.component.html', styleUrls: ['./facility-analysis-annual.component.css'] })
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
    markers: this.facilityAnnualMarkers(row.year),
    predictors: Object.fromEntries(
      (row.predictorUsage ?? []).map(item => [item.predictorId, item.usage])
    ) as Readonly<Record<string, number>>
  })));
  readonly legendMarkers = computed(() => uniqueMarkers(this.rowViews().flatMap(view => view.markers)));
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
    const columns = this.columns();
    if (!columns.productionVariables || columns.predictorGroupId !== this.predictorScopeId()) return [];
    const visible = new Set(columns.predictors.filter(item => item.display).map(item => item.predictor.id));
    return this.availablePredictors().filter(variable => visible.has(variable.id));
  });
  readonly useColumnCount = computed(() => {
    const columns = this.columns();
    return [
      columns.actualEnergy,
      columns.adjusted,
      columns.baselineAdjustmentForNormalization,
      columns.baselineAdjustmentForOther,
      columns.baselineAdjustment
    ].filter(Boolean).length;
  });
  readonly predictorColumnCount = computed(() => this.columns().productionVariables ? this.predictorColumns().length : 0);
  readonly improvementColumnCount = computed(() => {
    const columns = this.columns();
    return [
      columns.SEnPI,
      this.hasBanking() && columns.bankedSavings,
      this.hasBanking() && columns.savingsUnbanked,
      columns.savings,
      columns.totalSavingsPercentImprovement,
      columns.newSavings,
      columns.annualSavingsPercentImprovement,
      columns.cummulativeSavings
    ].filter(Boolean).length;
  });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly useChartMetrics = computed(() => annualUseChartMetrics(
    this.context.analysis()?.analysisCategory,
    this.unit()
  ));
  readonly useChartYAxisTitle = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? `Consumption${this.unit() ? ` (${this.unit()})` : ''}`
    : `Energy Use${this.unit() ? ` (${this.unit()})` : ''}`);

  private facilityAnnualMarkers(year: number): readonly AnalysisResultMarker[] {
    const state = this.results.state();
    if (state.state !== 'ready') return [];
    return uniqueMarkers((state.groups ?? []).flatMap(result => {
      const row = result.annualAnalysisSummaryData.find(item => item.year === year);
      return row ? annualResultMarkers(row) : [];
    }));
  }
}

function uniqueMarkers(markers: readonly AnalysisResultMarker[]): readonly AnalysisResultMarker[] {
  const present = new Set(markers);
  return (['banked-source', 'banked-savings', 'transition'] as const).filter(marker => present.has(marker));
}
