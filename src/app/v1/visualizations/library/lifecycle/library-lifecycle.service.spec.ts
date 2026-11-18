import { analysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { equipmentFixture } from '@domain/visualizations/testing/equipment-fixtures';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { Router } from '@angular/router';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { TestBed } from '@angular/core/testing';
import type { VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { LibraryLifecycle } from './library-lifecycle.service';
import { VISUALIZATION_DATA_SOURCES, buildVisualizationLibrary } from '../visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../testing/library-testing';
import { group, meter } from '@app/v1/data/meters/facility-meters.testing';
import { prepareDecisionChange } from '../../decisions/decision-tree';

function selectSetup(lifecycle: LibraryLifecycle, sourceKinds: readonly VisualizationSourceKind[] = ['utility']): void {
  lifecycle.continueFacilities();
  lifecycle.selectChart('line');
  for (const sourceKind of sourceKinds) lifecycle.toggleSource(sourceKind);
  lifecycle.continueSources();
  if (sourceKinds.includes('utility')) {
    const workspace = TestBed.inject(AccountWorkspaceStore);
    if (!workspace.meters().some(item => item.guid === 'meter-a')) workspace.publish({ ...workspace.snapshot()!, meters: [...workspace.meters(), meter({})] });
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.continueResources();
  }
  if (sourceKinds.includes('predictor')) lifecycle.continuePredictors();
  if (sourceKinds.includes('energy-use')) { lifecycle.selectEnergyUseMode('equipment'); lifecycle.continueEquipment(); }
  if (sourceKinds.includes('analysis')) {
    const workspace = TestBed.inject(AccountWorkspaceStore);
    if (!workspace.facilityAnalyses().length) workspace.publish({ ...workspace.snapshot()!, facilityAnalyses: [analysisFixture().analysis] });
    lifecycle.selectAnalysis(workspace.facilityAnalyses()[0].guid);
    lifecycle.continueAnalysis();
  }
  lifecycle.continueMeasures();
}

describe('visualization Dashboard lifecycle', () => {
  it('collects multiple exact analyses, retains unavailable selections and reviews their removal', () => {
    const { workspace } = configureLibraryTest(); const data = analysisFixture();
    workspace.publish({ ...data.snapshot, facilityAnalyses: [data.analysis, { ...data.analysis, guid: 'second', name: 'Second' }] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('analysis'); lifecycle.continueSources();
    expect(lifecycle.canContinueAnalysis()).toBe(false);
    lifecycle.selectAnalysis('analysis-a'); lifecycle.selectAnalysis('second');
    expect(lifecycle.form.controls.analysisGuids.value).toEqual(['analysis-a', 'second']);
    expect(lifecycle.draftDefinition()!.sources.map(source => source.kind === 'analysis' ? source.analysisGuid : undefined)).toEqual(['analysis-a', 'second']);
    lifecycle.continueAnalysis(); lifecycle.toggleCreationMeasure('analysis', 'calculated'); lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Production');
    expect(lifecycle.canSubmit()).toBe(true); expect(lifecycle.draftDefinition()!.sources).toHaveLength(4);
    workspace.publishCommitted({ ...data.snapshot, facilityAnalyses: [{ ...data.analysis, guid: 'second' }] }, {});
    expect(lifecycle.canSubmit()).toBe(false); lifecycle.editSelection('analysis'); lifecycle.selectAnalysis('analysis-a');
    expect(lifecycle.confirmation()).toBe('decision'); lifecycle.cancelConfirmation();
    expect(lifecycle.form.controls.analysisGuids.value).toEqual(['analysis-a', 'second']);
    lifecycle.selectAnalysis('analysis-a'); lifecycle.confirmDecision();
    expect(lifecycle.form.controls.analysisGuids.value).toEqual(['second']); expect(lifecycle.canContinueAnalysis()).toBe(true);
  });

  it.each([['line', 'bar'], ['bar', 'line']] as const)('saves the current %s to %s chart choice after selecting an analysis', async (initial, selected) => {
    const { workspace, commands } = configureLibraryTest(); workspace.publish(analysisFixture().snapshot);
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart(initial); lifecycle.toggleSource('analysis'); lifecycle.continueSources();
    lifecycle.selectAnalysis('analysis-a'); lifecycle.continueAnalysis(); lifecycle.editSelection('chart'); lifecycle.selectChart(selected);
    lifecycle.continueSources(); lifecycle.continueAnalysis(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Current chart'); await lifecycle.submit();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ chart: { kind: 'time-series', defaultTraceType: selected, interval: 'monthly' },
      sources: [{ analysisGuid: 'analysis-a', mode: 'result', measure: 'actual' }], series: [{ metric: 'actual', resourceGuid: 'analysis-a', axis: 'left' }] });
    expect(commands.prepareCreate.mock.calls[0][0].sources[0]).not.toHaveProperty('groupGuid');
  });

  it('rejects stale Analysis removal review and prunes excluded bindings only after scope review', () => {
    const { workspace } = configureLibraryTest(); const data = analysisFixture();
    const snapshot = { ...data.snapshot, facilities: [...data.snapshot.facilities, { ...data.facility, guid: 'facility-b' }] }; workspace.publish(snapshot);
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('analysis'); lifecycle.continueSources();
    lifecycle.selectAnalysis('analysis-a'); lifecycle.selectAnalysis('analysis-a'); expect(lifecycle.confirmation()).toBe('decision');
    workspace.publishCommitted({ ...snapshot, facilityAnalyses: [{ ...data.analysis, name: 'Renamed' }] }, {});
    lifecycle.confirmDecision(); expect(lifecycle.form.controls.analysisGuids.value).toEqual(['analysis-a']); expect(lifecycle.error()).toContain('Choices changed');
    lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-b'] }); expect(lifecycle.confirmation()).toBe('decision'); lifecycle.cancelConfirmation();
    expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'all' });
    lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-b'] }); lifecycle.confirmDecision();
    expect(lifecycle.form.controls.analysisGuids.value).toEqual([]); expect(lifecycle.canContinueAnalysis()).toBe(false);
  });

  it.each([
    ['group', 'energy-group', 'energy-use-group'], ['equipment', 'equipment-a', 'equipment'],
    ['equipment-type', 'Pump', undefined], ['linked-meter-group', 'linked-group', 'meter-group'], ['facility', 'facility-a', 'facility']
  ] as const)('collects %s selection before resources and reviews switching methods', (mode, id, resource) => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, energyUseEquipment: [equipmentFixture({ energyUseGroupId: 'energy-group', equipmentType: 'Pump', utilityMeterGroupIds: ['linked-group'] })],
      energyUseGroups: [{ ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'energy-group' }],
      meterGroups: [{ ...getNewIdbUtilityMeterGroup('Energy', 'Linked group', 'facility-a', 'account-a'), guid: 'linked-group' }] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('energy-use'); lifecycle.continueSources();
    expect(lifecycle.step()).toBe('energy-use-selection-mode'); lifecycle.selectEnergyUseMode(mode);
    expect(lifecycle.equipmentChoices().some(choice => choice.guid === id)).toBe(true);
    lifecycle.form.controls.energyUseResourceIds.setValue([id]); lifecycle.continueEquipment(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Saved selection');
    expect(lifecycle.canSubmit()).toBe(true);
    const source = lifecycle.draftDefinition()!.sources[0];
    expect(source).toMatchObject({ selectionMode: mode, aggregation: mode === 'equipment' ? 'none' : 'sum',
      ...(resource ? { selection: { kind: 'fixed', resource, guids: [id] } } : { equipmentTypes: ['Pump'] }) });
    const next = mode === 'equipment' ? 'group' : 'equipment';
    lifecycle.selectEnergyUseMode(next); expect(lifecycle.confirmation()).toBe('decision');
    expect(lifecycle.form.controls.energyUseResourceIds.value).toEqual([id]); lifecycle.cancelConfirmation();
    expect(lifecycle.form.controls.energyUseMode.value).toBe(mode);
    lifecycle.selectEnergyUseMode(next); lifecycle.confirmDecision();
    expect(lifecycle.form.controls.energyUseResourceIds.value).toEqual([]); expect(lifecycle.form.controls.energyUseMode.value).toBe(next);
    expect(lifecycle.form.controls.name.value).toBe('Saved selection');
  });
  it('collects exact equipment in Add with annual defaults and protects missing and removed selections', () => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, energyUseEquipment: [equipmentFixture()] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    lifecycle.continueFacilities(); lifecycle.selectChart('bar'); lifecycle.toggleSource('energy-use'); lifecycle.continueSources();
    expect(lifecycle.step()).toBe('energy-use-selection-mode'); lifecycle.selectEnergyUseMode('equipment'); expect(lifecycle.step()).toBe('equipment'); lifecycle.form.controls.energyUseResourceIds.setValue(['equipment-a']); lifecycle.continueEquipment();
    if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Equipment'); expect(lifecycle.canSubmit()).toBe(true);
    expect(lifecycle.draftDefinition()).toMatchObject({ chart: { defaultTraceType: 'bar', interval: 'yearly', stack: 'none' }, sources: [{ aggregation: 'none', selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }], period: { kind: 'latest-saved-year' } });
    lifecycle.editSelection('equipment'); expect(lifecycle.form.controls.energyUseResourceIds.value).toEqual(['equipment-a']);
    workspace.publish({ ...workspace.snapshot()!, energyUseEquipment: [] }); expect(lifecycle.equipmentSelectionValid()).toBe(false);
    expect(lifecycle.form.controls.energyUseResourceIds.value).toEqual(['equipment-a']);
    lifecycle.toggleSource('energy-use'); expect(lifecycle.confirmation()).toBe('decision'); lifecycle.cancelConfirmation();
    expect(lifecycle.form.controls.energyUseResourceIds.value).toEqual(['equipment-a']);
    lifecycle.form.controls.energyUseResourceIds.setValue([]); lifecycle.continueEquipment(); lifecycle.continueMeasures(); expect(lifecycle.canSubmit()).toBe(true);
    expect(lifecycle.draftDefinition()!.sources[0]).not.toHaveProperty('selection');
  });

  it('saves All with an empty catalog and tracks future predictors until an individual is deselected', () => {
    const { workspace } = configureLibraryTest();
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    selectSetup(lifecycle, ['predictor']); lifecycle.editSelection('predictor'); lifecycle.toggleAllPredictors();
    lifecycle.continuePredictors(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('All history');
    expect(lifecycle.canSubmit()).toBe(true);
    expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ selection: { kind: 'rule', resource: 'predictor', filter: {} } });
    const first = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'first' };
    workspace.publish({ ...workspace.snapshot()!, predictors: [first, { ...first, guid: 'future' }] });
    expect(lifecycle.predictorSelectedGuids()).toEqual(['first', 'future']);
    lifecycle.editSelection('predictor'); lifecycle.togglePredictor('first');
    expect(lifecycle.form.controls.predictorAll.value).toBe(false);
    expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ selection: { kind: 'fixed', guids: ['future'] } });
  });
  it('hands an exact predictor through Add and Back, retains it on compatible scope changes, and saves explicit empty setup', () => {
    const { workspace } = configureLibraryTest();
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'production', name: 'Production' };
    workspace.publish({ ...workspace.snapshot()!, predictors: [predictor] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('predictor'); lifecycle.continueSources();
    expect(lifecycle.step()).toBe('predictor');
    lifecycle.togglePredictor(predictor.guid); expect(lifecycle.step()).toBe('predictor'); lifecycle.continuePredictors(); expect(lifecycle.step()).toBe('measures'); lifecycle.continueMeasures(); expect(lifecycle.step()).toBe('name');
    expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ selection: { kind: 'fixed', resource: 'predictor', guids: ['production'] } });
    lifecycle.editSelection('predictor'); expect(lifecycle.form.controls.predictorGuids.value).toEqual(['production']);
    lifecycle.continuePredictors(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Production');
    workspace.publish({ ...workspace.snapshot()!, predictors: [] });
    expect(lifecycle.canSubmit()).toBe(false); expect(lifecycle.form.controls.predictorGuids.value).toEqual(['production']);
    lifecycle.editSelection('predictor');
    lifecycle.togglePredictor('production'); lifecycle.continuePredictors(); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Set up later');
    expect(lifecycle.canSubmit()).toBe(true);
    expect(lifecycle.draftDefinition()!.sources[0]).not.toHaveProperty('selection');
  });
  it.each((['energy-trend', 'cost-trend'] as const).flatMap(recipe => [
    { mode: 'source' as const, resource: 'Electricity' },
    { mode: 'group' as const, resource: 'group-a' },
    { mode: 'meter' as const, resource: 'meter-a' }
  ].map(choice => ({ ...choice, recipe }))))('matches shared $mode transitions and reviewed resets for $recipe', ({ mode, resource, recipe }) => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({ groupId: 'group-a' })], meterGroups: [group({ guid: 'group-a' })] });
    const snapshot = workspace.snapshot()!;
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe(recipe);
    let expected = lifecycle.draftDefinition()!;
    const sourceId = expected.sources[0].id;
    const transition = (action: Parameters<typeof prepareDecisionChange>[1]) => {
      const result = prepareDecisionChange(expected, action, { snapshot });
      if (result.state !== 'unchanged') expected = result.definition;
      return result;
    };
    transition({ kind: 'selection-mode', sourceId, mode });
    transition({ kind: 'set-resources', sourceId, resourceIds: [resource] });
    const dataMode = 'calendarized';
    transition({ kind: 'source-settings', sourceId, settings: { dataMode } });
    lifecycle.selectMeterMode(mode); lifecycle.toggleResource(resource); lifecycle.continueResources();
    expect(lifecycle.draftDefinition()).toEqual(expected);
    lifecycle.editSelection('resources'); lifecycle.selectMeterMode(mode);
    expect(lifecycle.draftDefinition()).toEqual(expected); expect(lifecycle.confirmation()).toBeUndefined();
    expect(transition({ kind: 'selection-mode', sourceId, mode }).state).toBe('unchanged');
    const nextMode = mode === 'group' ? 'meter' : 'group';
    expect(transition({ kind: 'selection-mode', sourceId, mode: nextMode }).state).toBe('confirm');
    const retained = lifecycle.form.getRawValue(); lifecycle.selectMeterMode(nextMode);
    expect(lifecycle.form.getRawValue()).toEqual(retained); expect(lifecycle.confirmation()).toBe('decision');
    lifecycle.confirmDecision();
    expect(lifecycle.draftDefinition()).toEqual(expected); expect(lifecycle.form.controls.name.value).toBe(retained.name);
  });
  it('reopens completed decisions without clearing them and resets bindings only after a confirmed mode change', () => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({ groupId: 'group-a' })], meterGroups: [group({ guid: 'group-a' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe('energy-trend');
    lifecycle.selectMeterMode('source'); lifecycle.toggleResource('Electricity'); lifecycle.continueResources();
    const before = lifecycle.form.getRawValue();
    lifecycle.editSelection('selection-mode'); expect(lifecycle.form.getRawValue()).toEqual(before);
    lifecycle.selectMeterMode('source'); expect(lifecycle.form.controls.resourceIds.value).toEqual(['Electricity']);
    lifecycle.selectMeterMode('group'); expect(lifecycle.confirmation()).toBe('decision');
    expect(lifecycle.form.controls.selectionMode.value).toBe('source'); lifecycle.cancelConfirmation();
    expect(lifecycle.form.getRawValue()).toEqual(before);
    lifecycle.selectMeterMode('group'); lifecycle.confirmDecision();
    expect(lifecycle.form.controls.selectionMode.value).toBe('group'); expect(lifecycle.form.controls.resourceIds.value).toEqual([]);
    expect(lifecycle.form.controls.name.value).toBe('Energy usage trend');
  });
  it.each(['energy-trend', 'cost-trend'] as const)('uses %s as a preset of the shared paths and accepts resources with no readings', async recipe => {
    const { commands, workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meterGroups: [group({ guid: 'empty-group', name: 'Future equipment' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe(recipe);
    expect(lifecycle.step()).toBe('selection-mode');
    lifecycle.selectMeterMode('group'); expect(lifecycle.resourceCards()[0].available).toBe(false);
    lifecycle.toggleResource('empty-group'); lifecycle.continueResources(); expect(lifecycle.step()).toBe('measures');

    lifecycle.continueMeasures(); await lifecycle.submit();
    expect(commands.prepareCreate).toHaveBeenCalledOnce();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ sources: [{ selectionMode: 'group', measure: recipe === 'cost-trend' ? 'cost' : 'energy',
      selection: { kind: 'fixed', resource: 'meter-group', guids: ['empty-group'] } }], chart: { defaultTraceType: 'line', interval: 'monthly' } });
  });
  it('requires custom Meter resources before name but permits coherent setup for other categories', async () => {
    const { commands, workspace } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, meters: [meter({})] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('scatter');
    lifecycle.toggleSource('utility'); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Usage and weather'); lifecycle.continueSources();
    expect(lifecycle.step()).toBe('selection-mode'); await lifecycle.submit(); expect(commands.submit).not.toHaveBeenCalled();
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.continueResources();
    lifecycle.continueMeasures(); await lifecycle.submit(); expect(commands.prepareCreate).toHaveBeenCalledOnce();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ chart: { kind: 'scatter', showFit: false } });
  });
  it('offers all primary selection modes and always uses calendarized observations', () => {
    const { workspace } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, meters: [meter({}), meter({ guid: 'meter-b' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line');
    lifecycle.toggleSource('utility'); lifecycle.continueSources();
    expect(lifecycle.selectionModes.map(choice => choice.value)).toEqual(['source', 'group', 'meter']);
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); expect(lifecycle.draftDefinition()!.sources[0]).toMatchObject({ dataMode: 'calendarized' });
    lifecycle.toggleResource('meter-b');
    lifecycle.toggleResource('meter-b'); lifecycle.continueResources();
    expect(lifecycle.draftDefinition()).toMatchObject({ chart: { interval: 'monthly' }, sources: [{ dataMode: 'calendarized', aggregation: 'sum' }] });
  });
  it('requires an explicit Source selection and rejects the removed selection method', () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectChart('line');
    lifecycle.toggleSource('utility'); lifecycle.continueSources(); lifecycle.selectMeterMode('source');
    expect(lifecycle.canContinueResources()).toBe(false);
    lifecycle.selectMeterMode('rule');
    expect(lifecycle.form.controls.selectionMode.value).toBe('source');
    expect(lifecycle.canContinueResources()).toBe(false);
    expect(lifecycle.draftDefinition()?.sources[0]).not.toHaveProperty('selection');
  });
  it('resets steps and selections when Add is reopened after explicit discard', () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle, ['utility', 'predictor']);
    if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Discard this setup'); lifecycle.discard(); lifecycle.openCreate();
    expect(lifecycle.step()).toBe('facilities'); expect(lifecycle.selections()).toEqual([]);
    expect(lifecycle.form.controls.chart.value).toBeNull(); expect(lifecycle.form.controls.sourceKinds.value).toEqual([]);
    expect(lifecycle.form.controls.name.value).toBe(''); expect(lifecycle.canSubmit()).toBe(false);
  });
  it('preselects facility context without locking the Facilities decision', () => {
    const { facility, workspace } = configureLibraryTest(); facility.set('facility-a');
    const snapshot = workspace.snapshot()!;
    workspace.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Facility B' }] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    expect(lifecycle.step()).toBe('chart');
    expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'fixed', facilityGuids: ['facility-a'] });
    lifecycle.editSelection('facilities'); expect(lifecycle.step()).toBe('facilities');
    lifecycle.selectFacilities({ kind: 'all' }); expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'all' });
    lifecycle.continueFacilities(); expect(lifecycle.step()).toBe('chart');
  });
  it('blocks creation progression when no facilities exist', () => {
    const { workspace, commands } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, facilities: [] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate();
    expect(lifecycle.editor()).toBeDefined(); expect(lifecycle.canContinueFacilities()).toBe(false);
    lifecycle.continueFacilities(); expect(lifecycle.step()).toBe('facilities'); expect(commands.prepareCreate).not.toHaveBeenCalled();
  });
  it('reviews excluded resources without clearing compatible creation choices', () => {
    const { workspace } = configureLibraryTest(); const snapshot = workspace.snapshot()!;
    workspace.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }],
      meters: [meter({}), meter({ guid: 'meter-b', facilityId: 'facility-b' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe('energy-trend');
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.toggleResource('meter-b');
    const original = lifecycle.form.getRawValue();
    lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] });
    expect(lifecycle.confirmation()).toBe('decision'); expect(lifecycle.form.getRawValue()).toEqual(original);
    lifecycle.cancelConfirmation(); expect(lifecycle.form.getRawValue()).toEqual(original);
    lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] }); lifecycle.confirmDecision();
    expect(lifecycle.form.controls.resourceIds.value).toEqual(['meter-a']); expect(lifecycle.form.controls.name.value).toBe(original.name);
    lifecycle.selectFacilities({ kind: 'all' }); expect(lifecycle.form.controls.resourceIds.value).toEqual(['meter-a']);
    expect(lifecycle.resourceChoices().map(item => item.value)).toEqual(['meter-a', 'meter-b']);
  });
  it('keeps ordinary facility-owned duplication available in a valid single-facility account', async () => {
    const { workspace, commands, visualizations } = configureLibraryTest();
    const record = getNewIdbSavedVisualization(createVisualizationDefinition('Facility setup', 'account-a', { kind: 'fixed', facilityGuids: ['facility-a'] }, 'utility'));
    const original = structuredClone(record.definition);
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true }, savedVisualizations: [record] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const lifecycle = TestBed.inject(LibraryLifecycle); await lifecycle.duplicate(buildVisualizationLibrary(workspace.snapshot()!)[0]);
    expect(commands.prepareDuplicate).toHaveBeenCalledWith(record);
    expect(commands.submit.mock.calls[0][0]).toMatchObject({ kind: 'duplicate', sourceGuid: record.guid,
      definition: { facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] } } });
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
    lifecycle.openCreate(); selectSetup(lifecycle); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Saved before leaving');
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
    lifecycle.openCreate(); selectSetup(lifecycle, ['utility', 'predictor']); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Retained'); await lifecycle.submit();
    const proposal = lifecycle.proposal();
    expect(proposal).toMatchObject({ definition: { chart: { kind: 'time-series', defaultTraceType: 'line' }, sources: [{ kind: 'utility' }, { kind: 'predictor' }] } });
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
    lifecycle.openCreate(); selectSetup(lifecycle); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Retained'); const saving = lifecycle.submit();
    const initial = lifecycle.editor(); workspace.beginLoad(false); await lifecycle.submit(); lifecycle.openCreate(); selectSetup(lifecycle);
    expect(lifecycle.editor()).toBe(initial); expect(commands.submit).toHaveBeenCalledTimes(1);
    workspace.publish(workspace.snapshot()!); finish({ value: libraryRecord(), referenceIssues: [] }); await saving;
  });
  it('uses live All in a single-facility account and rejects malformed name input', async () => {
    const { workspace, commands } = configureLibraryTest(); workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true } });
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle);
    expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'all' });
    if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('  '); await lifecycle.submit(); expect(commands.submit).not.toHaveBeenCalled();
    if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Single facility'); await lifecycle.submit();
    expect(commands.prepareCreate.mock.calls[0][0].facilitySelection).toEqual({ kind: 'all' });
  });
  it('uses portal-driven Stay and Discard decisions before leaving a changed draft', async () => {
    configureLibraryTest(); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); selectSetup(lifecycle); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Protected');
    const stay = lifecycle.resolveLeave(); expect(lifecycle.confirmation()).toBe('discard'); lifecycle.cancelConfirmation(); expect(await stay).toBe(false);
    expect(lifecycle.form.controls.name.value).toBe('Protected'); const discard = lifecycle.resolveLeave(); lifecycle.discard(); expect(await discard).toBe(true);
    expect(lifecycle.editor()).toBeUndefined(); expect(lifecycle.needsProtection()).toBe(false);
  });
  it('does not overwrite a conflicting rename and requires explicit saved-name review', async () => {
    const { workspace, commands } = configureLibraryTest(); const record = libraryRecord(); workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [record] });
    const saved = { ...record, revision: record.revision + 1, definition: { ...(record.definition as any), name: 'Externally saved' } };
    commands.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: saved, error: new Error('Conflict') } as any));
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.rename(buildVisualizationLibrary(workspace.snapshot()!)[0]); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Local'); await lifecycle.submit();
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
    const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.rename(buildVisualizationLibrary(workspace.snapshot()!)[0]); if (lifecycle.step() === 'measures') lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Mine'); await lifecycle.submit();
    lifecycle.keepLocalConflict(); expect(lifecycle.form.controls.name.value).toBe('Mine'); await lifecycle.submit();
    expect(commands.submit.mock.calls[1][0]).toMatchObject({ expectedRevision: saved.revision, definition: { name: 'Mine', appearance: { legend: false } } });
  });
});
