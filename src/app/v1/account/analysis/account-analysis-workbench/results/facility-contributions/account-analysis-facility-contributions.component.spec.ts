import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { AccountAnalysisFacilityContributionsComponent } from './account-analysis-facility-contributions.component';

describe('AccountAnalysisFacilityContributionsComponent', () => {
  it('renders contribution rows and a facility group-contributions link', () => {
    TestBed.configureTestingModule({ imports: [AccountAnalysisFacilityContributionsComponent], providers: [
      provideRouter([]),
      { provide: WorkspaceNavigationService, useValue: {
        facilityAnalysisResultsRoute: (facilityGuid: string, analysisGuid: string, tab: string) => ['/facility', facilityGuid, analysisGuid, tab]
      } },
      { provide: AccountAnalysisWorkbenchContext, useValue: {
        account: signal({ guid: 'account-a' }), analysis: signal({ guid: 'account-analysis-a', analysisCategory: 'energy', energyUnit: 'MMBtu' }),
        facilities: signal([{ guid: 'facility-a', name: 'North Plant' }]), hasBlockingErrors: signal(false)
      } },
      { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady: signal(true) } },
      { provide: AccountAnalysisResultsService, useValue: { state: signal({ state: 'ready', annual: [{ year: 2025, adjusted: 100, savings: 10, totalSavingsPercentImprovement: 10 }], facilitySummaries: [{
        facilityGuid: 'facility-a', analysisGuid: 'analysis-a', monthlySummaryData: [{ fiscalYear: 2025, savings: 10, adjusted: 100 }]
      }] }) } }
    ] });
    const fixture = TestBed.createComponent(AccountAnalysisFacilityContributionsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('North Plant');
    expect(fixture.nativeElement.textContent).toContain('View group contributions');
    expect(fixture.componentInstance.view().years[0].facilities[0].contributionPercent).toBe(10);
    expect(fixture.componentInstance.heatmapHeight()).toBe(220);
    expect(fixture.nativeElement.querySelector('a.v1-text-link')?.getAttribute('href')).toContain(
      'returnAccountGuid=account-a&returnAccountAnalysisGuid=account-analysis-a&returnFacilityGuid=facility-a'
    );
    expect(fixture.nativeElement.querySelector('a.v1-text-link')?.getAttribute('href')).toContain(
      'returnAccountResultTab=facility-contributions'
    );
  });
});
