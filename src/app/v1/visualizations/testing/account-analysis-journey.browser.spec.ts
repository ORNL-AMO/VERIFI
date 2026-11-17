import { previewValuesText } from './preview-values.testing';
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
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { accountAnalysisDefinition, accountAnalysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { VisualizationsModule } from '../visualizations.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import type { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';

function providers() { return [provideRouter([]), { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }]; }
describe('A2 saved account analysis native journey', () => {
  let harness: IndexedDbTestHarness | undefined, preview: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { preview?.destroy(); preview = undefined; vi.restoreAllMocks(); if (harness) await harness.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it('requires a named account card in Add, supports keyboard selection/inspection and leaves configuration in the workbench', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]); workspace.publish(accountAnalysisFixture().snapshot);
    const drawer = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('analysis'); lifecycle.continueSources(); drawer.detectChanges();
    const root = drawer.nativeElement as HTMLElement; root.className = 'v1-root';
    try {
      expect(lifecycle.canContinueAnalysis()).toBe(false);
      expect(root.querySelector('[formcontrolname=interval]')).toBeNull(); expect(root.querySelector('[formcontrolname=measure]')).toBeNull();
      const radio = root.querySelector('[aria-label="Inspect Portfolio baseline"]')!.closest('.report-analysis-card')!.querySelector<HTMLInputElement>('input[type=radio]')!;
      radio.focus(); await userEvent.keyboard(' '); drawer.detectChanges();
      expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ analysisGuid: 'account-analysis', measure: 'actual' });
      expect(lifecycle.canContinueAnalysis()).toBe(true);
      expect(root.querySelector('.creation-selections')?.textContent).toContain('Portfolio baseline');
      expect(root.querySelector('.creation-selections')?.textContent).not.toContain('Unavailable analysis');
      root.querySelector<HTMLButtonElement>('[aria-label="Inspect Portfolio baseline"]')!.click(); drawer.detectChanges();
      expect(root.querySelector('app-account-analysis-details-slideout')).not.toBeNull();
      root.querySelector<HTMLButtonElement>('app-account-analysis-details-slideout .v1-workspace-slideout__footer button')!.click(); drawer.detectChanges();
      expect(root.querySelector('app-account-analysis-details-slideout')).toBeNull();
      for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`;
        const dialog = root.querySelector<HTMLElement>('[role=dialog]')!;
        expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth + 1);
        await page.screenshot({ element: dialog, path: `../../../../../.angular/analysis-a2-picker-${label}.png` });
      }
      lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-a', 'facility-b'] }); drawer.detectChanges();
      expect(root.querySelector('[aria-label="Inspect Portfolio baseline"]')).toBeNull();
      expect(root.querySelector('[aria-label="Inspect Production baseline"]')).not.toBeNull();
      expect(lifecycle.canContinueAnalysis()).toBe(false);
      lifecycle.selectFacilities({ kind: 'all' }); drawer.detectChanges();
      expect(root.querySelector('[aria-label="Inspect Portfolio baseline"]')).not.toBeNull();
      expect(lifecycle.canContinueAnalysis()).toBe(true);
    } finally { drawer.destroy(); }
  });
  it('uses full account Worker results with banking, saves/reopens, recovers inclusion/reference loss and restores Account backups without source writes', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: providers() });
    harness = await IndexedDbTestHarness.create('analysis-a2');
    const fixture = accountAnalysisFixture(), snapshot = fixture.snapshot;
    const banked = { ...snapshot.facilityAnalyses[0], guid: 'banked-analysis', id: 3, name: 'Previous baseline', baselineYear: 2019 };
    snapshot.facilityAnalyses[0] = { ...snapshot.facilityAnalyses[0], hasBanking: true, bankedAnalysisItemId: banked.guid,
      groups: snapshot.facilityAnalyses[0].groups.map(group => ({ ...group, applyBanking: true, newBaselineYear: 2021, bankedAnalysisYear: 2020 })) };
    snapshot.facilityAnalyses.push(banked);
    snapshot.meterData.push(...snapshot.meterData.filter(row => row.year === 2020).map((row, index) => ({ ...row, id: 300 + index, guid: `earlier-${index}`, year: 2019 })));
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities, utilityMeterGroups: snapshot.meterGroups,
      utilityMeter: snapshot.meters, utilityMeterData: snapshot.meterData, analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    const before = { facility: await harness.getAll('analysisItems'), account: await harness.getAll('accountAnalysisItems'), readings: await harness.getAll('utilityMeterData') };
    const nativeWorker = globalThis.Worker, requests: AccountAnalysisResultsWorkerRequest[] = [];
    vi.spyOn(globalThis, 'Worker').mockImplementation(function(url, options) {
      const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
      const worker = new nativeWorker(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options), post = worker.postMessage.bind(worker);
      vi.spyOn(worker, 'postMessage').mockImplementation((payload: unknown) => { if (payload && typeof payload === 'object' && 'accountAnalysisItem' in payload) requests.push(structuredClone(payload) as AccountAnalysisResultsWorkerRequest); post(payload); });
      return worker;
    });
    const saved = await commands.submit(commands.prepareCreate(accountAnalysisDefinition()));
    if (saved.state !== 'committed' || !saved.value) throw new Error('Expected account chart save');
    const read = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
    if (read.state !== 'valid') throw new Error('Expected saved account intent');
    preview = TestBed.createComponent(PreviewComponent);
    const root = preview.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
    let revision = 1;
    const mount = async (definition: VisualizationDefinition, state = 'ready', guid = saved.value!.guid) => {
      preview!.componentRef.setInput('definition', definition); preview!.componentRef.setInput('active', true);
      preview!.componentRef.setInput('identity', { accountGuid: store.account()!.guid, workspaceRevision: store.revision(), definitionGuid: guid, definitionRevision: revision++ });
      preview!.detectChanges();
      await vi.waitFor(() => { preview!.detectChanges(); const current = preview!.componentInstance.preview.state(); expect(current.state, current.state === 'ready' ? '' : current.message).toBe(state); });
    };
    preview.componentRef.setInput('definition', read.definition); preview.componentRef.setInput('active', false); preview.detectChanges(); expect(requests).toHaveLength(0);
    await mount(read.definition); expect(requests).toHaveLength(1);
    expect(requests[0].accountFacilities.map(item => item.guid).sort()).toEqual(['facility-a', 'facility-b']);
    expect(requests[0].allAccountAnalysisItems.map(item => item.guid).sort()).toEqual(['analysis-a', 'analysis-b', 'banked-analysis']);
    const expected = calculateAccountAnalysisResults(requests[0]), state = preview.componentInstance.preview.state();
    if (state.state !== 'ready') throw new Error('Expected ready account results');
    expect(state.presentation.details.rows).toHaveLength(expected.monthlyAnalysisSummaryData.length);
    expect(state.presentation.details.rows[0].join(' ')).toContain(`${expected.monthlyAnalysisSummaryData[0].energyUse} kWh`);
    await mount({ ...read.definition, period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' } }); expect(requests).toHaveLength(1);
    const excluded = { ...read.definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] } };
    await mount(excluded, 'unsupported'); expect(requests).toHaveLength(1);
    await mount(read.definition); expect(requests).toHaveLength(1);
    const valid = store.snapshot()!;
    store.publishCommitted({ ...valid, accountAnalyses: [] }, {}); await mount(read.definition, 'missing-source');
    store.publishCommitted(valid, {}); await mount(read.definition); expect(requests).toHaveLength(1);
    let edited = read.definition;
    for (const action of [
      { kind: 'analysis-interval' as const, sourceId: 'source-1', interval: 'yearly' as const },
      { kind: 'analysis-measure' as const, sourceId: 'source-1', measure: 'total-improvement' as const },
      { kind: 'item-style' as const, sourceId: 'source-1', item: { resourceGuid: 'account-analysis' }, changes: { label: 'Account improvement', traceType: 'bar' as const, axis: 'right' as const, color: '#23684d' } }
    ]) { const change = prepareDecisionChange(edited, action, { snapshot: store.snapshot()! }); if (change.state !== 'unchanged') edited = change.definition; }
    const updated = await commands.submit({ kind: 'update', accountGuid: 'account-a', guid: saved.value.guid, expectedRevision: saved.value.revision, definition: edited });
    if (updated.state !== 'committed') throw new Error('Expected account chart edit');
    const reopened = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
    if (reopened.state !== 'valid') throw new Error('Expected reopened account chart');
    await mount(reopened.definition); expect(requests).toHaveLength(1);
    expect(previewValuesText(preview!)).toContain('Account improvement'); expect(previewValuesText(preview!)).toContain('%');
    for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; root.style.background = 'var(--v1-bg)';
      await page.screenshot({ element: root, path: `../../../../../.angular/analysis-a2-${label}.png` });
    }
    await page.viewport(1100, 850); root.className = 'v1-root';
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try { expect(root.querySelector('.time-series-actions, table')).toBeNull(); await page.screenshot({ element: root, path: '../../../../../.angular/analysis-a2-print.png' }); }
    finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }
    expect(await harness.getAll('analysisItems')).toEqual(before.facility); expect(await harness.getAll('accountAnalysisItems')).toEqual(before.account); expect(await harness.getAll('utilityMeterData')).toEqual(before.readings);
    preview.componentRef.setInput('active', false); preview.detectChanges();
    const builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const prepared = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(store.snapshot()!))));
    const importer = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: () => {}, setLoadingMessage: () => {} } as unknown as LoadingService);
    const restoredAccount = await importer.importAccountBackupFile(prepared, 0);
    await TestBed.inject(AccountWorkspaceService).selectAccount(restoredAccount.guid);
    const restored = store.savedVisualizations()[0], restoredRead = readSavedVisualization(restored);
    if (restoredRead.state !== 'valid') throw new Error('Expected restored account chart');
    const source = restoredRead.definition.sources[0]; if (source.kind !== 'analysis') throw new Error('Expected restored analysis');
    expect(source.analysisGuid).not.toBe('account-analysis'); expect(restoredRead.definition.series[0].resourceGuid).toBe(source.analysisGuid);
    await mount(restoredRead.definition, 'ready', restored.guid);
    expect(previewValuesText(preview!)).toContain('Account improvement');
    preview.componentRef.setInput('active', false); preview.detectChanges();
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const facilityOnly = await commands.submit(commands.prepareCreate({ ...accountAnalysisDefinition(), name: 'Transferred account reference',
      facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] } }));
    if (facilityOnly.state !== 'committed' || !facilityOnly.value) throw new Error('Expected retained account binding');
    const facilityBackup = preparation.prepare(JSON.parse(JSON.stringify(builder.buildFacilityBackup(store.snapshot()!, 'facility-a'))));
    await importer.importFacilityBackupFile(facilityBackup, 'account-a', 0);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
    const transferred = store.savedVisualizations().find(item => item.guid !== facilityOnly.value!.guid && (item.definition as VisualizationDefinition).name === 'Transferred account reference');
    expect(transferred).toBeDefined();
    expect(readSavedVisualization(transferred!).state).toBe('repair-required');
    expect((transferred!.definition as VisualizationDefinition).sources[0]).toMatchObject({ analysisGuid: 'account-analysis' });
    expect(transferred!.preservation?.references.some(reference => reference.kind === 'analysis' && reference.guid === 'account-analysis')).toBe(true);
  });
});
