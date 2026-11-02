import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { accountReportSnapshot } from '@app/v1/reports/account/testing/account-report-test-fixtures';
import { AccountHomeComponent } from '@app/v1/account/home/account-home.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityHomeComponent } from './facility-home.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

describe('FacilityHomeComponent', () => {
  it('displays the selected facility name', () => {
    const fixture: ComponentFixture<FacilityHomeComponent> = TestBed.configureTestingModule({
      declarations: [FacilityHomeComponent],
      imports: [IconsModule],
      providers: [
        { provide: WorkspaceNavigationService, useValue: createNavigation() },
        { provide: WorkspaceStatusService, useValue: createStatus() }
      ]
    }).createComponent(FacilityHomeComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Facility A');
  });
});

function createNavigation() {
  return {
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
    contextCounts: vi.fn(() => ({ facilities: 1, meters: 4, predictors: 2, analyses: 3, reports: 1 }))
  };
}

function createStatus() {
  return {
    state: vi.fn(() => 'ready'),
    selectedFacilitySummary: vi.fn(() => ({ state: 'valid', total: 0, errorCount: 0, warningCount: 0, infoCount: 0 }))
  };
}

describe('Home counts with real workspace navigation', () => {
  async function setup(single: boolean) {
    const store = new AccountWorkspaceStore(); const base = accountReportSnapshot(single);
    const facilityGuid = base.facilities[0].guid, accountGuid = base.account.guid;
    store.publish({ ...base,
      meters: Array.from({ length: 4 }, (_, i) => ({ ...getNewIdbUtilityMeter(facilityGuid, accountGuid, true, 'MMBtu'), guid: `meter-${i}` })),
      predictors: Array.from({ length: 2 }, (_, i) => ({ ...getNewIdbPredictor(accountGuid, facilityGuid), guid: `predictor-${i}` }))
    });
    const summary = signal({ state: 'valid', total: 0, errorCount: 0, warningCount: 0, infoCount: 0 });
    TestBed.configureTestingModule({ declarations: [FacilityHomeComponent, AccountHomeComponent], providers: [
      provideRouter([
        { path: 'v1/workspace/facility/:facilityGuid/home/overview', component: FacilityHomeComponent },
        { path: 'v1/workspace/account/:accountGuid/home/overview', component: AccountHomeComponent }
      ]),
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: { selectAccount: vi.fn(async () => 'published') } },
      { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [base.account] } },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), selectedFacilitySummary: summary, accountSummary: summary, accountTodos: signal([]), discardedItems: signal([]) } }
    ] });
    const harness = await RouterTestingHarness.create();
    const navigation = TestBed.inject(WorkspaceNavigationService);
    return { store, base, harness, navigation, router: TestBed.inject(Router) };
  }
  function metrics(root: HTMLElement) {
    return Object.fromEntries([...root.querySelectorAll('.v1-home__metrics article')].map(item => [item.querySelector('span')!.textContent!.trim(), item.querySelector('strong')!.textContent!.trim()]));
  }
  it('opens a single-facility company from Welcome and renders all four counts without counting hidden analysis pairs', async () => {
    const view = await setup(true);
    await view.navigation.openWorkspace(view.base.account.guid); view.harness.detectChanges();
    expect(view.router.url).toBe('/v1/workspace/facility/facility-a/home/overview');
    expect(metrics(view.harness.routeNativeElement!)).toEqual({ Meters: '4', Predictors: '2', Analyses: '1', Reports: '2' });
    expect(view.navigation.panelContent().results.map(item => item.label)).toEqual(['Meters', 'Predictors', 'Analyses', 'Reports']);
    // Publishing new data and converting presentation must not shift Home metrics.
    view.store.publish({ ...view.store.snapshot()!, predictors: [] }); view.harness.detectChanges();
    expect(metrics(view.harness.routeNativeElement!).Predictors).toBe('0');
    view.store.publish({ ...view.store.snapshot()!, account: { ...view.base.account, isSingleFacilityCompany: false } }); view.harness.detectChanges();
    expect(metrics(view.harness.routeNativeElement!)).toEqual({ Meters: '4', Predictors: '0', Analyses: '1', Reports: '1' });
  });
  it('supports direct single-facility Home entry', async () => {
    const view = await setup(true);
    await view.harness.navigateByUrl('/v1/workspace/facility/facility-a/home/overview', FacilityHomeComponent);
    expect(metrics(view.harness.routeNativeElement!).Reports).toBe('2');
  });
  it('retains combined account Home counts for a portfolio containing one facility', async () => {
    const view = await setup(false);
    await view.navigation.openWorkspace(view.base.account.guid); view.harness.detectChanges();
    expect(view.router.url).toBe('/v1/workspace/account/account-a/home/overview');
    expect(metrics(view.harness.routeNativeElement!)).toEqual({ Facilities: '1', Meters: '4', Analyses: '2', Reports: '2' });
    await view.harness.navigateByUrl('/v1/workspace/facility/facility-a/home/overview', FacilityHomeComponent);
    expect(metrics(view.harness.routeNativeElement!)).toEqual({ Meters: '4', Predictors: '2', Analyses: '1', Reports: '1' });
  });
});
