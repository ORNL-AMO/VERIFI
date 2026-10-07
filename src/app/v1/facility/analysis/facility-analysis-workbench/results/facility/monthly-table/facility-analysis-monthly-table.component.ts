import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { DEFAULT_TIME_PERIOD_PAGE_SIZE, TIME_PERIOD_PAGE_SIZE_OPTIONS } from '@shared/table-pagination';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { AnalysisResultStatusComponent } from '../../presentation/status/analysis-result-status.component';
import { AnalysisResultNumberPipe } from '../../presentation/number/analysis-result-number.pipe';
import { AnalysisResultColumnChooserComponent } from '../../presentation/column-chooser/analysis-result-column-chooser.component';
import { FacilityAnalysisResultsDisplayService } from '../../presentation/facility-analysis-results-display.service';
import { AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { AnalysisResultMarkersComponent } from '../../presentation/result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultMarkerLegendComponent } from '../../presentation/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import {
  AnalysisResultMarker,
  monthlyResultMarkers,
  orderedUniqueResultMarkers
} from '../../presentation/result-markers/analysis-result-markers';

type AnalysisResultColumnSection = 'period' | 'use' | 'predictors' | 'improvement';

@Component({
  selector: 'app-facility-analysis-monthly-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbPaginationModule, IconComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe, AnalysisResultMarkersComponent, AnalysisResultMarkerLegendComponent],
  templateUrl: './facility-analysis-monthly-table.component.html',
  styleUrls: ['./facility-analysis-monthly-table.component.css']
})
export class FacilityAnalysisMonthlyTableComponent {
  private readonly copyTableService = inject(CopyTableService);
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
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
    predictors: Object.fromEntries(
      (row.predictorUsage ?? []).map(item => [item.predictorId, item.usage])
    ) as Readonly<Record<string, number>>,
    isFiscalYearEnd: rows[index + 1]?.fiscalYear !== row.fiscalYear
  })));
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
  readonly currentPage = signal(1);
  readonly pageSizeControl = new FormControl(DEFAULT_TIME_PERIOD_PAGE_SIZE, { nonNullable: true });
  readonly pageSize = toSignal(this.pageSizeControl.valueChanges, { initialValue: this.pageSizeControl.value });
  readonly pageSizeOptions = [...TIME_PERIOD_PAGE_SIZE_OPTIONS];
  readonly copyingTable = signal(false);
  readonly hoveredColumnId = signal<string | undefined>(undefined);
  readonly hoveredSection = signal<AnalysisResultColumnSection | undefined>(undefined);
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
      columns.rollingSavings,
      columns.rolling12MonthImprovement
    ].filter(Boolean).length;
  });
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

  @ViewChild('monthlyResultsTable', { static: false }) monthlyResultsTable?: ElementRef<HTMLTableElement>;

  copyTable(): void {
    if (!this.monthlyResultsTable) return;
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.monthlyResultsTable!);
      this.copyingTable.set(false);
    }, 200);
  }

  setColumnHover(columnId?: string, section?: AnalysisResultColumnSection): void {
    this.hoveredColumnId.set(columnId);
    this.hoveredSection.set(section);
  }
}
