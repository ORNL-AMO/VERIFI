import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { createVisualizationChart, VISUALIZATION_CHART_CHOICES } from '../visualization-charts';
import { WorkbenchModule } from './workbench.module';
import { WorkbenchComponent } from './workbench.component';
import { By } from '@angular/platform-browser';
import { PeriodSettingsComponent } from '../utility/editors/period-settings/period-settings.component';
import { RecoveryActionsComponent } from '../recovery/recovery-actions/recovery-actions.component';
import { VISUALIZATION_DATA_SOURCES } from '../visualization-data-sources';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { meter } from '@app/v1/data/meters/facility-meters.testing';

describe('visualization workbench', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('reviews excluded facility bindings through the shell portal before committing the same identity', async () => {
    const definition = utilityVisualizationFixture();
    const { fixture, component, store, submit } = setup(definition);
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      meters: [meter({ guid: 'meter-a', facilityId: 'facility-b' })] }); fixture.detectChanges();
    const before = component.editor.definition()!;
    await component.requestFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] }); fixture.detectChanges();
    expect(component.facilityChange()?.cleared).toContain('Excluded resource selections');
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    expect(submit).not.toHaveBeenCalled(); expect(component.editor.definition()).toEqual(before);
    await component.confirmFacilities(); fixture.detectChanges();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'retarget', guid: 'visualization-a',
      targetFacilities: { kind: 'fixed', facilityGuids: ['facility-a'] } }));
    expect(component.editor.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] });
    expect(component.facilityChange()).toBeUndefined();
  });

  it('passes imported preservation through the facility review before any destructive projection', async () => {
    const definition = utilityVisualizationFixture(), { fixture, component, store, submit } = setup(definition);
    const snapshot = store.snapshot()!, references = [
      { path: 'sources.0.selection.guids.0', kind: 'meter' as const, guid: 'meter-a', reason: 'not-transferred' as const }
    ];
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      meters: [meter({ guid: 'meter-a', facilityId: 'facility-b' })],
      savedVisualizations: [{ ...snapshot.savedVisualizations[0], preservation: { references, transfers: [] } }] }); fixture.detectChanges();
    await component.requestFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] }); fixture.detectChanges();
    expect(component.facilityChange()).toBeUndefined();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'retarget', reviewedDefinition: expect.objectContaining({
      sources: definition.sources, series: definition.series
    }) }));
    expect(component.editor.record()!.preservation!.references).toEqual(references);
  });

  it.each(['failed', 'refresh-required'] as const)('cancels only rejected facility proposals, retaining %s publication protection', async state => {
    const { fixture, component, store, submit } = setup(utilityVisualizationFixture());
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      meters: [meter({ guid: 'meter-a', facilityId: 'facility-b' })] }); fixture.detectChanges();
    const original = structuredClone(component.editor.definition());
    submit.mockImplementationOnce(async command => ({ state, command, error: new Error('Save needs recovery') } as any));
    await component.requestFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] });
    await component.confirmFacilities(); fixture.detectChanges();
    expect(component.editor.needsProtection()).toBe(true);
    component.cancelFacilities(); fixture.detectChanges();
    expect(component.editor.definition()).toEqual(original);
    if (state === 'failed') {
      expect(component.facilityChange()).toBeUndefined();
      expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
      expect(component.editor.needsProtection()).toBe(false); expect(component.editor.canEdit()).toBe(true);
      await expect(component.editor.retry()).resolves.toBe(true);
      expect(submit).toHaveBeenCalledOnce();
    } else {
      expect(component.facilityChange()).toBeDefined();
      expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
      expect(component.editor.state()).toBe('refresh-required'); expect(component.editor.needsProtection()).toBe(true);
      expect(submit).toHaveBeenCalledOnce();
    }
  });

  it('keeps incomplete child input and rejects a catalog-changed facility review', async () => {
    const { fixture, component, store, submit } = setup(utilityVisualizationFixture());
    const snapshot = store.snapshot()!;
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      meters: [meter({ guid: 'meter-a', facilityId: 'facility-b' })] }); fixture.detectChanges();
    const periods = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    periods.form.controls.kind.setValue('fixed'); periods.form.controls.start.setValue('2026-01-01'); fixture.detectChanges();
    await component.requestFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] });
    expect(component.facilityChange()).toBeUndefined(); expect(submit).not.toHaveBeenCalled();
    expect(periods.form.controls.start.value).toBe('2026-01-01');
    periods.useSaved(); fixture.detectChanges();
    await component.requestFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] });
    store.publish({ ...store.snapshot()!, facilities: [...store.facilities(), { ...snapshot.facilities[0], guid: 'facility-c' }] }); fixture.detectChanges();
    expect(component.facilityChangeStale()).toBe(true);
    await component.confirmFacilities(); expect(submit).not.toHaveBeenCalled();
    component.cancelFacilities();
  });
  it('protects invalid child field drafts through metadata edits and explicitly discards them', async () => {
    const { component, fixture } = setup();
    const periods = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    periods.form.controls.kind.setValue('fixed');
    component.editor.form.controls.title.setValue('A coherent title');
    fixture.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    expect(component.saveLabel()).toContain('unsaved');
    const pending = component.resolveLeave(); await Promise.resolve(); await Promise.resolve();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    component.discardLeave();
    await expect(pending).resolves.toBe(true); expect(component.hasInvalidFields()).toBe(false);
  });
  it.each(VISUALIZATION_DATA_SOURCES)('adds independent $label sources and removes only the chosen configuration', choice => {
    const { component, fixture } = setup();
    const original = component.editor.definition()!;
    component.sourceKindControl.setValue(choice.value);
    component.addDataSource();
    expect(component.editor.definition()!.sources).toHaveLength(original.sources.length + 1);
    const added = component.editor.definition()!.sources.at(-1)!;
    expect(added.kind).toBe(choice.value);
    expect(added.id).not.toBe(original.sources[0].id);
    component.addDataSource();
    const repeated = component.editor.definition()!.sources.at(-1)!;
    expect(repeated.kind).toBe(choice.value); expect(repeated.id).not.toBe(added.id);
    fixture.detectChanges();
    if (choice.value === 'predictor' || choice.value === 'analysis') expect(fixture.nativeElement.textContent).toContain(`Data selection for ${choice.label} is not available yet.`);
    component.removeSource(repeated.id);
    component.removeSource(added.id);
    expect(component.editor.definition()!.sources).toEqual(original.sources);
    expect(component.editor.definition()!.series).toEqual(original.series);
  });
  it('keeps a mounted incomplete period after external deletion until Save as new explicitly discards field drafts', async () => {
    const { component, fixture, store, submit, prepareCreate } = setup();
    const periods = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    periods.form.controls.kind.setValue('fixed'); periods.form.controls.start.setValue('2026-03-01');
    fixture.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    store.publish({ ...store.snapshot()!, savedVisualizations: [] }); fixture.detectChanges();
    expect(component.editor.isMissing()).toBe(true);
    const recovery = fixture.debugElement.query(By.directive(RecoveryActionsComponent)).componentInstance as RecoveryActionsComponent;
    const open = vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockResolvedValue(true);
    const saveAsNew = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(button => button.textContent?.trim() === 'Save as new')!;
    saveAsNew.click(); await Promise.resolve(); fixture.detectChanges();
    expect(recovery.childDraftDecision()).toBe('new'); expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    expect(prepareCreate).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance).toBe(periods);
    expect(periods.form.controls.start.value).toBe('2026-03-01'); expect(periods.form.controls.end.value).toBe('');
    expect(component.editor.definition()).toBeDefined(); expect(component.hasInvalidFields()).toBe(true);
    recovery.cancelChildDraftDecision(); fixture.detectChanges();
    expect(periods.form.controls.kind.value).toBe('fixed'); expect(component.hasInvalidFields()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    saveAsNew.click(); await Promise.resolve(); fixture.detectChanges();
    await recovery.discardChildDraftsAndContinue(); fixture.detectChanges();
    expect(component.hasInvalidFields()).toBe(false); expect(periods.form.controls.kind.value).toBe('all-history');
    expect(recovery.mode()).toBe('new'); expect(prepareCreate).not.toHaveBeenCalled();
    await recovery.confirm(); fixture.detectChanges();
    expect(prepareCreate).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'create', guid: 'new-identity', definition: expect.objectContaining({ period: { kind: 'all-history' } }) }));
    expect(open).toHaveBeenCalledWith('account-a', 'new-identity');
    expect(component.editor.definition()).toBeUndefined();
    await expect(TestBed.inject(UnsavedChangesService).resolveNavigationPreflight()).resolves.toBe(true);
  });
  function setup(definition?: VisualizationDefinition) {
    const snapshot = visualizationSnapshot();
    const store = new AccountWorkspaceStore(); store.publish(definition ? { ...snapshot,
      savedVisualizations: [{ ...getNewIdbSavedVisualization(definition), id: 1, guid: 'visualization-a' }] } : snapshot);
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: 'visualization-a' });
    const prepareCreate = vi.fn((value: VisualizationDefinition) => ({ kind: 'create' as const, accountGuid: value.accountGuid, guid: 'new-identity', definition: value, createdDate: '2026-11-12T00:00:00.000Z' }));
    const submit = vi.fn(async (command: any) => ({ state: 'committed', value: command.kind === 'create'
      ? { ...getNewIdbSavedVisualization(command.definition), guid: command.guid }
      : { ...store.savedVisualizations()[0], definition: command.kind === 'retarget'
        ? prepareVisualizationFacilityChange(store.savedVisualizations()[0].definition as VisualizationDefinition, command.targetFacilities, store.snapshot()!, store.savedVisualizations()[0].preservation?.references).definition
        : command.definition, revision: command.expectedRevision + 1 }, command, referenceIssues: [] }));
    TestBed.configureTestingModule({ imports: [WorkbenchModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { routeState: route } },
      { provide: SavedVisualizationCommands, useValue: { submit, prepareCreate } }
    ] });
    const fixture = TestBed.createComponent(WorkbenchComponent); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, submit, prepareCreate, route };
  }
  it('shows saved ownership and saves valid edits before leaving', async () => {
    const { fixture, component, submit } = setup();
    expect(fixture.nativeElement.textContent).toContain('Plant A');
    component.editor.form.controls.name.setValue('Updated name');
    await expect(component.resolveLeave()).resolves.toBe(true);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, definition: expect.objectContaining({ name: 'Updated name' }) }));
    expect(component.editor.needsProtection()).toBe(false);
  });
  it.each(VISUALIZATION_CHART_CHOICES)('shows the saved $label chart choice and all selected data sources', choice => {
    const definition = createVisualizationSetupDefinition({ name: 'Mixed chart', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: createVisualizationChart(choice.value), sourceKinds: ['utility', 'predictor', 'analysis'] });
    const { fixture, component } = setup(definition);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(`Chart: ${choice.label}`);
    expect(root.textContent).toContain('Meters'); expect(root.textContent).toContain('Predictors'); expect(root.textContent).toContain('Analysis');
    expect(root.textContent).toContain('Back to Dashboard');
    expect(component.editor.definition()).toEqual(definition);
  });
  it('uses one portal review and retains invalid input when navigation is canceled', async () => {
    const { component, submit } = setup();
    component.editor.form.controls.name.setValue('');
    const pending = TestBed.inject(UnsavedChangesService).resolveNavigationPreflight();
    await Promise.resolve(); await Promise.resolve();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    component.finishLeave(false);
    await expect(pending).resolves.toBe(false);
    expect(component.editor.form.controls.name.value).toBe('');
    expect(component.editor.needsProtection()).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
  it('explicit discard restores the saved intent and closes the portal', async () => {
    const { component } = setup();
    component.editor.form.controls.name.setValue('');
    const pending = component.resolveLeave(); await Promise.resolve(); await Promise.resolve();
    component.discardLeave();
    await expect(pending).resolves.toBe(true);
    expect(component.editor.form.controls.name.value).toBe('My energy');
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });
  it('returns through account-isolated browse context', () => {
    const { component } = setup();
    const back = vi.spyOn(TestBed.inject(VisualizationNavigationService), 'returnToDashboard').mockResolvedValue(true);
    component.back(); expect(back).toHaveBeenCalledWith('account-a');
  });
});
