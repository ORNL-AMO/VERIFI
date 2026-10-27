import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { reportAccount, reportFacility, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { SectionNavModule } from '../section-nav.module';
import { ReportsNavComponent } from './reports-nav.component';

describe('ReportsNavComponent', () => {
  it('groups owned reports by type, sorts their names, and highlights the selected report', async () => {
    const active = signal<string | undefined>('z');
    const account = signal({ guid: 'account-a', displayEmissions: false });
    await TestBed.configureTestingModule({ imports: [SectionNavModule], providers: [provideRouter([]),
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]) } },
      { provide: AccountWorkspaceStore, useValue: {
        account, selectedFacilityAnalyses: signal([]), facilityReports: signal([
          { guid: 'z', name: 'Zebra', facilityReportType: 'analysis', facilityId: 'facility-a', accountId: 'account-a' },
          { guid: 'a', name: 'Alpha', facilityReportType: 'analysis', facilityId: 'facility-a', accountId: 'account-a' },
          { guid: 'overview', name: 'Overview report', facilityReportType: 'overview', facilityId: 'facility-a', accountId: 'account-a' },
          { guid: 'other', name: 'Other facility', facilityReportType: 'analysis', facilityId: 'facility-b', accountId: 'account-a' },
          { guid: 'other-owner', name: 'Other account', facilityReportType: 'savings', facilityId: 'facility-a', accountId: 'account-b' },
          { guid: 'factors', name: 'Factors report', facilityReportType: 'emissionFactors', facilityId: 'facility-a', accountId: 'account-a' }
        ])
      } }, { provide: WorkspaceNavigationService, useValue: {
        account: signal({ guid: 'account-a' }), routeState: signal({ facilityGuid: 'facility-a' }), activeReportGuid: active,
        contextMode: signal('facility'), isSingleSiteWorkspace: signal(true),
        facilityReportsRoute: () => ['/reports/dashboard'], accountReportsRoute: () => ['/account/reports/dashboard'],
        facilityReportWorkbenchRoute: (_facility: string, guid: string) => ['/reports/workbench', guid, 'setup']
      } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ReportsNavComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#reports-nav-title').textContent.trim()).toBe('Facility Reports');
    expect(fixture.componentInstance.reportGroups().map(group => ({ id: group.id, reports: group.reports.map(report => report.guid) })))
      .toEqual([{ id: 'analysis', reports: ['a', 'z'] }, { id: 'overview', reports: ['overview'] }]);
    const sections: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.v1-nav__report-section'));
    expect(sections.map(section => section.querySelector('.v1-nav__sublabel')?.textContent)).toEqual(['Analysis', 'Data Overview']);
    expect(sections.every(section => section.querySelector(`#${section.getAttribute('aria-labelledby')}`))).toBe(true);
    expect(fixture.debugElement.queryAll(By.css('.v1-nav__report-section:first-of-type .v1-nav__report-entry > a app-ui-icon'))
      .map(icon => icon.componentInstance.name)).toEqual(['report', 'report']);
    expect(fixture.nativeElement.querySelector('a app-ui-icon[name="reports"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-expanded="true"]').textContent).toContain('Zebra');
    expect(fixture.nativeElement.querySelectorAll('app-analysis-stage-navigation')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Setup');
    expect(fixture.componentInstance.activeStages().map(stage => stage.id)).toEqual(['setup', 'data-checks', 'report']);
    expect(fixture.componentInstance.activeStages()[0].completed).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-analysis-stages__marker.is-complete')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Analysis Report');
    active.set('overview');
    fixture.detectChanges();
    expect(fixture.componentInstance.activeStages().map(stage => stage.id)).toEqual(['setup', 'report']);
    active.set('z');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Account Reports');
    expect(fixture.nativeElement.textContent).not.toContain('Other facility');
    expect(fixture.nativeElement.textContent).not.toContain('Other account');
    expect(fixture.nativeElement.textContent).not.toContain('Savings');
    expect(fixture.nativeElement.textContent).not.toContain('Factors report');
    account.set({ guid: 'account-a', displayEmissions: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Factors report');
    expect(fixture.componentInstance.reportGroups().map(group => group.id)).toEqual(['analysis', 'overview', 'emissionFactors']);
  });
  it('groups account reports by type, highlights the selected landing, and preserves hidden impact reports', async () => {
    const store = new AccountWorkspaceStore();
    const base = getNewIdbAccountReport(reportAccount, [reportFacility], []);
    store.publish({ ...reportSnapshot(), account: { ...reportAccount, displayEmissions: false }, accountReports: [
      { ...base, guid: 'z', name: 'Zebra', reportType: 'analysis' }, { ...base, guid: 'a', name: 'Alpha', reportType: 'analysis' },
      { ...base, guid: 'plants', name: 'Better Plants report', reportType: 'betterPlants' },
      { ...base, guid: 'factors', name: 'Hidden factors', reportType: 'accountEmissionFactors' },
      { ...base, guid: 'other', name: 'Wrong account', accountId: 'account-b', reportType: 'analysis' }
    ] });
    const active = signal<string | undefined>('z');
    await TestBed.configureTestingModule({ imports: [SectionNavModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]) } },
      { provide: WorkspaceNavigationService, useValue: {
        account: store.account, routeState: signal({ accountGuid: 'account-a' }), contextMode: signal('account'), activeReportGuid: active,
        accountReportsRoute: () => ['/account/reports/dashboard'],
        accountReportWorkbenchRoute: (_account: string, guid: string) => ['/account/reports/workbench', guid, 'setup']
      } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(ReportsNavComponent); fixture.detectChanges();
    expect(fixture.componentInstance.reportGroups().map(group => group.reports.map(report => report.guid))).toEqual([['plants'], ['a', 'z']]);
    expect(fixture.debugElement.queryAll(By.css('.v1-nav__report-entry > a app-ui-icon')).map(icon => icon.componentInstance.name))
      .toEqual(['betterPlantsReport', 'report', 'report']);
    expect(fixture.nativeElement.querySelector('a[aria-current="page"]').textContent).toContain('Zebra');
    expect(fixture.nativeElement.querySelectorAll('app-analysis-stage-navigation')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toContain('Hidden factors'); expect(fixture.nativeElement.textContent).not.toContain('Wrong account');
    active.set(undefined); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('a[aria-current="page"]').textContent).toContain('Dashboard');
  });

});
