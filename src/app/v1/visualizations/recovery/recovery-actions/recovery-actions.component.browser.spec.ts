import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { visualizationAccount, visualizationFacility } from '../../testing/visualization-test-fixtures';
import { RecoveryModule } from '../recovery.module';
import { RecoveryActionsComponent } from './recovery-actions.component';

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

  it('saves a deleted editor draft under a new GUID without recreating its removed identity', async () => {
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
    const commands = TestBed.inject(SavedVisualizationCommands);
    const proposal = commands.prepareCreate(utilityVisualizationFixture({ kind: 'facility', facilityGuid: 'facility-a' }));
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
  });
});
