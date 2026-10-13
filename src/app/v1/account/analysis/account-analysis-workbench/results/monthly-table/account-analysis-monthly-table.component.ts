import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { DEFAULT_TIME_PERIOD_PAGE_SIZE, TIME_PERIOD_PAGE_SIZE_OPTIONS } from '@shared/table-pagination';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisResultColumnChooserComponent } from '@app/v1/shared/analysis-results/column-chooser/analysis-result-column-chooser.component';
import { AnalysisResultsDisplayService } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { AnalysisResultMarkersComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers/analysis-result-markers.component';
import { monthlyResultMarkers, orderedUniqueResultMarkers } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';

type AnalysisResultColumnSection = 'period' | 'use' | 'improvement';

@Component({
  selector: 'app-account-analysis-monthly-table', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbPaginationModule, IconComponent, AnalysisResultStatusComponent, AnalysisResultColumnChooserComponent, AnalysisResultNumberPipe, AnalysisResultMarkersComponent, AnalysisResultMarkerLegendComponent],
  templateUrl: './account-analysis-monthly-table.component.html',
  styleUrls: ['./account-analysis-monthly-table.component.css']
})
export class AccountAnalysisMonthlyTableComponent {
  private readonly copyTableService = inject(CopyTableService);
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  readonly displaySettings = inject(AnalysisResultsDisplayService);
  readonly columns = this.displaySettings.monthlyColumns;
  readonly rows = computed(() => { const state = this.results.state(); return state.state === 'ready' ? state.monthly : []; });
  readonly rowViews = computed(() => this.rows().map((row, index, rows) => ({ row, markers: monthlyResultMarkers(row), isFiscalYearEnd: rows[index + 1]?.fiscalYear !== row.fiscalYear })));
  readonly hasMissingValues = computed(() => this.rows().some(row => row.missingValueWarning));
  readonly legendMarkers = computed(() => orderedUniqueResultMarkers(this.rowViews().flatMap(view => view.markers)));
  readonly hasBanking = computed(() => this.selection.selectionItems().some(item => item.selectedAnalysis?.hasBanking === true));
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly currentPage = signal(1);
  readonly pageSizeControl = new FormControl(DEFAULT_TIME_PERIOD_PAGE_SIZE, { nonNullable: true });
  readonly pageSize = toSignal(this.pageSizeControl.valueChanges, { initialValue: this.pageSizeControl.value });
  readonly pageSizeOptions = [...TIME_PERIOD_PAGE_SIZE_OPTIONS];
  readonly copyingTable = signal(false);
  readonly hoveredColumnId = signal<string | undefined>(undefined);
  readonly hoveredSection = signal<AnalysisResultColumnSection | undefined>(undefined);
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.rowViews().length / this.pageSize())));
  readonly displayedRows = computed(() => { const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize(); return this.rowViews().slice(start, start + this.pageSize()); });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly useColumnCount = computed(() => { const columns = this.columns(); return [columns.actualEnergy, columns.adjusted, columns.baselineAdjustmentForNormalization, columns.baselineAdjustmentForOther, columns.baselineAdjustment].filter(Boolean).length; });
  readonly improvementColumnCount = computed(() => { const columns = this.columns(); return [columns.SEnPI, this.hasBanking() && columns.bankedSavings, this.hasBanking() && columns.savingsUnbanked, columns.savings, columns.rollingSavings, columns.rolling12MonthImprovement].filter(Boolean).length; });
  private readonly clampCurrentPage = effect(() => { if (this.currentPage() > this.maxPage()) this.currentPage.set(this.maxPage()); });
  private readonly resetCurrentPage = effect(() => { this.pageSize(); this.currentPage.set(1); });
  @ViewChild('monthlyResultsTable', { static: false }) monthlyResultsTable?: ElementRef<HTMLTableElement>;

  copyTable(): void {
    if (!this.monthlyResultsTable) return;
    this.copyingTable.set(true);
    setTimeout(() => { this.copyTableService.copyTable(this.monthlyResultsTable!); this.copyingTable.set(false); }, 200);
  }
  setColumnHover(columnId?: string, section?: AnalysisResultColumnSection): void { this.hoveredColumnId.set(columnId); this.hoveredSection.set(section); }
}
