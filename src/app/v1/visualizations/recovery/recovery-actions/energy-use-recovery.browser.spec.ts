import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbCascadeDeleteService } from '@data/indexedDB/indexed-db-cascade-delete.service';
import { getNewIdbSavedVisualization, type IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { energyUseResourceKind, energyUseSeriesId } from '@domain/visualizations/energy-use/equipment-selection';
import type { EnergyUseSelectionMode, EnergyUseVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { prepareDecisionChange } from '../../decisions/decision-tree';
import { PreviewComponent } from '../../preview/preview/preview.component';
import { UtilityDataSession } from '../../utility/utility-data-session.service';
import { VisualizationsModule } from '../../visualizations.module';
import { RecoveryModule } from '../recovery.module';
import { RecoveryActionsComponent } from './recovery-actions.component';

function definition(mode: EnergyUseSelectionMode): VisualizationDefinition {
  const base = equipmentDefinition(), { selection: _selection, ...source } = base.sources[0] as EnergyUseVisualizationSource;
  const selected = mode === 'facility' ? 'facility-a' : mode === 'group' ? 'group-a' : mode === 'linked-meter-group' ? 'linked' : mode === 'equipment' ? 'equipment-a' : 'Pump';
  const configured: EnergyUseVisualizationSource = { ...source, selectionMode: mode, aggregation: mode === 'equipment' ? 'none' : 'sum', settings: { unit: { kind: 'pinned', value: 'MJ' } },
    ...(mode === 'equipment-type' ? { equipmentTypes: ['Pump'] } : { selection: { kind: 'fixed', resource: energyUseResourceKind(mode), guids: [selected] } }) };
  return { ...base, period: { kind: 'fiscal-year', year: 2026 }, sources: [configured], series: [{ ...base.series[0], overrides: [{ seriesId: energyUseSeriesId(configured, selected), label: 'Saved choice', color: '#23684d' }] }] };
}

describe('Energy Use source repair and facility journeys in Chromium', () => {
  let harness: IndexedDbTestHarness, preview: ComponentFixture<PreviewComponent> | undefined, recovery: ComponentFixture<RecoveryActionsComponent> | undefined;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [VisualizationsModule, RecoveryModule], providers: [VisualizationEditorSession,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: VisualizationNavigationService, useValue: { open: vi.fn(async () => true) } }] });
    harness = await IndexedDbTestHarness.create('energy-e3-repair');
    const snapshot = equipmentSnapshot();
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: [{ ...snapshot.facilities[0] }, { ...snapshot.facilities[0], id: 2, guid: 'facility-b', name: 'Plant B' }],
      facilityEnergyUseGroups: [{ ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), id: 1, guid: 'group-a', name: 'Same name' }],
      utilityMeterGroups: [{ ...getNewIdbUtilityMeterGroup('Energy', 'Same name', 'facility-a', 'account-a'), id: 1, guid: 'linked' }],
      facilityEnergyUseEquipment: [{ ...equipmentFixture({ id: 1, equipmentType: 'Pump', name: 'Same name', utilityMeterGroupIds: ['linked'] }) }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
  });
  afterEach(async () => { preview?.destroy(); recovery?.destroy(); preview = undefined; recovery = undefined; vi.restoreAllMocks(); await harness?.destroy(); TestBed.resetTestingModule(); });

  async function render(record: IdbSavedVisualization) {
    const read = readSavedVisualization(record); if (read.state !== 'valid') throw new Error('Expected valid annual intent');
    preview?.destroy(); preview = TestBed.createComponent(PreviewComponent);
    preview.componentRef.setInput('definition', read.definition);
    preview.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: TestBed.inject(AccountWorkspaceStore).revision(), definitionGuid: record.guid, definitionRevision: record.revision });
    preview.detectChanges();
    await vi.waitFor(() => { preview!.detectChanges(); expect(preview!.componentInstance.preview.state().state).toBe('ready'); });
    expect((preview.nativeElement as HTMLElement).querySelector('table')?.textContent).toContain('36 MJ');
  }

  it.each(['equipment', 'group', 'linked-meter-group', 'facility', 'equipment-type'] as const)('reviews %s source repair, keeps canceled intent, and reopens an explicitly selected replacement', async mode => {
    const commands = TestBed.inject(SavedVisualizationCommands), workspace = TestBed.inject(AccountWorkspaceService), store = TestBed.inject(AccountWorkspaceStore);
    const intent = definition(mode), created = await commands.submit(commands.prepareCreate(intent));
    if (created.state !== 'committed' || !created.value) throw new Error('Expected saved annual chart');
    const meterDemand = vi.spyOn(TestBed.inject(UtilityDataSession), 'acquire');
    await render(created.value); preview!.destroy(); preview = undefined;
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', created.value.guid);
    if (mode === 'equipment-type') {
      await firstValueFrom(harness.dbService.update('savedVisualizations', { ...created.value, revision: created.value.revision + 1, preservation: { locked: true, references: [], transfers: [] } }));
    } else if (mode === 'facility') {
      await TestBed.inject(IndexedDbCascadeDeleteService).deleteFacility(store.facilities().find(f => f.guid === 'facility-a')!, 'account-a');
      await harness.seed({ facilityEnergyUseEquipment: [{ ...equipmentFixture({ id: 2, guid: 'replacement', facilityId: 'facility-b', name: 'Same name' }) }] });
    } else {
      const targetStore = mode === 'equipment' ? 'facilityEnergyUseEquipment' : mode === 'group' ? 'facilityEnergyUseGroups' : 'utilityMeterGroups';
      await firstValueFrom(harness.dbService.delete(targetStore, 1));
      const old = mode === 'equipment' ? equipmentFixture({ id: 2, guid: 'replacement', name: 'Same name' }) : mode === 'group'
        ? { ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), id: 2, guid: 'replacement', name: 'Same name' }
        : { ...getNewIdbUtilityMeterGroup('Energy', 'Same name', 'facility-a', 'account-a'), id: 2, guid: 'replacement' };
      await harness.seed({ [targetStore]: [{ ...old }] });
    }
    await workspace.reloadActiveWorkspace(true); TestBed.tick();
    const sourceBefore = await harness.getAll('facilityEnergyUseEquipment');
    recovery = TestBed.createComponent(RecoveryActionsComponent); recovery.detectChanges();
    expect(recovery.componentInstance.canReset()).toBe(true);
    if (mode !== 'equipment-type') expect(inspectVisualizationReferences(intent, store.snapshot()!).some(issue => issue.kind === energyUseResourceKind(mode))).toBe(true);
    await recovery.componentInstance.start('reset'); recovery.componentInstance.cancel();
    expect(editor.definition()).toEqual(intent); expect((await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations'))[0].definition).toEqual(intent);
    await recovery.componentInstance.start('reset'); await recovery.componentInstance.confirm();
    const reset = editor.definition()!;
    expect(reset.sources[0]).not.toHaveProperty('selection'); expect(reset.sources[0]).not.toHaveProperty('equipmentTypes'); expect(reset.series).toEqual([]);
    expect(reset.period).toEqual(intent.period); expect(reset.chart).toEqual(intent.chart); expect(reset.sources[0].settings).toEqual(intent.sources[0].settings);
    const replacementId = mode === 'equipment-type' ? 'Pump' : mode === 'facility' ? 'facility-b' : 'replacement';
    if (mode === 'group' || mode === 'linked-meter-group') {
      const item = store.snapshot()!.energyUseEquipment[0];
      await firstValueFrom(harness.dbService.update('facilityEnergyUseEquipment', { ...item, ...(mode === 'group' ? { energyUseGroupId: replacementId } : { utilityMeterGroupIds: [replacementId] }) }));
      await workspace.reloadActiveWorkspace(true); TestBed.tick();
    }
    const repair = prepareDecisionChange(editor.definition()!, { kind: 'energy-use-resources', sourceId: 'source-1', ids: [replacementId] }, { snapshot: store.snapshot()! });
    if (repair.state === 'unchanged') throw new Error('Expected explicit replacement');
    editor.applyDefinition(repair.definition); expect(await editor.flush()).toBe(true);
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(1); expect(records[0].guid).toBe(created.value.guid);
    expect(readSavedVisualization(records[0]).state).toBe('valid'); await render(records[0]);
    if (mode !== 'group' && mode !== 'linked-meter-group') expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(sourceBefore);
    expect(meterDemand).not.toHaveBeenCalled();
    preview!.destroy(); preview = undefined; recovery.destroy(); recovery = undefined;
    await harness.reopen();
    const reopened = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(reopened[0].definition).toEqual(repair.definition); expect(readSavedVisualization(reopened[0]).state).toBe('valid');
  });

  it.each(['group', 'equipment-type', 'linked-meter-group', 'facility'] as const)('keeps %s selections and appearance while membership empties and returns', async mode => {
    const store = TestBed.inject(AccountWorkspaceStore), workspace = TestBed.inject(AccountWorkspaceService), commands = TestBed.inject(SavedVisualizationCommands);
    const created = await commands.submit(commands.prepareCreate(definition(mode))); if (created.state !== 'committed' || !created.value) throw new Error('Expected chart');
    const original = store.snapshot()!.energyUseEquipment[0], savedBefore = await harness.getAll('savedVisualizations');
    await render(created.value);
    await firstValueFrom(harness.dbService.update('facilityEnergyUseEquipment', { ...original, facilityId: 'facility-b', equipmentType: 'Fan', energyUseGroupId: 'other', utilityMeterGroupIds: [] }));
    await workspace.reloadActiveWorkspace(true);
    preview!.componentRef.setInput('identity', { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: created.value.guid, definitionRevision: created.value.revision });
    await vi.waitFor(() => { preview!.detectChanges(); expect(preview!.componentInstance.preview.state().state).toBe('empty'); });
    expect(await harness.getAll('savedVisualizations')).toEqual(savedBefore);
    await firstValueFrom(harness.dbService.update('facilityEnergyUseEquipment', { ...original })); await workspace.reloadActiveWorkspace(true);
    await render(created.value);
    expect((preview!.nativeElement as HTMLElement).querySelector('table')!.textContent).toContain('Saved choice');
    expect(await harness.getAll('savedVisualizations')).toEqual(savedBefore);
    expect((await harness.getAll('facilityEnergyUseEquipment'))[0]).toEqual(original);
  });

  it.each(['equipment', 'equipment-type'] as const)('reviews copying %s to different facilities without changing the original or applying a stale review', async mode => {
    const store = TestBed.inject(AccountWorkspaceStore), workspace = TestBed.inject(AccountWorkspaceService), commands = TestBed.inject(SavedVisualizationCommands);
    const original = definition(mode), created = await commands.submit(commands.prepareCreate(original)); if (created.state !== 'committed' || !created.value) throw new Error('Expected chart');
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', created.value.guid);
    recovery = TestBed.createComponent(RecoveryActionsComponent); recovery.detectChanges();
    await recovery.componentInstance.start('copy'); recovery.componentInstance.facilitySelectionControl.setValue({ kind: 'fixed', facilityGuids: ['facility-b'] });
    await workspace.reloadActiveWorkspace(true); recovery.detectChanges(); expect(recovery.componentInstance.stale()).toBe(true);
    await recovery.componentInstance.confirm(); expect(store.savedVisualizations()).toHaveLength(1);
    recovery.componentInstance.cancel();
    await recovery.componentInstance.start('copy'); recovery.componentInstance.facilitySelectionControl.setValue({ kind: 'fixed', facilityGuids: ['facility-b'] });
    const reviewed = recovery.componentInstance.review()!.definition;
    if (mode === 'equipment') { expect(reviewed.sources[0]).not.toHaveProperty('selection'); expect(reviewed.series).toEqual([]); }
    else expect(reviewed.sources).toEqual(original.sources);
    expect(reviewed.period).toEqual(original.period); expect(reviewed.sources[0].settings).toEqual(original.sources[0].settings);
    await recovery.componentInstance.confirm();
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(2); expect(records.find(record => record.guid === created.value!.guid)!.definition).toEqual(original);
    const copied = records.find(record => record.guid !== created.value!.guid)!;
    expect(copied.definition).toEqual(reviewed); expect(readSavedVisualization(copied).state).toBe(mode === 'equipment' ? 'setup-required' : 'valid');
  });

  it('retargets and copies reviewed facility selections, rejects stale review, and preserves account intent on facility deletion', async () => {
    const commands = TestBed.inject(SavedVisualizationCommands), store = TestBed.inject(AccountWorkspaceStore), workspace = TestBed.inject(AccountWorkspaceService);
    const initial = definition('facility'), source = initial.sources[0] as EnergyUseVisualizationSource;
    const intent: VisualizationDefinition = { ...initial, sources: [{ ...source, selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a', 'facility-b'] } }] };
    const created = await commands.submit(commands.prepareCreate(intent)); if (created.state !== 'committed' || !created.value) throw new Error('Expected chart');
    const target = { kind: 'fixed' as const, facilityGuids: ['facility-b'] }, changed = prepareVisualizationFacilityChange(intent, target, store.snapshot()!);
    const recordsBefore = await harness.getAll('savedVisualizations');
    expect(changed.definition.sources[0]).toMatchObject({ selection: { guids: ['facility-b'] } });
    expect(await harness.getAll('savedVisualizations')).toEqual(recordsBefore); // Canceling the proposal has no write.
    const stale = { ...changed.definition, name: 'Unreviewed change' };
    expect((await commands.submit({ kind: 'retarget', accountGuid: 'account-a', guid: created.value.guid, expectedRevision: created.value.revision, targetFacilities: target, reviewedDefinition: stale })).state).toBe('conflict');
    expect(await harness.getAll('savedVisualizations')).toEqual(recordsBefore);
    const retargeted = await commands.submit({ kind: 'retarget', accountGuid: 'account-a', guid: created.value.guid, expectedRevision: created.value.revision, targetFacilities: target, reviewedDefinition: changed.definition });
    if (retargeted.state !== 'committed' || !retargeted.value) throw new Error('Expected reviewed retarget');
    expect(retargeted.value.guid).toBe(created.value.guid);
    const duplicate = await commands.submit(commands.prepareDuplicate(retargeted.value));
    if (duplicate.state !== 'committed' || !duplicate.value) throw new Error('Expected independent duplicate');
    expect(duplicate.value.guid).not.toBe(created.value.guid); expect(duplicate.value.definition).toEqual({ ...changed.definition, name: `${changed.definition.name} (Copy)` });
    const portfolio = await commands.submit(commands.prepareCreate(intent)); if (portfolio.state !== 'committed' || !portfolio.value) throw new Error('Expected portfolio');
    await TestBed.inject(IndexedDbCascadeDeleteService).deleteFacility(store.facilities().find(f => f.guid === 'facility-b')!, 'account-a');
    await workspace.reloadActiveWorkspace(true);
    const retained = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(retained.map(record => record.guid)).toEqual([portfolio.value.guid]);
    expect(retained[0].definition).toEqual(intent);
    expect(inspectVisualizationReferences(intent, store.snapshot()!)).toContainEqual(expect.objectContaining({ kind: 'facility', guid: 'facility-b' }));
  });
});
