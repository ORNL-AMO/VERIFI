import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { reportFacility, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceNavigationService } from './workspace-navigation.service';
import { inventoryScopeChangeGuard } from './inventory-scope-change.guard';

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet/>' })
class ScopeHost {}
@Component({ standalone: true, template: '<h1>Inventory</h1>' })
class ScopeDestination {}


export async function setupFacilityScopeNavigation(url = '/v1/workspace/account/account-a/data/portfolio/meters') {
  const store = new AccountWorkspaceStore();
  const snapshot = { ...reportSnapshot(), facilities: [reportFacility, { ...reportFacility, guid: 'facility-b', name: 'Facility B' }] };
  store.publish(snapshot, { facility: reportFacility });
  const canLeave = signal(true);
  const workspaceService = { selectFacility: vi.fn() };
  const status = { state: signal('ready'), items: signal<StatusItem[]>([]), accountTodos: signal<StatusItem[]>([]), discardedItems: signal<StatusItem[]>([]) };
  TestBed.configureTestingModule({ imports: [ScopeHost], providers: [
    provideRouter([
      { path: 'v1', component: ScopeDestination },
      { path: 'v1/workspace/account/:accountGuid', canActivateChild: [inventoryScopeChangeGuard], children: [
        { path: 'data/portfolio', pathMatch: 'full', redirectTo: 'data/portfolio/facilities' },
          { path: 'data/portfolio/:tab', component: ScopeDestination, runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
        { path: 'analysis/dashboard', component: ScopeDestination, runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
        { path: 'reports/dashboard', component: ScopeDestination, runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
        { path: 'analysis/workbench/:guid/setup', component: ScopeDestination, canDeactivate: [() => canLeave()] },
        { path: 'settings/:detail', component: ScopeDestination },
        { path: 'imports/upload', component: ScopeDestination }
      ] },
      { path: 'v1/workspace/facility/:facilityGuid/data/meters/:guid/settings', component: ScopeDestination, canDeactivate: [() => canLeave()] },
      { path: 'v1/workspace/facility/:facilityGuid/analysis/workbench/:guid/:stage', component: ScopeDestination, canDeactivate: [() => canLeave()] },
      { path: 'v1/workspace/facility/:facilityGuid/reports/workbench/:guid/setup', component: ScopeDestination, canDeactivate: [() => canLeave()] },
      { path: 'v1/workspace/facility/:facilityGuid/settings/:detail', component: ScopeDestination }
    ]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: AccountWorkspaceService, useValue: workspaceService },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [snapshot.account] } },
    { provide: WorkspaceStatusService, useValue: status }
  ] });
  const navigation = TestBed.inject(WorkspaceNavigationService);
  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(ScopeHost); fixture.detectChanges();
  await router.navigateByUrl(url); fixture.detectChanges(); await fixture.whenStable();
  return { store, router, navigation, fixture, workspaceService, canLeave, status };
}
