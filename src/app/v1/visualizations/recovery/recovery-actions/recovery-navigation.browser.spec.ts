import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionStorageService } from 'ngx-webstorage';
import { By } from '@angular/platform-browser';
import { NavigationCancel, NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { visualizationRecord, visualizationSnapshot } from '../../testing/visualization-test-fixtures';
import { WorkbenchComponent, visualizationLeaveGuard } from '../../workbench/workbench.component';
import { WorkbenchModule } from '../../workbench/workbench.module';
import { RecoveryActionsComponent } from './recovery-actions.component';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: `
  <main class="v1-root"><router-outlet/></main>
  <div class="v1-root" data-testid="recovery-modal-outlet"><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>` })
class RecoveryNavigationHost { readonly modal = inject(ModalPortalService); }

@Component({ standalone: true, template: '<h1>Dashboard</h1>' })
class DashboardPage { }

const workbenchBase = '/v1/workspace/account/account-a/visualization/workbench';
const originalUrl = `${workbenchBase}/visualization-a`;

function setup(firstOutcome: 'failed' | 'refresh-required') {
  const store = new AccountWorkspaceStore();
  const definition = createVisualizationSetupDefinition({ name: 'Usage and weather', accountGuid: 'account-a',
    facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
  store.publish({ ...visualizationSnapshot(), savedVisualizations: [{ ...visualizationRecord(), definition }] });
  const currentUrl = signal('/');
  const routeState = computed(() => parseWorkspaceRoute(currentUrl()));
  let durable: IdbSavedVisualization | undefined;
  let attempts = 0;
  const publish = (record: IdbSavedVisualization) => store.publishCommitted({ ...store.snapshot()!, savedVisualizations: [record] }, store.selections());
  const prepareCreate = vi.fn<SavedVisualizationCommands['prepareCreate']>(intent => ({ kind: 'create', accountGuid: intent.accountGuid,
    guid: 'recovered-identity', definition: structuredClone(intent), createdDate: '2026-11-11T00:00:00.000Z' }));
  const submit = vi.fn<SavedVisualizationCommands['submit']>(async command => {
    if (command.kind !== 'create') throw new Error('This recovery fixture only permits the reviewed new identity.');
    const date = new Date(command.createdDate);
    const value = getNewIdbSavedVisualization(command.definition, { guid: command.guid, createdDate: date, modifiedDate: date });
    attempts++;
    if (attempts === 1) {
      if (firstOutcome === 'refresh-required') durable = value;
      return { state: firstOutcome, command, error: new Error('Injected recovery failure') } as VisualizationCommandOutcome;
    }
    durable = value; publish(value);
    return { state: 'committed', command, value, referenceIssues: [] };
  });
  const recover = vi.fn<SavedVisualizationCommands['recover']>(async (_accountGuid, guid) => {
    if (!durable || durable.guid !== guid) throw new Error('No committed recovery identity.');
    publish(durable); return readSavedVisualization(durable);
  });
  TestBed.configureTestingModule({ imports: [RecoveryNavigationHost, WorkbenchModule], providers: [
    provideRouter([{ path: 'dashboard', component: DashboardPage },
      { path: 'v1/workspace/account/:accountGuid/visualization/workbench/:visualizationGuid',
        component: WorkbenchComponent, canDeactivate: [visualizationLeaveGuard] }]),
    { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceNavigationService, useValue: { routeState, isSingleSiteWorkspace: () => false } },
    { provide: SavedVisualizationCommands, useValue: { prepareCreate, submit, recover } }
  ] });
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const subscription = router.events.subscribe(event => { if (event instanceof NavigationEnd) currentUrl.set(event.urlAfterRedirects); });
  const fixture = TestBed.createComponent(RecoveryNavigationHost); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const workbench = () => fixture.debugElement.query(By.directive(WorkbenchComponent))?.componentInstance as WorkbenchComponent | undefined;
  const recovery = () => fixture.debugElement.query(By.directive(RecoveryActionsComponent))?.componentInstance as RecoveryActionsComponent | undefined;
  const navigate = async (url: string) => { await router.navigateByUrl(url); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const destroy = () => { fixture.destroy(); subscription.unsubscribe(); };
  return { fixture, root, store, router, workbench, recovery, prepareCreate, submit, recover, navigate, settle, destroy,
    modal: TestBed.inject(ModalPortalService) };
}

function dialog(test: ReturnType<typeof setup>): HTMLElement {
  const element = test.root.querySelector<HTMLElement>('[data-testid="recovery-modal-outlet"] [role="dialog"]');
  if (!element) throw new Error('Expected the recovery review dialog.');
  return element;
}

async function activate(test: ReturnType<typeof setup>, label: string, withinDialog = true): Promise<void> {
  const root = withinDialog ? dialog(test) : test.root;
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  expect(button.disabled).toBe(false); button.focus(); await userEvent.keyboard('{Enter}'); await test.settle();
}

async function reviewDeletedDraft(test: ReturnType<typeof setup>): Promise<void> {
  await test.navigate('/dashboard'); await test.navigate(originalUrl);
  test.workbench()!.editor.form.controls.name.setValue('Recovered local intent');
  test.store.publishCommitted({ ...test.store.snapshot()!, savedVisualizations: [] }, test.store.selections());
  await test.settle();
  expect(test.workbench()!.editor.isMissing()).toBe(true); expect(test.workbench()!.editor.needsProtection()).toBe(true);
  await activate(test, 'Save as new', false);
}

async function failSaveAsNew(test: ReturnType<typeof setup>): Promise<TemplatePortal> {
  await reviewDeletedDraft(test); await activate(test, 'Create independent copy');
  expect(test.recovery()!.proposal()?.guid).toBe('recovered-identity');
  const portal = test.modal.activePortal(); expect(portal).toBeInstanceOf(TemplatePortal);
  return portal as TemplatePortal;
}

async function blockedBack(test: ReturnType<typeof setup>): Promise<void> {
  const canceled = firstValueFrom(test.router.events.pipe(filter((event): event is NavigationCancel => event instanceof NavigationCancel), take(1)));
  TestBed.inject(Location).back(); await canceled; await test.settle();
  expect(test.router.url).toBe(originalUrl);
}

describe('routed deleted-draft recovery protection in Chromium', () => {
  it.each(['failed', 'refresh-required'] as const)('keeps the %s Save as new review reachable through Back and retries one stable identity', async outcome => {
    const test = setup(outcome);
    try {
      const portal = await failSaveAsNew(test);
      const proposal = test.recovery()!.proposal();
      const flush = vi.spyOn(test.workbench()!.editor, 'flush');
      await blockedBack(test);
      expect(flush).not.toHaveBeenCalled();
      expect(test.modal.activePortal()).toBe(portal);
      expect(dialog(test).textContent).toContain('Save local intent as new?');
      expect(dialog(test).textContent).not.toContain('Resolve unsaved visualization changes');
      expect([...dialog(test).querySelectorAll('button')].map(button => button.textContent?.trim())).toContain('Cancel');
      expect(test.recovery()!.proposal()).toBe(proposal); expect(test.prepareCreate).toHaveBeenCalledOnce();
      if (outcome === 'refresh-required') {
        await activate(test, 'Cancel');
        expect(test.recovery()!.proposal()).toBe(proposal); expect(test.modal.activePortal()).toBe(portal);
      }
      await activate(test, 'Retry');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(test.router.url).toBe(`${workbenchBase}/recovered-identity`); });
      expect(test.prepareCreate).toHaveBeenCalledOnce(); expect(test.submit).toHaveBeenCalledTimes(outcome === 'failed' ? 2 : 1);
      expect(test.recover).toHaveBeenCalledTimes(outcome === 'refresh-required' ? 1 : 0);
      expect(test.submit.mock.calls.every(([command]) => command.guid === 'recovered-identity')).toBe(true);
      expect(test.store.savedVisualizations()).toHaveLength(1);
      expect(test.workbench()!.editor.definition()?.sources.map(source => source.kind)).toEqual(['utility', 'predictor']);
      expect(test.workbench()!.editor.definition()?.chart).toEqual({ kind: 'scatter', showFit: false });
      expect(test.modal.activePortal()).toBeNull();
    } finally { test.destroy(); }
  });

  it('keeps a recovery proposal that becomes protected while parent navigation is awaiting an editor flush', async () => {
    const test = setup('failed');
    let finishFlush: (value: boolean) => void = () => {};
    try {
      await reviewDeletedDraft(test);
      const portal = test.modal.activePortal();
      vi.spyOn(test.workbench()!.editor, 'flush').mockImplementation(() => new Promise(resolve => finishFlush = resolve));
      const departure = test.workbench()!.resolveLeave();
      await activate(test, 'Create independent copy');
      expect(test.recovery()!.proposal()?.guid).toBe('recovered-identity');
      finishFlush(false); await expect(departure).resolves.toBe(false); await test.settle();
      expect(test.modal.activePortal()).toBe(portal);
      expect(dialog(test).textContent).toContain('Save local intent as new?');
      expect(dialog(test).textContent).not.toContain('Resolve unsaved visualization changes');
      expect([...dialog(test).querySelectorAll('button')].map(button => button.textContent?.trim())).toContain('Retry');
    } finally { finishFlush(false); test.destroy(); }
  });

  it('cancels a rejected new proposal back to the dirty original before ordinary parent leave review', async () => {
    const test = setup('failed');
    try {
      await failSaveAsNew(test); await blockedBack(test); await activate(test, 'Cancel');
      expect(test.recovery()!.proposal()).toBeUndefined(); expect(test.modal.activePortal()).toBeNull();
      expect(test.workbench()!.editor.needsProtection()).toBe(true);
      const departure = test.router.navigateByUrl('/dashboard');
      await vi.waitFor(() => { test.fixture.detectChanges(); expect(dialog(test).textContent).toContain('Resolve unsaved visualization changes'); });
      await activate(test, 'Cancel'); await expect(departure).resolves.toBe(false);
      expect(test.router.url).toBe(originalUrl); expect(test.workbench()!.editor.needsProtection()).toBe(true);
      expect(test.submit).toHaveBeenCalledOnce(); expect(test.prepareCreate).toHaveBeenCalledOnce();
    } finally { test.destroy(); }
  });
});
