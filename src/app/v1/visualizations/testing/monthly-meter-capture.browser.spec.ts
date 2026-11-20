import { PeriodSettingsComponent } from '../shared/period-settings/period-settings.component';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { MeterWorkbenchYearlyDataComponent } from '@app/v1/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { TimeSeriesChartComponent } from '../time-series/chart/time-series-chart.component';
import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { firstValueFrom, Subscription } from 'rxjs';
import { cdp, page, userEvent } from 'vitest/browser';
import { echarts } from '@app/v1/shared/charts/echarts';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { meter, reading, group } from '@app/v1/data/meters/facility-meters.testing';
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
import { MeterFiscalYearComparisonChartComponent } from '@app/v1/data/meters/meter-workbench/monthly-chart/fiscal-year-comparison-chart/meter-fiscal-year-comparison-chart.component';
import { MonthlyPatternsChartComponent } from '../monthly-patterns/chart/monthly-patterns-chart.component';
import { MonthlyPatternYearSettingsComponent } from '../monthly-patterns/year-settings/monthly-pattern-year-settings.component';
import { decisionNodeId } from '../decisions/decision-tree';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: `
  <main class="v1-root v1-workspace__main"><router-outlet/></main>
  <div class="v1-root"><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>`,
  styles: [`main { height: 650px; width: 1000px; overflow: auto; }
    @media print { main { height: auto; overflow: visible; } }`] })
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
        { path: 'v1/workspace/facility/:facilityGuid/data/meters/:meterGuid/yearly', component: MeterWorkbenchYearlyDataComponent, canActivate: [protectedNavigationPreflightGuard] },
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
  async function workspaceReload(): Promise<void> { await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(); await settle(); await expectPreview(); }
  async function expectPreview(): Promise<void> {
    await vi.waitFor(() => {
      fixture.detectChanges();
      const preview = fixture.debugElement.query(By.directive(PreviewComponent)).componentInstance as PreviewComponent;
      expect(preview.preview.state().state).toBe('ready');
    }, { timeout: 15000 });
  }

  it.each([false, true])('captures yearly data (YTD=%s), reopens durable settings and links to the same source mode', async ytd => {
    const router = TestBed.inject(Router), workspace = TestBed.inject(AccountWorkspaceService);
    await harness.seed({ utilityMeterData: Array.from({ length: 12 }, (_, month) => ({ ...reading({ id: 100 + month, guid: `previous-${month}`, year: 2025, month: month + 1, totalEnergyUse: 10, totalCost: 20 }) })) });
    await workspace.reloadActiveWorkspace();
    await router.navigateByUrl('/v1/workspace/facility/facility-a/data/meters/meter-a/yearly'); await settle();
    const yearly = () => fixture.debugElement.query(By.directive(MeterWorkbenchYearlyDataComponent)).componentInstance as MeterWorkbenchYearlyDataComponent;
    await vi.waitFor(() => { fixture.detectChanges(); expect(yearly().captureSupport().state).toBe('supported'); }, { timeout: 15000 });
    if (ytd) { button('Year to Date').click(); await settle(); }
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.v1-meter-results-chart__series-controls .v1-meter-yearly-data__mode')).not.toBeNull();
    expect(yearly().chartRows().map(row => row.values['energyUse'])).toEqual([ytd ? 30 : 120, 33]);
    expect(root.querySelector('.v1-meter-yearly-data__table')?.textContent).toContain(ytd ? 'FY 2025 YTD' : 'FY 2025');
    if (ytd) {
      const main = root.querySelector('main')!; main.style.width = '100%';
      try {
        for (const width of [1280, 390]) {
          await page.viewport(width, 900); main.classList.toggle('v1-theme-dark', width === 390); await settle();
          expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth + 1);
          const toggle = root.querySelector('.v1-meter-yearly-data__mode')!, controls = root.querySelector('.v1-meter-results-chart__series-controls')!;
          expect(toggle.getBoundingClientRect().left).toBe(controls.getBoundingClientRect().left);
          expect(root.textContent).not.toContain('Some totals have partial');
        }
      } finally { await page.viewport(1280, 900); main.classList.remove('v1-theme-dark'); }
      const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', params: { media: string }) => Promise<unknown> };
      await print.send('Emulation.setEmulatedMedia', { media: 'print' });
      try {
        expect(getComputedStyle(root.querySelector('.v1-meter-results-chart__controls')!).display).toBe('none');
        expect(root.querySelector('.v1-meter-yearly-data__table caption')?.textContent).toContain('March');
      } finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }
    }
    button('Visualize').click(); await settle();
    expect(drawer().name.value).toBe(`HQ (Simple) - ${ytd ? 'Year to Date' : 'Yearly'} Electricity`);
    button('Cancel').click(); await settle(); expect((await harness.getAll('savedVisualizations'))).toHaveLength(0);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Visualize');
    button('Visualize').click(); await settle(); button('Save and open').click();
    await vi.waitFor(() => expect(router.url).toContain('/visualization/workbench/')); await settle(); await expectPreview();
    expect(root.querySelector('#period-body [aria-label="Chart interval"]')).not.toBeNull();
    expect(root.querySelector('#chart-body [aria-label="Chart interval"]')).toBeNull();
    expect(root.querySelector('[aria-label="Comparison"]')).toBeNull();
    const saved = (await harness.getAll('savedVisualizations'))[0] as unknown as IdbSavedVisualization;
    expect(saved.captureOrigin?.source.kind).toBe('meter-yearly');
    expect(readSavedVisualization(saved)).toMatchObject({ state: 'valid', definition: { chart: { interval: 'yearly', ...(ytd ? { yearToDate: true } : {}) } } });
    const model = () => (fixture.debugElement.query(By.directive(TimeSeriesChartComponent)).componentInstance as TimeSeriesChartComponent).model;
    expect(model().traces[0].points.map(point => point.observation.value)).toEqual([ytd ? 30 : 120, 33]);
    await workspaceReload(); expect(workbench().sourceLink()).toBeDefined();
    workbench().setYearToDate(!ytd); await settle(); expect(await workbench().editor.flush()).toBe(true); await expectPreview(); expect(workbench().sourceLink()).toBeUndefined();
    workbench().setYearToDate(ytd); await settle(); expect(await workbench().editor.flush()).toBe(true); await expectPreview(); expect(workbench().sourceLink()).toBeDefined();
    if (ytd) {
      await harness.seed({ utilityMeterData: [{ ...reading({ id: 200, guid: 'new-zero', year: 2026, month: 4, totalEnergyUse: 0, totalCost: 0 }) }] });
      await workspaceReload(); expect(model().yearToDateLabel).toContain('April'); expect(model().traces[0].points.map(point => point.observation.value)).toEqual([40, 33]);
      expect(workbench().sourceLink()).toBeDefined();
    }
    const link = [...root.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.textContent?.includes('View source chart'))!;
    link.click(); await settle(); await vi.waitFor(() => expect(router.url).toContain('/yearly'));
    expect(router.url).toContain('meter-yearly-chart'); expect(yearly().ytd()).toBe(ytd);
    if (ytd) expect(yearly().contextLabel()).toContain('April');
    expect(document.activeElement?.id).toBe('meter-yearly-chart');
  });

  it.each(['group', 'source'] as const)('creates a yearly YTD %s chart from scratch with one cutoff for unequal meter histories', async mode => {
    const router = TestBed.inject(Router), workspace = TestBed.inject(AccountWorkspaceService), store = TestBed.inject(AccountWorkspaceStore);
    await firstValueFrom(harness.dbService.update('utilityMeter', { ...store.meters()[0], groupId: 'group-a' }));
    await harness.seed({ utilityMeterGroups: [{ ...group({ guid: 'group-a', name: 'Production' }) }], utilityMeter: [{ ...meter({ id: 2, guid: 'meter-b', groupId: 'group-a', meterReadingDataApplication: 'fullMonth' }) }], utilityMeterData: [{ ...reading({ id: 40, guid: 'late', meterId: 'meter-b', year: 2026, month: 4, totalEnergyUse: 5 }) }] });
    await workspace.reloadActiveWorkspace(); await router.navigateByUrl('/v1/workspace/account/account-a/visualization/dashboard'); await settle();
    button('Add visualization').click(); await settle();
    const lifecycle = (fixture.debugElement.query(By.directive(LibraryComponent)).componentInstance as LibraryComponent).lifecycle;
    lifecycle.continueFacilities(); lifecycle.selectChart('line'); lifecycle.toggleSource('utility'); lifecycle.continueSources();
    lifecycle.selectMeterMode(mode); lifecycle.toggleResource(mode === 'group' ? 'group-a' : 'Electricity'); lifecycle.continueResources(); lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Yearly YTD cohort');
    await lifecycle.submit(); await settle(); await expectPreview();
    workbench().setInterval('yearly'); await settle(); await expectPreview();
    const dates = fixture.debugElement.query(By.directive(PeriodSettingsComponent)).componentInstance as PeriodSettingsComponent;
    dates.selectChoice(dates.form.controls.kind, 'fiscal-year'); await settle();
    expect((fixture.nativeElement as HTMLElement).querySelector('#period-body input[formcontrolname="year"]')).not.toBeNull();
    dates.form.controls.year.setValue(2026); await settle();
    expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(workbench().editor.definition()?.period).toEqual({ kind: 'fiscal-year', year: 2026 });
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#period-body input[formcontrolname="year"]')?.value).toBe('2026');
    dates.selectChoice(dates.form.controls.kind, 'fixed'); dates.form.patchValue({ start: '2026-01', end: '2026-02' }); await settle();
    expect(workbench().editor.definition()?.period).toMatchObject({ start: '2026-01-01', end: '2026-02-28' });
    expect((fixture.nativeElement as HTMLElement).querySelector('#period-body input[type="date"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('#period-body input[type="month"]').length).toBe(2);
    await workbench().requestDecision({ kind: 'year-to-date', enabled: true }); await settle(); expect(workbench().pendingDecision()).toBeDefined();
    await workbench().confirmDecision(); await settle(); await expectPreview();
    expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    const model = (fixture.debugElement.query(By.directive(TimeSeriesChartComponent)).componentInstance as TimeSeriesChartComponent).model;
    expect(model.yearToDateLabel).toContain('April'); expect(model.traces[0].points[0].observation).toMatchObject({ value: 38, partial: true });
  });

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

  it('creates monthly patterns from scratch and follows the selected meter facility calendar', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/v1/workspace/account/account-a/visualization/dashboard'); await settle();
    button('Add visualization').click(); await settle();
    const lifecycle = (fixture.debugElement.query(By.directive(LibraryComponent)).componentInstance as LibraryComponent).lifecycle;
    lifecycle.continueFacilities(); lifecycle.selectChart('monthly-patterns');
    expect(lifecycle.availableDataSources().map(source => source.value)).toEqual(['utility', 'predictor']);
    lifecycle.toggleSource('utility'); lifecycle.continueSources();
    lifecycle.selectMeterMode('facility'); expect(lifecycle.form.controls.selectionMode.value).toBeNull();
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.continueResources();
    lifecycle.toggleCreationMeasure('utility', 'cost'); lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Built monthly patterns');
    await lifecycle.submit(); await settle(); await expectPreview();
    expect(workbench().sourcePanels()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    const model = () => fixture.debugElement.query(By.directive(MonthlyPatternsChartComponent)).componentInstance.model();
    expect(model().panels).toHaveLength(2); expect(model().months[0]).toBe('Jan');
    await firstValueFrom(harness.dbService.update('facilities', { ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }));
    await workspaceReload();
    expect(model().months[0]).toBe('Jul'); expect(model().years[0].label).toBe('FY 2026');
    button('Settings').click(); await settle();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement; root.style.width = '100%';
    try {
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); root.classList.toggle('v1-theme-dark', width === 390); await settle();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      }
    } finally { await page.viewport(1280, 900); root.classList.remove('v1-theme-dark'); }
    const print = cdp() as { send: (method: 'Emulation.setEmulatedMedia', params: { media: string }) => Promise<unknown> };
    await print.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      expect(getComputedStyle(fixture.nativeElement.querySelector('#visualization-settings')).display).toBe('none');
      expect(getComputedStyle(fixture.nativeElement.querySelector('.v1-data-workbench-actions')).display).toBe('none');
      const printedChart = fixture.nativeElement.querySelector('.monthly-patterns-chart').getBoundingClientRect();
      expect(printedChart.height).toBeGreaterThan(0);
      expect(printedChart.bottom).toBeLessThanOrEqual(root.getBoundingClientRect().bottom);
      expect(fixture.nativeElement.querySelector('app-monthly-patterns-chart details')).toBeNull();
    } finally { await print.send('Emulation.setEmulatedMedia', { media: '' }); }

    expect((await harness.getAll('savedVisualizations'))[0].captureOrigin).toBeUndefined();
    expect((await harness.getAll('savedVisualizations'))[0].definition).toMatchObject({ chart: { kind: 'monthly-patterns' }, sources: [{ kind: 'utility', measures: ['energy', 'cost'] }] });
  });

  it.each(['group', 'source'] as const)('creates combined monthly patterns by %s and includes new matching meters', async mode => {
    const workspace = TestBed.inject(AccountWorkspaceService), store = TestBed.inject(AccountWorkspaceStore), router = TestBed.inject(Router);
    await firstValueFrom(harness.dbService.update('utilityMeter', { ...store.meters()[0], groupId: 'group-a' }));
    await harness.seed({ utilityMeterGroups: [{ ...group({ guid: 'group-a', name: 'Production' }) }],
      utilityMeter: [{ ...meter({ id: 2, guid: 'meter-b', name: 'Second meter', groupId: 'group-a', meterReadingDataApplication: 'fullMonth' }) }],
      utilityMeterData: [{ ...reading({ id: 40, guid: 'second-bill', meterId: 'meter-b', totalEnergyUse: 5, totalCost: 10 }) }] });
    await workspace.reloadActiveWorkspace(); await router.navigateByUrl('/v1/workspace/account/account-a/visualization/dashboard'); await settle();
    button('Add visualization').click(); await settle();
    const lifecycle = (fixture.debugElement.query(By.directive(LibraryComponent)).componentInstance as LibraryComponent).lifecycle;
    lifecycle.continueFacilities(); lifecycle.selectChart('monthly-patterns'); lifecycle.toggleSource('utility'); lifecycle.continueSources();
    lifecycle.selectMeterMode(mode); lifecycle.toggleResource(mode === 'group' ? 'group-a' : 'Electricity'); lifecycle.continueResources();
    lifecycle.toggleCreationMeasure('utility', 'cost'); lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Combined patterns'); await lifecycle.submit();
    await settle(); await expectPreview();
    const model = () => fixture.debugElement.query(By.directive(MonthlyPatternsChartComponent)).componentInstance.model();
    expect(model().panels).toHaveLength(2);
    expect(model().panels[0].years[0].points[0].observation).toMatchObject({ state: 'observed', value: 15 });
    expect(model().panels[1].years[0].points[0].observation).toMatchObject({ state: 'observed', value: 30 });
    await harness.seed({ utilityMeter: [{ ...meter({ id: 3, guid: 'meter-c', groupId: 'group-a', meterReadingDataApplication: 'fullMonth' }) }],
      utilityMeterData: [{ ...reading({ id: 41, guid: 'third-bill', meterId: 'meter-c', totalEnergyUse: 7, totalCost: 14 }) }] });
    await workspaceReload();
    expect(model().panels[0].years[0].points[0].observation).toMatchObject({ state: 'observed', value: 22 });
    expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    expect(fixture.nativeElement.querySelector('app-monthly-patterns-chart details')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-monthly-patterns-chart .visually-hidden table')).not.toBeNull();
  });

  it('creates a single-panel predictor pattern with fiscal alignment, zeros, negative values and gaps', async () => {
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), id: 1, guid: 'production', name: 'Production', unit: 'widgets' };
    await harness.seed({ predictor: [predictor], predictorData: [
      { ...getNewIdbPredictorData(predictor), id: 1, guid: 'production-july', year: 2026, month: 7, amount: 0 },
      { ...getNewIdbPredictorData(predictor), id: 2, guid: 'production-september', year: 2026, month: 9, amount: -2 },
      { ...getNewIdbPredictorData(predictor), id: 3, guid: 'production-next', year: 2027, month: 7, amount: 8 }
    ] });
    await firstValueFrom(harness.dbService.update('facilities', { ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }));
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    await TestBed.inject(Router).navigateByUrl('/v1/workspace/account/account-a/visualization/dashboard'); await settle();
    button('Add visualization').click(); await settle();
    const lifecycle = (fixture.debugElement.query(By.directive(LibraryComponent)).componentInstance as LibraryComponent).lifecycle;
    lifecycle.continueFacilities(); lifecycle.selectChart('monthly-patterns'); lifecycle.toggleSource('predictor'); lifecycle.continueSources();
    expect(fixture.nativeElement.querySelector('.predictor-all-choice')).toBeNull();
    expect(lifecycle.predictorChoices().map(choice => choice.value)).toContain('production');
    expect(lifecycle.canEditDraft()).toBe(true);
    lifecycle.togglePredictor('production'); expect(lifecycle.form.controls.predictorGuids.value).toEqual(['production']);
    lifecycle.continuePredictors(); lifecycle.continueMeasures(); lifecycle.form.controls.name.setValue('Production patterns');
    await lifecycle.submit(); await settle(); await expectPreview();
    const model = () => fixture.debugElement.query(By.directive(MonthlyPatternsChartComponent)).componentInstance.model();
    expect(model().panels).toHaveLength(1); expect(model().panels[0].unit).toBe('widgets'); expect(model().months[0]).toBe('Jul');
    expect(model().years.map(year => year.label)).toEqual(['FY 2027', 'FY 2028']);
    expect(model().panels[0].years[0].points.slice(0, 3).map(point => point.observation)).toMatchObject([{ state: 'observed', value: 0 }, { state: 'missing', value: null }, { state: 'observed', value: -2 }]);
    expect(fixture.nativeElement.querySelector('app-monthly-patterns-chart details')).toBeNull();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement; root.style.width = '100%';
    try {
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); root.classList.toggle('v1-theme-dark', width === 390); await settle();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      }
    } finally { await page.viewport(1280, 900); root.classList.remove('v1-theme-dark'); }
    expect(await workbench().editor.flush()).toBe(true); await workspaceReload(); expect(model().panels).toHaveLength(1);
  });

  it('captures linked fiscal patterns, persists year edits and future years, and exposes only unchanged source links', async () => {
    const workspace = TestBed.inject(AccountWorkspaceService);
    await harness.seed({ utilityMeterData: Array.from({ length: 10 }, (_, index) => { const month = index + 3; return { ...reading({ id: 40 + index, guid: `next-year-${index}`, year: 2026 + Math.floor(month / 12), month: month % 12 + 1, totalEnergyUse: 42, totalCost: 84 }) }; }) });
    await workspace.reloadActiveWorkspace(); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(monthly().patternCaptureSupport().state, JSON.stringify(monthly().patternCaptureSupport())).toBe('supported'); });
    const patterns = fixture.debugElement.query(By.directive(MeterFiscalYearComparisonChartComponent)).componentInstance as MeterFiscalYearComparisonChartComponent;
    const sourceRoot = fixture.nativeElement.querySelector('app-meter-fiscal-year-comparison-chart') as HTMLElement;
    const sourceChart = () => echarts.getInstanceByDom(sourceRoot.querySelector('.v1-meter-fiscal-comparison__chart')!);
    // The instance is created before its initial options are applied on the next animation frame.
    await vi.waitFor(() => expect(sourceChart()?.getOption()).toMatchObject({ legend: [{ data: ['2026', '2027'] }] }));
    sourceChart()!.dispatchAction({ type: 'legendToggleSelect', name: '2026' }); await settle();
    expect(patterns.hiddenYears()).toEqual([2026]);
    const visualize = sourceRoot.querySelector<HTMLButtonElement>('button[aria-label="Visualize"]')!;
    visualize.focus(); await userEvent.keyboard('{Enter}'); await settle();
    expect(drawer().name.value).toBe('HQ (Simple) - Monthly Patterns Electricity');
    button('Cancel').click(); await settle(); expect(document.activeElement).toBe(visualize);
    visualize.click(); await settle(); button('Save and open').click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/visualization/workbench/')); await settle(); await expectPreview();
    const savedGuid = workbench().editor.record()!.guid;
    const model = () => fixture.debugElement.query(By.directive(MonthlyPatternsChartComponent)).componentInstance.model();
    expect(model().panels).toHaveLength(2); expect(model().years.map(year => [year.year, year.visible])).toEqual([[2026, false], [2027, true]]);
    expect((await harness.getAll('savedVisualizations'))[0].captureOrigin).toMatchObject({ source: { kind: 'meter-monthly-patterns', meterGuid: 'meter-a' } });
    workbench().editor.form.controls.name.setValue('Renamed patterns'); expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(fixture.nativeElement.textContent).toContain('View source chart');
    workbench().smoothLines.setValue(true); expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(model().smoothLines).toBe(true); expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    workbench().smoothLines.setValue(false); expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(fixture.nativeElement.textContent).toContain('View source chart');
    const savedChartRoot = () => fixture.nativeElement.querySelector('app-monthly-patterns-chart .monthly-patterns-chart') as HTMLElement;
    await vi.waitFor(() => expect(echarts.getInstanceByDom(savedChartRoot())?.getOption()).toMatchObject({ legend: [{ data: ['2026', '2027'] }] }));
    echarts.getInstanceByDom(savedChartRoot())!.dispatchAction({ type: 'legendToggleSelect', name: '2027' }); await settle();
    await vi.waitFor(() => { fixture.detectChanges(); expect(model().years.every(year => !year.visible)).toBe(true); });
    expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    echarts.getInstanceByDom(savedChartRoot())!.dispatchAction({ type: 'legendToggleSelect', name: '2027' }); await settle(); await expectPreview();
    workbench().setSection('pattern-years', true); await settle();
    const settings = fixture.debugElement.query(By.directive(MonthlyPatternYearSettingsComponent)).componentInstance as MonthlyPatternYearSettingsComponent;
    settings.form.controls['2027'].controls.color.setValue('#23684d'); await settle();
    expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(model().years.find(year => year.year === 2027)?.color).toBe('#23684d');
    const duplicate = await TestBed.inject(SavedVisualizationCommands).submit(TestBed.inject(SavedVisualizationCommands).prepareDuplicate(workbench().editor.record()!));
    expect(duplicate.state).toBe('committed');
    const store = TestBed.inject(AccountWorkspaceStore);
    expect(store.savedVisualizations().find(record => record.guid !== savedGuid)?.captureOrigin).toEqual(workbench().editor.record()?.captureOrigin);
    await harness.seed({ utilityMeterData: Array.from({ length: 12 }, (_, index) => { const month = index + 13; return { ...reading({ id: 60 + index, guid: `future-year-${index}`, year: 2026 + Math.floor(month / 12), month: month % 12 + 1, totalEnergyUse: 43, totalCost: 86 }) }; }) });
    await workspaceReload();
    expect(model().years.map(year => year.year)).toEqual([2026, 2027, 2028]); expect(model().years.at(-1)?.visible).toBe(true);
    workbench().setSection('pattern-years', true); await settle();
    const current = fixture.debugElement.query(By.directive(MonthlyPatternYearSettingsComponent)).componentInstance as MonthlyPatternYearSettingsComponent;
    current.form.controls['2027'].controls.color.setValue('#efb118'); await settle(); expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    expect(fixture.nativeElement.textContent).toContain('View source chart');
    const link = [...fixture.nativeElement.querySelectorAll('a')].find((anchor: HTMLAnchorElement) => anchor.textContent?.includes('View source chart')) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(monthlyUrl + '#meter-fiscal-comparison-heading');
    link.focus(); await userEvent.keyboard('{Enter}'); await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(monthlyUrl + '#meter-fiscal-comparison-heading'));
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('meter-fiscal-comparison-heading'));
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

  it('cancels without a record, saves once, edits/reopens, duplicates, and links only an unchanged source', async () => {
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
    expect(fixture.nativeElement.textContent).toContain('View source chart');
    workbench().editor.form.controls.name.setValue('Renamed monthly capture'); await settle();
    expect(fixture.nativeElement.textContent).toContain('View source chart');
    const store = TestBed.inject(AccountWorkspaceStore), saved = store.savedVisualizations()[0];
    expect(workbench().editor.definition()).toMatchObject({ name: 'Renamed monthly capture', chart: { smoothLines: true }, series: [{ traceType: 'bar' }, { traceType: 'line', visible: false }] });
    workbench().smoothLines.setValue(false); workbench().editor.form.controls.title.setValue('Edited in workbench');
    expect(await workbench().editor.flush()).toBe(true); await settle();
    const duplicate = await commands.submit(commands.prepareDuplicate(store.savedVisualizations()[0]));
    expect(duplicate.state).toBe('committed');
    expect(readSavedVisualization(store.savedVisualizations().find(item => item.guid !== saved.guid)!)).toMatchObject({ definition: { chart: { smoothLines: false } } });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace(); await settle();
    expect(workbench().editor.definition()?.chart).toMatchObject({ smoothLines: false });
    expect(fixture.nativeElement.textContent).not.toContain('View source chart');
    workbench().smoothLines.setValue(true); workbench().editor.form.controls.title.setValue(''); await settle();
    expect(await workbench().editor.flush()).toBe(true); await workspaceReload();
    const sourceLink = [...fixture.nativeElement.querySelectorAll('a')].find((link: HTMLAnchorElement) => link.textContent?.includes('View source chart')) as HTMLAnchorElement;
    expect(sourceLink).toBeDefined(); expect(sourceLink.getAttribute('href')).toBe(monthlyUrl + '#meter-monthly-chart');
    sourceLink.click(); await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(monthlyUrl + '#meter-monthly-chart')); await settle();
    expect(chart().presentation().zoom).toEqual({ start: 0, end: 100 });
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
