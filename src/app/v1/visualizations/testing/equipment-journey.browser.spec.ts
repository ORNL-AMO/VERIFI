import { cdp, page, userEvent } from 'vitest/browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { EnergyUseVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { VisualizationsModule } from '../visualizations.module';
import { PreviewComponent } from '../preview/preview/preview.component';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { EquipmentEditorsModule } from '../energy-use/equipment-editors.module';
import { EquipmentSourceEditorComponent } from '../energy-use/source-editor/equipment-source-editor.component';
import { EquipmentSourceProvider } from '../energy-use/equipment-source-provider.service';
import { UtilityEditorsModule } from '../utility/editors/utility-editors.module';
import { PeriodSettingsComponent } from '../shared/period-settings/period-settings.component';
import { echarts } from '@app/v1/shared/charts/echarts';

describe('saved equipment history native journey', () => {
  let harness: IndexedDbTestHarness | undefined;
  let fixture: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { fixture?.destroy(); fixture = undefined; vi.restoreAllMocks(); if (harness) await harness.destroy(); harness = undefined; TestBed.resetTestingModule(); });
  it.each(['group', 'equipment-type', 'linked-meter-group', 'facility'] as const)('saves and reopens a combined %s trace with current membership', async mode => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create(`energy-use-${mode}`);
    const snapshot = equipmentSnapshot(), group = { ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), id: 1, guid: 'group-a', name: 'Production' };
    const meterGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Linked equipment', 'facility-a', 'account-a'), id: 1, guid: 'linked' };
    const equipment = [equipmentFixture({ id: 1, equipmentType: 'Pump', utilityMeterGroupIds: ['linked', 'shared'] }), equipmentFixture({ id: 2, guid: 'second', name: 'Second pump', equipmentType: 'Pump', utilityMeterGroupIds: ['linked'] })];
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: [{ ...snapshot.facilities[0] }], facilityEnergyUseGroups: [group], utilityMeterGroups: [meterGroup, { ...meterGroup, id: 2, guid: 'shared', name: 'Shared equipment' }], facilityEnergyUseEquipment: equipment.map(item => ({ ...item })) });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    let definition: VisualizationDefinition = { ...equipmentDefinition([]), sources: equipmentDefinition([]).sources.map(source => { const { selection: _selection, ...base } = source as EnergyUseVisualizationSource; return base; }) };
    const id = mode === 'facility' ? 'facility-a' : mode === 'group' ? group.guid : mode === 'equipment-type' ? 'Pump' : meterGroup.guid;
    for (const action of [{ kind: 'energy-use-selection-mode' as const, sourceId: 'source-1', mode }, { kind: 'energy-use-resources' as const, sourceId: 'source-1', ids: mode === 'linked-meter-group' ? [id, 'shared'] : [id] }]) {
      const changed = prepareDecisionChange(definition, action, { snapshot: store.snapshot()! });
      if (changed.state === 'unchanged') throw new Error('Expected selection change'); definition = changed.definition;
    }
    const saved = await commands.submit(commands.prepareCreate(definition));
    if (saved.state !== 'committed' || !saved.value) throw new Error('Expected saved grouped intent');
    const reopened = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
    if (reopened.state !== 'valid') throw new Error('Expected valid grouped intent');
    const before = await harness.getAll('facilityEnergyUseEquipment');
    fixture = TestBed.createComponent(PreviewComponent);
    fixture.componentRef.setInput('definition', reopened.definition);
    fixture.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: saved.value.guid, definitionRevision: 1 });
    fixture.detectChanges();
    await vi.waitFor(() => { fixture!.detectChanges(); expect(fixture!.componentInstance.preview.state().state).toBe('ready'); });
    const view = fixture.componentInstance.preview.state();
    if (view.state !== 'ready') throw new Error('Expected annual preview');
    expect(view.presentation.details.rows).toHaveLength(mode === 'linked-meter-group' ? 2 : 1); expect(view.presentation.details.rows[0].join(' ')).toContain('20 kWh');
    if (mode === 'linked-meter-group') {
      expect(view.presentation.details.rows[1].join(' ')).toContain('10 kWh');
      expect((view.presentation.inputs['model'] as { warnings: string[] }).warnings).toContain('These separate series overlap underlying equipment contributions. They are comparisons, not a combined total.');
    }
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
    expect(meterDemand).not.toHaveBeenCalled();
    if (mode === 'facility') {
      await harness.seed({ facilityEnergyUseEquipment: [{ ...equipmentFixture({ id: 3, guid: 'orphan', name: 'Unassigned equipment', energyUseGroupId: 'missing-group' }) }] });
      const seeded = await harness.getAll('facilityEnergyUseEquipment');
      await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
      fixture.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: saved.value.guid, definitionRevision: 1 });
      await vi.waitFor(() => { fixture!.detectChanges(); expect((fixture!.nativeElement as HTMLElement).querySelector('table')?.textContent).toContain('30 kWh'); });
      let edited = reopened.definition;
      for (const action of [
        { kind: 'equipment-unit' as const, sourceId: 'source-1', unit: { kind: 'pinned' as const, value: 'MJ' } },
        { kind: 'item-style' as const, sourceId: 'source-1', item: { resourceGuid: id }, changes: { label: 'Facility equipment', color: '#23684d', traceType: 'bar' as const } }
      ]) {
        const changed = prepareDecisionChange(edited, action, { snapshot: store.snapshot()! });
        if (changed.state === 'unchanged') throw new Error('Expected facility edit'); edited = changed.definition;
      }
      const updated = await commands.submit({ kind: 'update', accountGuid: 'account-a', guid: saved.value.guid, expectedRevision: saved.value.revision, definition: edited });
      if (updated.state !== 'committed') throw new Error('Expected saved facility edit');
      const read = readSavedVisualization((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.value.guid))!);
      if (read.state !== 'valid') throw new Error('Expected valid facility edit');
      fixture.componentRef.setInput('definition', read.definition);
      fixture.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: saved.value.guid, definitionRevision: 2 });
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
      await vi.waitFor(() => { fixture!.detectChanges(); expect(root.querySelector('table')?.textContent).toContain('108 MJ'); });
      expect(root.querySelector('table')!.textContent).toContain('Facility equipment');
      for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`; root.style.background = 'var(--v1-bg)'; fixture.detectChanges();
        await page.screenshot({ element: root, path: `../../../../../.angular/equipment-e2-facility-chart-${label}.png` });
      }
      await page.viewport(1100, 850); root.className = 'v1-root';
      const printSession = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
      await printSession.send('Emulation.setEmulatedMedia', { media: 'print' });
      try {
        expect(getComputedStyle(root.querySelector('.time-series-actions')!).display).toBe('none');
        await page.screenshot({ element: root, path: '../../../../../.angular/equipment-e2-facility-print.png' });
      } finally { await printSession.send('Emulation.setEmulatedMedia', { media: '' }); }
      expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(seeded);
      expect(seeded.slice(0, 2)).toEqual(before);
      expect(meterDemand).not.toHaveBeenCalled();
    }
  });
  it('saves, renders, reopens and edits annual equipment without source writes or meter calculations', async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('equipment-journey');
    const snapshot = equipmentSnapshot(), account = snapshot.account, facility = snapshot.facilities[0];
    Object.assign(facility, { fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true });
    const pump = { ...snapshot.energyUseEquipment[0], id: 1 };
    pump.utilityData[0].energyUse.push({ year: 2026, energyUse: 0, energyUseUnit: 'kWh', overrideEnergyUse: false });
    const fan = { ...equipmentFixture({ guid: 'fan', name: 'Fan' }), id: 2 };
    fan.utilityData.push({ ...fan.utilityData[0], energySource: 'Natural Gas', energyUse: [] });
    await harness.seed({ accounts: [{ ...account }], facilities: [{ ...facility }], facilityEnergyUseEquipment: [pump, fan] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore), commands = TestBed.inject(SavedVisualizationCommands);
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    const before = await harness.getAll('facilityEnergyUseEquipment');
    const definition = { ...equipmentDefinition([]), period: { kind: 'all-history' as const } };
    const selected = prepareDecisionChange(definition, { kind: 'equipment-selection', sourceId: 'source-1', equipmentGuids: [pump.guid, fan.guid] }, { snapshot: store.snapshot()! });
    if (selected.state === 'unchanged') throw new Error('Expected equipment selection');
    const created = await commands.submit(commands.prepareCreate(selected.definition));
    if (created.state !== 'committed' || !created.value) throw new Error('Expected native save');
    const decode = (record: IdbSavedVisualization) => { const read = readSavedVisualization(record); if (read.state !== 'valid') throw new Error('Expected saved equipment intent'); return read.definition; };
    const mount = async (record: IdbSavedVisualization) => {
      fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%';
      fixture.componentRef.setInput('definition', decode(record));
      fixture.componentRef.setInput('identity', { accountGuid: account.guid, workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
      fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); const state = fixture!.componentInstance.preview.state();
        expect(state.state, state.state === 'ready' ? undefined : state.message).toBe('ready'); expect(root.querySelector('canvas')).not.toBeNull(); });
      return root;
    };
    const first = await mount(created.value);
    expect(first.querySelector('table')!.textContent).toContain('Carried forward from FY 2024');
    expect(first.querySelector('table')!.textContent).toContain('Partial coverage');
    expect(first.querySelector('table')!.textContent).toContain('2023-07-01');
    const reopened = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(created.value.guid))!;
    let edited: VisualizationDefinition = { ...decode(reopened), period: { kind: 'fiscal-year' as const, year: 2027 } };
    for (const action of [
      { kind: 'equipment-unit' as const, sourceId: 'source-1', unit: { kind: 'pinned' as const, value: 'MJ' } },
      { kind: 'item-style' as const, sourceId: 'source-1', item: { resourceGuid: pump.guid }, changes: { label: 'Saved pump', traceType: 'bar' as const, axis: 'right' as const, color: '#23684d' } }
    ]) {
      const result = prepareDecisionChange(edited, action, { snapshot: store.snapshot()! });
      if (result.state === 'unchanged') throw new Error('Expected edit'); edited = result.definition;
    }
    const updated = await commands.submit({ kind: 'update', accountGuid: account.guid, guid: reopened.guid, expectedRevision: reopened.revision, definition: edited });
    if (updated.state !== 'committed' || !updated.value) throw new Error('Expected saved edit');
    const root = await mount((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(reopened.guid))!);
    expect(root.querySelector('table')!.textContent).toContain('0 MJ'); expect(root.querySelector('table')!.textContent).toContain('2026-07-01');
    const options = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!.getOption() as { xAxis: { data: string[]; axisLabel: { formatter: (key: string) => string } }[]; series: { name: string; type: string; yAxisIndex: number }[] };
    expect(options.xAxis[0].data.map(key => options.xAxis[0].axisLabel.formatter(key))).toEqual(['FY 2027']);
    expect(options.series[0]).toMatchObject({ type: 'bar', name: 'Saved pump', yAxisIndex: 1 });
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before); expect(meterDemand).not.toHaveBeenCalled();
    const provider = TestBed.inject(EquipmentSourceProvider), identity = { accountGuid: account.guid, workspaceRevision: store.revision(), definitionGuid: reopened.guid, definitionRevision: 2, requestId: 'canceled', sourceId: 'source-1', scope: { kind: 'facility' as const, facilityGuid: facility.guid, facilityGuids: [facility.guid] } };
    const abort = new AbortController(); abort.abort();
    expect((await provider.resolve({ identity, source: edited.sources[0], chart: edited.chart!, period: edited.period, comparison: edited.comparison, series: edited.series, dateContext: { calendarDate: '2026-11-16' } }, abort.signal)).state).toBe('error');
    for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; root.style.background = 'var(--v1-bg)';
      fixture!.detectChanges(); await page.screenshot({ element: root, path: `../../../../../.angular/equipment-e1-chart-${label}.png` });
    }
    await page.viewport(1100, 850); root.className = 'v1-root';
    const printSession = cdp() as { send: (method: 'Emulation.setEmulatedMedia', parameters: { media: string }) => Promise<unknown> };
    await printSession.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      expect(getComputedStyle(root.querySelector('.time-series-actions')!).display).toBe('none');
      expect(root.querySelector('table')!.textContent).toContain('Source FY 2026');
      await page.screenshot({ element: root, path: '../../../../../.angular/equipment-e1-print.png' });
    } finally { await printSession.send('Emulation.setEmulatedMedia', { media: '' }); }
    fixture!.componentInstance.preview.update({ ...edited, sources: edited.sources.map(source => ({ ...source, selection: { kind: 'fixed', resource: 'equipment', guids: ['deleted-equipment'] } })) }, { accountGuid: account.guid, workspaceRevision: store.revision(), definitionGuid: reopened.guid, definitionRevision: 3 });
    await vi.waitFor(() => expect(fixture!.componentInstance.preview.state().state).toBe('missing-source'));
  });
  it.each(['equipment', 'facility'] as const)('supports keyboard %s selection, typed annual controls and disabled states at narrow widths', async mode => {
    const store = new AccountWorkspaceStore(); store.publish(equipmentSnapshot());
    TestBed.configureTestingModule({ imports: [EquipmentEditorsModule, UtilityEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const source = TestBed.createComponent(EquipmentSourceEditorComponent), period = TestBed.createComponent(PeriodSettingsComponent);
    const requested = vi.fn(), changed = vi.fn(), base = equipmentDefinition([]);
    const definition = mode === 'equipment' ? base : { ...base, sources: [{ ...base.sources[0] as EnergyUseVisualizationSource, selectionMode: 'facility' as const, aggregation: 'sum' as const, selection: { kind: 'fixed' as const, resource: 'facility' as const, guids: [] } }] };
    source.componentRef.setInput('context', { definition, sourceId: 'source-1', disabled: false, expandedNodes: new Set(['selection-mode:source-1', 'resources:source-1', 'data-settings:source-1']), changed: () => {}, request: requested });
    period.componentRef.setInput('context', { definition, disabled: false, changed }); source.detectChanges(); period.detectChanges();
    const host = document.createElement('section'); host.className = 'v1-root'; document.body.append(host); host.append(source.nativeElement, period.nativeElement);
    try {
      const method = (source.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Energy Use selection method"] button')!;
      method.focus(); await userEvent.keyboard('{Enter}');
      expect(requested).toHaveBeenLastCalledWith({ kind: 'energy-use-selection-mode', sourceId: 'source-1', mode: 'group' });
      const button = (source.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.resource-picker__option')!;
      button.focus(); await userEvent.keyboard('{Enter}');
      expect(requested).toHaveBeenLastCalledWith({ kind: 'energy-use-resources', sourceId: 'source-1', ids: [mode === 'equipment' ? 'equipment-a' : 'facility-a'] });
      const pin = [...(period.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Pinned fiscal year'))!;
      pin.focus(); await userEvent.keyboard('{Enter}'); period.detectChanges();
      await userEvent.fill((period.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formcontrolname="year"]')!, '2029');
      expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fiscal-year', year: 2029 }, comparison: { kind: 'none' } });
      for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); host.className = `v1-root ${theme}`; host.style.background = 'var(--v1-bg)'; host.style.padding = '12px';
        expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
        await page.screenshot({ element: host, path: `../../../../../.angular/equipment-${mode === 'equipment' ? 'e1' : 'e2-facility'}-controls-${label}.png` });
      }
      source.componentRef.setInput('context', { definition, sourceId: 'source-1', disabled: true, changed: () => {}, request: requested }); source.detectChanges();
      expect((source.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select')!.disabled).toBe(true);
    } finally { source.destroy(); period.destroy(); host.remove(); }
  });
});
