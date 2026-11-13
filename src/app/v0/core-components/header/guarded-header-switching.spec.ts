import '@angular/compiler';
import { Component, InjectionToken, Injector, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { accountReadyGuard, dataManagementChildGuard } from '@app/routing/workspace-readiness.guards';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccount } from '@data/models/idbModels/account';
import { canDeactivateGuard } from '@v0/routing/can-deactivate.guard';
import { HeaderComponent } from './header.component';

const EDITOR = new InjectionToken<{ value: string; finish: () => Promise<boolean> }>('header switch editor');

@Component({ standalone: true, template: '<p>{{editor.value}}</p>' })
class HeaderSwitchEditorComponent {
  readonly editor = inject(EDITOR);
  canDeactivate(): Promise<boolean> { return this.editor.finish(); }
}

@Component({ standalone: true, template: '<p>Account Home</p>' })
class HeaderSwitchHomeComponent { }

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => resolve = complete);
  return { promise, resolve };
}

function snapshot(guid: string): AccountWorkspaceSnapshot {
  return {
    account: { id: guid === 'account-a' ? 1 : 2, guid, name: guid } as IdbAccount,
    facilities: [{ id: 10, guid: `facility-${guid}`, accountId: guid } as any], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [],
    accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], savedVisualizations: [], energyUseEquipment: []
  };
}

async function createHarness(url = '/data-evaluation/account/analysis/setup') {
  const store = new AccountWorkspaceStore();
  store.publish(snapshot('account-a'));
  const account = snapshot('account-b').account;
  const editor = { value: 'Unsaved model notes', finish: vi.fn(async () => true) };
  const events: string[] = [];
  const workspace = {
    selectAccount: vi.fn(async (guid: string) => {
      events.push('select:' + guid);
      const loaded = snapshot(guid);
      store.publish(loaded, { facility: loaded.facilities[0] });
      return 'published';
    })
  };
  const lifecycle = {
    initialize: vi.fn(async () => ({ status: 'ready' })),
    usableAccounts: () => [snapshot('account-a').account, account]
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'data-evaluation/account', canActivate: [accountReadyGuard], runGuardsAndResolvers: 'always', children: [
          { path: 'analysis/setup', component: HeaderSwitchEditorComponent, canDeactivate: [canDeactivateGuard] },
          { path: 'home', component: HeaderSwitchHomeComponent }
        ] },
        { path: 'data-management/:id', canActivateChild: [dataManagementChildGuard], children: [
          { path: '', pathMatch: 'full', redirectTo: 'home' },
          { path: 'home', component: HeaderSwitchHomeComponent },
          { path: 'facilities/:facilityId', component: HeaderSwitchHomeComponent },
          { path: 'tools', component: HeaderSwitchHomeComponent }
        ] }
      ]),
      { provide: EDITOR, useValue: editor },
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: workspace },
      { provide: ApplicationLifecycleService, useValue: lifecycle }
    ]
  });
  const harness = await RouterTestingHarness.create(url);
  const router = TestBed.inject(Router);
  const header = new HeaderComponent(
    router, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } as any,
    workspace as any, {} as any, { showToast: vi.fn() } as any, {} as any, {} as any, {} as any,
    lifecycle as any, store, {} as any, {} as any, TestBed.inject(Injector)
  );
  header.activeAccount = store.account();
  header.inDataEvaluation = !url.includes('data-management');
  return { store, account, editor, events, workspace, harness, router, header };
}

describe('guarded header account switching', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('preserves the original account and draft when leaving is canceled', async () => {
    const h = await createHarness();
    const originalEditor = h.harness.routeDebugElement.componentInstance;
    h.editor.finish.mockResolvedValue(false);
    await h.header.switchAccount(h.account);
    expect(h.store.account().guid).toBe('account-a');
    expect(h.workspace.selectAccount).not.toHaveBeenCalled();
    expect(h.router.url).toBe('/data-evaluation/account/analysis/setup');
    expect(h.harness.routeDebugElement.componentInstance).toBe(originalEditor);
    expect(h.editor.value).toBe('Unsaved model notes');
  });

  it('finishes saving before the readiness guard selects the next account', async () => {
    const h = await createHarness();
    const started = deferred();
    const saved = deferred();
    h.editor.finish.mockImplementation(async () => {
      h.events.push('save-start');
      started.resolve();
      await saved.promise;
      h.events.push('saved');
      return true;
    });
    const switching = h.header.switchAccount(h.account);
    await started.promise;
    expect(h.store.account().guid).toBe('account-a');
    expect(h.workspace.selectAccount).not.toHaveBeenCalled();
    saved.resolve();
    await switching;
    expect(h.events).toEqual(['save-start', 'saved', 'select:account-b']);
    expect(h.store.account().guid).toBe('account-b');
    expect(h.router.url).toBe('/data-evaluation/account/home');
  });

  it('reruns account readiness when switching accounts while already at Account Home', async () => {
    const h = await createHarness('/data-evaluation/account/home');
    await h.header.switchAccount(h.account);
    expect(h.workspace.selectAccount).toHaveBeenCalledExactlyOnceWith('account-b');
    expect(h.store.account().guid).toBe('account-b');
    expect(h.router.url).toBe('/data-evaluation/account/home');
  });

  it('uses the requested data-management account URL to load its workspace', async () => {
    const h = await createHarness('/data-management/account-a/home');
    await h.header.switchAccount(h.account);
    expect(h.workspace.selectAccount).toHaveBeenCalledExactlyOnceWith('account-b');
    expect(h.store.account().guid).toBe('account-b');
    expect(h.router.url).toBe('/data-management/account-b/home');
  });

  it('does not replace a newer accepted destination with the remembered facility', async () => {
    const h = await createHarness('/data-management/account-a/facilities/facility-account-a');
    const navigate = h.router.navigateByUrl.bind(h.router);
    vi.spyOn(h.router, 'navigateByUrl').mockImplementation(async (url, options) => {
      const accepted = await navigate(url, options);
      if (url === '/data-management/account-b') {
        await navigate('/data-management/account-b/tools');
      }
      return accepted;
    });
    await h.header.switchAccount(h.account);
    expect(h.store.account().guid).toBe('account-b');
    expect(h.router.url).toBe('/data-management/account-b/tools');
  });

});
