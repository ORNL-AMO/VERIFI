import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { SectionNavModule } from '../section-nav.module';
import { ReportsNavComponent } from './reports-nav.component';

describe('ReportsNavComponent', () => {
  it('groups owned reports by type, sorts their names, and highlights the selected report', async () => {
    const active = signal<string | undefined>('z');
    const account = signal({ guid: 'account-a', displayEmissions: false });
    await TestBed.configureTestingModule({ imports: [SectionNavModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: {
        account, facilityReports: signal([
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
    expect(sections[0].querySelectorAll('app-ui-icon[name="report"]')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('a app-ui-icon[name="reports"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent).toContain('Zebra');
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
});
