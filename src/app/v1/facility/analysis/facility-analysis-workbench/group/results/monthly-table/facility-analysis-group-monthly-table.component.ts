import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { DEFAULT_TIME_PERIOD_PAGE_SIZE, TIME_PERIOD_PAGE_SIZE_OPTIONS } from '@shared/table-pagination';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import { FacilityAnalysisResultsDisplayService } from '../../../results/presentation/facility-analysis-results-display.service';
import { AnalysisResultStatusComponent } from '../../../results/presentation/status/analysis-result-status.component';
import { AnalysisResultColumnChooserComponent } from '../../../results/presentation/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultNumberPipe } from '../../../results/presentation/number/analysis-result-number.pipe';

type AnalysisResultColumnSection = 'period' | 'use' | 'predictors' | 'improvement';

@Component({
  selector: 'app-facility-analysis-group-monthly-table',
  standalone: true,
  imports: [CommonModule, NgbPaginationModule, IconComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe],
  templateUrl: './facility-analysis-group-monthly-table.component.html',
  styleUrls: ['./facility-analysis-group-monthly-table.component.css']
})
export class FacilityAnalysisGroupMonthlyTableComponent {
  private readonly copyTableService = inject(CopyTableService);
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly results = inject(FacilityAnalysisGroupResultsService);
  readonly displaySettings = inject(FacilityAnalysisResultsDisplayService);
  readonly columns = this.displaySettings.monthlyColumns;
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.monthly : [];
  });
  readonly rowViews = computed(() => this.rows().map((row, index, rows) => ({
    row,
    predictors: Object.fromEntries((row.predictorUsage ?? []).map(item => [item.predictorId, item.usage])),
    isFiscalYearEnd: rows[index + 1]?.fiscalYear !== row.fiscalYear
  })));
  readonly currentPage = signal(1);
  readonly pageSize = signal(DEFAULT_TIME_PERIOD_PAGE_SIZE);
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

  @ViewChild('monthlyResultsTable', { static: false }) monthlyResultsTable?: ElementRef<HTMLTableElement>;

  setPageSize(value: string): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
  }

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
