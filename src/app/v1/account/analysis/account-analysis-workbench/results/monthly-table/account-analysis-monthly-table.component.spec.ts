import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisResultsDisplayService, DEFAULT_ANALYSIS_TABLE_COLUMNS } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisMonthlyTableComponent } from './account-analysis-monthly-table.component';

describe('AccountAnalysisMonthlyTableComponent', () => {
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
