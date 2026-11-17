import { By } from '@angular/platform-browser';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { VisualizationCommandHandler } from '@data/account-workspace/handlers/visualization-command-handler.service';
import { RecoveryActionsComponent } from '../recovery/recovery-actions/recovery-actions.component';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { PeriodSettingsComponent } from '../shared/period-settings/period-settings.component';
import { ItemSettingsComponent } from '../time-series/settings/item-settings/item-settings.component';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { SavedVisualizationsDbService } from '@data/indexedDB/saved-visualizations-db.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { createVisualizationDefinition, PredictorVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import type { WorkspaceCalendarizationBaseResult, WorkspaceCalendarizationProjectionRequest } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { calendarizedMeter, meter, monthlyData, reading } from '@app/v1/data/meters/facility-meters.testing';
import { echarts } from '@app/v1/shared/charts/echarts';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { VisualizationsModule } from '../visualizations.module';
import { WorkbenchComponent } from '../workbench/workbench.component';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { PredictorPickerComponent } from '../predictor/predictor-picker/predictor-picker.component';

describe('saved All Predictors and mixed monthly charts', () => {
  let harness: IndexedDbTestHarness;
  let fixture: ComponentFixture<WorkbenchComponent> | undefined;
  let coverage: BehaviorSubject<WorkspaceCalendarizationBaseResult>;
  const routeState = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: '' });
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', energyUnit: 'kWh', energyIsSource: false };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', energyUnit: 'kWh', energyIsSource: false };
  const utilityMeter = meter({ id: 1, meterReadingDataApplication: 'fullMonth' });
  const predictor = { ...getNewIdbPredictor(account.guid, facility.guid), id: 1, guid: 'production', name: 'Production', unit: 'widgets' };
  const weather = vi.fn(() => { throw new Error('Saved previews do not retrieve weather'); });
  const calendarizeBase = vi.fn(() => coverage.asObservable());

  beforeEach(async () => {
    routeState.set({ ...routeState(), visualizationGuid: '' });
    const canonical = calendarizedMeter(utilityMeter, [0, 2].map((month, index) => monthlyData({ monthNumValue: month, year: 2026,
      energyUse: index ? 7 : 5, energyConsumption: index ? 7 : 5 })), { energyUnit: 'kWh', consumptionUnit: 'kWh' });
    coverage = new BehaviorSubject({ state: 'ready', accountGuid: account.guid, inputFingerprint: 'canonical', meters: [canonical] });
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [provideRouter([]),
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { routeState, isSingleSiteWorkspace: () => true } },
      { provide: HourlyWeatherDataService, useValue: { load: weather } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase, currentInputFingerprint: () => 'canonical', currentEmissionsRates: () => [],
        project: (base: WorkspaceCalendarizationBaseResult, request: WorkspaceCalendarizationProjectionRequest) => projectWorkspaceCalendarization(base, TestBed.inject(AccountWorkspaceStore).snapshot()!, request) } }
    ] });
    harness = await IndexedDbTestHarness.create('predictor-combinations');
    await harness.seed({ accounts: [account], facilities: [facility], utilityMeter: [{ ...utilityMeter }], utilityMeterData: [0, 2].map((month, index) =>
      ({ ...reading({ id: index + 1, guid: `meter-${month}`, year: 2026, month: month + 1, day: 1, totalEnergyUse: index ? 7 : 5 }) })) });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });
  afterEach(async () => { fixture?.destroy(); fixture = undefined; TestBed.resetTestingModule(); coverage.complete(); await harness?.destroy(); vi.clearAllMocks(); });

  async function save(definition: VisualizationDefinition) {
    const commands = TestBed.inject(SavedVisualizationCommands), result = await commands.submit(commands.prepareCreate(definition));
    if (result.state !== 'committed' || !result.value) throw new Error('Expected saved intent');
    routeState.set({ ...routeState(), visualizationGuid: result.value.guid });
    return result.value;
  }
  function mount() {
    fixture?.destroy(); fixture = TestBed.createComponent(WorkbenchComponent);
    const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root'; root.style.height = '850px'; root.style.width = '100%';
    fixture.detectChanges(); return root;
  }
  async function ready(root: HTMLElement) {
    await vi.waitFor(() => { fixture!.detectChanges(); expect(root.querySelector('canvas')).not.toBeNull(); });
    return echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!;
  }

  async function seedProduction() {
    await harness.seed({ predictor: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), id: 1, guid: 'production-zero', year: 2026, month: 4, amount: 0 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
  }
  function fixedProduction(mixed = false): VisualizationDefinition {
    const base = mixed ? utilityVisualizationFixture() : createVisualizationDefinition('Production history', account.guid, { kind: 'all' }, 'predictor');
    const source: PredictorVisualizationSource = { id: 'production-source', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'fixed', resource: 'predictor', guids: [predictor.guid] } };
    return { ...base, chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' }, appearance: { title: 'Saved chart title', legend: true },
      sources: [...(mixed ? base.sources : []), source], series: [...(mixed ? base.series : []), { id: 'production-values', sourceId: source.id, metric: 'value', axis: 'left',
        overrides: [{ resourceGuid: predictor.guid, label: 'My production', color: '#23684d', axis: 'right', traceType: 'bar' }] }] };
  }

  it('P4 keeps fixed identity through rename and same-name replacement, and explicitly repairs only the missing predictor source', async () => {
    await seedProduction();
    const store = TestBed.inject(AccountWorkspaceStore), handlers = TestBed.inject(PredictorCommandHandler);
    const definition = fixedProduction(true), saved = await save(definition), root = mount(); await ready(root);
    await handlers.updatePredictor({ ...store.predictors()[0], name: 'Renamed production' }, account.guid);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); await ready(root);
    expect(root.querySelector('table')!.textContent).toContain('My production');
    expect(await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid)).toEqual(saved);
    await handlers.deletePredictorsWithData({ facilityGuid: facility.guid, predictors: [...store.predictors()], predictorData: [...store.predictorData()], facilityAnalyses: [] }, account.guid);
    const replacement = { ...predictor, id: 2, guid: 'replacement', name: 'Renamed production' };
    await harness.seed({ predictor: [replacement], predictorData: [{ ...getNewIdbPredictorData(replacement), id: 2, guid: 'replacement-reading', year: 2026, month: 4, amount: 20 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); fixture!.detectChanges();
    const component = fixture!.componentInstance;
    expect(component.editor.definition()!.sources[1]).toMatchObject({ selection: { guids: [predictor.guid] } });
    expect(root.querySelector('canvas')).toBeNull(); expect(root.textContent).toContain('Selected predictor unavailable');
    const dataBefore = structuredClone(store.predictorData());
    const recovery = fixture!.debugElement.query(By.directive(RecoveryActionsComponent)).componentInstance as RecoveryActionsComponent;
    await recovery.start('reset');
    expect(recovery.referencesForReview().map(reference => reference.guid)).toContain(predictor.guid);
    await recovery.confirm(); fixture!.detectChanges();
    expect(component.editor.definition()!.sources[0]).toEqual(definition.sources[0]);
    expect(component.editor.definition()!.sources[1]).not.toHaveProperty('selection');
    await component.requestDecision({ kind: 'predictor-selection', sourceId: 'production-source', predictorGuids: [replacement.guid] });
    fixture!.detectChanges(); expect(await component.editor.flush()).toBe(true); await ready(root);
    const repaired = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!;
    expect(repaired.guid).toBe(saved.guid); expect(repaired.id).toBe(saved.id); expect(repaired.createdDate).toEqual(saved.createdDate);
    expect(component.editor.definition()!.appearance).toEqual(definition.appearance);
    expect(root.querySelector('table')!.textContent).toContain('20 widgets');
    expect(root.querySelector('table')!.textContent).not.toContain('My production');
    expect(store.predictorData()).toEqual(dataBefore); expect(weather).not.toHaveBeenCalled();
  });

  it('P4 reviews All/mixed facility changes and independent copies, retaining one failed copy proposal for retry', async () => {
    await seedProduction();
    const otherFacility = { ...facility, id: 2, guid: 'facility-b', name: 'Plant B' }, other = { ...predictor, id: 2, guid: 'other', facilityId: otherFacility.guid, name: 'Other production' };
    await harness.seed({ facilities: [otherFacility], predictor: [other], predictorData: [{ ...getNewIdbPredictorData(other), id: 2, guid: 'other-reading', year: 2026, month: 4, amount: 8 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
    const base = fixedProduction(true), source = base.sources[1] as PredictorVisualizationSource;
    const definition: VisualizationDefinition = { ...base, sources: [base.sources[0], { ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } }],
      series: base.series.map(series => series.sourceId === source.id ? { ...series, overrides: [...series.overrides!, { seriesId: `${source.id}:predictor:${other.guid}`, color: '#b44a19', label: 'Other custom' }] } : series) };
    const saved = await save(definition), root = mount(); await ready(root);
    const component = fixture!.componentInstance;
    await component.requestDecision({ kind: 'facilities', selection: { kind: 'fixed', facilityGuids: [facility.guid] } }); fixture!.detectChanges();
    expect(component.pendingDecision()).toBeDefined(); expect(component.editor.definition()!.facilitySelection).toEqual({ kind: 'all' });
    await component.confirmDecision(); fixture!.detectChanges(); await ready(root);
    expect(component.editor.definition()!.sources[1]).toMatchObject({ selection: { kind: 'rule', filter: {} } });
    expect(component.editor.definition()!.series[1].overrides).toHaveLength(1);
    expect(root.querySelector('table')!.textContent).not.toContain('Other custom');
    const commands = TestBed.inject(SavedVisualizationCommands), current = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!;
    const duplicated = await commands.submit(commands.prepareDuplicate(current));
    expect(duplicated.state).toBe('committed');
    if (duplicated.state !== 'committed' || !duplicated.value) throw new Error('Expected duplicate');
    expect(duplicated.value.guid).not.toBe(saved.guid); expect(duplicated.value.definition).toMatchObject({ sources: component.editor.definition()!.sources, series: component.editor.definition()!.series });
    const recovery = fixture!.debugElement.query(By.directive(RecoveryActionsComponent)).componentInstance as RecoveryActionsComponent;
    const open = vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockResolvedValue(true);
    await recovery.start('copy'); recovery.facilitySelectionControl.setValue({ kind: 'fixed', facilityGuids: [otherFacility.guid] });
    const create = vi.spyOn(TestBed.inject(VisualizationCommandHandler), 'create').mockRejectedValueOnce(new Error('Copy rejected before commit'));
    await recovery.confirm(); const proposal = recovery.proposal()!; expect(proposal).toBeDefined();
    expect(proposal.definition.sources[1]).toMatchObject({ selection: { kind: 'rule', filter: {} } });
    expect(proposal.definition.sources[0]).not.toHaveProperty('selection');
    await recovery.confirm();
    expect(create).toHaveBeenCalledTimes(2); expect(create.mock.calls[0][0].guid).toBe(proposal.guid); expect(create.mock.calls[1][0].guid).toBe(proposal.guid);
    expect(open).toHaveBeenCalledWith(account.guid, proposal.guid);
    expect((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!.definition).toEqual(current.definition);
    const store = TestBed.inject(AccountWorkspaceStore), predictorHandler = TestBed.inject(PredictorCommandHandler);
    await predictorHandler.deletePredictorsWithData({ facilityGuid: facility.guid,
      predictors: store.predictors().filter(item => item.guid === predictor.guid), predictorData: store.predictorData().filter(item => item.predictorId === predictor.guid), facilityAnalyses: [] }, account.guid);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); await ready(root);
    expect(root.querySelector('table')!.textContent).not.toContain('My production');
    expect((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!.definition).toEqual(current.definition);
    await harness.seed({ predictor: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), id: 3, guid: 'returned-reading', year: 2026, month: 4, amount: 0 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true); await ready(root);
    expect(root.querySelector('table')!.textContent).toContain('My production');
    expect((await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!.definition).toEqual(current.definition);
  });

  it('P4 protects predictor/date drafts through save failure, conflict, deletion and publication-only Save as new recovery', async () => {
    await seedProduction();
    const saved = await save(fixedProduction()), root = mount(); await ready(root);
    const component = fixture!.componentInstance, handler = TestBed.inject(VisualizationCommandHandler);
    const period = fixture!.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    period.form.controls.kind.setValue('fixed'); period.form.controls.start.setValue('2026-01'); fixture!.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    const update = vi.spyOn(handler, 'update').mockRejectedValueOnce(new Error('Rejected before commit'));
    const item = fixture!.debugElement.query(By.directive(ItemSettingsComponent)).componentInstance as ItemSettingsComponent;
    item.form.controls.label.setValue('Local production');
    await vi.waitFor(() => expect(component.editor.definition()!.series[0].overrides![0].label).toBe('Local production'));
    expect(await component.editor.flush()).toBe(false); expect(component.editor.state()).toBe('error');
    const leaving = component.resolveLeave(); await Promise.resolve(); component.finishLeave(false); expect(await leaving).toBe(false);
    expect(period.form.controls.start.value).toBe('2026-01'); expect(period.form.controls.end.value).toBe('');
    expect(await component.editor.retry()).toBe(true); fixture!.detectChanges();
    expect(component.hasInvalidFields()).toBe(true); expect(update).toHaveBeenCalledTimes(2);
    component.editor.form.controls.name.setValue('Local recovery');
    const durable = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!;
    await handler.update({ kind: 'update', accountGuid: account.guid, guid: saved.guid, expectedRevision: durable.revision,
      definition: { ...component.editor.definition()!, name: 'External name' } }, account.guid);
    expect(await component.editor.flush()).toBe(false); fixture!.detectChanges();
    expect(component.editor.conflicts().length).toBeGreaterThan(0); expect(component.editor.form.controls.name.value).toBe('Local recovery');
    const current = (await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid))!;
    await TestBed.inject(SavedVisualizationCommands).submit({ kind: 'delete', accountGuid: account.guid, guid: saved.guid, expectedRevision: current.revision }); fixture!.detectChanges();
    expect(component.editor.isMissing()).toBe(true); expect(component.editor.definition()!.name).toBe('Local recovery');
    expect(component.hasInvalidFields()).toBe(true);
    const recovery = fixture!.debugElement.query(By.directive(RecoveryActionsComponent)).componentInstance as RecoveryActionsComponent;
    await recovery.start('new'); await recovery.confirm(); fixture!.detectChanges();
    expect(recovery.childDraftDecision()).toBe('new'); expect(recovery.proposal()).toBeUndefined();
    await recovery.discardChildDraftsAndContinue(); fixture!.detectChanges(); expect(component.hasInvalidFields()).toBe(false);
    const create = vi.spyOn(handler, 'create').mockRejectedValueOnce(new Error('Create rejected before commit'));
    const recover = vi.spyOn(TestBed.inject(SavedVisualizationCommands), 'recover');
    const open = vi.spyOn(TestBed.inject(VisualizationNavigationService), 'open').mockResolvedValue(true);
    await recovery.confirm(); const proposal = recovery.proposal()!; expect(proposal).toBeDefined();
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Committed publication unavailable'));
    await recovery.confirm(); expect(recovery.error()).toContain('saved');
    expect(await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(proposal.guid)).toBeDefined();
    await recovery.confirm();
    expect(create).toHaveBeenCalledTimes(2); expect(recover).toHaveBeenCalledWith(account.guid, proposal.guid); expect(open).toHaveBeenCalledWith(account.guid, proposal.guid);
    expect((await harness.getAll('savedVisualizations')).map(record => record.guid)).toEqual([proposal.guid]);
    expect((await harness.getAll('predictorData'))[0]).toMatchObject({ guid: 'production-zero', amount: 0 }); expect(weather).not.toHaveBeenCalled();
  });

  it('activates the All card by keyboard independently of local search in narrow themed layouts', async () => {
    const picker = TestBed.createComponent(PredictorPickerComponent), requested = vi.fn();
    picker.componentRef.setInput('choices', ['Temperature', 'Production', 'Hours', 'Visitors', 'Occupancy', 'Output', 'Rain', 'CDD', 'HDD']
      .map((label, index) => ({ value: `p-${index}`, label, detail: 'Saved predictor', icon: 'predictor', available: true })));
    picker.componentInstance.allRequested.subscribe(requested);
    const root = picker.nativeElement as HTMLElement; root.className = 'v1-root'; picker.detectChanges();
    try {
      await userEvent.fill(root.querySelector<HTMLInputElement>('input[type="search"]')!, 'temperature'); picker.detectChanges();
      expect(root.querySelectorAll('.predictor-choice')).toHaveLength(1);
      const all = root.querySelector<HTMLButtonElement>('.predictor-all-choice')!;
      all.focus(); await userEvent.keyboard('{Enter}'); expect(requested).toHaveBeenCalledOnce();
      expect(document.activeElement === all).toBe(true);
      picker.componentRef.setInput('allMode', true); picker.componentRef.setInput('selected', Array.from({ length: 9 }, (_, index) => `p-${index}`)); picker.detectChanges();
      expect(all.getAttribute('aria-pressed')).toBe('true');
      for (const [width, theme, label] of [[1100, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
        await page.viewport(width, 850); root.className = `v1-root ${theme}`;
        expect(root.scrollWidth).toBeLessThanOrEqual(width);
        await page.screenshot({ element: root, path: `../../../../../.angular/predictor-p3-add-${label}.png` });
      }
    } finally { picker.destroy(); }
  });

  it('saves empty All, reopens, and includes a newly committed predictor without rewriting the visualization', async () => {
    const store = TestBed.inject(AccountWorkspaceStore), data = TestBed.inject(UtilityDataSession), demand = vi.spyOn(data, 'acquire');
    const initial = { ...createVisualizationDefinition('All predictors', account.guid, { kind: 'all' }, 'predictor'),
      chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'monthly' as const, stack: 'none' as const } };
    const choice = prepareDecisionChange(initial, { kind: 'predictor-selection', sourceId: 'source-1', predictorGuids: [], all: true }, { snapshot: store.snapshot()! });
    if (choice.state === 'unchanged') throw new Error('Expected All');
    const saved = await save(choice.definition), root = mount();
    await vi.waitFor(() => { fixture!.detectChanges(); expect(root.textContent).toContain('No usable'); });
    const all = root.querySelector<HTMLButtonElement>('.resource-picker__all')!;
    expect(all.textContent).toContain('All Predictors'); expect(all.getAttribute('aria-checked')).toBe('true'); expect(all.disabled).toBe(false);
    await harness.seed({ predictor: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), id: 1, guid: 'new-zero', year: 2026, month: 4, amount: 0 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
    await ready(root); expect(root.querySelector('table')!.textContent).toContain('0 widgets');
    expect(root.querySelectorAll('.resource-picker__option[aria-checked="true"]')).toHaveLength(1);
    expect(await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid)).toEqual(saved);
    const reopened = mount(); await ready(reopened);
    expect(reopened.querySelector('.resource-picker__all')!.getAttribute('aria-checked')).toBe('true');
    const expand = reopened.querySelector<HTMLButtonElement>('[id="source:source-1-heading"]')!;
    expand.focus(); await userEvent.keyboard('{Enter}'); fixture!.detectChanges();
    const liveAll = reopened.querySelector<HTMLButtonElement>('.resource-picker__all')!;
    liveAll.focus(); await userEvent.keyboard('{Enter}'); fixture!.detectChanges(); await fixture!.componentInstance.editor.flush();
    expect(liveAll.getAttribute('aria-checked')).toBe('false');
    liveAll.focus(); await userEvent.keyboard('{Enter}'); fixture!.detectChanges(); await fixture!.componentInstance.editor.flush();
    expect(liveAll.getAttribute('aria-checked')).toBe('true');
    expect(demand).not.toHaveBeenCalled(); expect(weather).not.toHaveBeenCalled();
  });

  it('renders mixed histories, edits dates and axes, and reopens while reusing canonical coverage', async () => {
    await harness.seed({ predictor: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), id: 1, guid: 'new-zero', year: 2026, month: 4, amount: 0 }] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(true);
    const base = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: [facility.guid] });
    const source: PredictorVisualizationSource = { id: 'predictors', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'rule', resource: 'predictor', filter: {} } };
    const definition: VisualizationDefinition = { ...base, sources: [...base.sources, source], series: [...base.series, { id: 'predictors-series', sourceId: source.id, metric: 'value', axis: 'left' }] };
    const saved = await save(definition), root = mount(), chart = await ready(root);
    const options = chart.getOption() as any;
    expect(options.yAxis.map((axis: any) => axis.name)).toEqual(['']);
    expect(options.series).toHaveLength(2); expect(options.series[1].data).toEqual([['monthly:24315', 0]]);
    expect(root.querySelector('table')!.textContent).toContain('widgets'); expect(root.querySelector('table')!.textContent).toContain('kWh');
    const subscriptions = calendarizeBase.mock.calls.length;
    await fixture!.componentInstance.requestDecision({ kind: 'item-style', sourceId: source.id, item: { resourceGuid: predictor.guid }, changes: { axis: 'right', traceType: 'bar' } });
    fixture!.detectChanges(); await fixture!.componentInstance.editor.flush(); await ready(root);
    const current = fixture!.componentInstance.editor.definition()!;
    fixture!.componentInstance.editor.applyDefinition({ ...current, period: { kind: 'rolling', count: 2, unit: 'month', basis: 'calendar', anchor: 'latest-data', includeIncomplete: false } });
    fixture!.detectChanges(); await fixture!.componentInstance.editor.flush(); await ready(root);
    for (const [width, theme, label] of [[1100, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 950); root.className = `v1-root ${theme}`; fixture!.detectChanges();
      expect(root.scrollWidth).toBeLessThanOrEqual(width);
      await page.screenshot({ element: root, path: `../../../../../.angular/predictor-p3-${label}.png` });
    }
    const reopened = mount(), restored = await ready(reopened), restoredOptions = restored.getOption() as any;
    expect(restoredOptions.series[1]).toMatchObject({ type: 'bar', yAxisIndex: 1 });
    expect(restoredOptions.yAxis.map((axis: any) => axis.name)).toEqual(['kWh', 'widgets']);
    const stored = await TestBed.inject(SavedVisualizationsDbService).getStoredByGuid(saved.guid);
    expect(stored!.definition).toMatchObject({ period: { kind: 'rolling', count: 2, anchor: 'latest-data' } });
    expect(calendarizeBase.mock.calls).toHaveLength(subscriptions); expect(weather).not.toHaveBeenCalled();
    const expand = reopened.querySelector<HTMLButtonElement>('[id="source:predictors-heading"]')!;
    expand.focus(); await userEvent.keyboard('{Enter}'); fixture!.detectChanges();
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    const all = reopened.querySelector<HTMLButtonElement>('app-predictor-source-editor .resource-picker__all')!;
    all.focus(); expect(document.activeElement === all).toBe(true);
  });
});
