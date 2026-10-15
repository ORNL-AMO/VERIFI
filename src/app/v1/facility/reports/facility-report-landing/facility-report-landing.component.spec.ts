import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityReportsModule } from '../facility-reports.module';
import { reportFacility, reportFixture, reportSnapshot } from '../testing/report-test-fixtures';
import { FacilityReportLandingComponent } from './facility-report-landing.component';

describe('FacilityReportLandingComponent', () => {
  it('opens the exact saved report without writes and never substitutes a wrong-owner record', async () => {
    const store = new AccountWorkspaceStore();
    store.publish(reportSnapshot(), { facility: reportFacility });
    const guid = signal('report-a');
    await TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceNavigationService, useValue: {
        routeState: signal({ facilityGuid: 'facility-a' }), activeReportGuid: guid,
        facilityReportsRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'reports', 'dashboard']
      } }, { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]) } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(FacilityReportLandingComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Saved report');
    expect(store.committedRevision()).toBeUndefined();
    guid.set('missing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report unavailable');
    guid.set('report-a');
    store.publish(reportSnapshot([reportFixture({ facilityId: 'facility-b' })]), { facility: reportFacility });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report unavailable');
    expect(store.committedRevision()).toBeUndefined();
    const hidden = reportSnapshot([reportFixture({ facilityReportType: 'emissionFactors' })]);
    store.publish({ ...hidden, account: { ...hidden.account, displayEmissions: false } }, { facility: reportFacility });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Other Impacts');
    expect(store.facilityReports()[0].facilityReportType).toBe('emissionFactors');
  });
});
