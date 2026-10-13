import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisResultsDisplayService, DEFAULT_ANALYSIS_TABLE_COLUMNS } from '@app/v1/shared/analysis-results/display/analysis-results-display.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisAnnualComponent } from './account-analysis-annual.component';

describe('AccountAnalysisAnnualComponent', () => {
  it('renders account annual values, markers, and account-specific charts without predictor columns', () => {
    TestBed.configureTestingModule({ imports: [AccountAnalysisAnnualComponent], providers: [
      { provide: AccountAnalysisWorkbenchContext, useValue: { analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu' }), hasBlockingErrors: signal(false) } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true), selectionItems: signal([{ selectedAnalysis: { hasBanking: true } }]) } },
      { provide: AccountAnalysisResultsService, useValue: { state: signal({ state: 'ready', annual: [{
        year: 2025, energyUse: 100, adjusted: 90, baselineAdjustmentForNormalization: 2,
        baselineAdjustmentForOtherV2: 1, baselineAdjustment: 3, SEnPI: 1.1, savingsBanked: 4,
        savingsUnbanked: 6, savings: 10, totalSavingsPercentImprovement: 10, newSavings: 2,
        annualSavingsPercentImprovement: 3, cummulativeSavings: 12, isBanked: true,
        isIntermediateBanked: false, missingPredictorValue: true
      }], monthly: [] }) } },
      { provide: AnalysisResultsDisplayService, useValue: { annualColumns: signal({ ...structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS), SEnPI: true, savings: true, bankedSavings: true, savingsUnbanked: true }) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisAnnualComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Banked savings');
    expect(fixture.nativeElement.querySelector('tbody tr')?.classList).toContain('v1-analysis-results__missing');
    expect(text).not.toContain('Production Variables');
    expect(fixture.componentInstance.useChartRows()[0].values).toEqual({ actual: 100, calculated: 90 });
    expect(fixture.nativeElement.querySelectorAll('app-meter-results-chart')).toHaveLength(2);
  });
});
