import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { visualizationAccount, visualizationFacility } from '../../testing/visualization-test-fixtures';
import { RecoveryModule } from '../recovery.module';
import { RecoveryActionsComponent } from './recovery-actions.component';

function mixedSetup(): VisualizationDefinition {
  return createVisualizationSetupDefinition({ name: 'Usage and weather', accountGuid: 'account-a',
    scope: { kind: 'facility', facilityGuid: 'facility-a' }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
}

describe('reviewed visualization recovery with native storage', () => {
  let harness: IndexedDbTestHarness;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [RecoveryModule], providers: [VisualizationEditorSession,
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: VisualizationNavigationService, useValue: { open: vi.fn(async () => true) } }] });
    harness = await IndexedDbTestHarness.create('vis3-reviewed-recovery');
    await harness.seed({ accounts: [visualizationAccount], facilities: [visualizationFacility] });
  });
  afterEach(async () => { TestBed.resetTestingModule(); await harness.destroy(); });

  it('unlocks a known transferred definition only after reviewing removal of its unverified relationships', async () => {
    const definition = utilityVisualizationFixture({ kind: 'facility', facilityGuid: 'facility-a' });
    const locked: IdbSavedVisualization = { ...getNewIdbSavedVisualization(definition), guid: 'locked-chart',
      preservation: { locked: true, transfers: [], references: [{ path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'not-transferred' }] } };
    await harness.seed({ savedVisualizations: [{ ...locked }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', 'locked-chart');
    const fixture = TestBed.createComponent(RecoveryActionsComponent); fixture.detectChanges();
    expect(editor.state()).toBe('readonly');
    await fixture.componentInstance.start('reset');
    expect(fixture.componentInstance.review()!.cleared.length).toBeGreaterThan(0);
    await fixture.componentInstance.confirm();
    fixture.destroy();
    await harness.reopen();
    const saved = (await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations'))[0];
    expect(saved.guid).toBe('locked-chart'); expect(saved.revision).toBe(2); expect(saved.preservation).toBeUndefined();
    expect(readSavedVisualization(saved).state).toBe('setup-required');
    expect((saved.definition as any).sources[0].selection).toBeUndefined();
  });

  it('resets only a broken source and its Scatter binding while retaining the chart and unaffected sourceKind after reopen', async () => {
    const setup = mixedSetup();
    const definition: VisualizationDefinition = { ...setup,
      sources: [{ ...utilityVisualizationFixture().sources[0], id: setup.sources[0].id }, setup.sources[1]],
      series: [{ id: 'usage', sourceId: setup.sources[0].id, metric: 'energy', resourceGuid: 'meter-a', axis: 'left' }],
      chart: { kind: 'scatter', xSeriesId: 'usage', showFit: false } };
    await harness.seed({ savedVisualizations: [{ ...getNewIdbSavedVisualization(definition), guid: 'mixed-chart' }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', 'mixed-chart');
    const fixture = TestBed.createComponent(RecoveryActionsComponent); fixture.detectChanges();
    await fixture.componentInstance.start('reset');
    expect(fixture.componentInstance.review()!.definition.sources[1]).toEqual(definition.sources[1]);
    expect(fixture.componentInstance.review()!.definition.chart).toEqual(setup.chart);
    await fixture.componentInstance.confirm(); fixture.destroy();
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(1); expect(records[0].guid).toBe('mixed-chart'); expect(records[0].revision).toBe(2);
    const saved = readSavedVisualization(records[0]); expect(saved.state).toBe('setup-required');
    if (!('definition' in saved)) throw new Error('Expected readable saved setup.');
    expect(saved.definition.chart).toEqual(setup.chart); expect(saved.definition.series).toEqual([]);
    expect(saved.definition.sources.map(source => source.kind)).toEqual(['utility', 'predictor']);
    expect(saved.definition.sources[1]).toEqual(definition.sources[1]);
    expect(saved.definition.sources[0]).not.toHaveProperty('selection');
  });

  it('duplicates incomplete mixed-sourceKind Scatter intent with independent identity and unchanged original after reopen', async () => {
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const commands = TestBed.inject(SavedVisualizationCommands), definition = mixedSetup();
    const original = commands.prepareCreate(definition); await commands.submit(original);
    const source = TestBed.inject(AccountWorkspaceStore).savedVisualizations().find(record => record.guid === original.guid)!;
    const copy = commands.prepareDuplicate(source); await commands.submit(copy);
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(2); expect(copy.guid).not.toBe(original.guid);
    expect(records.find(record => record.guid === original.guid)!.definition).toEqual(definition);
    const duplicate = records.find(record => record.guid === copy.guid)!;
    expect(duplicate.definition).toEqual({ ...definition, name: `${definition.name} (Copy)` });
    expect(readSavedVisualization(duplicate).state).toBe('setup-required');
  });

  it('copies unassigned Scatter intent to an explicitly reviewed facility and preserves both data sources after reopen', async () => {
    await harness.seed({ facilities: [{ ...visualizationFacility, id: 2, guid: 'facility-b', name: 'Plant B' }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const commands = TestBed.inject(SavedVisualizationCommands), definition = mixedSetup();
    const original = commands.prepareCreate(definition); await commands.submit(original);
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', original.guid);
    const fixture = TestBed.createComponent(RecoveryActionsComponent); fixture.detectChanges();
    await fixture.componentInstance.start('copy'); fixture.componentInstance.scopeControl.setValue('facility-b');
    const expected = { ...definition, name: `${definition.name} (Copy)`, scope: { kind: 'facility', facilityGuid: 'facility-b' } };
    expect(fixture.componentInstance.review()!.definition).toEqual(expected);
    await fixture.componentInstance.confirm(); fixture.destroy();
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(2);
    expect(records.find(record => record.guid === original.guid)!.definition).toEqual(definition);
    const copied = records.find(record => record.guid !== original.guid)!;
    expect(copied.facilityId).toBe('facility-b'); expect(copied.definition).toEqual(expected);
    expect(readSavedVisualization(copied).state).toBe('setup-required');
  });

  it.each(['legacy', 'mixed-sourceKind Scatter'] as const)('saves a deleted %s editor draft under a new GUID without recreating its removed identity', async kind => {
    if (kind === 'legacy') await harness.seed({ utilityMeter: [{
      ...getNewIdbUtilityMeter('facility-a', 'account-a', true, 'kWh'), guid: 'meter-a'
    }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const commands = TestBed.inject(SavedVisualizationCommands);
    const definition = kind === 'legacy' ? utilityVisualizationFixture({ kind: 'facility', facilityGuid: 'facility-a' }) : mixedSetup();
    const proposal = commands.prepareCreate(definition);
    await commands.submit(proposal);
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', proposal.guid);
    const fixture = TestBed.createComponent(RecoveryActionsComponent); fixture.detectChanges();
    editor.form.controls.name.setValue('Recovered local name');
    await commands.submit({ kind: 'delete', accountGuid: 'account-a', guid: proposal.guid, expectedRevision: 1 });
    fixture.detectChanges(); await fixture.whenStable();
    expect(editor.isMissing()).toBe(true); expect(editor.needsProtection()).toBe(true);
    await fixture.componentInstance.start('new'); await fixture.componentInstance.confirm();
    expect(TestBed.inject(AccountWorkspaceStore).savedVisualizations()).toHaveLength(1);
    expect(editor.needsProtection()).toBe(false);
    fixture.destroy();
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & Record<string, unknown>>('savedVisualizations');
    expect(records).toHaveLength(1); expect(records[0].guid).not.toBe(proposal.guid);
    expect((records[0].definition as any).name).toContain('Recovered local name');
    const saved = readSavedVisualization(records[0]);
    if (!('definition' in saved)) throw new Error('Expected readable recovered definition.');
    expect(saved.definition.chart).toEqual(definition.chart); expect(saved.definition.sources).toEqual(definition.sources);
    expect(saved.definition.series).toEqual(definition.series);
  });
});
