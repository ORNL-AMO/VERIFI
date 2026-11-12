import { Router } from '@angular/router';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { TestBed } from '@angular/core/testing';
import type { VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { LibraryLifecycle } from './library-lifecycle.service';
import { VISUALIZATION_DATA_SOURCES, buildVisualizationLibrary } from '../visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../testing/library-testing';
import { group, meter, reading } from '@app/v1/data/meters/facility-meters.testing';

function selectSetup(lifecycle: LibraryLifecycle, sourceKinds: readonly VisualizationSourceKind[] = ['utility']): void {
  if (!lifecycle.editor()?.fixedFacility) lifecycle.selectScope('portfolio');
  lifecycle.selectChart('line');
  for (const sourceKind of sourceKinds) lifecycle.toggleSource(sourceKind);
  lifecycle.continueSources();
}

describe('visualization Dashboard lifecycle', () => {
  it('clears resources when revisiting the grouping step and blocks removed choices', () => {
    const { workspace, commands } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({ groupId: 'group-a' })], meterData: [reading({})],
      meterGroups: [group({ guid: 'group-a', name: 'Production' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.selectScope('portfolio'); lifecycle.selectRecipe('energy-trend');
    expect(lifecycle.form.controls.recipeGrouping.value).toBeNull();
    lifecycle.selectRecipeGrouping('sources'); lifecycle.toggleRecipeResource('Electricity');
    expect(lifecycle.canContinueRecipe()).toBe(true);
    lifecycle.editSelection('recipe-grouping'); lifecycle.selectRecipeGrouping('sources');
    expect(lifecycle.form.controls.recipeResourceIds.value).toEqual([]);
    lifecycle.editSelection('recipe-grouping'); lifecycle.selectRecipeGrouping('groups');
    expect(lifecycle.form.controls.recipeResourceIds.value).toEqual([]); expect(lifecycle.canContinueRecipe()).toBe(false);
    lifecycle.toggleRecipeResource('group-a'); expect(lifecycle.canContinueRecipe()).toBe(true);
    workspace.publish({ ...workspace.snapshot()!, meterGroups: [] });
    expect(lifecycle.canContinueRecipe()).toBe(false);
    expect(lifecycle.recipeResourceCards()).toContainEqual({ value: 'group-a', label: 'Unavailable selection', detail: 'Select to remove', icon: 'meterGroupItem' });
    lifecycle.continueRecipe(); expect(lifecycle.step()).toBe('recipe-resources'); expect(commands.prepareCreate).not.toHaveBeenCalled();
    lifecycle.toggleRecipeResource('group-a'); expect(lifecycle.form.controls.recipeResourceIds.value).toEqual([]);
  });
  it('binds a recipe to explicit saved meters before preparing one independent creation', async () => {
    const { commands, workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({})], meterData: [reading({})] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.selectScope('portfolio'); lifecycle.selectRecipe('energy-trend');
    expect(lifecycle.step()).toBe('recipe-grouping'); lifecycle.selectRecipeGrouping('meters');
    expect(lifecycle.step()).toBe('recipe-resources'); expect(lifecycle.canContinueRecipe()).toBe(false);
    lifecycle.continueRecipe(); await lifecycle.submit(); expect(commands.prepareCreate).not.toHaveBeenCalled();
    lifecycle.form.controls.recipeResourceIds.setValue(['meter-a']); lifecycle.continueRecipe(); await lifecycle.submit();
    expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ name: 'Energy usage trend',
      chart: { kind: 'time-series', type: 'line', interval: 'monthly' }, sources: [{ measure: 'energy', selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] } }] });
  });
  it('requires an explicit chart, data sources and final name step before adding', async () => {
    const { commands } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    lifecycle.form.controls.name.setValue('Premature'); await lifecycle.submit();
    expect(commands.prepareCreate).not.toHaveBeenCalled();
    lifecycle.selectScope('portfolio'); lifecycle.selectChart('scatter'); await lifecycle.submit();
    expect(lifecycle.canContinueSources()).toBe(false); expect(commands.prepareCreate).not.toHaveBeenCalled();
    lifecycle.toggleSource('utility'); await lifecycle.submit();
    expect(commands.prepareCreate).not.toHaveBeenCalled(); lifecycle.continueSources(); await lifecycle.submit();
    expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.prepareCreate.mock.calls[0][0].chart).toEqual({ kind: 'scatter', showFit: false });
  });
  it('clears later choices immediately when revisiting chart and ownership selections', async () => {
    const { commands } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    lifecycle.selectScope('facility'); expect(lifecycle.step()).toBe('facility'); lifecycle.selectFacility('facility-a');
    lifecycle.selectChart('scatter'); lifecycle.toggleSource('utility'); lifecycle.toggleSource('predictor'); lifecycle.continueSources();
    lifecycle.form.controls.name.setValue('Usage versus weather');
    lifecycle.editSelection('chart'); expect(lifecycle.step()).toBe('chart');
    expect(lifecycle.form.controls.chart.value).toBe('scatter'); expect(lifecycle.form.controls.facilityGuid.value).toBe('facility-a');
    expect(lifecycle.form.controls.sourceKinds.value).toEqual([]); expect(lifecycle.form.controls.name.value).toBe('');
    lifecycle.selectChart('combination'); lifecycle.toggleSource('utility'); lifecycle.toggleSource('predictor'); lifecycle.continueSources();
    lifecycle.form.controls.name.setValue('New selection'); lifecycle.editSelection('scope');
    expect(lifecycle.form.controls.facilityGuid.value).toBe(''); expect(lifecycle.form.controls.chart.value).toBeNull();
    expect(lifecycle.form.controls.sourceKinds.value).toEqual([]); expect(lifecycle.form.controls.name.value).toBe('');
    expect(lifecycle.canSubmit()).toBe(false);
    lifecycle.selectScope('portfolio'); lifecycle.selectChart('combination'); lifecycle.toggleSource('utility'); lifecycle.toggleSource('predictor');
    lifecycle.continueSources(); lifecycle.form.controls.name.setValue('Fresh name');
    await lifecycle.submit();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ scope: { kind: 'portfolio' }, chart: { kind: 'time-series', type: 'combination' },
      sources: [{ id: 'source-1', kind: 'utility' }, { id: 'source-2', kind: 'predictor' }] });
  });
  it.each(['energy-trend', 'cost-trend'] as const)('clears the %s path immediately when reopening the facility step', recipe => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({})], meterData: [reading({})] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.selectScope('facility'); lifecycle.selectFacility('facility-a');
    lifecycle.selectRecipe(recipe); if (recipe === 'energy-trend') lifecycle.selectRecipeGrouping('meters');
    lifecycle.toggleRecipeResource('meter-a'); lifecycle.continueRecipe(); lifecycle.form.controls.name.markAsTouched();
    lifecycle.editSelection('facility');
    expect(lifecycle.step()).toBe('facility');
    expect(lifecycle.form.getRawValue()).toMatchObject({ scope: 'facility', facilityGuid: 'facility-a', chart: null,
      sourceKinds: [], recipe: 'custom', recipeGrouping: null, recipeResourceIds: [], name: '' });
    expect(lifecycle.selections().map(selection => selection.step)).toEqual(['scope', 'facility']);
    expect(lifecycle.form.controls.name.touched).toBe(false); expect(lifecycle.canSubmit()).toBe(false);
  });
  it('keeps the current resources but clears the later name when editing resource selection', () => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({})], meterData: [reading({})] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.selectScope('portfolio'); lifecycle.selectRecipe('energy-trend');
    lifecycle.selectRecipeGrouping('meters'); lifecycle.toggleRecipeResource('meter-a'); lifecycle.continueRecipe();
    lifecycle.editSelection('recipe-resources');
    expect(lifecycle.form.controls.recipeResourceIds.value).toEqual(['meter-a']);
    expect(lifecycle.form.controls.recipeGrouping.value).toBe('meters'); expect(lifecycle.form.controls.name.value).toBe('');
    expect(lifecycle.canContinueRecipe()).toBe(true); expect(lifecycle.canSubmit()).toBe(false);
  });
  it('resets steps and selections when Add is reopened after explicit discard', () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle, ['utility', 'predictor']);
    lifecycle.form.controls.name.setValue('Discard this setup'); lifecycle.discard(); lifecycle.openCreate();
    expect(lifecycle.step()).toBe('scope'); expect(lifecycle.selections()).toEqual([]);
    expect(lifecycle.form.controls.chart.value).toBeNull(); expect(lifecycle.form.controls.sourceKinds.value).toEqual([]);
    expect(lifecycle.form.controls.name.value).toBe(''); expect(lifecycle.canSubmit()).toBe(false);
  });
  it('skips ownership for a preselected facility and blocks an unavailable owner', () => {
    const { facility, workspace } = configureLibraryTest(); facility.set('facility-a');
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    expect(lifecycle.step()).toBe('chart'); expect(lifecycle.selections().filter(selection => selection.step === 'facility')[0].editable).toBe(false);
    selectSetup(lifecycle); lifecycle.form.controls.name.setValue('Locked owner'); expect(lifecycle.canSubmit()).toBe(true);
    lifecycle.selectScope('portfolio'); expect(lifecycle.form.controls.scope.value).toBe('facility');
    workspace.publish({ ...workspace.snapshot()!, facilities: [] }); expect(lifecycle.canSubmit()).toBe(false);
  });
  it('does not fall back to portfolio creation for an invalid single-facility account', () => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, facilities: [] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle);
    expect(lifecycle.editor()).toBeUndefined(); expect(lifecycle.error()).toContain('sole facility');
  });
  it('reviews a retained portfolio visualization before copying it into a single-facility account', async () => {
    const { workspace, commands, visualizations } = configureLibraryTest(); const record = libraryRecord('Retained portfolio');
    const original = structuredClone(record.definition);
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, savedVisualizations: [record] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const lifecycle = TestBed.inject(LibraryLifecycle); await lifecycle.duplicate(buildVisualizationLibrary(workspace.snapshot()!)[0]);
    expect(navigate).toHaveBeenCalledWith(visualizations.workbenchRoute('account-a', record.guid), { queryParams: { action: 'copy-scope' } });
    expect(commands.prepareDuplicate).not.toHaveBeenCalled(); expect(commands.submit).not.toHaveBeenCalled();
    expect(lifecycle.proposal()).toBeUndefined(); expect(record.definition).toEqual(original);
    expect(workspace.savedVisualizations()).toEqual([record]);
  });
  it.each(['duplicate', 'duplicateToScope'] as const)('blocks %s when the single-facility account has no valid sole facility', async action => {
    const { workspace, commands } = configureLibraryTest(); const record = libraryRecord(); const original = structuredClone(record.definition);
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, facilities: [], savedVisualizations: [record] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const lifecycle = TestBed.inject(LibraryLifecycle); await lifecycle[action](buildVisualizationLibrary(workspace.snapshot()!)[0]);
    expect(lifecycle.error()).toContain('Restore the sole facility or convert this account to a portfolio');
    expect(commands.prepareDuplicate).not.toHaveBeenCalled(); expect(commands.submit).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    expect(record.definition).toEqual(original);
  });
  it('keeps ordinary facility-owned duplication available in a valid single-facility account', async () => {
    const { workspace, commands, visualizations } = configureLibraryTest();
    const record = getNewIdbSavedVisualization(createVisualizationDefinition('Facility setup', 'account-a', { kind: 'facility', facilityGuid: 'facility-a' }, 'utility'));
    const original = structuredClone(record.definition);
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, savedVisualizations: [record] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const lifecycle = TestBed.inject(LibraryLifecycle); await lifecycle.duplicate(buildVisualizationLibrary(workspace.snapshot()!)[0]);
    expect(commands.prepareDuplicate).toHaveBeenCalledWith(record);
    expect(commands.submit.mock.calls[0][0]).toMatchObject({ kind: 'duplicate', sourceGuid: record.guid,
      definition: { scope: { kind: 'facility', facilityGuid: 'facility-a' } } });
    expect(visualizations.open).toHaveBeenCalledWith('account-a', 'copy-1'); expect(navigate).not.toHaveBeenCalled();
    expect(record.definition).toEqual(original);
  });
  it('refreshes a conflicting source before explicitly discarding a rejected duplicate proposal', async () => {
    const { commands, workspace } = configureLibraryTest(); const record = libraryRecord();
    workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [record] });
    commands.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: { ...record, revision: 2 }, error: new Error('Conflict') } as any));
    const lifecycle = TestBed.inject(LibraryLifecycle);
    await lifecycle.duplicate(buildVisualizationLibrary(workspace.snapshot()!)[0]);
    expect(lifecycle.proposal()).toBeDefined();
    await lifecycle.reloadSavedConflict();
    expect(commands.recover).toHaveBeenCalledWith('account-a', record.guid);
    expect(commands.submit).toHaveBeenCalledTimes(1); expect(lifecycle.proposal()).toBeUndefined();
  });
  it('lets a pending account or scope transition own navigation after creation finishes', async () => {
    const { commands, visualizations } = configureLibraryTest();
    const lifecycle = TestBed.inject(LibraryLifecycle);
    let finish!: (value: any) => void;
    commands.submit.mockImplementationOnce(command => new Promise(resolve => finish = value => resolve({ state: 'committed', command, ...value })));
    lifecycle.openCreate(); selectSetup(lifecycle); lifecycle.form.controls.name.setValue('Saved before leaving');
    const saving = lifecycle.submit(); const leaving = lifecycle.resolveLeave();
    finish({ value: libraryRecord(), referenceIssues: [] });
    await saving; await expect(leaving).resolves.toBe(true);
    expect(visualizations.open).not.toHaveBeenCalled();
    expect(lifecycle.needsProtection()).toBe(false);
  });
  it.each(VISUALIZATION_DATA_SOURCES)('creates one saved setup identity for $value and opens its workbench', async sourceKind => {
    const { commands, visualizations } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); selectSetup(lifecycle, [sourceKind.value]); lifecycle.form.patchValue({ name: '  Useful name  ' }); await lifecycle.submit();
    expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ name: 'Useful name', sources: [{ kind: sourceKind.value }] });
    expect(visualizations.open).toHaveBeenCalledWith('account-a', 'created-1'); expect(lifecycle.needsProtection()).toBe(false);
  });
  it('retains one failed creation proposal and recovers a committed publication without resubmitting', async () => {
    const { commands, visualizations } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    commands.submit.mockImplementationOnce(async command => ({ state: 'failed', command, error: new Error('Storage unavailable') } as any))
      .mockImplementationOnce(async command => ({ state: 'refresh-required', command, error: new Error('Refresh unavailable') } as any));
    lifecycle.openCreate(); selectSetup(lifecycle, ['utility', 'predictor']); lifecycle.form.controls.name.setValue('Retained'); await lifecycle.submit();
    const proposal = lifecycle.proposal();
    expect(proposal).toMatchObject({ definition: { chart: { kind: 'time-series', type: 'line' }, sources: [{ kind: 'utility' }, { kind: 'predictor' }] } });
    lifecycle.toggleSource('predictor'); expect(lifecycle.form.controls.sourceKinds.value).toEqual(['utility', 'predictor']);
    expect(lifecycle.needsProtection()).toBe(true); expect(lifecycle.form.controls.name.value).toBe('Retained');
    await lifecycle.retry(); expect(lifecycle.proposal()).toBe(proposal); expect(lifecycle.outcome()).toBe('refresh-required');
    lifecycle.discard(); expect(lifecycle.proposal()).toBe(proposal); expect(lifecycle.canDiscard()).toBe(false);
    await lifecycle.retry(); expect(commands.submit).toHaveBeenCalledTimes(2); expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.recover).toHaveBeenCalledWith('account-a', 'created-1'); expect(visualizations.open).toHaveBeenCalledWith('account-a', 'created-1');
  });
  it('prevents repeated activation and keeps draft state through transient workspace refresh', async () => {
    const { commands, workspace } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    let finish!: (value: any) => void; commands.submit.mockImplementationOnce(command => new Promise(resolve => { finish = value => resolve({ state: 'committed', command, ...value }); }));
    lifecycle.openCreate(); selectSetup(lifecycle); lifecycle.form.controls.name.setValue('Retained'); const saving = lifecycle.submit();
    const initial = lifecycle.editor(); workspace.beginLoad(false); await lifecycle.submit(); lifecycle.openCreate(); selectSetup(lifecycle);
    expect(lifecycle.editor()).toBe(initial); expect(commands.submit).toHaveBeenCalledTimes(1);
    workspace.publish(workspace.snapshot()!); finish({ value: libraryRecord(), referenceIssues: [] }); await saving;
  });
  it('locks single-facility creation to the sole facility and rejects malformed name input', async () => {
    const { workspace, commands } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true } });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle);
    expect(lifecycle.editor()?.fixedFacility).toBe('facility-a'); lifecycle.form.controls.name.setValue('  '); await lifecycle.submit();
    expect(commands.submit).not.toHaveBeenCalled(); lifecycle.form.patchValue({ name: 'Attempt portfolio', scope: 'portfolio' }); await lifecycle.submit();
    expect(commands.submit).not.toHaveBeenCalled(); lifecycle.form.controls.scope.setValue('facility'); await lifecycle.submit();
    expect(commands.prepareCreate.mock.calls[0][0].scope).toEqual({ kind: 'facility', facilityGuid: 'facility-a' });
  });
  it('uses portal-driven Stay and Discard decisions before leaving a changed draft', async () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle); lifecycle.form.controls.name.setValue('Protected');
    const stay = lifecycle.resolveLeave(); expect(lifecycle.confirmation()).toBe('discard'); lifecycle.cancelConfirmation(); expect(await stay).toBe(false);
    expect(lifecycle.form.controls.name.value).toBe('Protected'); const discard = lifecycle.resolveLeave(); lifecycle.discard(); expect(await discard).toBe(true);
    expect(lifecycle.editor()).toBeUndefined(); expect(lifecycle.needsProtection()).toBe(false);
  });
  it('does not overwrite a conflicting rename and requires explicit saved-name review', async () => {
    const { workspace, commands } = configureLibraryTest(); const record = libraryRecord(); workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [record] });
    const saved = { ...record, revision: record.revision + 1, definition: { ...(record.definition as any), name: 'Externally saved' } };
    commands.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: saved, error: new Error('Conflict') } as any));
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.rename(buildVisualizationLibrary(workspace.snapshot()!)[0]); lifecycle.form.controls.name.setValue('Local'); await lifecycle.submit();
    expect(lifecycle.form.controls.name.value).toBe('Local'); expect(lifecycle.canRetry()).toBe(false); lifecycle.useSavedConflict();
    expect(lifecycle.form.controls.name.value).toBe('Externally saved'); expect(lifecycle.proposal()).toBeUndefined();
  });
  it('confirms deletions with the viewed revision and does not duplicate unreadable payloads', async () => {
    const { workspace, commands } = configureLibraryTest(); const record = libraryRecord(); workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [record] });
    const lifecycle = TestBed.inject(LibraryLifecycle); const entry = buildVisualizationLibrary(workspace.snapshot()!)[0]; lifecycle.requestDelete(entry);
    expect(commands.submit).not.toHaveBeenCalled(); await lifecycle.confirmDelete(); expect(commands.submit.mock.calls[0][0]).toEqual({ kind: 'delete', accountGuid: 'account-a', guid: record.guid, expectedRevision: record.revision });
    await lifecycle.duplicate({ ...entry, editable: false }); expect(commands.prepareDuplicate).not.toHaveBeenCalled();
  });
  it('keeps an explicitly chosen local rename against the authoritative saved revision', async () => {
    const { workspace, commands } = configureLibraryTest(); const record = libraryRecord(); workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [record] });
    const saved = { ...record, revision: record.revision + 1, definition: { ...(record.definition as any), name: 'New saved', appearance: { legend: false } } };
    commands.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: saved, error: new Error('Conflict') } as any));
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.rename(buildVisualizationLibrary(workspace.snapshot()!)[0]); lifecycle.form.controls.name.setValue('Mine'); await lifecycle.submit();
    lifecycle.keepLocalConflict(); expect(lifecycle.form.controls.name.value).toBe('Mine'); await lifecycle.submit();
    expect(commands.submit.mock.calls[1][0]).toMatchObject({ expectedRevision: saved.revision, definition: { name: 'Mine', appearance: { legend: false } } });
  });
});
