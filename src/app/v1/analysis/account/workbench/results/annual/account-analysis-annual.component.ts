import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultColumnChooserComponent } from '@app/v1/shared/analysis-results/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultsDisplayService } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { AnalysisResultMarkersComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { annualResultMarkers, orderedUniqueResultMarkers } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';
import { annualImprovementChartMetrics, annualImprovementChartRows, annualUseChartMetrics, annualUseChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';

@Component({
  selector: 'app-account-analysis-annual',
  standalone: true,
  imports: [CommonModule, MeterResultsChartComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe, AnalysisResultMarkersComponent, AnalysisResultMarkerLegendComponent],
  templateUrl: './account-analysis-annual.component.html',
  styleUrls: ['./account-analysis-annual.component.css']
})
export class AccountAnalysisAnnualComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  readonly displaySettings = inject(AnalysisResultsDisplayService);
  readonly columns = this.displaySettings.annualColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly rowViews = computed(() => this.rows().map(row => ({ row, markers: annualResultMarkers(row) })));
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
  readonly hasBanking = computed(() => this.selection.selectionItems().some(item => item.selectedAnalysis?.hasBanking === true));
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly useColumnCount = computed(() => {
    const columns = this.columns();
    return [columns.actualEnergy, columns.adjusted, columns.baselineAdjustmentForNormalization, columns.baselineAdjustmentForOther, columns.baselineAdjustment].filter(Boolean).length;
  });
  readonly improvementColumnCount = computed(() => {
    const columns = this.columns();
    return [columns.SEnPI, this.hasBanking() && columns.bankedSavings, this.hasBanking() && columns.savingsUnbanked, columns.savings, columns.totalSavingsPercentImprovement, columns.newSavings, columns.annualSavingsPercentImprovement, columns.cummulativeSavings].filter(Boolean).length;
  });
  readonly useChartRows = computed(() => annualUseChartRows(this.rows()));
  readonly improvementChartRows = computed(() => annualImprovementChartRows(this.rows()));
  readonly useChartMetrics = computed(() => annualUseChartMetrics(this.context.analysis()?.analysisCategory, this.unit()));
  readonly improvementChartMetrics = computed(() => annualImprovementChartMetrics(this.context.analysis()?.analysisCategory));
  readonly useChartYAxisTitle = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? `Consumption${this.unit() ? ` (${this.unit()})` : ''}`
    : `Energy Use${this.unit() ? ` (${this.unit()})` : ''}`);
}
