import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AnalysisResultsTableModule } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.module';
import { analysisResultsTableView } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.view';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { AnalysisResultsDisplayService } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { annualResultChartsView } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AnalysisResultColumnChooserComponent } from '@app/v1/shared/analysis-results/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { annualResultMarkers, orderedUniqueResultMarkers } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';

@Component({ selector: 'app-facility-analysis-group-annual', standalone: true, imports: [AnalysisResultsTableModule, CommonModule, AnalysisChartsModule, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultMarkerLegendComponent], templateUrl: './facility-analysis-group-annual.component.html', styleUrls: ['./facility-analysis-group-annual.component.css'] })
export class FacilityAnalysisGroupAnnualComponent {
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly displaySettings = inject(AnalysisResultsDisplayService);
  readonly columns = this.displaySettings.annualColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly rowViews = computed(() => this.rows().map(row => ({
    row,
    markers: annualResultMarkers(row, this.groupContext.group(), this.groupContext.workbench.facility())
  })));
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
  readonly predictorScopeId = computed(() => this.groupContext.group()?.idbGroupId ?? '');
  readonly availablePredictors = computed(() => this.groupContext.group()?.predictorVariables ?? []);
  readonly predictorColumns = computed(() => {
    const columns = this.columns();
    if (!columns.productionVariables) return [];
    const scopeId = this.predictorScopeId();
    if (columns.predictorGroupId !== scopeId) return this.availablePredictors().filter(variable => variable.productionInAnalysis);
    const visible = new Set(columns.predictors.filter(item => item.display).map(item => item.predictor.id));
    return this.availablePredictors().filter(variable => visible.has(variable.id));
  });
  readonly hasBanking = computed(() => this.groupContext.autosave.draft()?.hasBanking === true);
  readonly tableView = computed(() => analysisResultsTableView(this.rowViews(), this.columns(),
    this.predictorColumns(), 'annual', this.hasBanking()));
  readonly unit = computed(() => {
    const analysis = this.groupContext.autosave.draft();
    return analysis?.analysisCategory === 'water' ? analysis.waterUnit : analysis?.energyUnit;
  });
  readonly charts = computed(() => annualResultChartsView(this.rows(), this.groupContext.autosave.draft()?.analysisCategory, this.unit()));
}
