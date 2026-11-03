import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { AnalysisResultsTableComponent } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.component';
import { AnalysisResultsTableModule } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.module';
import { analysisResultsTableView } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.view';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { DEFAULT_TIME_PERIOD_PAGE_SIZE, TIME_PERIOD_PAGE_SIZE_OPTIONS } from '@shared/table-pagination';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AnalysisResultColumnChooserComponent } from '@app/v1/shared/analysis-results/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultsDisplayService } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import {
  AnalysisResultMarker,
  monthlyResultMarkers,
  orderedUniqueResultMarkers
} from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';

@Component({
  selector: 'app-facility-analysis-monthly-table',
  standalone: true,
  imports: [AnalysisResultsTableModule, CommonModule, ReactiveFormsModule, NgbPaginationModule, IconComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultMarkerLegendComponent],
  templateUrl: './facility-analysis-monthly-table.component.html',
  styleUrls: ['./facility-analysis-monthly-table.component.css']
})
export class FacilityAnalysisMonthlyTableComponent {
  private readonly copyTableService = inject(CopyTableService);
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(AnalysisResultsDisplayService);
  readonly columns = this.displaySettings.monthlyColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly hasBanking = computed(() => this.context.analysis()?.hasBanking === true);
  readonly rowViews = computed(() => this.rows().map((row, index, rows) => ({
    row,
    markers: this.facilityMonthlyMarkers(row.date),
    isFiscalYearEnd: rows[index + 1]?.fiscalYear !== row.fiscalYear
  })));
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
  readonly currentPage = signal(1);
  readonly pageSizeControl = new FormControl(DEFAULT_TIME_PERIOD_PAGE_SIZE, { nonNullable: true });
  readonly pageSize = toSignal(this.pageSizeControl.valueChanges, { initialValue: this.pageSizeControl.value });
  readonly pageSizeOptions = [...TIME_PERIOD_PAGE_SIZE_OPTIONS];
  readonly copyingTable = signal(false);
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.rowViews().length / this.pageSize())));
  readonly displayedRows = computed(() => {
    const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize();
    return this.rowViews().slice(start, start + this.pageSize());
  });
  private readonly clampCurrentPage = effect(() => {
    const maxPage = this.maxPage();
    if (this.currentPage() > maxPage) this.currentPage.set(maxPage);
  });
  private readonly resetCurrentPage = effect(() => {
    this.pageSize();
    this.currentPage.set(1);
  });
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
  readonly tableView = computed(() => analysisResultsTableView(this.displayedRows(), this.columns(),
    this.predictorColumns(), 'monthly', this.hasBanking()));
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);

  private facilityMonthlyMarkers(date: Date): readonly AnalysisResultMarker[] {
    const state = this.results.state();
    if (state.state !== 'ready') return [];
    const target = new Date(date).getTime();
    return orderedUniqueResultMarkers((state.groups ?? []).flatMap(result => {
      const row = result.monthlyAnalysisSummaryData.find(item => new Date(item.date).getTime() === target);
      return row ? monthlyResultMarkers(row) : [];
    }));
  }

  @ViewChild(AnalysisResultsTableComponent) monthlyResultsTable?: AnalysisResultsTableComponent;

  copyTable(): void {
    if (!this.monthlyResultsTable?.table) return;
    this.copyingTable.set(true);
    setTimeout(() => {
      if (this.monthlyResultsTable?.table) this.copyTableService.copyTable(this.monthlyResultsTable.table);
      this.copyingTable.set(false);
    }, 200);
  }
}
