import { previewValuesText } from '@app/v1/visualizations/testing/preview-values.testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { provideIndexedDb } from 'ngx-indexed-db';
import { cdp, page } from 'vitest/browser';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { energyUseResourceKind, energyUseSeriesId } from '@domain/visualizations/energy-use/equipment-selection';
import type { EnergyUseSelectionMode, EnergyUseVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { PreviewComponent } from '@app/v1/visualizations/preview/preview/preview.component';
import { UtilityDataSession } from '@app/v1/visualizations/utility/utility-data-session.service';
import { VisualizationsModule } from '@app/v1/visualizations/visualizations.module';
import { echarts } from '@app/v1/shared/charts/echarts';
import { BackupImportCommandService } from './backup-import-command.service';
import { BackupPreparationService } from './backup-preparation.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';

function populatedSnapshot() {
  const base = equipmentSnapshot(), pump = equipmentFixture({ equipmentType: 'Pump', utilityMeterGroupIds: ['linked', 'shared', 'linked'] });
  pump.utilityData[0].energyUse[0].year = 2022;
  pump.utilityData.push({ ...pump.utilityData[0], energyUse: [{ year: 2024, energyUse: 3.6, energyUseUnit: 'MJ', overrideEnergyUse: false }] }, { ...pump.utilityData[0], energyUse: [] });
  const zero = equipmentFixture({ guid: 'zero', name: 'Retired pump', equipmentType: 'Pump', utilityMeterGroupIds: ['linked'], noLongerInUse: { isNoLongerInUse: true, year: 2023 } });
  zero.utilityData[0].energyUse = [{ year: 2022, energyUse: 2, energyUseUnit: 'kWh', overrideEnergyUse: true }, { year: 2025, energyUse: 0, energyUseUnit: 'kWh', overrideEnergyUse: false }];
  const orphan = equipmentFixture({ guid: 'orphan', name: 'Orphan', energyUseGroupId: 'missing-group', equipmentType: 'Pump', utilityMeterGroupIds: ['linked', 'shared'] });
  orphan.utilityData[0].energyUse = [{ year: 2023, energyUse: 5, energyUseUnit: 'kWh', overrideEnergyUse: true }];
  const definitions = (['equipment', 'group', 'equipment-type', 'linked-meter-group', 'facility'] as const).map(mode => {
    const ids = mode === 'equipment' ? ['equipment-a', 'zero', 'orphan'] : mode === 'group' ? ['group-a'] : mode === 'facility' ? ['facility-a'] : mode === 'linked-meter-group' ? ['linked', 'shared'] : ['Pump'];
    const { selection: _selection, ...sourceBase } = equipmentDefinition().sources[0] as EnergyUseVisualizationSource;
    const source: EnergyUseVisualizationSource = { ...sourceBase, id: 'energy:history', selectionMode: mode, aggregation: mode === 'equipment' ? 'none' : 'sum',
      settings: { unit: { kind: 'pinned', value: 'MJ' } }, ...(mode === 'equipment-type' ? { equipmentTypes: ['Pump'] } : { selection: { kind: 'fixed', resource: energyUseResourceKind(mode), guids: ids } }) };
    const definition: VisualizationDefinition = { ...equipmentDefinition(), name: mode, facilitySelection: { kind: 'all' }, period: { kind: 'all-history' }, sources: [source],
      series: [{ id: 'annual', sourceId: source.id, metric: 'consumption', axis: 'left', overrides: [
        { seriesId: energyUseSeriesId(source, ids[0]), label: 'Saved annual estimate', color: '#23684d', axis: 'right', traceType: 'bar' },
        { seriesId: energyUseSeriesId(source, ids[0]), accountGuid: 'foreign', visible: false },
        { seriesId: 'unknown-format', color: '#123456' }
      ] }] };
    return { ...getNewIdbSavedVisualization(definition), guid: `chart-${mode}` };
  });
  return { ...base, facilities: base.facilities.map(f => ({ ...f, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true })),
    energyUseEquipment: [pump, zero, orphan], energyUseGroups: [{ ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'group-a' }],
    meterGroups: ['linked', 'shared'].map(guid => ({ ...getNewIdbUtilityMeterGroup('Energy', guid, 'facility-a', 'account-a'), guid })), savedVisualizations: definitions };
}

describe('populated Energy Use visualization backup acceptance', () => {
  let harness: IndexedDbTestHarness, fixture: ComponentFixture<PreviewComponent> | undefined;
  afterEach(async () => { fixture?.destroy(); fixture = undefined; vi.restoreAllMocks(); await harness?.destroy(); TestBed.resetTestingModule(); });
  it.each(['Account', 'Facility'] as const)('restores and previews all five selection methods from a %s backup with annual evidence and mapped appearance', async kind => {
    harness = await IndexedDbTestHarness.create('energy-use-e3-backup');
    const original = populatedSnapshot(), before = structuredClone(original), builder = new WorkspaceBackupSnapshotBuilder(), preparation = new BackupPreparationService();
    const backup = preparation.prepare(JSON.parse(JSON.stringify(kind === 'Account' ? builder.buildAccountBackup(original) : builder.buildFacilityBackup(original, 'facility-a'))));
    const importer = new BackupImportCommandService(new IndexedDbTransactionService(indexedDB, { [dbConfig.name]: { ...dbConfig, name: harness.databaseName } }),
      { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as unknown as LoadingService);
    let accountGuid: string;
    if (kind === 'Account') accountGuid = (await importer.importAccountBackupFile(backup, 0)).guid;
    else {
      accountGuid = 'destination'; await harness.seed({ accounts: [{ ...original.account, guid: accountGuid }],
        facilities: [{ ...original.facilities[0], guid: 'outside', accountId: accountGuid }],
        facilityEnergyUseEquipment: [{ ...equipmentFixture({ guid: 'equipment-a', facilityId: 'outside', accountId: accountGuid, name: 'Same name collision' }) }] });
      await importer.importFacilityBackupFile(backup, accountGuid, 0);
    }
    await harness.reopen();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [provideIndexedDb({ ...dbConfig, name: harness.databaseName }), { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(accountGuid);
    const store = TestBed.inject(AccountWorkspaceStore), restored = store.snapshot()!, equipmentBefore = await harness.getAll('facilityEnergyUseEquipment');
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    expect(restored.savedVisualizations).toHaveLength(5);
    for (const item of original.energyUseEquipment) {
      const saved = restored.energyUseEquipment.find(candidate => candidate.name === item.name)!;
      expect(saved.utilityData).toEqual(item.utilityData); expect(saved.operatingConditionsData).toEqual(item.operatingConditionsData);
      expect(saved.noLongerInUse).toEqual(item.noLongerInUse);
    }
    for (const record of restored.savedVisualizations) {
      const decoded = readSavedVisualization(record); if (decoded.state !== 'valid') throw new Error('Expected valid annual chart');
      expect(decoded.definition.facilitySelection.kind).toBe(kind === 'Account' ? 'all' : 'fixed');
      const source = decoded.definition.sources[0] as EnergyUseVisualizationSource, mode = source.selectionMode as EnergyUseSelectionMode;
      const target = mode === 'equipment-type' ? 'Pump' : mode === 'equipment' ? restored.energyUseEquipment.find(item => item.name === 'Pump')!.guid
        : mode === 'group' ? restored.energyUseGroups[0].guid : mode === 'linked-meter-group' ? restored.meterGroups.find(group => group.name === 'linked')!.guid : restored.facilities.find(f => f.guid !== 'outside')!.guid;
      expect(decoded.definition.series[0].overrides?.[0]).toMatchObject({ seriesId: energyUseSeriesId(source, target), accountGuid, label: 'Saved annual estimate', axis: 'right', traceType: 'bar' });
      expect(decoded.definition.series[0].overrides?.[1]).toMatchObject({ accountGuid: 'foreign', visible: false });
      expect(decoded.definition.series[0].overrides?.[2]).toMatchObject({ accountGuid: original.account.guid });
      fixture?.destroy(); fixture = TestBed.createComponent(PreviewComponent);
      fixture.componentRef.setInput('definition', decoded.definition);
      fixture.componentRef.setInput('identity', { accountGuid, workspaceRevision: store.revision(), definitionGuid: record.guid, definitionRevision: record.revision });
      const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.width = '100%'; fixture.detectChanges();
      await vi.waitFor(() => { fixture!.detectChanges(); expect(fixture!.componentInstance.preview.state().state).toBe('ready'); });
      const state = fixture.componentInstance.preview.state(); if (state.state !== 'ready') throw new Error('Expected restored annual preview');
      const table = previewValuesText(fixture!);
      for (const text of ['2021-07-01', '2025-06-30', 'Source FY 2022', 'Saved 10 kWh', 'Saved 3.6 MJ', 'Partial coverage', 'Saved annual estimate']) expect(table).toContain(text);
      expect(table).not.toContain('Same name collision');
      expect(table).toContain('Explicit saved history after retirement FY 2023');
      if (mode === 'equipment') expect(table).toContain('0 MJ');
      const latest = state.presentation.details.rows.filter(row => row.join(' ').includes('2024-07-01'));
      expect(latest.map(row => row.join(' ')).join(' ')).toContain(mode === 'group' || mode === 'equipment' ? '39.6 MJ' : '57.6 MJ');
      if (mode === 'linked-meter-group') expect((state.presentation.inputs['model'] as { warnings: string[] }).warnings.join(' ')).toContain('overlap');
      const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!;
      const option = chart.getOption() as { series: { name: string; type: string; yAxisIndex: number }[]; yAxis: { position: string }[] };
      const styled = option.series.find(series => series.name === 'Saved annual estimate')!;
      expect(styled.type).toBe('bar'); expect(option.yAxis[styled.yAxisIndex].position).toBe('right');
      if (mode === 'facility') {
        for (const [width, theme, label] of [[1100, '', 'wide-light'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
          await page.viewport(width, 850); root.className = `v1-root ${theme}`; fixture.detectChanges();
          await vi.waitFor(() => expect(chart.getWidth()).toBeLessThanOrEqual(width));
          await page.screenshot({ element: root, path: `../../../../.angular/energy-e3-restored-${kind}-${label}.png` });
        }
        const media = cdp() as { send(method: string, params: { media: string }): Promise<unknown> };
        await page.viewport(1100, 850); root.className = 'v1-root'; await media.send('Emulation.setEmulatedMedia', { media: 'print' });
        try {
          expect(root.querySelector('.time-series-actions, table')).toBeNull();
          expect(previewValuesText(fixture!)).toBe(table);
          await page.screenshot({ element: root, path: `../../../../.angular/energy-e3-restored-${kind}-print.png` });
        } finally { await media.send('Emulation.setEmulatedMedia', { media: '' }); }
      }
    }
    expect(meterDemand).not.toHaveBeenCalled(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(equipmentBefore); expect(original).toEqual(before);
    const exported = preparation.prepare(JSON.parse(JSON.stringify(builder.buildAccountBackup(restored))));
    const second = await importer.importAccountBackupFile(exported, 0);
    await TestBed.inject(AccountWorkspaceService).selectAccount(second.guid);
    const repeated = TestBed.inject(AccountWorkspaceStore).snapshot()!;
    for (const record of repeated.savedVisualizations) {
      const read = readSavedVisualization(record); if (read.state !== 'valid') throw new Error('Expected valid repeated transfer');
      expect(inspectVisualizationReferences(read.definition, repeated)).toEqual([]);
      expect(read.definition.series[0].overrides?.[0].accountGuid).toBe(second.guid);
      expect(read.definition.series[0].overrides?.[1].accountGuid).toBe('foreign');
      expect(read.definition.series[0].overrides?.[2].accountGuid).toBe(original.account.guid);
    }
  });
});
