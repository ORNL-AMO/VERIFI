import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { firstValueFrom, Subscription } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { echarts } from '@app/v1/shared/charts/echarts';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { MetersModule } from '@app/v1/data/meters/meters.module';
import { FacilityMetersWorkspaceService } from '@app/v1/data/meters/facility-meters-workspace.service';
import { MeterWorkbenchMonthlyChartComponent } from '@app/v1/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { protectedNavigationPreflightGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { facilityMeterRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { VisualizationsModule } from '../visualizations.module';
import { WorkbenchComponent, visualizationLeaveGuard } from '../workbench/workbench.component';
import { LibraryComponent } from '../library/library.component';
import { PreviewComponent } from '../preview/preview/preview.component';
import { CaptureSlideoutComponent } from '../capture/capture-slideout/capture-slideout.component';
import { DisplaySettingsComponent } from '../shared/display-settings/display-settings.component';
import { decisionNodeId } from '../decisions/decision-tree';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: `
  <main class="v1-root v1-workspace__main" style="height:650px;width:1000px;overflow:auto"><router-outlet/></main>
  <div class="v1-root"><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>` })
class CaptureJourneyHost { readonly modal = inject(ModalPortalService); }

describe('monthly meter capture through native storage and canonical calculation', () => {
  let harness: IndexedDbTestHarness;
  let fixture: ComponentFixture<CaptureJourneyHost>;
  let routeSubscription: Subscription;
  let canonicalSubscription: Subscription;
  let originalWorker: typeof Worker;
  const monthlyUrl = '/v1/workspace/facility/facility-a/data/meters/meter-a/monthly-chart';
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', name: 'Example', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', name: 'HQ (Simple)', energyUnit: 'kWh', energyIsSource: false, fiscalYear: 'calendarYear' as const };

  beforeEach(async () => {
    originalWorker = globalThis.Worker;
    globalThis.Worker = class extends originalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        // The Angular test builder serves emitted Worker assets at its root.
        const original = new URL(url, location.href), filename = original.pathname.split('/').at(-1)!;
        super(/^worker-[\w-]+\.js$/.test(filename) ? new URL(`/${filename}`, original) : original, options);
      }
    };
    const currentUrl = signal('/');
    TestBed.configureTestingModule({ imports: [CaptureJourneyHost, MetersModule, VisualizationsModule], providers: [
      FacilityMetersWorkspaceService,
      provideRouter([
        { path: 'v1/workspace/facility/:facilityGuid/data/meters/:meterGuid/monthly-chart', component: MeterWorkbenchMonthlyChartComponent, canActivate: [protectedNavigationPreflightGuard] },
        { path: 'v1/workspace/account/:accountGuid/visualization/workbench/:visualizationGuid', component: WorkbenchComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [visualizationLeaveGuard] },
        { path: 'v1/workspace/account/:accountGuid/visualization/dashboard', component: LibraryComponent, canActivate: [protectedNavigationPreflightGuard] }
      ]),
      { provide: WorkspaceNavigationService, useValue: { routeState: computed(() => parseWorkspaceRoute(currentUrl())), isSingleSiteWorkspace: () => false, inventoryFacilityGuid: () => undefined, facilityMeterRoute } },
      { provide: WorkspaceStatusService, useValue: { state: signal('idle'), items: signal([]), evaluation: signal(undefined) } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('monthly-meter-capture');
    await harness.seed({ accounts: [account], facilities: [facility], utilityMeter: [{ ...meter({ id: 1, name: 'Electricity', meterReadingDataApplication: 'fullMonth' }) }],
      utilityMeterData: [0, 1, 2].map(month => ({ ...reading({ id: month + 1, guid: `bill-${month}`, month: month + 1, totalEnergyUse: 10 + month, totalCost: 20 + month }) })) });
    const router = TestBed.inject(Router);
    routeSubscription = router.events.subscribe(event => { if (event instanceof NavigationEnd) currentUrl.set(event.urlAfterRedirects); });
    const workspace = TestBed.inject(AccountWorkspaceService);
    await workspace.selectAccount(account.guid); workspace.selectFacility(facility.guid);
    canonicalSubscription = TestBed.inject(WorkspaceCalendarizationService).calendarizeBase().subscribe();
    fixture = TestBed.createComponent(CaptureJourneyHost); fixture.detectChanges();
    await router.navigateByUrl(monthlyUrl); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().captureSupport().state).toBe('supported'); }, { timeout: 15000 });
  });

  afterEach(async () => {
    fixture?.destroy(); routeSubscription?.unsubscribe(); canonicalSubscription?.unsubscribe();
    vi.restoreAllMocks(); globalThis.Worker = originalWorker;
    if (harness) await harness.destroy();
  });

  const monthly = () => fixture.debugElement.query(By.directive(MeterWorkbenchMonthlyChartComponent)).componentInstance as MeterWorkbenchMonthlyChartComponent;
  const chart = () => fixture.debugElement.query(By.directive(MeterResultsChartComponent)).componentInstance as MeterResultsChartComponent;
  const drawer = () => fixture.debugElement.query(By.directive(CaptureSlideoutComponent)).componentInstance as CaptureSlideoutComponent;
  const workbench = () => fixture.debugElement.query(By.directive(WorkbenchComponent)).componentInstance as WorkbenchComponent;
  async function settle(): Promise<void> { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  function button(label: string): HTMLButtonElement {
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(item => item.getAttribute('aria-label') === label || item.textContent?.trim() === label);
    if (!button) throw new Error(`Missing button ${label}`);
    return button;
  }
  async function expectPreview(): Promise<void> {
    await vi.waitFor(() => {
      fixture.detectChanges();
      const preview = fixture.debugElement.query(By.directive(PreviewComponent)).componentInstance as PreviewComponent;
      expect(preview.preview.state().state).toBe('ready');
    }, { timeout: 15000 });
  }

  it('creates energy plus cost from scratch, edits independent traces and shared units, and reopens one durable Meters selection', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/v1/workspace/account/account-a/visualization/dashboard'); await settle();
    button('Add visualization').click(); await settle();
    const library = fixture.debugElement.query(By.directive(LibraryComponent)).componentInstance as LibraryComponent;
    const lifecycle = library.lifecycle;
    lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('utility'); lifecycle.continueSources();
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.continueResources(); await settle();
    expect(lifecycle.step()).toBe('measures');
    button('Cost').focus(); await userEvent.keyboard('{Enter}'); await settle();
    expect(button('Cost').getAttribute('aria-pressed')).toBe('true');
    expect(button('Cost').querySelectorAll('app-ui-icon')).toHaveLength(2);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Meter Data To Chart'); expect(dialog.textContent).not.toContain('Calendarized months');
    try {
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); dialog.classList.toggle('v1-theme-dark', width === 390); await settle();
        expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth + 1);
        await page.screenshot({ path: `../../../../../.angular/vis9-capture/meter-data-to-chart-${width}.png` });
      }
    } finally { await page.viewport(1280, 900); dialog.classList.remove('v1-theme-dark'); }
    button('Continue').click(); await settle();
    lifecycle.form.controls.name.setValue('Built from scratch'); await settle(); (fixture.nativeElement.querySelector('[form="visualization-creation-form"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(router.url).toContain('/visualization/workbench/')); await settle(); await expectPreview();
    expect(workbench().sourcePanels()).toHaveLength(1); expect(workbench().traceItems()).toHaveLength(2);
    const energy = workbench().traceItems()[0], cost = workbench().traceItems()[1];
    expect(cost.appearance.axis).toBe('right');
    await workbench().requestDecision({ kind: 'item-style', sourceId: energy.sourceId, item: energy.identity, changes: { traceType: 'bar', label: 'Meter energy' } });
    await workbench().requestDecision({ kind: 'item-style', sourceId: cost.sourceId, item: cost.identity, changes: { traceType: 'line', visible: false } }); await settle();
    const display = fixture.debugElement.query(By.directive(DisplaySettingsComponent)).componentInstance as DisplaySettingsComponent;
    display.units.controls['energy'].setValue('MMBtu'); workbench().smoothLines.setValue(true); await settle();
    workbench().setSection(workbench().sourcePanels()[0].nodeId, true);
    workbench().setSection(workbench().rootNodes.appearance, true); await settle();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    main.style.width = '100%';
    try {
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); main.classList.toggle('v1-theme-dark', width === 390); await settle();
        expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth + 1);
        await page.screenshot({ path: `../../../../../.angular/vis9-capture/source-groups-${width}.png` });
      }
    } finally { await page.viewport(1280, 900); main.classList.remove('v1-theme-dark'); }
    expect(await workbench().editor.flush()).toBe(true);
    const saved = (await harness.getAll('savedVisualizations'))[0];
    expect(saved.definition).toMatchObject({ version: 3, sources: [{ kind: 'utility', measures: ['energy', 'cost'] }], displaySettings: { units: { energy: { kind: 'pinned', value: 'MMBtu' } } } });
    expect((saved.definition as { sources: unknown[] }).sources).toHaveLength(1);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(); await settle(); await expectPreview();
    expect(workbench().traceItems().map(item => item.appearance)).toMatchObject([{ traceType: 'bar', label: 'Meter energy' }, { traceType: 'line', visible: false }]);
    expect(workbench().editor.definition()?.chart).toMatchObject({ smoothLines: true });
    expect(fixture.nativeElement.textContent).not.toContain('Back to Monthly Chart');
    expect(TestBed.inject(AccountWorkspaceStore).meterData()).toHaveLength(3);
  });

  it('reviews a bill-charge meter replacement and reopens only the new meter and named charge', async () => {
    const workspace = TestBed.inject(AccountWorkspaceService), store = TestBed.inject(AccountWorkspaceStore);
    const charge = (guid: string) => ({ guid, name: guid, chargeType: 'flatFee' as const, displayChargeInTable: true, displayUsageInTable: false });
    await firstValueFrom(harness.dbService.update('utilityMeter', { ...store.meters()[0], charges: [charge('charge-a')] }));
    await firstValueFrom(harness.dbService.update('utilityMeterData', { ...store.meterData()[0], charges: [{ chargeGuid: 'charge-a', chargeAmount: 14, chargeUsage: 0 }] }));
    await harness.seed({ utilityMeter: [{ ...meter({ id: 2, guid: 'meter-b', name: 'Second meter', charges: [charge('charge-b')] }) }],
      utilityMeterData: [{ ...reading({ id: 4, guid: 'bill-b', meterId: 'meter-b', charges: [{ chargeGuid: 'charge-b', chargeAmount: 29, chargeUsage: 0 }] }) }] });
    await workspace.reloadActiveWorkspace(); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().captureSupport().state).toBe('supported'); });
    button('Visualize').click(); await settle(); button('Save and open').click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/visualization/workbench/')); await settle(); await expectPreview();
    await workbench().requestDecision({ kind: 'source-measures', sourceKind: 'utility', measures: ['charge'] });
    if (workbench().pendingDecision()) await workbench().confirmDecision(); await settle();
    const sourceId = workbench().editor.definition()!.sources[0].id;
    await workbench().requestDecision({ kind: 'source-settings', sourceId, settings: { charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'cost' } } });
    if (workbench().pendingDecision()) await workbench().confirmDecision();
    await settle(); await expectPreview();
    workbench().setSection(workbench().sourcePanels()[0].nodeId, true);
    workbench().setSection(decisionNodeId({ kind: 'resources', sourceId }), true); await settle();
    const picker = () => fixture.nativeElement.querySelector('app-utility-source-editor app-visualization-resource-picker') as HTMLElement;
    expect(picker().querySelector('.resource-picker__all')).toBeNull();
    const second = () => [...picker().querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(row => row.textContent?.includes('Second meter'))!;
    second().focus(); await userEvent.keyboard('{Enter}'); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(workbench().pendingDecision()?.result.cleared).toContain('Named charge settings'); });
    expect((workbench().editor.definition()!.sources[0] as UtilityVisualizationSource).charge?.meterGuid).toBe('meter-a');
    workbench().cancelDecision(); await settle(); await expectPreview();
    second().focus(); await userEvent.keyboard(' '); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(workbench().pendingDecision()).toBeDefined(); });
    await workbench().confirmDecision(); await settle();
    expect(workbench().editor.definition()!.sources[0]).toMatchObject({ selection: { guids: ['meter-b'] } });
    expect((workbench().editor.definition()!.sources[0] as UtilityVisualizationSource).charge).toBeUndefined();
    await workbench().requestDecision({ kind: 'source-settings', sourceId, settings: { charge: { meterGuid: 'meter-b', chargeGuid: 'charge-b', measure: 'cost' } } });
    if (workbench().pendingDecision()) await workbench().confirmDecision();
    await settle(); await expectPreview(); expect(await workbench().editor.flush()).toBe(true);
    await workspace.reloadActiveWorkspace(); await settle(); await expectPreview();
    expect(workbench().editor.definition()!.sources[0]).toMatchObject({ selection: { guids: ['meter-b'] }, charge: { meterGuid: 'meter-b', chargeGuid: 'charge-b' } });
    const preview = fixture.debugElement.query(By.directive(PreviewComponent)).componentInstance as PreviewComponent;
    const state = preview.preview.state();
    expect(state.state).toBe('ready');
    if (state.state === 'ready') {
      const resolution = state.evidence[0].resolution;
      expect(resolution.state).toBe('ready');
      if (resolution.state === 'ready' && resolution.resolved.data.kind === 'time-series') {
        expect(Object.values(resolution.resolved.data.rows[0].values)).toContainEqual(expect.objectContaining({ state: 'observed', value: 29 }));
      }
    }
  });

  it('cancels without a record, saves once, edits/reopens, duplicates, and returns with original controls, zoom and focus', async () => {
    const commands = TestBed.inject(SavedVisualizationCommands), submit = vi.spyOn(commands, 'submit');
    chart().setUtilityDisplay('bar'); chart().syncDataZoom({ start: 20, end: 80 }); await settle();
    await vi.waitFor(() => expect(echarts.getInstanceByDom(fixture.nativeElement.querySelector('.v1-meter-results-chart__chart'))).toBeDefined());
    await vi.waitFor(() => {
      const options = echarts.getInstanceByDom(fixture.nativeElement.querySelector('.v1-meter-results-chart__chart'))!.getOption();
      expect((options['series'] as { name: string }[]).some(series => series.name === 'Total Cost')).toBe(true);
    });
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    echarts.getInstanceByDom(fixture.nativeElement.querySelector('.v1-meter-results-chart__chart'))!.dispatchAction({ type: 'legendToggleSelect', name: 'Total Cost' }); await settle();
    expect(chart().presentation().hiddenMetricIds).toContain('energyCost');
    const sourceScroll = fixture.nativeElement.querySelector('main') as HTMLElement;
    sourceScroll.scrollTop = 120; const scrollTop = sourceScroll.scrollTop;
    button('Visualize').focus(); button('Visualize').click(); await settle();
    expect(drawer().name.value).toBe('HQ (Simple) - Monthly Electricity');
    button('Cancel').click(); await settle(); expect(await harness.getAll('savedVisualizations')).toEqual([]);
    expect(document.activeElement).toBe(button('Visualize'));
    expect(sourceScroll.scrollTop).toBe(scrollTop);
    button('Visualize').click(); await settle(); drawer().name.setValue('Monthly main');
    button('Save and open').click(); button('Save and open').click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/visualization/workbench/')); await settle();
    expect(submit).toHaveBeenCalledOnce(); expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
    await expectPreview();
    const store = TestBed.inject(AccountWorkspaceStore), saved = store.savedVisualizations()[0];
    expect(workbench().editor.definition()).toMatchObject({ name: 'Monthly main', chart: { smoothLines: true }, series: [{ traceType: 'bar' }, { traceType: 'line', visible: false }] });
    workbench().smoothLines.setValue(false); workbench().editor.form.controls.title.setValue('Edited in workbench');
    expect(await workbench().editor.flush()).toBe(true); await settle();
    const duplicate = await commands.submit(commands.prepareDuplicate(store.savedVisualizations()[0]));
    expect(duplicate.state).toBe('committed');
    expect(readSavedVisualization(store.savedVisualizations().find(item => item.guid !== saved.guid)!)).toMatchObject({ definition: { chart: { smoothLines: false } } });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(); await settle();
    expect(workbench().editor.definition()?.chart).toMatchObject({ smoothLines: false });
    button('Back to Monthly Chart').click(); await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(monthlyUrl)); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().captureSupport().state).toBe('supported'); });
    expect(chart().presentation()).toMatchObject({ leftDisplay: 'bar', zoom: { start: 20, end: 80 }, smoothLines: true, hiddenMetricIds: ['energyCost'] });
    expect(document.activeElement).toBe(button('Visualize'));
    expect(sourceScroll.scrollTop).toBe(scrollTop);
    expect(store.meters()[0].name).toBe('Electricity'); expect(store.meterData()).toHaveLength(3);
  });

  it('retains one identity across failed writes, publication recovery, and failed navigation', async () => {
    const commands = TestBed.inject(SavedVisualizationCommands), realSubmit = commands.submit.bind(commands), submit = vi.spyOn(commands, 'submit');
    chart().setUtilityDisplay('bar'); chart().syncDataZoom({ start: 20, end: 80 }); await settle();
    submit.mockImplementationOnce(async command => ({ state: 'failed', command, error: new Error('Rejected write') }));
    button('Visualize').click(); await settle(); button('Save and open').click(); await settle();
    const guid = monthly().capture.proposal()!.guid;
    expect(await harness.getAll('savedVisualizations')).toHaveLength(0);
    submit.mockImplementationOnce(async command => { const outcome = await realSubmit(command); expect(outcome.state).toBe('committed'); return { state: 'refresh-required', command, error: new Error('Refresh failed') }; });
    button('Retry save').click(); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().capture.refreshRequired()).toBe(true); });
    expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
    const router = TestBed.inject(Router), navigate = vi.spyOn(router, 'navigate').mockResolvedValueOnce(false);
    button('Retry refresh').click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().capture.saved()?.guid).toBe(guid); }); await settle();
    expect(monthly().capture.saved()?.guid).toBe(guid); expect(submit).toHaveBeenCalledTimes(2);
    expect(chart().presentation()).toMatchObject({ leftDisplay: 'bar', zoom: { start: 20, end: 80 } });
    expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
    button('Open saved visualization').click(); await vi.waitFor(() => expect(router.url).toContain(guid)); await settle();
    expect(navigate).toHaveBeenCalledTimes(2); await expectPreview();
  });

  it('keeps the naming panel usable in narrow light/dark layouts with keyboard dismissal', async () => {
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    try {
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); root.style.width = '100%';
        root.classList.toggle('v1-theme-dark', width === 390);
        button('Visualize').focus(); button('Visualize').click(); await settle();
        expect(document.activeElement?.id).toBe('capture-visualization-name');
        const panel = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
        expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
        const field = panel.querySelector<HTMLInputElement>('input')!;
        expect(textContrast(field)).toBeGreaterThanOrEqual(4.5);
        expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(panel.getBoundingClientRect().right);
        await page.screenshot({ path: `../../../../../.angular/vis9-capture/naming-${width}.png` });
        await userEvent.keyboard('{Escape}'); await settle();
        expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(button('Visualize'));
      }
      expect(await harness.getAll('savedVisualizations')).toHaveLength(0);
    } finally { await page.viewport(1280, 900); }
  });

  it('retains invalid names locally and refuses a source configuration changed during review', async () => {
    button('Visualize').click(); await settle(); drawer().name.setValue('  ');
    button('Save and open').click(); await settle();
    expect(monthly().capture.proposal()).toBeUndefined();
    drawer().name.setValue('Reviewed chart');
    const store = TestBed.inject(AccountWorkspaceStore);
    store.publishCommitted({ ...store.snapshot()!, meters: store.meters().map(item => ({ ...item, name: 'Renamed meter' })) }, store.selections());
    await settle(); button('Save and open').click(); await settle();
    expect(monthly().captureError()).toContain('changed during review');
    expect(drawer().name.value).toBe('Reviewed chart');
    expect(await harness.getAll('savedVisualizations')).toHaveLength(0);
    button('Cancel').click(); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().captureSupport().state).toBe('supported'); });
    button('Visualize').click(); await settle();
    expect(drawer().name.value).toBe('HQ (Simple) - Monthly Renamed meter');
  });
});
