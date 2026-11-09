import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisResultsDisplayService, DEFAULT_ANALYSIS_TABLE_COLUMNS } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisMonthlyTableComponent } from './account-analysis-monthly-table.component';

describe('AccountAnalysisMonthlyTableComponent', () => {
  it('pages account results, resets page size, and clamps after a smaller refresh', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ date: new Date(2024, index, 1), fiscalYear: 2024 + Math.floor(index / 12), energyUse: index, missingValueWarning: false }));
    const state = signal({ state: 'ready', annual: [], monthly: rows });
    TestBed.configureTestingModule({ imports: [AccountAnalysisMonthlyTableComponent], providers: [
      { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
      { provide: AccountAnalysisWorkbenchContext, useValue: { analysis: signal({ analysisCategory: 'water', waterUnit: 'gal' }), hasBlockingErrors: signal(false) } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true), selectionItems: signal([]) } },
      { provide: AccountAnalysisResultsService, useValue: { state } },
      { provide: AnalysisResultsDisplayService, useValue: { monthlyColumns: signal(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS)) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisMonthlyTableComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Page 3"]')!.click(); fixture.detectChanges();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(6);
    const size = root.querySelector<HTMLSelectElement>('select')!;
    size.value = Array.from(size.options).find(option => option.textContent?.trim() === '24')!.value;
    size.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(24);
    root.querySelector<HTMLButtonElement>('app-pagination button[aria-label="Next page"]')!.click(); fixture.detectChanges();
    state.set({ state: 'ready', annual: [], monthly: rows.slice(0, 2) }); fixture.detectChanges();
    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(root.querySelector('app-pagination')).toBeNull();
  });

  it('renders fiscal boundaries, missing-data guidance, and only aggregate account fields', () => {
    TestBed.configureTestingModule({ imports: [AccountAnalysisMonthlyTableComponent], providers: [
      { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
      { provide: AccountAnalysisWorkbenchContext, useValue: { analysis: signal({ analysisCategory: 'water', waterUnit: 'gal' }), hasBlockingErrors: signal(false) } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true), selectionItems: signal([]) } },
      { provide: AccountAnalysisResultsService, useValue: { state: signal({ state: 'ready', annual: [], monthly: [{
        date: new Date(2025, 0, 1), fiscalYear: 2025, energyUse: 100, adjusted: 90,
        baselineAdjustmentForNormalization: 2, baselineAdjustmentForOtherV2: 1, baselineAdjustment: 3,
        savings: 10, rollingSavings: 20, rolling12MonthImprovement: 5, missingValueWarning: true,
        isIntermediateBanked: false
      }] }) } },
      { provide: AnalysisResultsDisplayService, useValue: { monthlyColumns: signal({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), savings: true, rollingSavings: true, rolling12MonthImprovement: true }) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisMonthlyTableComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Fiscal year');
    expect(text).toContain('Some months contain incomplete data');
    expect(text).not.toContain('Production Variables');
    expect(fixture.nativeElement.querySelector('tbody tr')?.classList).toContain('v1-analysis-results__fiscal-year-end');
  });
});
