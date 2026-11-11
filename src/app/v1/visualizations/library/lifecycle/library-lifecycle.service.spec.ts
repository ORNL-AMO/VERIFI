import { TestBed } from '@angular/core/testing';
import { LibraryLifecycle } from './library-lifecycle.service';
import { VISUALIZATION_FAMILIES, buildVisualizationLibrary } from '../visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../testing/library-testing';

describe('visualization library lifecycle', () => {
  it('does not fall back to portfolio creation for an invalid single-facility account', () => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, facilities: [] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    expect(lifecycle.editor()).toBeUndefined(); expect(lifecycle.error()).toContain('sole facility');
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
    lifecycle.openCreate(); lifecycle.form.controls.name.setValue('Saved before leaving');
    const saving = lifecycle.submit(); const leaving = lifecycle.resolveLeave();
    finish({ value: libraryRecord(), referenceIssues: [] });
    await saving; await expect(leaving).resolves.toBe(true);
    expect(visualizations.open).not.toHaveBeenCalled();
    expect(lifecycle.needsProtection()).toBe(false);
  });
  it.each(VISUALIZATION_FAMILIES)('creates one saved setup identity for $value and opens its workbench', async family => {
    const { commands, visualizations } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.form.patchValue({ name: '  Useful name  ', family: family.value }); await lifecycle.submit();
    expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ name: 'Useful name', sources: [{ kind: family.value }] });
    expect(visualizations.open).toHaveBeenCalledWith('account-a', 'created-1'); expect(lifecycle.needsProtection()).toBe(false);
  });
  it('retains one failed creation proposal and recovers a committed publication without resubmitting', async () => {
    const { commands, visualizations } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    commands.submit.mockImplementationOnce(async command => ({ state: 'failed', command, error: new Error('Storage unavailable') } as any))
      .mockImplementationOnce(async command => ({ state: 'refresh-required', command, error: new Error('Refresh unavailable') } as any));
    lifecycle.openCreate(); lifecycle.form.controls.name.setValue('Retained'); await lifecycle.submit();
    const proposal = lifecycle.proposal(); expect(lifecycle.needsProtection()).toBe(true); expect(lifecycle.form.controls.name.value).toBe('Retained');
    await lifecycle.retry(); expect(lifecycle.proposal()).toBe(proposal); expect(lifecycle.outcome()).toBe('refresh-required');
    lifecycle.discard(); expect(lifecycle.proposal()).toBe(proposal); expect(lifecycle.canDiscard()).toBe(false);
    await lifecycle.retry(); expect(commands.submit).toHaveBeenCalledTimes(2); expect(commands.prepareCreate).toHaveBeenCalledTimes(1);
    expect(commands.recover).toHaveBeenCalledWith('account-a', 'created-1'); expect(visualizations.open).toHaveBeenCalledWith('account-a', 'created-1');
  });
  it('prevents repeated activation and keeps draft state through transient workspace refresh', async () => {
    const { commands, workspace } = configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle);
    let finish!: (value: any) => void; commands.submit.mockImplementationOnce(command => new Promise(resolve => { finish = value => resolve({ state: 'committed', command, ...value }); }));
    lifecycle.openCreate(); lifecycle.form.controls.name.setValue('Retained'); const saving = lifecycle.submit();
    const initial = lifecycle.editor(); workspace.beginLoad(false); await lifecycle.submit(); lifecycle.openCreate();
    expect(lifecycle.editor()).toBe(initial); expect(commands.submit).toHaveBeenCalledTimes(1);
    workspace.publish(workspace.snapshot()!); finish({ value: libraryRecord(), referenceIssues: [] }); await saving;
  });
  it('locks single-facility creation to the sole facility and rejects malformed name input', async () => {
    const { workspace, commands } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true } });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    expect(lifecycle.editor()?.fixedFacility).toBe('facility-a'); lifecycle.form.controls.name.setValue('  '); await lifecycle.submit();
    expect(commands.submit).not.toHaveBeenCalled(); lifecycle.form.patchValue({ name: 'Attempt portfolio', scope: 'portfolio' }); await lifecycle.submit();
    expect(commands.submit).not.toHaveBeenCalled(); lifecycle.form.controls.scope.setValue('facility'); await lifecycle.submit();
    expect(commands.prepareCreate.mock.calls[0][0].scope).toEqual({ kind: 'facility', facilityGuid: 'facility-a' });
  });
  it('uses portal-driven Stay and Discard decisions before leaving a changed draft', async () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.form.controls.name.setValue('Protected');
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
