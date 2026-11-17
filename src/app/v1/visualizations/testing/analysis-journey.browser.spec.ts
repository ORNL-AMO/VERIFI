import { analysisPickerTestProvider } from './analysis-picker.testing';
import { configureLibraryTest } from '../library/testing/library-testing';
import { LibraryLifecycle } from '../library/lifecycle/library-lifecycle.service';
import { CreationComponent } from '../creation/creation-drawer/creation-drawer.component';
import { LibraryModule } from '../library/library.module';
import { provideRouter } from '@angular/router';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import type { LoadingService } from '@app/core-components/loading/loading.service';
import { cdp, page, userEvent } from 'vitest/browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { analysisDefinition, analysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { VisualizationsModule } from '../visualizations.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { AnalysisSourceEditorComponent } from '../analysis/source-editor/analysis-source-editor.component';
import { PeriodSettingsComponent } from '../shared/period-settings/period-settings.component';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import type { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { echarts } from '@app/v1/shared/charts/echarts';

function providers() { return [provideRouter([]), { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }]; }
describe('A1 saved facility analysis native journey', () => {
  it('requires a report-style analysis card in Add and leaves result configuration to the workbench', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]); workspace.publish(analysisFixture().snapshot);
    const drawer = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('analysis'); lifecycle.continueSources(); drawer.detectChanges();
    const root = drawer.nativeElement as HTMLElement; root.className = 'v1-root';
    try {
      expect(root.querySelector('app-report-analysis-selection')).not.toBeNull();
      expect(root.querySelector('[formcontrolname=interval]')).toBeNull(); expect(root.querySelector('[formcontrolname=measure]')).toBeNull();
      expect(root.querySelector('.creation-selections')?.textContent).not.toContain('Choose analysis later');
      expect(root.querySelector('[role=radiogroup]')?.getAttribute('aria-required')).toBe('true');
      const next = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Continue')!;
      expect(next.disabled).toBe(true); lifecycle.continueAnalysis(); expect(lifecycle.step()).toBe('analysis');
      const radio = root.querySelector<HTMLInputElement>('input[type=radio]')!;
      radio.focus(); await userEvent.keyboard(' '); drawer.detectChanges();
      expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ analysisGuid: 'analysis-a', mode: 'result', measure: 'actual' });
      expect(lifecycle.step()).toBe('analysis'); expect(next.disabled).toBe(false);
      root.querySelector<HTMLButtonElement>('[aria-label="Inspect Production baseline"]')!.click(); drawer.detectChanges();
      expect(root.querySelector('app-analysis-details-slideout')).not.toBeNull();
      root.querySelector<HTMLButtonElement>('app-analysis-details-slideout .v1-workspace-slideout__footer button')!.click(); drawer.detectChanges();
      expect(root.querySelector('app-analysis-details-slideout')).toBeNull();
      for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`;
        const dialog = root.querySelector<HTMLElement>('[role=dialog]')!;
        expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth + 1);
        await page.screenshot({ element: dialog, path: `../../../../../.angular/analysis-a1-add-picker-${label}.png` });
      }
    } finally { drawer.destroy(); }
  });

  let harness: IndexedDbTestHarness | undefined, preview: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { preview?.destroy(); preview = undefined; vi.restoreAllMocks(); if (harness) await harness.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it('saves/reopens, uses a real Worker, reuses current results, edits fiscal group results and preserves source records', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: providers() });
    harness = await IndexedDbTestHarness.create('analysis-a1');
    const fixture = analysisFixture(), meter = { ...fixture.snapshot.meters[0], startingUnit: 'kWh', energyUnit: 'kWh', meterReadingDataApplication: 'fullMonth' as const };
    const analysis = { ...fixture.analysis, energyUnit: 'kWh' };
    const readings = fixture.meters[0].monthlyData.map((month, i) => ({ ...getNewIdbUtilityMeterData(meter, []), id: i + 1, guid: `reading-${i}`, year: month.year, month: month.monthNumValue + 1, day: 1, totalEnergyUse: month.energyUse, totalCost: 0 }));
    await harness.seed({ accounts: [{ ...fixture.snapshot.account }], facilities: [{ ...fixture.facility }], utilityMeterGroups: fixture.snapshot.meterGroups.map(item => ({ ...item })),
      utilityMeter: [meter], utilityMeterData: readings, analysisItems: [analysis] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    const before = await harness.getAll('analysisItems'), beforeReadings = await harness.getAll('utilityMeterData');
    const groupRequests: unknown[] = [];
    const nativeWorker = globalThis.Worker, requests: FacilityAnalysisResultsWorkerRequest[] = [], terminated: (() => number)[] = [];
    vi.spyOn(globalThis, 'Worker').mockImplementation(function(url, options) {
      // Angular's browser-test builder serves emitted Worker assets at the test-server root.
      const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
      const resolved = /^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original;
      const worker = new nativeWorker(resolved, options), post = worker.postMessage.bind(worker);
      vi.spyOn(worker, 'postMessage').mockImplementation((payload: unknown) => { if (payload && typeof payload === 'object' && 'groupGuid' in payload) groupRequests.push(structuredClone(payload)); if (payload && typeof payload === 'object' && 'calculateAllMonthlyData' in payload) requests.push(structuredClone(payload) as FacilityAnalysisResultsWorkerRequest); post(payload); });
      const termination = vi.spyOn(worker, 'terminate'); terminated.push(() => termination.mock.calls.length); return worker;
    });
    const saved = await commands.submit(commands.prepareCreate(analysisDefinition()));
    if (saved.state !== 'committed' || !saved.value) throw new Error('Expected native save');
    const read = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
    if (read.state !== 'valid') throw new Error('Expected saved result intent');
    preview = TestBed.createComponent(PreviewComponent);
    const root = preview.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
    const mount = async (definition: VisualizationDefinition, revision: number, guid = saved.value!.guid) => {
      preview!.componentRef.setInput('definition', definition); preview!.componentRef.setInput('active', true);
      preview!.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: guid, definitionRevision: revision });
      preview!.detectChanges();
      await vi.waitFor(() => { preview!.detectChanges(); const state = preview!.componentInstance.preview.state(); expect(state.state, state.state === 'ready' ? '' : state.message).toBe('ready'); expect(root.querySelector('canvas')).not.toBeNull(); });
    };
    preview.componentRef.setInput('definition', read.definition); preview.componentRef.setInput('active', false); preview.detectChanges();
    expect(requests).toHaveLength(0);
    await mount(read.definition, 1);
    expect(requests).toHaveLength(1); expect(terminated.some(count => count() > 0)).toBe(true);
    const expected = calculateFacilityAnalysisResults(requests[0]);
    const state = preview.componentInstance.preview.state(); if (state.state !== 'ready') throw new Error('Expected ready result');
    expect(state.presentation.details.rows).toHaveLength(expected.monthlyAnalysisSummaryData.length);
    expect(state.presentation.details.rows[0].join(' ')).toContain(`${expected.monthlyAnalysisSummaryData[0].energyUse} kWh`);
    await mount({ ...read.definition, period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' } }, 2);
    expect(requests).toHaveLength(1); expect(root.querySelector('table')!.textContent).toContain('2021-01-01');
    let edited = read.definition;
    for (const action of [
      { kind: 'analysis-binding' as const, sourceId: 'source-1', analysisGuid: analysis.guid, groupGuid: 'group-a' },
      { kind: 'analysis-interval' as const, sourceId: 'source-1', interval: 'yearly' as const },
      { kind: 'analysis-measure' as const, sourceId: 'source-1', measure: 'total-improvement' as const },
      { kind: 'item-style' as const, sourceId: 'source-1', item: { resourceGuid: 'group-a' }, changes: { label: 'Production improvement', traceType: 'bar' as const, axis: 'right' as const, color: '#23684d' } }
    ]) {
      const result = prepareDecisionChange(edited, action, { snapshot: store.snapshot()! }); if (result.state !== 'unchanged') edited = result.definition;
    }
    const updated = await commands.submit({ kind: 'update', accountGuid: 'account-a', guid: saved.value.guid, expectedRevision: saved.value.revision, definition: edited });
    if (updated.state !== 'committed') throw new Error('Expected saved group edit');
    const reopened = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
    if (reopened.state !== 'valid') throw new Error('Expected reopened group result');
    await mount(reopened.definition, 3); expect(requests).toHaveLength(1);
    const options = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!.getOption() as { series: { name: string; type: string; yAxisIndex: number }[]; yAxis: { position: string }[] };
    expect(options.series[0]).toMatchObject({ name: 'Production improvement', type: 'bar' });
    expect(options.yAxis[options.series[0].yAxisIndex].position).toBe('right');
    expect(root.querySelector('table')!.textContent).toContain('%');
    for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; root.style.background = 'var(--v1-bg)';
      await page.screenshot({ element: root, path: `../../../../../.angular/analysis-a1-${label}.png` });
    }
    await page.viewport(1100, 850); root.className = 'v1-root';
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try { expect(getComputedStyle(root.querySelector('.time-series-actions')!).display).toBe('none'); await page.screenshot({ element: root, path: '../../../../../.angular/analysis-a1-print.png' }); }
    finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }
    const validSnapshot = store.snapshot()!;
    store.publishCommitted({ ...validSnapshot, facilityAnalyses: [{ ...validSnapshot.facilityAnalyses[0], groups: [...validSnapshot.facilityAnalyses[0].groups,
      { ...validSnapshot.facilityAnalyses[0].groups[0], idbGroupId: 'unfinished-group', analysisType: 'regression' }] }] }, {});
    await mount(analysisDefinition('actual', 'group-a'), 4);
    expect(groupRequests).toHaveLength(1);
    const fallback = preview.componentInstance.preview.state(); if (fallback.state !== 'ready') throw new Error('Expected selected-group fallback');
    expect(fallback.presentation.details.rows).toHaveLength(24);
    expect(fallback.evidence[0].resolution).toMatchObject({ state: 'ready', resolved: { quality: { warnings: [expect.stringContaining('latest complete fiscal year')] } } });
    store.publishCommitted(validSnapshot, {});
    await mount(reopened.definition, 5);
    expect(await harness.getAll('analysisItems')).toEqual(before); expect(await harness.getAll('utilityMeterData')).toEqual(beforeReadings);
    preview.componentRef.setInput('active', false); preview.detectChanges(); expect(preview.componentInstance.preview.state().state).toBe('inactive');
    const snapshot = store.snapshot()!, builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const expectedRestoredValues = (preview.componentInstance.definition!.series[0].label);
    const importer = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: () => {}, setLoadingMessage: () => {} } as unknown as LoadingService);
    for (const kind of ['Account', 'Facility'] as const) {
      const prepared = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility-a'))));
      let accountGuid: string;
      if (kind === 'Account') accountGuid = (await importer.importAccountBackupFile(prepared, 0)).guid;
      else { accountGuid = snapshot.account.guid; await importer.importFacilityBackupFile(prepared, accountGuid, 0); }
      await TestBed.inject(AccountWorkspaceService).selectAccount(accountGuid);
      if (kind === 'Facility') await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
      const restored = store.savedVisualizations().find(item => item.guid !== saved.value!.guid)!;
      const restoredRead = readSavedVisualization(restored); if (restoredRead.state !== 'valid') throw new Error('Expected mapped restored chart');
      const restoredSource = restoredRead.definition.sources[0]; if (restoredSource.kind !== 'analysis') throw new Error('Expected restored analysis source');
      expect(restoredSource.analysisGuid).not.toBe('analysis-a'); expect(restoredSource.groupGuid).not.toBe('group-a');
      expect(restoredRead.definition.series[0].resourceGuid).toBe(restoredSource.groupGuid);
      preview.componentRef.setInput('definition', restoredRead.definition); preview.componentRef.setInput('active', true);
      preview.componentRef.setInput('identity', { accountGuid, workspaceRevision: store.revision(), definitionGuid: restored.guid, definitionRevision: restored.revision }); preview.detectChanges();
      await vi.waitFor(() => { preview!.detectChanges(); const current = preview!.componentInstance.preview.state(); expect(current.state, current.state === 'ready' ? '' : current.message).toBe('ready'); });
      expect(root.querySelector('table')!.textContent).toContain(expectedRestoredValues);
      expect(root.querySelector('table')!.textContent).toContain('20 %');
      preview.componentRef.setInput('active', false); preview.detectChanges();
    }

  });
  it('supports native labels, keyboard month editing and disabled source controls in narrow/dark layouts', async () => {
    const store = new AccountWorkspaceStore(); store.publish(analysisFixture().snapshot);
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [...providers(), analysisPickerTestProvider(), { provide: AccountWorkspaceStore, useValue: store }] });
    const source = TestBed.createComponent(AnalysisSourceEditorComponent), period = TestBed.createComponent(PeriodSettingsComponent), requested = vi.fn(), changed = vi.fn();
    source.componentRef.setInput('context', { definition: analysisDefinition(), sourceId: 'source-1', disabled: false, changed: () => {}, request: requested });
    period.componentRef.setInput('context', { definition: analysisDefinition(), disabled: false, changed }); source.detectChanges(); period.detectChanges();
    const host = document.createElement('section'); document.body.append(host); host.append(source.nativeElement, period.nativeElement);
    try {
      const select = source.nativeElement.querySelector('select[formcontrolname=interval]') as HTMLSelectElement; select.focus(); expect(document.activeElement).toBe(select);
      const fixed = [...(period.nativeElement as HTMLElement).querySelectorAll('button')].find(button => button.textContent?.includes('Fixed months'))!;
      fixed.focus(); await userEvent.keyboard('{Enter}'); period.detectChanges();
      await userEvent.fill(period.nativeElement.querySelector('input[formcontrolname="start"]'), '2021-01');
      await userEvent.fill(period.nativeElement.querySelector('input[formcontrolname="end"]'), '2021-12');
      expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' }, comparison: { kind: 'none' } });
      for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); host.className = `v1-root ${theme}`; host.style.background = 'var(--v1-bg)';
        expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
        await page.screenshot({ element: host, path: `../../../../../.angular/analysis-a1-controls-${label}.png` });
      }
      source.componentRef.setInput('context', { definition: analysisDefinition(), sourceId: 'source-1', disabled: true, changed: () => {}, request: requested }); source.detectChanges(); expect(select.disabled).toBe(true);
    } finally { source.destroy(); period.destroy(); host.remove(); }
  });
});
