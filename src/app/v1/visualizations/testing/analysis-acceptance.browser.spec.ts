import { expandVisualizationDefinition, serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';
import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PortalModule } from '@angular/cdk/portal';
import { provideRouter } from '@angular/router';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { cdp, page, userEvent } from 'vitest/browser';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommandHandler } from '@data/account-workspace/handlers/visualization-command-handler.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { accountAnalysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { VisualizationsModule } from '../visualizations.module';
import { WorkbenchModule } from '../workbench/workbench.module';
import { WorkbenchComponent } from '../workbench/workbench.component';
import { PreviewComponent } from '../preview/preview/preview.component';
import { CreationComponent } from '../creation/creation-drawer/creation-drawer.component';
import { LibraryLifecycle } from '../library/lifecycle/library-lifecycle.service';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { RecoveryActionsComponent } from '../recovery/recovery-actions/recovery-actions.component';

@Component({ standalone: true, imports: [WorkbenchModule, PortalModule], template: '<main class="v1-root"><app-visualization-workbench/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class AcceptanceHost { readonly modal = inject(ModalPortalService); }

type SavedRecord = IdbSavedVisualization & Record<string, unknown>;
describe('A4 composed analysis workbench acceptance', () => {
  let harness: IndexedDbTestHarness | undefined, host: ComponentFixture<AcceptanceHost> | undefined, drawer: ComponentFixture<CreationComponent> | undefined;
  afterEach(async () => { drawer?.destroy(); host?.destroy(); host = undefined; drawer = undefined; vi.restoreAllMocks(); await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); });

  async function setup(target: 'group' | 'account') {
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: '' });
    TestBed.configureTestingModule({ imports: [VisualizationsModule, AcceptanceHost], providers: [provideRouter([]), LibraryLifecycle,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { routeState: route, inventoryFacilityGuid: signal(undefined), isSingleSiteWorkspace: () => false } }
    ] });
    harness = await IndexedDbTestHarness.create(`analysis-a4-${target}`);
    const fixture = accountAnalysisFixture(), snapshot = fixture.snapshot;
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities, utilityMeterGroups: snapshot.meterGroups,
      utilityMeter: snapshot.meters, utilityMeterData: snapshot.meterData, analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockImplementation(async (accountGuid, visualizationGuid) => { route.set({ section: 'visualization', accountGuid, visualizationGuid }); return true; });
    const nativeWorker = globalThis.Worker, resultRequests: unknown[] = [];
    vi.spyOn(globalThis, 'Worker').mockImplementation(function(url, options) {
      const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
      const worker = new nativeWorker(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options), post = worker.postMessage.bind(worker);
      vi.spyOn(worker, 'postMessage').mockImplementation((payload: unknown) => {
        if (payload && typeof payload === 'object' && ('accountAnalysisItem' in payload || 'includeGroupSummaries' in payload || 'groupGuid' in payload)) resultRequests.push(structuredClone(payload));
        post(payload);
      });
      return worker;
    });
    const sourceBefore = { facility: await harness.getAll('analysisItems'), account: await harness.getAll('accountAnalysisItems'), readings: await harness.getAll('utilityMeterData'), predictors: await harness.getAll('predictorData') };
    drawer = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('analysis'); lifecycle.continueSources(); drawer.detectChanges();
    const name = target === 'account' ? 'Portfolio baseline' : 'Production baseline';
    const radio = [...(drawer.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent?.includes(name))!;
    radio.focus(); await userEvent.keyboard(' '); drawer.detectChanges();
    expect(lifecycle.canContinueAnalysis()).toBe(true); expect(resultRequests).toHaveLength(0);
    lifecycle.continueAnalysis(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue(`Acceptance ${target}`); await lifecycle.submit(); drawer.detectChanges(); drawer.destroy(); drawer = undefined;
    expect(store.savedVisualizations()).toHaveLength(1);
    host = TestBed.createComponent(AcceptanceHost); host.detectChanges();
    const component = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent;
    const root = host.nativeElement as HTMLElement;
    const preview = () => host!.debugElement.query(By.directive(PreviewComponent))?.componentInstance as PreviewComponent | undefined;
    const wait = async (expected = 'ready') => vi.waitFor(() => { host!.detectChanges(); const state = preview()?.preview.state(); expect(state?.state, JSON.stringify(state)).toBe(expected); });
    await wait();
    if (target === 'group') {
      await component.requestDecision({ kind: 'analysis-binding', sourceId: component.editor.definition()!.sources[0].id, analysisGuid: 'analysis-a', groupGuid: 'group-a' });
      if (component.pendingDecision()) await component.confirmDecision(); host.detectChanges(); expect(await component.editor.flush()).toBe(true); await wait();
    }
    component.setSection('source:' + encodeURIComponent(component.editor.definition()!.sources[0].id), true); component.setSection(component.rootNodes.period, true); host.detectChanges();
    const guid = store.savedVisualizations()[0].guid;
    return { fixture, store, commands, component, root, preview, wait, guid, resultRequests, sourceBefore, route };
  }
  async function select(root: HTMLElement, control: string, value: string) {
    const element = root.querySelector<HTMLSelectElement>(`select[formcontrolname="${control}"]`)!;
    element.value = value; element.dispatchEvent(new Event('change')); host!.detectChanges();
  }
  async function sources() { return { facility: await harness!.getAll('analysisItems'), account: await harness!.getAll('accountAnalysisItems'), readings: await harness!.getAll('utilityMeterData'), predictors: await harness!.getAll('predictorData') }; }

  it('saves multiple Analysis targets and measures with shared display units and reuses their canonical results', async () => {
    const { component, wait, resultRequests, sourceBefore } = await setup('account');
    await component.requestDecision({ kind: 'source-measures', sourceKind: 'analysis', measures: ['actual', 'savings'] }); host!.detectChanges(); await wait();
    await component.requestDecision({ kind: 'analysis-targets', targets: [{ analysisGuid: 'account-analysis' }, { analysisGuid: 'analysis-a' }, { analysisGuid: 'analysis-a', groupGuid: 'group-a' }, { analysisGuid: 'analysis-b' }] });
    if (component.pendingDecision()) await component.confirmDecision(); host!.detectChanges(); await wait();
    const axes = component.editor.definition()!.series;
    expect(axes.filter(series => series.metric === 'actual').map(series => series.axis)).toEqual(['left', 'left', 'left', 'left']);
    expect(axes.filter(series => series.metric === 'savings').map(series => series.axis)).toEqual(['right', 'right', 'right', 'right']);
    const productionTraces = component.traceItems().filter(item => item.label === 'Production baseline · Actual use');
    expect(productionTraces).toHaveLength(2);
    expect(productionTraces.map(item => item.detail)).toEqual(expect.arrayContaining([expect.stringContaining('Facility total'), expect.stringContaining('Production ·')]));
    const numericalWork = resultRequests.length;
    await component.requestDecision({ kind: 'source-measures', sourceKind: 'analysis', measures: ['actual', 'calculated', 'savings'] }); host!.detectChanges(); await wait();
    expect(component.sourcePanels()).toHaveLength(1); expect(component.traceItems()).toHaveLength(12);
    expect(resultRequests).toHaveLength(numericalWork);
    await component.requestDecision({ kind: 'chart-display', settings: { units: { energy: { kind: 'pinned', value: 'MMBtu' } } } }); host!.detectChanges(); await wait();
    expect(resultRequests).toHaveLength(numericalWork); expect(await component.editor.flush()).toBe(true);
    const before = structuredClone(component.editor.definition());
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(); host!.detectChanges(); await wait();
    expect(component.editor.definition()).toEqual(before);
    const durable = await harness!.getAll<SavedRecord>('savedVisualizations');
    expect(durable[0].definition).toMatchObject({ sources: [{ kind: 'analysis', measures: ['actual', 'savings', 'calculated'], targets: [{}, {}, {}, {}] }] });
    expect(await sources()).toEqual(sourceBefore);
  });

  it.each(['group', 'account'] as const)('saves %s controls through reopen, protects review/conflicts, and recovers publication without replay', async target => {
    const { component, root, wait, guid, resultRequests, sourceBefore } = await setup(target);
    const initialWorkers = resultRequests.length;
    await component.requestDecision({ kind: 'source-measures', sourceKind: 'analysis', measures: ['calculated'] }); if (component.pendingDecision()) await component.confirmDecision(); host!.detectChanges(); expect(await component.editor.flush()).toBe(true); await wait();
    expect(component.editor.definition()!.sources[0]).toHaveProperty('measure', 'calculated'); expect(resultRequests).toHaveLength(initialWorkers);
    const fixed = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Fixed months')!;
    fixed.click(); host!.detectChanges();
    await userEvent.fill(root.querySelector<HTMLInputElement>('input[formcontrolname=start]')!, '2021-01'); host!.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    component.editor.form.controls.name.setValue(`Edited ${target}`); host!.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    await userEvent.fill(root.querySelector<HTMLInputElement>('input[formcontrolname=end]')!, '2021-12'); host!.detectChanges();
    expect(component.hasInvalidFields()).toBe(false); expect(await component.editor.flush()).toBe(true); await wait();
    const source = component.editor.definition()!.sources[0]; if (source.kind !== 'analysis') throw new Error('Expected analysis');
    await component.requestDecision({ kind: 'item-style', sourceId: source.id, item: { resourceGuid: source.groupGuid ?? source.analysisGuid }, changes: { label: 'Retained analysis values', color: '#23684d' } });
    expect(await component.editor.flush()).toBe(true); await wait(); expect(resultRequests).toHaveLength(initialWorkers);
    const beforeReview = structuredClone(component.editor.definition());
    await component.requestDecision({ kind: 'analysis-binding', sourceId: source.id, analysisGuid: 'analysis-b' }); host!.detectChanges();
    expect(component.pendingDecision()).toBeDefined();
    const cancel = [...root.querySelectorAll<HTMLButtonElement>('[role=dialog] button')].find(button => button.textContent?.trim() === 'Cancel')!;
    cancel.focus(); await userEvent.keyboard('{Enter}'); host!.detectChanges();
    expect(component.pendingDecision()).toBeUndefined(); expect(component.editor.definition()).toEqual(beforeReview);
    await component.requestDecision({ kind: 'analysis-binding', sourceId: source.id, analysisGuid: 'analysis-b' }); host!.detectChanges();
    const store = TestBed.inject(AccountWorkspaceStore); store.publishCommitted(store.snapshot()!, {});
    await component.confirmDecision(); host!.detectChanges(); expect(component.decisionError()).toContain('changed during review'); expect(component.editor.definition()).toEqual(beforeReview);
    if (target === 'account') {
      const retained = structuredClone(component.editor.definition()!);
      await component.requestDecision({ kind: 'facilities', selection: { kind: 'fixed', facilityGuids: ['facility-a'] } }); host!.detectChanges();
      if (component.pendingDecision()) await component.confirmDecision(); host!.detectChanges(); await wait('unsupported');
      expect(component.editor.record()!.guid).toBe(guid); expect(component.editor.definition()!.sources).toEqual(retained.sources); expect(component.editor.definition()!.series).toEqual(retained.series);
      expect(component.sourcePanels()[0].context.definition.facilitySelection.kind).toBe('fixed');
      await component.requestDecision({ kind: 'facilities', selection: { kind: 'all' } }); host!.detectChanges();
      if (component.pendingDecision()) await component.confirmDecision(); host!.detectChanges(); await wait();
      expect(component.sourcePanels()[0].context.definition.facilitySelection.kind).toBe('all'); expect(resultRequests).toHaveLength(initialWorkers);
    }
    const handler = TestBed.inject(VisualizationCommandHandler), update = vi.spyOn(handler, 'update');
    update.mockRejectedValueOnce(new Error('Save temporarily unavailable'));
    component.editor.form.controls.title.setValue('Retry retained intent'); expect(await component.editor.flush()).toBe(false); host!.detectChanges();
    expect(component.editor.state()).toBe('error');
    const retry = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Retry save or refresh'))!;
    retry.focus(); await userEvent.keyboard('{Enter}'); await vi.waitFor(() => { host!.detectChanges(); expect(component.editor.state()).toBe('saved'); }); await wait();
    const savedWrites = update.mock.calls.length;
    vi.spyOn(store, 'publishCommittedPatch').mockImplementationOnce(() => { throw new Error('Publication unavailable'); });
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Reload unavailable'));
    component.editor.form.controls.title.setValue('Committed once'); expect(await component.editor.flush()).toBe(false); host!.detectChanges();
    expect(component.editor.state()).toBe('refresh-required'); expect(update).toHaveBeenCalledTimes(savedWrites + 1);
    expect(await component.editor.retry()).toBe(true); host!.detectChanges(); await wait(); expect(update).toHaveBeenCalledTimes(savedWrites + 1);
    const record = component.editor.record()!;
    const local = { ...component.editor.definition()!, period: { kind: 'fixed' as const, basis: 'calendar' as const, start: '2020-01-01', end: '2020-12-31' } };
    component.editor.applyDefinition(local);
    await handler.update({ kind: 'update', accountGuid: 'account-a', guid, expectedRevision: record.revision,
      definition: { ...expandVisualizationDefinition(record.definition) as VisualizationDefinition, period: { kind: 'all-history' } } }, 'account-a');
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); host!.detectChanges();
    expect(component.editor.conflicts().map(conflict => conflict.id)).toContain('configuration');
    component.editor.resolveConflicts({ configuration: 'saved' }); expect(await component.editor.flush()).toBe(true); host!.detectChanges(); await wait();
    expect(component.editor.definition()!.period).toEqual({ kind: 'all-history' });
    for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.querySelector('main')!.className = `v1-root ${theme}`;
      expect(root.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 1);
      await page.screenshot({ element: root, path: `../../../../../.angular/analysis-a4-${target}-${label}.png` });
    }
    await page.viewport(1100, 850); root.querySelector('main')!.className = 'v1-root';
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', params: { media: string }) => Promise<unknown> };
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      expect(getComputedStyle(root.querySelector('#visualization-settings')!).display).toBe('none');
      expect(getComputedStyle(root.querySelector('.v1-data-workbench-actions')!).display).toBe('none');
      await page.screenshot({ element: root, path: `../../../../../.angular/analysis-a4-${target}-print.png` });
    }
    finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }
    const expected = component.editor.definition(); host!.destroy(); host = undefined;
    host = TestBed.createComponent(AcceptanceHost); host.detectChanges();
    const reopened = host.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent;
    await vi.waitFor(() => { host!.detectChanges(); expect(host!.debugElement.query(By.directive(PreviewComponent))?.componentInstance.preview.state().state).toBe('ready'); });
    expect(reopened.editor.definition()).toEqual(expected); expect(reopened.editor.record()!.guid).toBe(guid);
    host.destroy(); host = undefined;
    await harness!.reopen();
    const durable = await harness!.getAll<SavedRecord>('savedVisualizations');
    expect(durable).toHaveLength(1); expect(durable[0].guid).toBe(guid); expect(durable[0].definition).toEqual(serializeVisualizationDefinition(expected!));
    expect(await sources()).toEqual(sourceBefore);
  });

  it.each(['group', 'account'] as const)('retains deleted %s references, cancels repair and reopens only an explicit same-name replacement', async target => {
    const { component, root, wait, guid, store, fixture, sourceBefore } = await setup(target), handlers = TestBed.inject(AnalysisCommandHandler);
    const definition = component.editor.definition()!;
    if (target === 'account') await handlers.deleteAccountAnalysisAtomic({ accountGuid: 'account-a', analysisGuid: 'account-analysis' });
    else await handlers.deleteFacilityAnalysisAtomic({ accountGuid: 'account-a', facilityGuid: 'facility-a', analysisGuid: 'analysis-a' });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); host!.detectChanges();
    expect(root.querySelector('app-visualization-preview')).toBeNull(); expect(root.textContent).toContain('Saved source relationships need review');
    const replacementGuid = `replacement-${target}`;
    if (target === 'account') await harness!.seed({ accountAnalysisItems: [{ ...fixture.analysis, id: 99, guid: replacementGuid }] });
    else await harness!.seed({ analysisItems: [{ ...fixture.snapshot.facilityAnalyses[0], id: 99, guid: replacementGuid }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); host!.detectChanges();
    expect(root.querySelector('app-visualization-preview')).toBeNull(); expect(component.editor.definition()!.sources).toEqual(definition.sources);
    const beforeRepair = await sources(), recovery = host!.debugElement.query(By.directive(RecoveryActionsComponent)).componentInstance as RecoveryActionsComponent;
    await recovery.start('reset'); host!.detectChanges(); recovery.cancel(); host!.detectChanges();
    expect(component.editor.definition()).toEqual(definition);
    await recovery.start('reset'); host!.detectChanges(); await recovery.confirm(); host!.detectChanges();
    const name = target === 'account' ? fixture.analysis.name : fixture.snapshot.facilityAnalyses[0].name;
    component.setSection('source:' + encodeURIComponent(component.editor.definition()!.sources[0].id), true); host!.detectChanges();
    const radio = [...root.querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent?.includes(name))!;
    radio.focus(); await userEvent.keyboard(' '); host!.detectChanges(); expect(await component.editor.flush()).toBe(true); await wait();
    expect(component.editor.definition()!.sources[0]).toHaveProperty('analysisGuid', replacementGuid); expect(component.editor.record()!.guid).toBe(guid);
    expect(await sources()).toEqual(beforeRepair); expect(await harness!.getAll('utilityMeterData')).toEqual(sourceBefore.readings);
    expect(store.savedVisualizations()).toHaveLength(1);
  });
});
