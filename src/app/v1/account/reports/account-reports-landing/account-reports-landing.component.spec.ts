import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountReportsModule } from '../account-reports.module';
import { AccountReportsLandingComponent } from './account-reports-landing.component';

describe('AccountReportsLandingComponent', () => {
  it('links to facility dashboards and handles an account without facilities', async () => {
    const facilities = signal([{ guid: 'facility-a', name: 'Site A' }]);
    await TestBed.configureTestingModule({ imports: [AccountReportsModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { account: signal({ name: 'Account A' }), facilities } },
      { provide: WorkspaceNavigationService, useValue: { facilityReportsRoute: (guid: string) => ['/v1', 'workspace', 'facility', guid, 'reports', 'dashboard'] } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(AccountReportsLandingComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Account A');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/v1/workspace/facility/facility-a/reports/dashboard');
    facilities.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No facilities are available');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
