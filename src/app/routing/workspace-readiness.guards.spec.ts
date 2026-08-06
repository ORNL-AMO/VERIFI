import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from '../application-lifecycle/application-lifecycle.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import {
  accountGuidReadyGuard,
  accountReadyGuard,
  dataManagementChildGuard,
  facilityReadyGuard,
  persistenceReadyGuard
} from './workspace-readiness.guards';

describe('workspace readiness guards', () => {
  let store: AccountWorkspaceStore;
  let lifecycle: {
    initialize: ReturnType<typeof vi.fn>;
    persistenceReady: ReturnType<typeof vi.fn>;
    usableAccounts: ReturnType<typeof vi.fn>;
  };
  let workspace: {
    selectAccount: ReturnType<typeof vi.fn>;
    selectFacility: ReturnType<typeof vi.fn>;
  };
  let facilities: { getStoredByGuid: ReturnType<typeof vi.fn> };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    store = new AccountWorkspaceStore();
    lifecycle = {
      initialize: vi.fn().mockResolvedValue({ status: 'ready' }),
      persistenceReady: vi.fn(() => true),
      usableAccounts: vi.fn(() => [
        { id: 1, guid: 'account-a', name: 'Account A' },
        { id: 2, guid: 'account-b', name: 'Account B' }
      ])
    };
    workspace = {
      selectAccount: vi.fn(async (guid: string) => {
        store.publish(createSnapshot(guid));
        return 'published';
      }),
      selectFacility: vi.fn()
    };
    facilities = { getStoredByGuid: vi.fn() };
    router = {
      createUrlTree: vi.fn(commands => ({ commands }))
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApplicationLifecycleService, useValue: lifecycle },
        { provide: AccountWorkspaceService, useValue: workspace },
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: FacilitydbService, useValue: facilities },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('waits for persistence initialization before allowing a persistence route', async () => {
    let resolveStartup: (value: { status: 'ready' }) => void;
    lifecycle.initialize.mockReturnValue(new Promise(resolve => { resolveStartup = resolve; }));

    const result = invoke(persistenceReadyGuard, route(), state('/welcome'));
    let settled = false;
    void result.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveStartup!({ status: 'ready' });
    await expect(result).resolves.toBe(true);
  });

  it('allows persistence-only recovery routes after a later startup step fails', async () => {
    lifecycle.initialize.mockResolvedValue({ status: 'error', error: { step: 'workspace' } });
    lifecycle.persistenceReady.mockReturnValue(true);

    await expect(invoke(persistenceReadyGuard, route(), state('/manage-accounts')))
      .resolves.toBe(true);

    const parent = route({ id: 'account-a' }, undefined, 'data-management/:id');
    const child = route({}, parent, 'help');
    await expect(invoke(dataManagementChildGuard, child, state('/data-management/account-a/help')))
      .resolves.toBe(true);
  });

  it('blocks persistence routes when startup fails before persistence is ready', async () => {
    lifecycle.initialize.mockResolvedValue({ status: 'error', error: { step: 'migrations' } });
    lifecycle.persistenceReady.mockReturnValue(false);

    await expect(invoke(persistenceReadyGuard, route(), state('/manage-accounts')))
      .resolves.toBe(false);
  });

  it('redirects account routes in the empty state and blocks on startup error', async () => {
    lifecycle.initialize.mockResolvedValueOnce({ status: 'empty' });
    await expect(invoke(accountReadyGuard, route(), state('/data-evaluation/account')))
      .resolves.toEqual({ commands: ['/manage-accounts'] });

    lifecycle.initialize.mockResolvedValueOnce({ status: 'error' });
    await expect(invoke(accountReadyGuard, route(), state('/data-evaluation/account')))
      .resolves.toBe(false);
  });

  it('loads an inactive account GUID before activating data management', async () => {
    store.publish(createSnapshot('account-a'));

    await expect(invoke(accountGuidReadyGuard, route({ id: 'account-b' }), state('/data-management/account-b/home')))
      .resolves.toBe(true);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(store.account()?.guid).toBe('account-b');
  });

  it('redirects a missing account GUID to account management', async () => {
    await expect(invoke(accountGuidReadyGuard, route({ id: 'missing' }), state('/data-management/missing/home')))
      .resolves.toEqual({ commands: ['/manage-accounts'] });
  });

  it('allows the active workspace while a newly imported account catalog refresh is pending', async () => {
    store.publish(createSnapshot('imported-account'));
    lifecycle.initialize.mockResolvedValue({ status: 'empty' });
    lifecycle.usableAccounts.mockReturnValue([]);

    await expect(invoke(
      accountGuidReadyGuard,
      route({ id: 'imported-account' }),
      state('/data-management/imported-account/home')
    )).resolves.toBe(true);

    expect(workspace.selectAccount).not.toHaveBeenCalled();
  });

  it('loads a facility owner workspace and selects the facility deep link', async () => {
    store.publish(createSnapshot('account-a'));
    facilities.getStoredByGuid.mockResolvedValue({
      id: 20,
      guid: 'facility-b',
      accountId: 'account-b',
      name: 'Facility B'
    });
    workspace.selectAccount.mockImplementationOnce(async () => {
      store.publish(createSnapshot('account-b', 'facility-b'));
      return 'published';
    });

    await expect(invoke(facilityReadyGuard, route({ id: 'facility-b' }), state('/data-evaluation/facility/facility-b')))
      .resolves.toBe(true);

    expect(workspace.selectAccount).toHaveBeenCalledWith('account-b');
    expect(workspace.selectFacility).toHaveBeenCalledWith('facility-b');
  });

  it('selects an active-workspace facility while a newly imported account catalog refresh is pending', async () => {
    store.publish(createSnapshot('imported-account', 'imported-facility'));
    lifecycle.initialize.mockResolvedValue({ status: 'empty' });
    lifecycle.usableAccounts.mockReturnValue([]);
    facilities.getStoredByGuid.mockResolvedValue({
      id: 30,
      guid: 'imported-facility',
      accountId: 'imported-account',
      name: 'Imported Facility'
    });

    await expect(invoke(
      facilityReadyGuard,
      route({ id: 'imported-facility' }),
      state('/data-evaluation/facility/imported-facility')
    )).resolves.toBe(true);

    expect(workspace.selectAccount).not.toHaveBeenCalled();
    expect(workspace.selectFacility).toHaveBeenCalledWith('imported-facility');
  });

  it('redirects a missing or mismatched facility to the active account home', async () => {
    store.publish(createSnapshot('account-a'));
    facilities.getStoredByGuid.mockResolvedValue(undefined);

    await expect(invoke(facilityReadyGuard, route({ id: 'missing' }), state('/data-evaluation/facility/missing')))
      .resolves.toEqual({ commands: ['/data-evaluation/account/home'] });
  });

  it('keeps invalid data-management facility links in the URL account workspace', async () => {
    store.publish(createSnapshot('account-a'));
    facilities.getStoredByGuid.mockResolvedValue({
      id: 20,
      guid: 'facility-b',
      accountId: 'account-b',
      name: 'Facility B'
    });
    const accountRoute = route({ id: 'account-a' }, undefined, 'data-management/:id');
    const facilitiesRoute = route({}, accountRoute, 'facilities');
    const facilityRoute = route({ id: 'facility-b' }, facilitiesRoute, ':id');

    await expect(invoke(
      facilityReadyGuard,
      facilityRoute,
      state('/data-management/account-a/facilities/facility-b')
    )).resolves.toEqual({ commands: ['/data-management', 'account-a', 'home'] });

    expect(workspace.selectAccount).not.toHaveBeenCalled();
    expect(store.account()?.guid).toBe('account-a');
  });

  it('keeps nested static pages outside account readiness', async () => {
    lifecycle.initialize.mockResolvedValue({ status: 'empty' });
    const parent = route({ id: 'missing' }, undefined, 'data-management/:id');
    const child = route({}, parent, 'privacy');

    await expect(invoke(dataManagementChildGuard, child, state('/data-management/missing/privacy')))
      .resolves.toBe(true);
    expect(workspace.selectAccount).not.toHaveBeenCalled();
  });
});

function invoke(
  guard: Function,
  routeSnapshot: ActivatedRouteSnapshot,
  routerState: RouterStateSnapshot
): Promise<any> {
  const injector = TestBed.inject(EnvironmentInjector);
  return Promise.resolve(runInInjectionContext(injector, () => guard(routeSnapshot, routerState)));
}

function route(
  parameters: Record<string, string> = {},
  parent?: ActivatedRouteSnapshot,
  path?: string
): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(parameters),
    parent: parent ?? null,
    routeConfig: path ? { path } : null
  } as ActivatedRouteSnapshot;
}

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

function createSnapshot(accountGuid: string, facilityGuid?: string): AccountWorkspaceSnapshot {
  return {
    account: { id: accountGuid === 'account-a' ? 1 : 2, guid: accountGuid, name: accountGuid },
    facilities: facilityGuid ? [{ id: 20, guid: facilityGuid, accountId: accountGuid, name: facilityGuid }] : [],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;
}
