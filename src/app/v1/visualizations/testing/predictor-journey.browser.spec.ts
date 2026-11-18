import { previewValuesText } from './preview-values.testing';
import { page, userEvent } from 'vitest/browser';
import { PredictorEditorsModule } from '../predictor/predictor-editors.module';
import { PredictorSourceEditorComponent } from '../predictor/source-editor/predictor-source-editor.component';
import { PeriodSettingsComponent } from '../shared/period-settings/period-settings.component';
import { UtilityEditorsModule } from '../utility/editors/utility-editors.module';
import { visualizationSnapshot } from './visualization-test-fixtures';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { VisualizationsModule } from '../visualizations.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { echarts } from '@app/v1/shared/charts/echarts';

describe('saved predictor native journey', () => {
  let harness: IndexedDbTestHarness | undefined;
  let fixture: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { fixture?.destroy(); fixture = undefined; vi.restoreAllMocks(); if (harness) await harness.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it('labels unitless heatmaps by facility and leaves missing months blank without hiding recorded zeroes', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('exploration-facility-labels');
    const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
    const facilities = ['Plant A', 'Plant B'].map((name, index) => ({ ...getNewIdbFacility(account), id: index + 1, guid: `facility-${index}`, name }));
    const predictors = facilities.map((facility, index) => ({ ...getNewIdbPredictor(account.guid, facility.guid), id: index + 1,
      guid: `production-${index}`, name: 'Production', unit: '' }));
    const readings = predictors.flatMap((predictor, index) => [1, 3].map(month => ({ ...getNewIdbPredictorData(predictor), id: index * 3 + month,
      guid: `reading-${index}-${month}`, year: 2025, month, amount: index === 0 && month === 1 ? 0 : month * (index + 1) })));
    await harness.seed({ accounts: [account], facilities, predictor: predictors, predictorData: readings });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore);
    const initial = { ...createVisualizationDefinition('Production history', account.guid,
      { kind: 'fixed', facilityGuids: facilities.map(facility => facility.guid) }, 'predictor'),
      chart: { kind: 'heatmap' as const, dimension: 'month-year' as const, scale: 'linear' as const } };
    const selected = prepareDecisionChange(initial, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: predictors.map(predictor => predictor.guid) }, { snapshot: store.snapshot()! });
    if (selected.state === 'unchanged') throw new Error('Expected predictor selection');
    fixture = TestBed.createComponent(PreviewComponent);
    const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
    fixture.componentRef.setInput('definition', selected.definition);
    fixture.componentRef.setInput('identity', { accountGuid: account.guid, workspaceRevision: store.revision(), definitionGuid: 'labels', definitionRevision: 1 });
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture!.detectChanges();
      const panels = [...root.querySelectorAll<HTMLElement>('.heatmap-chart')];
      expect(panels).toHaveLength(2);
      // The instance exists before its first option is applied on an animation frame.
      expect(panels.every(panel => !!echarts.getInstanceByDom(panel)?.getOption())).toBe(true);
    });
    expect([...root.querySelectorAll('h3')].map(heading => heading.textContent)).toEqual(['Production · Plant A', 'Production · Plant B']);
    const charts = [...root.querySelectorAll<HTMLElement>('.heatmap-chart')].map(element => echarts.getInstanceByDom(element)!);
    expect(charts.every(chart => !!chart)).toBe(true);
    charts.forEach((chart, index) => {
      const options = chart.getOption() as {
        visualMap: { text?: string[]; min: number; max: number }[];
        series: { type: string; data: { value: number[]; cell: { value: number | null; text: string; marker: string; column: number } }[] }[];
      };
      expect(options.visualMap).toHaveLength(1);
      expect(options.visualMap[0]).toMatchObject({ min: index ? 2 : 0, max: index ? 6 : 3 });
      expect(options.visualMap[0].text?.every(label => /^\d+$/.test(label))).toBe(true);
      expect(options.series[0].type).toBe('custom');
      const february = options.series[0].data.find(point => point.cell.column === 1)!;
      expect(february.value).toEqual([1, 0]);
      expect(february.cell).toMatchObject({ value: null, marker: '', text: expect.stringContaining('No saved reading') });
      expect(options.series[1].data.map(point => point.value[2])).toEqual(index ? [2, 6] : [0, 3]);
    });
    await page.screenshot({ element: root, path: '../../../../../.angular/vis7-facility-labels.png' });
    expect(await harness.getAll('predictorData')).toEqual(readings);
  });

  it('saves, renders, reopens and edits predictor bindings without source writes or meter calculations', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('predictor-journey');
    const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
    const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a' };
    const predictor = { ...getNewIdbPredictor(account.guid, facility.guid), id: 1, guid: 'predictor-a', name: 'Temperature',
      predictorType: 'Weather' as const, weatherDataType: 'dryBulbTemp' as const, weatherStationName: 'Saved station', unit: '°F' };
    const production = { ...getNewIdbPredictor(account.guid, facility.guid), id: 2, guid: 'production', name: 'Production', unit: 'widgets' };
    const readings = [1, 3].map((month, index) => ({ ...getNewIdbPredictorData(predictor), id: index + 1, guid: `reading-${month}`,
      year: 2024, month, amount: index ? 12 : 0, weatherOverride: true }));
    const productionReadings = [1, 2].map((month, index) => ({ ...getNewIdbPredictorData(production), id: index + 3, guid: `production-${month}`, year: 2024, month, amount: 100 + index * 20 }));
    await harness.seed({ accounts: [account], facilities: [facility], predictor: [predictor, production], predictorData: [...readings, ...productionReadings] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const before = await harness.getAll('predictorData');
    const initial = { ...createVisualizationDefinition('Temperature history', account.guid, { kind: 'fixed', facilityGuids: [facility.guid] }, 'predictor'),
      chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'monthly' as const, stack: 'none' as const } };
    const selected = prepareDecisionChange(initial, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid, production.guid] }, { snapshot: store.snapshot()! });
    if (selected.state === 'unchanged') throw new Error('Expected predictor binding');
    const created = await commands.submit(commands.prepareCreate(selected.definition));
    if (created.state !== 'committed' || !created.value) throw new Error('Expected native save');
    const savedGuid = created.value.guid;
    const decode = (record: IdbSavedVisualization) => {
      const read = readSavedVisualization(record); if (read.state !== 'valid') throw new Error('Expected valid saved intent'); return read.definition;
    };
    const mount = async (record: IdbSavedVisualization) => {
      fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
      fixture.componentRef.setInput('definition', decode(record));
      fixture.componentRef.setInput('identity', { accountGuid: account.guid, workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
      fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); const state = fixture!.componentInstance.preview.state();
        expect(state.state, state.state === 'ready' ? undefined : state.message).toBe('ready'); expect(root.querySelector('canvas')).not.toBeNull(); });
      expect(previewValuesText(fixture!)).toContain('Manual weather override');
      expect(previewValuesText(fixture!)).toContain('2024-02-01');
      return root;
    };
    const initialRoot = await mount(created.value);
    const initialChart = echarts.getInstanceByDom(initialRoot.querySelector<HTMLElement>('.time-series-canvas')!)!;
    const initialOptions = initialChart.getOption() as { yAxis: { name: string }[]; series: { yAxisIndex: number }[] };
    expect(initialOptions.yAxis.map(axis => axis.name)).toEqual(['']);
    expect(initialOptions.series.map(series => series.yAxisIndex)).toEqual([0, 0]);
    expect(previewValuesText(fixture!)).toContain('100 widgets');
    await page.screenshot({ element: initialRoot, path: '../../../../../.angular/predictor-multi-shared-axis.png' });
    const reopened = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(savedGuid))!;
    const styled = prepareDecisionChange(decode(reopened), { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: predictor.guid },
      changes: { traceType: 'bar', label: 'Saved temperature', color: '#23684d', axis: 'right' } }, { snapshot: store.snapshot()! });
    if (styled.state === 'unchanged') throw new Error('Expected appearance edit');
    const updated = await commands.submit({ kind: 'update', accountGuid: account.guid, guid: savedGuid, expectedRevision: reopened.revision, definition: styled.definition });
    if (updated.state !== 'committed' || !updated.value) throw new Error('Expected saved appearance');
    const root = await mount(updated.value), chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!;
    const options = chart.getOption() as { yAxis: { name: string }[]; series: { type: string; name: string; data: unknown[]; yAxisIndex: number }[] };
    expect(options.series[0]).toMatchObject({ type: 'bar', name: 'Saved temperature', data: [['monthly:24288', 0], ['monthly:24289', null], ['monthly:24290', 12]] });
    expect(options.yAxis.map(axis => axis.name)).toEqual(['widgets', '°F']);
    expect(options.series[0].yAxisIndex).toBe(1); expect(options.series[1].yAxisIndex).toBe(0);
    expect(options.series[1].data).toEqual([['monthly:24288', 100], ['monthly:24289', 120]]);
    expect(decode(updated.value).sources).toEqual(selected.definition.sources);
    expect(await harness.getAll('predictorData')).toEqual(before);
    expect(await harness.getAll('predictor')).toEqual([predictor, production]);
    expect(meterDemand).not.toHaveBeenCalled();
    for (const [width, theme, label] of [[1100, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; root.style.width = '100%'; root.style.background = 'var(--v1-bg)';
      fixture!.detectChanges();
      await vi.waitFor(() => expect(root.querySelector('canvas')).not.toBeNull());
      await page.screenshot({ element: root, path: `../../../../../.angular/predictor-p1-chart-${label}.png` });
    }
  });
  it('supports keyboard selection and native month inputs at narrow and wide sizes in light and dark themes', async () => {
    const store = new AccountWorkspaceStore(), predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a', name: 'Monthly production', unit: 'widgets' };
    store.publish({ ...visualizationSnapshot(), predictors: [predictor,
      { ...predictor, guid: 'cdd', name: 'CDD', predictorType: 'Weather', weatherDataType: 'CDD', unit: 'days', weatherStationName: 'Saved weather station', coolingBaseTemperature: 63 },
      { ...predictor, guid: 'hdd', name: 'HDD', predictorType: 'Weather', weatherDataType: 'HDD', unit: 'days', weatherStationName: 'Saved weather station', heatingBaseTemperature: 65 },
      { ...predictor, guid: 'roasting', name: 'Roasting', unit: '' }
    ] });
    TestBed.configureTestingModule({ imports: [PredictorEditorsModule, UtilityEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const definition = { ...createVisualizationDefinition('Production', 'account-a', { kind: 'all' }, 'predictor'),
      period: { kind: 'fixed' as const, start: '2024-01-01', end: '2024-03-31', basis: 'calendar' as const } };
    const source = TestBed.createComponent(PredictorSourceEditorComponent), period = TestBed.createComponent(PeriodSettingsComponent);
    const request = vi.fn(), changed = vi.fn();
    source.componentRef.setInput('context', { definition, sourceId: 'source-1', disabled: false, changed: () => {}, request });
    period.componentRef.setInput('context', { definition, disabled: false, changed });
    source.detectChanges(); period.detectChanges();
    const sourceRoot = source.nativeElement as HTMLElement, periodRoot = period.nativeElement as HTMLElement;
    const host = document.createElement('section'); document.body.append(host); host.append(sourceRoot, periodRoot);
    try {
      [...sourceRoot.querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent?.trim() === predictor.name)!.focus();
      await userEvent.keyboard('{Enter}');
      expect(request).toHaveBeenCalledExactlyOnceWith({ kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid] });
      const selected = prepareDecisionChange(definition, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid] }, { snapshot: store.snapshot()! });
      if (selected.state === 'unchanged') throw new Error('Expected keyboard selection');
      source.componentRef.setInput('context', { definition: selected.definition, sourceId: 'source-1', disabled: false, changed: () => {}, request }); source.detectChanges();
      [...sourceRoot.querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent?.trim() === 'CDD')!.focus();
      await userEvent.keyboard('{Enter}');
      expect(request).toHaveBeenLastCalledWith({ kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid, 'cdd'] });
      const multiple = prepareDecisionChange(selected.definition, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [predictor.guid, 'cdd'] }, { snapshot: store.snapshot()! });
      if (multiple.state === 'unchanged') throw new Error('Expected another selected predictor');
      source.componentRef.setInput('context', { definition: multiple.definition, sourceId: 'source-1', disabled: false, changed: () => {}, request }); source.detectChanges();
      expect(sourceRoot.querySelectorAll('.resource-picker__option[aria-checked="true"]')).toHaveLength(2);
      sourceRoot.querySelector<HTMLButtonElement>('.resource-picker__all')!.focus(); await userEvent.keyboard('{Enter}');
      expect(request).toHaveBeenLastCalledWith({ kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [], all: true });
      expect(sourceRoot.querySelectorAll('.resource-picker__option[aria-checked="true"]')).toHaveLength(2);
      const start = periodRoot.querySelector<HTMLInputElement>('input[formcontrolname="start"]')!;
      expect(start.type).toBe('month'); expect(periodRoot.querySelector('input[type="date"]')).toBeNull();
      await userEvent.fill(start, '2024-02'); period.detectChanges();
      expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fixed', start: '2024-02-01', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
      for (const [width, theme, label] of [[1100, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850);
        for (const root of [sourceRoot, periodRoot]) { root.className = `v1-root ${theme}`; root.style.width = '100%'; root.style.background = 'var(--v1-bg)'; root.style.padding = '12px'; }
        source.detectChanges(); period.detectChanges();
        expect(sourceRoot.scrollWidth).toBeLessThanOrEqual(sourceRoot.clientWidth + 1);
        expect(periodRoot.scrollWidth).toBeLessThanOrEqual(periodRoot.clientWidth + 1);
        await page.screenshot({ element: sourceRoot, path: `../../../../../.angular/predictor-p1-picker-${label}.png` });
        await page.screenshot({ element: periodRoot, path: `../../../../../.angular/predictor-p1-months-${label}.png` });
      }
    } finally { source.destroy(); period.destroy(); host.remove(); }
  });

});
