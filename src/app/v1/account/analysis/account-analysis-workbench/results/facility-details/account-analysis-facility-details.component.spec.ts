import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisFacilityDetailsComponent } from './account-analysis-facility-details.component';

describe('AccountAnalysisFacilityDetailsComponent', () => {
  it('renders a monthly result card for each selected facility', () => {
    TestBed.configureTestingModule({ imports: [AccountAnalysisFacilityDetailsComponent], providers: [
      provideRouter([]),
      { provide: WorkspaceNavigationService, useValue: {
        facilityAnalysisWorkbenchRoute: (facilityGuid: string, analysisGuid: string) => ['/facility', facilityGuid, analysisGuid, 'setup']
      } },
      { provide: AccountAnalysisWorkbenchContext, useValue: {
        account: signal({ guid: 'account-a' }), analysis: signal({ guid: 'account-analysis-a', analysisCategory: 'energy', energyUnit: 'MMBtu' }),
        facilities: signal([{ guid: 'facility-a', name: 'North Plant' }]), hasBlockingErrors: signal(false)
      } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true) } },
      { provide: AccountAnalysisResultsService, useValue: { state: signal({ state: 'ready', facilitySummaries: [{
        facilityGuid: 'facility-a', analysisGuid: 'analysis-a', monthlySummaryData: [{ date: new Date(2025, 0, 1), fiscalYear: 2025, energyUse: 90, adjusted: 100, savings: 10, rolling12MonthImprovement: 10 }]
      }], annual: [{ year: 2025, adjusted: 100 }] }) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisFacilityDetailsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('North Plant');
    expect(fixture.nativeElement.textContent).toContain('10%');
    expect(fixture.nativeElement.textContent).toContain('FY 2025 total savings');
    expect(fixture.nativeElement.textContent).toContain('% contribution to account');
    expect(fixture.nativeElement.querySelectorAll('app-meter-results-chart')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Scrollable facility details');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toContain('/facility/facility-a/analysis-a/setup');
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toContain(
      'returnAccountResultTab=facility-details'
    );
  });
});
