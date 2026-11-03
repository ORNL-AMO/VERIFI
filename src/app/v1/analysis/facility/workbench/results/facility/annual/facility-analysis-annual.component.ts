import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AnalysisResultsTableModule } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.module';
import { analysisResultsTableView } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.view';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { annualResultChartsView, facilityAnnualChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AnalysisResultColumnChooserComponent } from '@app/v1/shared/analysis-results/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultsDisplayService } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import {
  AnalysisResultMarker,
  annualResultMarkers,
  orderedUniqueResultMarkers
} from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';

@Component({ selector: 'app-facility-analysis-annual', standalone: true, imports: [AnalysisResultsTableModule, CommonModule, AnalysisChartsModule, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultMarkerLegendComponent], templateUrl: './facility-analysis-annual.component.html', styleUrls: ['./facility-analysis-annual.component.css'] })
export class FacilityAnalysisAnnualComponent {
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(AnalysisResultsDisplayService);
  readonly columns = this.displaySettings.annualColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly hasBanking = computed(() => this.context.analysis()?.hasBanking === true);
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    markers: this.facilityAnnualMarkers(row.year)
  })));
  readonly chartRows = computed(() => {
    const state = this.results.state();
    return facilityAnnualChartRows(this.rows(), state.state === 'ready' ? state.groups ?? [] : []);
  });
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
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
  readonly tableView = computed(() => analysisResultsTableView(this.rowViews(), this.columns(),
    this.predictorColumns(), 'annual', this.hasBanking()));
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly charts = computed(() => annualResultChartsView(this.chartRows(), this.context.analysis()?.analysisCategory, this.unit()));

  private facilityAnnualMarkers(year: number): readonly AnalysisResultMarker[] {
    const state = this.results.state();
    if (state.state !== 'ready') return [];
    return orderedUniqueResultMarkers((state.groups ?? []).flatMap(result => {
      const row = result.annualAnalysisSummaryData.find(item => item.year === year);
      return row ? annualResultMarkers(row) : [];
    }));
  }
}
