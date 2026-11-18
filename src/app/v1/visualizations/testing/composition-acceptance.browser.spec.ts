import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { cdp, page } from 'vitest/browser';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { compositionFixture } from '@domain/visualizations/testing/composition-fixtures';
import type { EnergyUseVisualizationSource, VisualizationChart, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { echarts } from '@app/v1/shared/charts/echarts';
import { VisualizationsModule } from '../visualizations.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { CompositionChartComponent } from '../composition/chart/composition-chart.component';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';

describe('VIS8 saved composition acceptance', () => {
  let harness: IndexedDbTestHarness | undefined, fixture: ComponentFixture<PreviewComponent> | undefined;
  let originalWorker: typeof Worker;
  beforeEach(() => {
    originalWorker = globalThis.Worker;
    globalThis.Worker = class extends originalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        // The Angular test server serves emitted worker assets at its root.
        // Keep the native Worker and calculation; correct only that test base.
        const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
        super(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options);
      }
    };
  });
  afterEach(async () => { fixture?.destroy(); fixture = undefined; vi.restoreAllMocks(); await harness?.destroy(); harness = undefined; TestBed.resetTestingModule(); globalThis.Worker = originalWorker; await page.viewport(1100, 850); });
  it('saves and reopens every presentation, navigates hierarchy by keyboard, prints context and preserves all source records', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [provideRouter([]), { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('vis8-composition');
    const { snapshot, definition: base } = compositionFixture();
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(value => ({ ...value })),
      facilityEnergyUseEquipment: snapshot.energyUseEquipment.map((value, index) => ({ ...value, id: index + 1 })) });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands), demand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const before = await harness.getAll('facilityEnergyUseEquipment');
    const initial: VisualizationDefinition = { ...base, sources: [{ ...base.sources[0] as EnergyUseVisualizationSource,
      selectionMode: 'facility', aggregation: 'sum', selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a'] } }] };
    const saved = await commands.submit(commands.prepareCreate(initial));
    if (saved.state !== 'committed' || !saved.value) throw new Error(JSON.stringify(saved));
    let record = saved.value;
    const copied = await commands.submit(commands.prepareDuplicate(record));
    if (copied.state !== 'committed' || !copied.value) throw new Error(JSON.stringify(copied));
    expect(copied.value.guid).not.toBe(record.guid);
    const charts: VisualizationChart[] = [{ kind: 'treemap', hierarchy: ['group', 'equipment'], values: 'percent' },
      { kind: 'sunburst', hierarchy: ['group', 'equipment'], values: 'percent' }, { kind: 'breakdown', type: 'donut', values: 'percent' },
      { kind: 'breakdown', type: 'bar', values: 'absolute' }, { kind: 'sankey', flow: 'source-to-equipment' }];
    for (const chart of charts) {
      const changed = await commands.submit({ kind: 'update', accountGuid: 'account-a', guid: record.guid, expectedRevision: record.revision, definition: { ...initial, chart } });
      if (changed.state !== 'committed' || !changed.value) throw new Error(JSON.stringify(changed)); record = changed.value;
      const reopened = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(record.guid))!);
      if (reopened.state !== 'valid') throw new Error(JSON.stringify(reopened));
      fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
      fixture.componentRef.setInput('definition', reopened.definition);
      fixture.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%'; fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); const state = fixture!.componentInstance.preview.state(); expect(state.state, JSON.stringify(state)).toBe('ready'); });
      const canvas = root.querySelector<HTMLElement>('.composition-canvas')!;
      await vi.waitFor(() => expect(echarts.getInstanceByDom(canvas)).toBeDefined());
      const instance = echarts.getInstanceByDom(canvas)!;
      expect((instance.getOption() as any).series[0].type).toBe(chart.kind === 'breakdown' ? chart.type === 'donut' ? 'pie' : 'bar' : chart.kind);
      expect(root.textContent).toContain('2025-01-01'); expect(root.textContent).toContain('Unavailable'); expect(root.textContent).toContain('Source occurrence 1');
      if (chart.kind === 'treemap' || chart.kind === 'sunburst') {
        const component = fixture.debugElement.query(By.directive(CompositionChartComponent)).componentInstance as CompositionChartComponent;
        const explore = () => { root.querySelector<HTMLButtonElement>('[aria-label="Explore hierarchy"] button')!.click(); fixture!.detectChanges(); expect(component.rootId()).not.toBe(''); };
        explore();
        expect(root.ownerDocument.activeElement).toBe(root.querySelector('h2'));
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); fixture.detectChanges(); expect(component.rootId()).toBe('');
        explore(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })); fixture.detectChanges(); expect(component.rootId()).toBe('');
        for (const [width, theme, label] of [[1100, '', 'light'], [390, 'v1-theme-dark', 'dark']] as const) {
          await page.viewport(width, 850); root.className = `v1-root ${theme}`; fixture.detectChanges();
          await page.screenshot({ element: root, path: `../../../../../.angular/vis8-${chart.kind}-${label}.png` });
        }
        explore();
        const printedPath = ['All selected data', ...component.path().map(node => node.label)].join(' / ');
        expect(component.path().length).toBeGreaterThan(0);
        expect(getComputedStyle(root.querySelector('.composition-print-path')!).display).toBe('none');
        const print = cdp() as { send: (method: string, parameters: object) => Promise<unknown> };
        await print.send('Emulation.setEmulatedMedia', { media: 'print' });
        try {
          window.dispatchEvent(new Event('beforeprint')); fixture.detectChanges();
          expect(getComputedStyle(root.querySelector('.composition-path')!).display).toBe('none');
          expect(getComputedStyle(root.querySelector('.composition-navigation')!).display).toBe('none');
          expect(getComputedStyle(root.querySelector('h2')!).display).not.toBe('none');
          const context = root.querySelector<HTMLElement>('.composition-print-path');
          expect(context).not.toBeNull();
          expect(context!.textContent?.replace(/\s+/g, ' ').trim()).toBe(`Viewing: ${printedPath}`);
          expect(getComputedStyle(context!).display).not.toBe('none');
          await page.screenshot({ element: root, path: `../../../../../.angular/vis8-${chart.kind}-print.png` });
        }
        finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); window.dispatchEvent(new Event('afterprint')); }
      }
    }
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before); expect(demand).not.toHaveBeenCalled();
    const copy = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(copied.value.guid))!);
    expect(copy.state).toBe('valid'); if ('definition' in copy) expect(copy.definition.chart).toEqual(initial.chart);
    // Only balance acquires canonical metered data. Real zero/partial equipment
    // remain intact while a complete meter year supplies the residual.
    const utility = meter({ id: 1, meterReadingDataApplication: 'fullMonth' });
    await harness.seed({ utilityMeter: [{ ...utility }], utilityMeterData: Array.from({ length: 12 }, (_, month) => ({ ...reading({ id: month + 1,
      guid: `balance-${month}`, year: 2025, month: month + 1, totalEnergyUse: 2 }) })) });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
    const balance: VisualizationDefinition = { ...initial, chart: { kind: 'sankey', flow: 'energy-balance' } };
    fixture!.componentRef.setInput('definition', balance);
    fixture!.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision + 1 });
    fixture!.detectChanges(); fixture!.componentRef.setInput('active', false); fixture!.detectChanges();
    expect(fixture!.componentInstance.preview.state().state).toBe('inactive');
    fixture!.componentRef.setInput('active', true); fixture!.detectChanges();
    await vi.waitFor(() => { fixture!.detectChanges(); const state = fixture!.componentInstance.preview.state(); expect(state.state, JSON.stringify(state)).toBe('ready'); }, { timeout: 5000 });
    expect(demand).toHaveBeenCalled();
    expect(fixture!.nativeElement.textContent).toContain('Unaccounted');
    const balanceView = fixture!.debugElement.query(By.directive(CompositionChartComponent)).componentInstance as CompositionChartComponent;
    expect(balanceView.model.evidence.residuals?.[0].observation.value).toBeCloseTo(13.99);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
  });
});
