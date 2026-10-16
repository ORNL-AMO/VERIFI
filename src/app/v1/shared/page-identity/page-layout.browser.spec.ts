import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountPortfolioComponent } from '@app/v1/account/data/portfolio/account-portfolio.component';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityMetersComponent } from '@app/v1/facility/data/meters/facility-meters.component';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { MetersDashboardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard.component';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { account, facility } from '@app/v1/facility/data/meters/facility-meters.testing';

describe('account and facility header alignment', () => {
  it('uses the same outer edges, top offset and header height through the real facility wrapper, with scoped validation settings', async () => {
    await page.viewport(1600, 1000);
    const currentAccount = signal(account()), currentFacility = signal(facility());
    const facade = { account: currentAccount, facility: currentFacility, meterCards: signal([]), meterData: signal([]), meterGroups: signal([]),
      facilityCalendarizedMeters: signal([]), statusState: signal('ready'), calendarizationState: signal('ready'), canWrite: signal(true), hasPending: signal(false) };
    TestBed.configureTestingModule({ imports: [AccountDataModule, FacilityMetersComponent, MetersDashboardComponent], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { account: currentAccount, facilities: signal([currentFacility()]), meters: signal([]), predictors: signal([]), energyUseEquipment: signal([]), accountAnalyses: signal([]), facilityAnalyses: signal([]), facilityReports: signal([]), canWrite: signal(true), hasPending: signal(false) } },
      { provide: FacilityMetersWorkspaceService, useValue: facade },
      { provide: WorkspaceNavigationService, useValue: { activePortfolioTab: signal('facilities'), accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'facilities'] } }
    ] });
    TestBed.overrideComponent(FacilityMetersComponent, { set: { providers: [] } });
    TestBed.overrideComponent(MetersDashboardComponent, { set: { providers: [{ provide: MetersDashboardActionsService, useValue: {} }] } });
    const portfolio = TestBed.createComponent(AccountPortfolioComponent);
    const wrapper = TestBed.createComponent(FacilityMetersComponent);
    for (const fixture of [portfolio, wrapper]) {
      fixture.nativeElement.classList.add('v1-root');
      Object.assign(fixture.nativeElement.style, { width: '1100px', height: '350px', minHeight: '0', overflow: 'auto' });
      fixture.detectChanges();
    }
    const dashboard = TestBed.createComponent(MetersDashboardComponent);
    wrapper.nativeElement.querySelector('.v1-facility-meters').append(dashboard.nativeElement); dashboard.detectChanges();
    const rect = (host: HTMLElement) => {
      const header = host.querySelector('header')!.getBoundingClientRect(), root = host.getBoundingClientRect();
      return { left: header.left - root.left, top: header.top - root.top, width: header.width, height: header.height };
    };
    const accountHeader = rect(portfolio.nativeElement), facilityHeader = rect(wrapper.nativeElement);
    expect(facilityHeader.left).toBeCloseTo(accountHeader.left, 0);
    expect(facilityHeader.top).toBeCloseTo(accountHeader.top, 0);
    expect(facilityHeader.width).toBeCloseTo(accountHeader.width, 0);
    expect(facilityHeader.height).toBeCloseTo(accountHeader.height, 0);
    expect(dashboard.nativeElement.querySelector('.v1-facility-meters__validation').getAttribute('href')).toBe('/v1/workspace/facility/facility-a/settings/data-validation');
    dashboard.destroy(); wrapper.destroy(); portfolio.destroy();
  });
});
