import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { visualizationSnapshot, visualizationRecord, visualizationFacility } from '../../testing/visualization-test-fixtures';
import { RecoveryActionsComponent } from './recovery-actions.component';
import { RecoveryModule } from '../recovery.module';

describe('reviewed visualization recovery actions', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(definition: VisualizationDefinition = utilityVisualizationFixture({ kind: 'facility', facilityGuid: 'facility-a' })) {
    const store = new AccountWorkspaceStore();
    const record = { ...visualizationRecord(), definition };
    store.publish({ ...visualizationSnapshot(), facilities: [visualizationFacility, { ...visualizationFacility, guid: 'facility-b', name: 'Plant B' }], savedVisualizations: [record] });
    const prepareCreate = vi.fn((definition: any) => ({ kind: 'create', accountGuid: definition.accountGuid, guid: 'new-identity', definition, createdDate: new Date().toISOString() }));
    const submit = vi.fn(async (command: any): Promise<any> => ({ state: 'committed', command,
      value: command.kind === 'update' ? { ...record, revision: 2, definition: command.definition }
        : { ...getNewIdbSavedVisualization(command.definition), guid: command.guid }, referenceIssues: [] }));
    const recover = vi.fn(async () => ({ state: 'setup-required', record: { ...record, guid: 'new-identity' } }));
    const open = vi.fn(async () => true);
    TestBed.configureTestingModule({ imports: [RecoveryModule],
      providers: [VisualizationEditorSession, { provide: AccountWorkspaceStore, useValue: store },
        { provide: SavedVisualizationCommands, useValue: { prepareCreate, submit, recover } }, { provide: VisualizationNavigationService, useValue: { open } }] });
    const fixture = TestBed.createComponent(RecoveryActionsComponent);
    const editor = TestBed.inject(VisualizationEditorSession); editor.open('account-a', 'visualization-a'); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, editor, record, prepareCreate, submit, recover, open };
  }
  it('reviews all affected references and writes an explicit same-identity reset', async () => {
    const { component, editor, submit, prepareCreate } = setup();
    await component.start('reset');
    expect(component.review()!.cleared).not.toHaveLength(0);
    expect(component.referencesForReview().map(ref => ref.guid)).toContain('meter-a');
    await component.confirm();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'update', guid: 'visualization-a', repair: expect.objectContaining({ referencePaths: expect.arrayContaining(['sources.0.selection.guids.0', 'series.0.resourceGuid']) }) }));
    expect(editor.definition()!.series).toEqual([]);
    expect(prepareCreate).not.toHaveBeenCalled();
  });
  it('copies to an explicitly reviewed scope without using same-scope duplicate commands', async () => {
    const { component, prepareCreate, submit, open, editor } = setup();
    await component.start('copy'); component.scopeControl.setValue('facility-b');
    expect(component.review()!.definition.scope).toEqual({ kind: 'facility', facilityGuid: 'facility-b' });
    await component.confirm();
    expect(prepareCreate).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'create', guid: 'new-identity' }));
    expect(open).toHaveBeenCalledWith('account-a', 'new-identity');
    expect(editor.record()!.guid).toBe('visualization-a');
  });
  it('retains mixed-sourceKind Scatter intent in one retried proposal and recovers publication without replay', async () => {
    const definition = createVisualizationSetupDefinition({ name: 'Usage and weather', accountGuid: 'account-a',
      scope: { kind: 'facility', facilityGuid: 'facility-a' }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
    const { component, prepareCreate, submit, recover, open } = setup(definition);
    submit.mockResolvedValueOnce({ state: 'failed' }).mockResolvedValueOnce({ state: 'refresh-required' });
    await component.start('copy'); component.scopeControl.setValue('facility-b'); await component.confirm();
    const proposal = component.proposal()!;
    expect(proposal.definition).toEqual({ ...definition, name: `${definition.name} (Copy)`, scope: { kind: 'facility', facilityGuid: 'facility-b' } });
    await component.confirm();
    expect(prepareCreate).toHaveBeenCalledOnce();
    component.cancel(); expect(component.proposal()).toBeDefined();
    await component.confirm();
    expect(submit).toHaveBeenCalledTimes(2); expect(recover).toHaveBeenCalledWith('account-a', 'new-identity');
    expect(submit.mock.calls[0][0]).toBe(proposal); expect(submit.mock.calls[1][0]).toBe(proposal);
    expect(open).toHaveBeenCalledOnce();
  });
  it('invalidates review when the committed workspace changes', async () => {
    const { component, store, submit } = setup();
    await component.start('copy');
    store.publish({ ...store.snapshot()!, predictors: [] });
    expect(component.stale()).toBe(true);
    await component.confirm(); expect(submit).not.toHaveBeenCalled();
  });
  it('gates a reviewed reset if a child field becomes incomplete before confirmation', async () => {
    const { component, fixture, editor, submit } = setup();
    const invalid = signal(false), discard = vi.fn(() => invalid.set(false));
    fixture.componentRef.setInput('childDrafts', { invalid, key: signal('editor-a'), discard }); fixture.detectChanges();
    await component.start('reset');
    const before = structuredClone(editor.definition()); invalid.set(true);
    await component.confirm(); fixture.detectChanges();
    expect(component.childDraftDecision()).toBe('reset'); expect(submit).not.toHaveBeenCalled(); expect(editor.definition()).toEqual(before);
    component.cancelChildDraftDecision(); expect(discard).not.toHaveBeenCalled(); expect(invalid()).toBe(true);
    await component.start('reset'); await component.discardChildDraftsAndContinue(); await component.confirm();
    expect(discard).toHaveBeenCalledOnce(); expect(submit).toHaveBeenCalledOnce();
  });
  it('retains late child drafts after a committed new copy and recovers its identity without replay', async () => {
    const { component, fixture, editor, store, submit, recover, open } = setup();
    const invalid = signal(false), discard = vi.fn(() => invalid.set(false));
    fixture.componentRef.setInput('childDrafts', { invalid, key: signal('editor-a'), discard }); fixture.detectChanges();
    store.publish({ ...store.snapshot()!, savedVisualizations: [] }); fixture.detectChanges();
    let complete!: (value: unknown) => void;
    submit.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await component.start('new'); const pending = component.confirm();
    invalid.set(true); complete({ state: 'committed' }); await pending; fixture.detectChanges();
    expect(component.childDraftDecision()).toBe('new'); expect(editor.definition()).toBeDefined();
    expect(component.proposal()?.guid).toBe('new-identity'); expect(open).not.toHaveBeenCalled();
    await component.discardChildDraftsAndContinue();
    expect(discard).toHaveBeenCalledOnce(); expect(recover).toHaveBeenCalledWith('account-a', 'new-identity');
    expect(submit).toHaveBeenCalledOnce(); expect(open).toHaveBeenCalledWith('account-a', 'new-identity');
    expect(editor.definition()).toBeUndefined();
  });
});
