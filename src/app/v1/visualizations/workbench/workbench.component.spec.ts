import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SessionStorageService } from 'ngx-webstorage';
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
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { UtilitySourceEditorComponent } from '../utility/editors/source-editor/utility-source-editor.component';
import { ItemSettingsComponent } from '../time-series/settings/item-settings/item-settings.component';
import { VISUALIZATION_DATA_SOURCES } from '../visualization-data-sources';

describe('visualization workbench', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('retains consecutive period edits before the next view update without restoring stale metadata', () => {
    const { component, fixture } = setup();
    const periods = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    periods.form.controls.kind.setValue('rolling');
    component.editor.form.controls.title.setValue('Newer title');
    periods.form.controls.count.setValue(24); periods.form.controls.unit.setValue('year');
    fixture.detectChanges();
    expect(component.editor.definition()!.period).toMatchObject({ kind: 'rolling', count: 24, unit: 'year' });
    expect(component.editor.definition()!.appearance.title).toBe('Newer title');
    expect(periods.form.controls.count.value).toBe(24); expect(periods.form.controls.unit.value).toBe('year');
  });
  it('rejects a period callback superseded by a reviewed comparison reset', async () => {
    const original = utilityVisualizationFixture();
    const { component } = setup({ ...original, comparison: { kind: 'previous-year', basis: 'calendar' } }, false, true);
    const oldContext = component.periodContext();
    await component.requestDecision({ kind: 'source-settings', sourceId: 'utility', settings: { dataMode: 'billing-period' } });
    expect(component.pendingDecision()).toBeDefined(); await component.confirmDecision();
    const afterReset = component.editor.definition();
    expect(afterReset!.comparison).toEqual({ kind: 'none' });
    oldContext.changed({ period: { kind: 'rolling', count: 24, unit: 'year', anchor: 'calendar', basis: 'calendar', includeIncomplete: true }, comparison: oldContext.definition.comparison });
    expect(component.editor.definition()).toEqual(afterReset);
  });
  it('retains consecutive item-label edits before the next view update', () => {
    const { component, fixture } = setup(utilityVisualizationFixture(), false, true);
    const item = fixture.debugElement.query(By.directive(ItemSettingsComponent)).componentInstance as ItemSettingsComponent;
    item.form.controls.label.setValue('C');
    item.form.controls.label.setValue('Cu');
    item.form.controls.label.setValue('Custom meter');
    fixture.detectChanges();
    expect(item.form.controls.label.value).toBe('Custom meter');
    expect(component.editor.definition()!.series[0].label).toBe('Custom meter');
  });
  it('retains consecutive chart-unit edits before the next view update', () => {
    const { component, fixture } = setup(utilityVisualizationFixture(), false, true);
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
    source.settingsForm.controls.unit.setValue('M');
    source.settingsForm.controls.unit.setValue('MW');
    source.settingsForm.controls.unit.setValue('MWh');
    fixture.detectChanges();
    expect(source.settingsForm.controls.unit.value).toBe('MWh');
    expect(component.editor.definition()!.sources[0].settings?.unit).toEqual({ kind: 'pinned', value: 'MWh' });
  });
  it('does not restore item styling from an old control after the item is removed', async () => {
    const { component, fixture } = setup(utilityVisualizationFixture(), false, true);
    const item = fixture.debugElement.query(By.directive(ItemSettingsComponent)).componentInstance as ItemSettingsComponent;
    await component.requestDecision({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false });
    await component.confirmDecision();
    item.form.controls.label.setValue('Stale item label');
    expect(component.editor.definition()!.series).toEqual([]);
    expect(component.editor.definition()!.sources[0]).not.toHaveProperty('selection');
  });
  it('rejects old data-setting controls after their charted data is changed', async () => {
    const { component, fixture } = setup(utilityVisualizationFixture(), false, true);
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
    await component.requestDecision({ kind: 'measure', sourceId: 'utility', measure: 'cost' });
    await component.confirmDecision();
    source.settingsForm.controls.unit.setValue('MWh');
    expect(component.editor.definition()!.sources[0]).toMatchObject({ measure: 'cost', settings: {} });
    expect(component.editor.definition()!.sources[0].settings?.unit).toBeUndefined();
  });
  it('keeps incomplete Bill charge setup collapsed while retaining its attention indicator', () => {
    const original = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...original, series: [], sources: original.sources.map(source => {
      if (source.kind !== 'utility') return source;
      const { selection: _selection, charge: _charge, ...base } = source;
      return { ...base, measure: 'charge', dataMode: 'billing-period', aggregation: 'none', settings: {} };
    }) };
    const { component, fixture, submit } = setup(definition);
    expect(component.expandedNodes().size).toBe(0);
    const section = (fixture.nativeElement as HTMLElement).querySelector('#data-settings\\:utility-heading')!;
    expect(section.getAttribute('aria-expanded')).toBe('false');
    expect(section.closest('.decision-section')?.classList.contains('decision-section--attention')).toBe(true);
    expect(submit).not.toHaveBeenCalled();
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
  it('hides settings without replacing invalid child drafts or the chart, and restores focus', () => {
    const { component, fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="visualization-settings"]')!;
    const panel = root.querySelector<HTMLElement>('#visualization-settings')!;
    const chart = root.querySelector('app-visualization-preview');
    const periods = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    periods.form.controls.kind.setValue('fixed');
    periods.form.controls.start.setValue('2026-03-01');
    fixture.detectChanges();
    panel.querySelector<HTMLInputElement>('input')!.focus();
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true); expect(document.activeElement).toBe(toggle);
    expect(component.hasInvalidFields()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    expect(root.querySelector('app-visualization-preview')).toBe(chart);
    toggle.click(); fixture.detectChanges();
    expect(panel.hidden).toBe(false); expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance).toBe(periods);
    expect(periods.form.controls.start.value).toBe('2026-03-01');
  });
  it('expands earlier decisions without changing intent, saving, or replacing source forms', () => {
    const { component, fixture, submit } = setup(utilityVisualizationFixture());
    const initial = component.editor.definition();
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance;
    component.setSection(component.rootNodes.facilities, true); component.setSection(component.rootNodes.chart, true); fixture.detectChanges();
    component.setSection(component.rootNodes.chart, false); fixture.detectChanges();
    expect(component.editor.definition()).toEqual(initial); expect(submit).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance).toBe(source);
  });
  it('reviews customized item removal before applying it and clears its presentation', async () => {
    const original = utilityVisualizationFixture();
    const definition = { ...original, series: original.series.map(series => ({ ...series, color: '#123456' })) };
    const { component, fixture } = setup(definition);
    await component.requestDecision({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false }); fixture.detectChanges();
    expect(component.pendingDecision()).toBeDefined(); expect(component.editor.definition()).toEqual(definition);
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    component.cancelDecision(); fixture.detectChanges(); expect(component.editor.definition()).toEqual(definition);
    await component.requestDecision({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false });
    await component.confirmDecision(); fixture.detectChanges();
    expect(component.editor.definition()!.sources[0]).not.toHaveProperty('selection');
    expect(component.editor.definition()!.series).toEqual([]);
  });
  it('does not mistake a matching global default for a no-op when an item uses Bar', async () => {
    const original = utilityVisualizationFixture();
    const definition = { ...original, series: original.series.map(series => ({ ...series, traceType: 'bar' as const })) };
    const { component } = setup(definition);
    await component.requestDecision({ kind: 'chart-type', traceType: 'line' });
    expect(component.pendingDecision()).toBeDefined();
    await component.confirmDecision();
    expect(component.editor.definition()!.series[0].traceType).toBeUndefined();
  });
  it('keeps the current measure and pinned settings when reset review is canceled', async () => {
    const definition = utilityVisualizationFixture();
    const { component, fixture, submit } = setup(definition);
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
    source.selectMeasure('cost'); fixture.detectChanges();
    expect(component.pendingDecision()).toBeDefined();
    expect(component.editor.definition()).toEqual(definition);
    expect(source.settingsForm.controls.unit.value).toBe('kWh');
    component.cancelDecision(); fixture.detectChanges();
    expect(component.editor.definition()).toEqual(definition); expect(submit).not.toHaveBeenCalled();
    source.selectMeasure('cost'); fixture.detectChanges();
    await component.confirmDecision(); fixture.detectChanges();
    expect(component.editor.definition()!.sources[0]).toMatchObject({ measure: 'cost', settings: {} });
  });
  it('rejects a prepared reset when local intent changes during review', async () => {
    const original = utilityVisualizationFixture();
    const { component } = setup({ ...original, series: original.series.map(series => ({ ...series, color: '#123456' })) });
    await component.requestDecision({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false });
    component.editor.form.controls.title.setValue('New local title');
    await component.confirmDecision();
    expect(component.pendingDecision()).toBeUndefined(); expect(component.decisionError()).toContain('changed during review');
    expect(component.editor.definition()!.series).toHaveLength(1);
  });
  it('requires a fresh reset review after the committed workspace changes', async () => {
    const original = utilityVisualizationFixture();
    const { component, store } = setup({ ...original, series: original.series.map(series => ({ ...series, color: '#123456' })) });
    await component.requestDecision({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false });
    expect(component.pendingDecision()).toBeDefined();
    store.publishCommitted({ ...store.snapshot()!, meters: [meter({ id: 1 })] }, store.selections());
    await component.confirmDecision();
    expect(component.pendingDecision()).toBeUndefined(); expect(component.decisionError()).toContain('changed during review');
    expect(component.editor.definition()!.series).toHaveLength(1);
  });
  it('restores the coherent charge dropdown while a destructive change is reviewed or canceled', async () => {
    const original = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
    const source: UtilityVisualizationSource = { ...original.sources[0] as UtilityVisualizationSource, measure: 'charge', dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter',
      charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'cost' }, settings: {} };
    const definition: VisualizationDefinition = { ...original, chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'native', stack: 'none' }, sources: [source],
      series: original.series.map(series => ({ ...series, metric: utilityMeasureKey(source), color: '#123456' })) };
    const { component, fixture, store } = setup(definition, false, true);
    store.publish({ ...store.snapshot()!, meters: [meter({ id: 1, charges: ['a', 'b'].map(suffix => ({ guid: `charge-${suffix}`, name: `Charge ${suffix}`, chargeType: 'consumption' as const, displayUsageInTable: true, displayChargeInTable: true })) })] });
    component.setSection('source:utility', true); component.setSection('data-settings:utility', true); fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select[formcontrolname="chargeGuid"]') as HTMLSelectElement;
    expect(select.value).toBe('charge-a'); select.value = 'charge-b'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(component.pendingDecision()).toBeDefined(); expect(select.value).toBe('charge-a');
    component.cancelDecision(); fixture.detectChanges();
    expect(select.value).toBe('charge-a'); expect((component.editor.definition()!.sources[0] as UtilityVisualizationSource).charge?.chargeGuid).toBe('charge-a');
  });
  it('preserves an unrelated invalid unit draft when ownership is requested', async () => {
    const { component, fixture, submit } = setup(utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] }));
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
    source.settingsForm.controls.unit.setValue(''); fixture.detectChanges();
    expect(component.hasInvalidFields()).toBe(true);
    await component.requestDecision({ kind: 'facilities', selection: { kind: 'all' } });
    expect(component.pendingDecision()).toBeUndefined(); expect(component.decisionError()).toBe('');
    expect(component.editor.definition()!.facilitySelection).toEqual({ kind: 'all' });
    expect(source.settingsForm.controls.unit.value).toBe(''); expect(component.hasInvalidFields()).toBe(true); expect(submit).toHaveBeenCalledOnce();
  });
  it('preserves an incomplete independent calendar draft when ownership is requested', async () => {
    const original = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...original, facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a'] }, period: { kind: 'fixed', basis: 'calendar', start: '2026-01-01', end: '2026-02-28' } };
    const { component, fixture, submit } = setup(definition);
    const period = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    period.form.controls.end.setValue(''); fixture.detectChanges();
    await component.requestDecision({ kind: 'facilities', selection: { kind: 'all' } });
    expect(component.pendingDecision()).toBeUndefined(); expect(component.decisionError()).toBe('');
    expect(component.editor.definition()!.facilitySelection).toEqual({ kind: 'all' });
    expect(period.form.controls.end.value).toBe(''); expect(component.hasInvalidFields()).toBe(true); expect(submit).toHaveBeenCalledOnce();
  });
  it.each([undefined, utilityVisualizationFixture()])('starts every settings accordion collapsed without changing saved intent (%j)', definition => {
    const { component, fixture, submit } = setup(definition);
    const root = fixture.nativeElement as HTMLElement;
    expect(component.expandedNodes().size).toBe(0);
    const toggles = [...root.querySelectorAll<HTMLButtonElement>('#visualization-settings .decision-section__toggle')];
    expect(toggles.length).toBeGreaterThan(0);
    expect(toggles.every(toggle => toggle.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    component.setSection(component.rootNodes.sources, true); fixture.detectChanges();
    expect(component.expandedNodes().has(component.rootNodes.sources)).toBe(true);
  });
  it('selects categories immediately and renders their accordions alongside Data Sources', () => {
    const { component, fixture } = setup();
    component.setSection(component.rootNodes.sources, true); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const categories = root.querySelector<HTMLElement>('[aria-label="Data source categories"]')!;
    const choices = [...categories.querySelectorAll<HTMLButtonElement>('button')];
    expect(choices.map(button => button.textContent?.trim())).toEqual(['Meters', 'Predictors', 'Energy Use', 'Analysis']);
    expect(choices.map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
    expect(choices[0].disabled).toBe(true);
    expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Add data source')).toBe(false);
    const meterEditor = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance;
    choices[1].click(); fixture.detectChanges();
    expect(component.editor.definition()!.sources.map(source => source.kind)).toEqual(['utility', 'predictor']);
    expect(choices[0].disabled).toBe(false); expect(choices[1].getAttribute('aria-pressed')).toBe('true');
    const settings = root.querySelector('#visualization-settings')!;
    const sections = [...settings.children].filter(child => child.matches('app-visualization-decision-section'));
    expect(sections.map(section => section.querySelector('strong')?.textContent))
      .toEqual(['Facilities', 'Chart', 'Data Sources', 'Meters', 'Predictors', 'Dates and comparison', 'Chart appearance']);
    expect(categories.closest('app-visualization-decision-section')!.querySelector('app-utility-source-editor')).toBeNull();
    const predictor = component.sourcePanels().find(source => source.kind === 'predictor')!;
    expect(component.expandedNodes().has(predictor.nodeId)).toBe(true);
    component.setSection(component.rootNodes.sources, false); fixture.detectChanges();
    expect([...root.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === `${predictor.nodeId}-body`)?.hidden).toBe(false);
    expect(fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance).toBe(meterEditor);
  });
  it.each(VISUALIZATION_DATA_SOURCES.filter(choice => choice.value !== 'utility'))('toggles $label without changing the other selected sources', choice => {
    const { component, fixture } = setup();
    const original = component.editor.definition()!;
    const root = fixture.nativeElement as HTMLElement;
    const button = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Data source categories"] button')]
      .find(button => button.textContent?.trim() === choice.label)!;
    button.click(); fixture.detectChanges();
    expect(component.editor.definition()!.sources.filter(source => source.kind === choice.value)).toHaveLength(1);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).toContain(`Data selection for ${choice.label} is not available yet.`);
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(component.editor.definition()!.sources).toEqual(original.sources);
    expect(component.editor.definition()!.series).toEqual(original.series);
  });
  it('keeps a selected category and its incomplete draft until removal is confirmed', async () => {
    const { component, fixture } = setup(utilityVisualizationFixture(), false, true);
    const source = fixture.debugElement.query(By.directive(UtilitySourceEditorComponent)).componentInstance as UtilitySourceEditorComponent;
    source.settingsForm.controls.unit.setValue(''); fixture.detectChanges();
    component.toggleDataSource('predictor'); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const meters = root.querySelector<HTMLButtonElement>('[aria-label="Data source categories"] button')!;
    meters.click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(component.pendingDecision()).toBeDefined(); });
    expect(meters.getAttribute('aria-pressed')).toBe('true');
    expect(source.settingsForm.controls.unit.value).toBe('');
    component.cancelDecision(); fixture.detectChanges();
    expect(component.hasInvalidFields()).toBe(true); expect(meters.getAttribute('aria-pressed')).toBe('true');
    meters.click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(component.pendingDecision()).toBeDefined(); });
    await component.confirmDecision(); fixture.detectChanges();
    expect(component.editor.definition()!.sources.map(source => source.kind)).toEqual(['predictor']);
    expect(meters.getAttribute('aria-pressed')).toBe('false'); expect(component.hasInvalidFields()).toBe(false);
    expect(fixture.debugElement.query(By.directive(UtilitySourceEditorComponent))).toBeNull();
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
  function setup(definition?: VisualizationDefinition, singleFacility = false, withMeter = false) {
    const initial = visualizationSnapshot();
    const snapshot = { ...initial, ...(withMeter ? { meters: [meter({ id: 1 })] } : {}), account: { ...initial.account, isSingleFacilityCompany: singleFacility } };
    const store = new AccountWorkspaceStore(); store.publish(definition ? { ...snapshot,
      savedVisualizations: [{ ...getNewIdbSavedVisualization(definition), id: 1, guid: 'visualization-a' }] } : snapshot);
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: 'visualization-a' });
    const prepareCreate = vi.fn((value: VisualizationDefinition) => ({ kind: 'create' as const, accountGuid: value.accountGuid, guid: 'new-identity', definition: value, createdDate: '2026-11-12T00:00:00.000Z' }));
    const submit = vi.fn(async (command: any) => ({ state: 'committed', value: command.kind === 'create'
      ? { ...getNewIdbSavedVisualization(command.definition), guid: command.guid }
      : { ...store.savedVisualizations()[0], definition: command.kind === 'retarget' ? command.reviewedDefinition : command.definition, revision: command.expectedRevision + 1 }, command, referenceIssues: [] }));
    TestBed.configureTestingModule({ imports: [WorkbenchModule], providers: [provideRouter([]),
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { routeState: route, isSingleSiteWorkspace: computed(() => store.account()?.isSingleFacilityCompany === true && store.facilities().length === 1) } },
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
    expect(root.querySelector('.v1-chip')?.textContent).toContain(choice.label);
    expect(root.textContent).toContain('Meters'); expect(root.textContent).toContain('Predictors'); expect(root.textContent).toContain('Analysis');
    expect(root.querySelector('nav[aria-label="Visualization breadcrumb"] a')?.textContent).toContain('Account A');
    expect(component.editor.definition()).toEqual(definition);
  });
  it('toggles summary facts with the shared preference and omits workbench duplication', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="visualization-workbench-facts"]')!;
    const facts = root.querySelector<HTMLElement>('#visualization-workbench-facts')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(facts.hidden).toBe(true);
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(facts.hidden).toBe(false);
    expect(facts.textContent).toContain('Plant A');
    expect(TestBed.inject(SessionStorageService).store).toHaveBeenCalledWith('v1WorkbenchFactsExpanded', true);
    expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Duplicate to another scope')).toBe(false);
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
  it('links only account and facility contexts to their own dashboards', () => {
    const { fixture } = setup();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const links = [...nav.querySelectorAll('a')];
    expect(links.map(link => link.textContent?.trim())).toEqual(['Account A', 'Plant A']);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/v1/workspace/account/account-a/visualization/dashboard',
      '/v1/workspace/account/account-a/visualization/dashboard?facility=facility-a'
    ]);
    expect(nav.querySelector('[aria-current="page"]')).toBeNull();
    expect(nav.textContent).not.toContain('My energy');
  });
  it('derives live All ownership as facilities arrive without saving intent', () => {
    const definition = createVisualizationSetupDefinition({ name: 'Portfolio chart', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: createVisualizationChart('line'), sourceKinds: ['utility'] });
    const { fixture, store, submit } = setup(definition);
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    expect(nav.querySelectorAll('a')).toHaveLength(2);
    store.publishCommitted({ ...store.snapshot()!, facilities: [...store.facilities(), { ...store.facilities()[0], guid: 'facility-b', name: 'Plant B' }] }, store.selections()); fixture.detectChanges();
    expect(nav.querySelectorAll('a')).toHaveLength(1); expect(submit).not.toHaveBeenCalled();
    expect(nav.textContent).not.toContain('Plant A');
    expect(nav.textContent?.trim()).toBe('Account A');
  });
  it('uses the simplified resource breadcrumb for a single-facility account', () => {
    const { fixture } = setup(undefined, true);
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    expect(nav.querySelectorAll('a')).toHaveLength(1);
    expect(nav.textContent?.trim()).toBe('Dashboard');
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/v1/workspace/account/account-a/visualization/dashboard');
  });
});
