import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisMonthlyChartComponent } from './account-analysis-monthly-chart.component';

describe('AccountAnalysisMonthlyChartComponent', () => {
  it('uses aggregate rolling savings and losses without facility banking splits', () => {
    TestBed.configureTestingModule({ imports: [AccountAnalysisMonthlyChartComponent], providers: [
      { provide: AccountAnalysisWorkbenchContext, useValue: { analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu' }), hasBlockingErrors: signal(false) } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true) } },
      { provide: AccountAnalysisResultsService, useValue: { state: signal({ state: 'ready', annual: [], monthly: [
        { date: new Date(2025, 0, 1), energyUse: 100, adjusted: 90, rolling12MonthImprovement: 5, isBanked: true, isIntermediateBanked: false },
        { date: new Date(2025, 1, 1), energyUse: 110, adjusted: 100, rolling12MonthImprovement: -2, isBanked: false, isIntermediateBanked: false }
      ] }) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisMonthlyChartComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.savingsChart().metrics.map(metric => metric.id)).toEqual(['losses', 'savings']);
    expect(fixture.componentInstance.savingsChart().rows.map(row => row.values)).toEqual([
      { savings: 5, losses: 0 }, { savings: 0, losses: -2 }
    ]);
    expect(fixture.nativeElement.querySelectorAll('app-meter-results-chart')).toHaveLength(2);
  });
});
