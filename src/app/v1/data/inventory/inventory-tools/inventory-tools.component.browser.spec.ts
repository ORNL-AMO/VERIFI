import { Component, NgModule, computed, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PortalModule } from '@angular/cdk/portal';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ShellComponent } from '@app/v1/shell/shell.component';
import { ShellHeaderTestModule } from '@app/v1/shell/header/shell-header.testing';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { cdp, page, userEvent } from 'vitest/browser';
import * as echarts from 'echarts/core';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { inventoryReading } from '@app/v1/data/predictors/inventory/predictor-inventory.testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { reportSnapshot } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { calendarizedMeter, meter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';
import { InventoryToolsComponent } from './inventory-tools.component';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';

@NgModule({ imports: [CommonModule, PortalModule, RouterModule, ShellHeaderTestModule, NoopAnimationsModule], declarations: [ShellComponent], exports: [ShellComponent] })
class ChartShellTestModule {}

const scope = signal<string | undefined>(undefined);
@Component({ standalone:true,imports:[InventoryToolsComponent,PortalModule],template:`<main class="v1-root" style="height:700px;width:100%"><header style="position:relative;z-index:10;height:var(--v1-header-height)"><button class="v1-btn" type="button" (click)="chooseOther()">Choose other facility</button></header><app-inventory-tools [resource]="resource()" [scopeGuids]="ids()" [matchingGuids]="ids()"/><ng-template [cdkPortalOutlet]="portal.activePortal()"/></main>` })
class ToolsHost {
  chooseOther(): void { scope.set('facility-b'); }
  readonly portal=inject(ModalPortalService);
  readonly resource=signal<'meters' | 'predictors'>('meters');
  readonly matching = signal<readonly string[] | undefined>(undefined);
  readonly matchingIds = computed(() => this.matching() ?? this.ids());
  readonly filterKey = computed(() => this.matchingIds().join(','));
  private readonly workspace=inject(AccountWorkspaceStore);
  readonly ids=computed(()=>this.resource() === 'predictors' ? this.workspace.predictors().filter(p => !scope() || p.facilityId === scope()).map(p => p.guid) : this.workspace.meters().filter(m => !scope() || m.facilityId === scope()).map(m => m.guid));
}
async function settle(fixture: ComponentFixture<unknown>) { fixture.detectChanges();await fixture.whenStable();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));fixture.detectChanges(); }

async function finishChartAnimation(root: HTMLElement): Promise<void> {
  const host = root.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
  await vi.waitFor(() => expect(echarts.getInstanceByDom(host)?.getZr().animation.isFinished()).toBe(true));
}

describe('unified inventory charts in Chromium',()=>{
  it('keeps simplified straight-line charts right-aligned and scopes the backdrop beneath the real header', async () => {
    await page.viewport(1300, 950); scope.set(undefined);
    const store = new AccountWorkspaceStore(), original = reportSnapshot();
    const snapshot = { ...original, account: { ...original.account, energyUnit: 'MMBtu', volumeLiquidUnit: 'gal' }, facilities: [
      { ...original.facilities[0], energyUnit: 'kWh' },
      { ...original.facilities[0], guid: 'facility-b', name: 'Other plant', energyUnit: 'GJ', volumeLiquidUnit: 'm3', energyIsSource: false }
    ], meters: [meter({ guid: 'ma', accountId: 'account-a', facilityId: 'facility-a' }), meter({ guid: 'mb', accountId: 'account-a', facilityId: 'facility-b' }),
      ...['facility-a', 'facility-b'].flatMap((facilityId, f) => Array.from({ length: 11 }, (_, index) => meter({ guid: `extra-${f}-${index}`, facilityId, accountId: 'account-a', name: `Process ${String(index + 1).padStart(2, '0')}` })))
    ] };
    store.publish(snapshot);
    const base = { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'test', meters: snapshot.meters.map((m, index) => calendarizedMeter(m, [
      monthlyData({ year: 2025, monthNumValue: 0, energyUse: 10 + index * .25, energyCost: m.guid === 'ma' ? NaN : 0 }),
      monthlyData({ year: 2025, monthNumValue: 1, energyUse: 15 + index * .35, energyCost: m.guid === 'ma' ? NaN : 2 }),
      monthlyData({ year: 2025, monthNumValue: 2, energyUse: 12 + index * .4, energyCost: m.guid === 'ma' ? NaN : 1 })
    ], { energyUnit: 'MMBtu', energyIsSource: false, showEnergyUse: true })) };
    const navigation = { inventoryFacilityGuid: scope, account: store.account, facilities: store.facilities,
      headerFacility: computed(() => store.facilities().find(f => f.guid === scope())),
      isWorkspaceRoute: () => true, isSingleSiteWorkspace: () => false, scopeChangePending: () => false,
      scopeAvailability: () => '', scopeNotice: () => '', contextNavigationError: () => '', isSupportPanelOpen: () => false,
      showWelcome: vi.fn(), toggleSupportPanel: vi.fn(),
      changeFacilityScope: async (next: { kind: 'all' } | { kind: 'facility'; facilityGuid: string }) => { scope.set(next.kind === 'facility' ? next.facilityGuid : undefined); return true; }
    };
    TestBed.configureTestingModule({ imports: [ToolsHost, ChartShellTestModule], providers: [
      provideRouter([{ path: 'meters', component: ToolsHost }]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: navigation },
      { provide: AppearanceService, useValue: { settings: () => ({ palette: 'default', mode: 'light', cornerStyle: 'soft', highContrast: false, backgroundPattern: 'skyline-green' }), isDark: () => false } },
      { provide: ManualBackupDownloadService, useValue: { reminder: () => ({ tone: 'none', label: 'Backup', detail: '' }), available: () => false, preparing: () => false } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of(base), project: (value, request) => projectWorkspaceCalendarization(value, snapshot, request) } }
    ] }).overrideComponent(ToolsHost, { set: { template: '<button class="v1-btn" type="button">Background action</button><app-inventory-tools resource="meters" [scopeGuids]="ids()" [matchingGuids]="matchingIds()" [filtersKey]="filterKey()"/>' } });
    const fixture = TestBed.createComponent(ShellComponent);
    try {
      await TestBed.inject(Router).navigateByUrl('/meters'); await settle(fixture);
      const root = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
      const stage = root.querySelector<HTMLElement>('.v1-route-stage')!;
      const header = root.querySelector<HTMLElement>('.v1-workspace__header')!;
      const route = fixture.debugElement.query(By.directive(ToolsHost)).componentInstance as ToolsHost;
      const tools = fixture.debugElement.query(By.directive(InventoryToolsComponent)).componentInstance as InventoryToolsComponent;
      const opener = page.getByRole('button', { name: 'Charts', exact: true });
      await opener.click(); await settle(fixture);
      expect(stage.inert).toBe(true);
      expect(getComputedStyle(stage, '::after').content).not.toBe('none');
      expect(getComputedStyle(stage, '::after').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(stage.getBoundingClientRect().top).toBeCloseTo(header.getBoundingClientRect().bottom, 0);
      expect(header.closest('[inert]')).toBeNull();
      const background = stage.querySelector<HTMLButtonElement>('button')!; background.focus(); expect(document.activeElement).not.toBe(background);
      expect(root.querySelector('.workspace-bottom-sheet__header')).toBeNull();
      expect(root.querySelector('[aria-label="Find chart series"]')).toBeNull();
      expect(root.querySelector('[formControlName="source"]')).toBeNull();
      const controls = root.querySelector<HTMLElement>('.inventory-chart-sheet__controls')!;
      const metricGroup = controls.querySelector<HTMLElement>('[aria-label="Chart metric"]')!;
      const grouping = controls.querySelector<HTMLElement>('[aria-label="Meter chart grouping"]')!;
      const actions = controls.querySelector<HTMLElement>('[aria-label="Chart actions"]')!;
      const centers = [metricGroup, grouping, actions].map(element => { const bounds = element.getBoundingClientRect(); return bounds.top + bounds.height / 2; });
      expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
      expect(Math.abs(actions.getBoundingClientRect().right - controls.getBoundingClientRect().right)).toBeLessThanOrEqual(1);
      expect(parseFloat(getComputedStyle(actions).borderInlineStartWidth)).toBeGreaterThan(0);
      expect(tools.charts()[0].unit).toBe('MMBtu'); expect(tools.grouping()).toBe('groups');
      const renderer = fixture.debugElement.query(By.directive(MeterResultsChartComponent)).componentInstance as MeterResultsChartComponent;
      expect(renderer.rows()).toHaveLength(3);
      expect((renderer.chartOption().series as { smooth: boolean }[]).every(series => series.smooth === false)).toBe(true);
      await page.getByRole('button', { name: 'Facility totals', exact: true }).click(); await settle(fixture); expect(tools.grouping()).toBe('facilities');
      await page.getByRole('button', { name: 'Individual meters', exact: true }).click(); await settle(fixture); expect(new Set(tools.charts()[0].metrics.map(metric => metric.id))).toEqual(new Set(snapshot.meters.map(m => m.guid)));
      expect(root.querySelector('[aria-label="Chart metric"]')?.textContent).not.toContain('Water');
      await page.getByRole('button', { name: 'Cost', exact: true }).click(); await settle(fixture); expect(tools.view().metric).toBe('cost');
      await page.getByRole('button', { name: 'Energy', exact: true }).click(); await settle(fixture);
      const panel = root.querySelector<HTMLElement>('app-chart-trace-panel')!;
      expect(panel.querySelectorAll('.chart-traces__row')).toHaveLength(24);
      const sheetBody = root.querySelector<HTMLElement>('.workspace-bottom-sheet__body')!;
      const sidebar = root.querySelector<HTMLElement>('#chart-trace-browser')!;
      const contentBottom = sheetBody.getBoundingClientRect().bottom - parseFloat(getComputedStyle(sheetBody).paddingBottom);
      expect(Math.abs(sidebar.getBoundingClientRect().bottom - contentBottom)).toBeLessThanOrEqual(1);
      for (const icon of [panel.querySelector<HTMLElement>('.chart-traces__disclosure')!, panel.querySelector<HTMLElement>('[data-trace-close]')!]) {
        expect(getComputedStyle(icon).borderTopWidth).toBe('0px');
        expect(getComputedStyle(icon).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      }

      expect(root.querySelector('[aria-label="Next legend page"]')).toBeNull();
      expect(root.querySelector('.chart-traces__list')!.scrollHeight).toBeGreaterThan(root.querySelector('.chart-traces__list')!.clientHeight);
      const name = panel.querySelector<HTMLButtonElement>('[aria-label="Facility A / Meter A"]')!;
      await userEvent.dblClick(name); await settle(fixture);
      expect(tools.view().hiddenGuids).toHaveLength(23); expect(renderer.visibleMetrics().map(metric => metric.id)).toEqual(['ma']);
      await userEvent.dblClick(name); await settle(fixture); expect(tools.view().hiddenGuids).toEqual([]);
      name.focus(); await userEvent.keyboard('{Enter}'); await settle(fixture); expect(renderer.visibleMetrics().map(metric => metric.id)).toEqual(['ma']);
      await userEvent.keyboard('{Enter}'); await settle(fixture); expect(tools.view().hiddenGuids).toEqual([]);
      await userEvent.dblClick(panel.querySelector<HTMLButtonElement>('.chart-traces__group-name')!); await settle(fixture);
      expect(renderer.visibleMetrics()).toHaveLength(12);
      await page.getByRole('checkbox', { name: 'All traces', exact: true }).click(); await settle(fixture); expect(tools.view().hiddenGuids).toEqual([]);
      const row = name.closest<HTMLElement>('.chart-traces__row')!;
      row.dispatchEvent(new MouseEvent('mouseenter')); await settle(fixture);
      expect(renderer.highlightedMetricId).toBe('ma');
      expect((renderer.chartOption().series as { id: string; lineStyle: { opacity: number } }[]).find(series => series.id === 'mb')?.lineStyle.opacity).toBe(.2);
      row.dispatchEvent(new MouseEvent('mouseleave')); name.blur(); await settle(fixture);
      await page.getByRole('button', { name: 'Collapse Facility A', exact: true }).click(); await settle(fixture);
      expect(tools.view().hiddenGuids).toEqual([]); expect(scope()).toBeUndefined();
      await finishChartAnimation(root);
      await page.screenshot({ element: root, path: '../../../../../../.angular/meter-traces-grouped-wide.png' });
      await page.getByRole('button', { name: 'Hide traces', exact: true }).click(); await settle(fixture);
      expect(root.querySelector('app-chart-trace-panel')).toBeNull();
      await page.getByRole('button', { name: /^Traces / }).click(); await settle(fixture);
      expect(root.querySelector('#trace-facility-facility-a')?.hasAttribute('hidden')).toBe(true);
      await page.getByRole('button', { name: 'Cost', exact: true }).click(); await settle(fixture);
      route.matching.set(['ma']); await settle(fixture); expect(tools.charts()[0].metrics.map(metric => metric.id)).toEqual(['ma']);
      expect(tools.charts().map(chart => chart.id)).toEqual(['energy']);
      expect(root.querySelector('[aria-label="Chart metric"]')).toBeNull();
      expect(root.querySelector('.inventory-chart-sheet__coverage')?.textContent).toContain('Energy MMBtu');
      expect(getComputedStyle(grouping).borderInlineStartWidth).toBe('0px');
      route.matching.set(undefined); await settle(fixture);
      expect(root.querySelector('[aria-label="Chart metric"]')?.querySelectorAll('button')).toHaveLength(2);
      await page.getByRole('button', { name: 'Choose facility. All facilities', exact: true }).click(); await settle(fixture);
      await page.getByRole('dialog', { name: 'Choose facility', exact: true }).getByRole('button', { name: 'Other plant', exact: true }).click(); await settle(fixture);
      expect(tools.chartsOpen()).toBe(true); expect(tools.charts()[0].unit).toBe('GJ'); expect(tools.charts()[0].metrics).toHaveLength(1); expect(stage.inert).toBe(true);
      await page.getByRole('button', { name: 'Individual meters', exact: true }).click(); await settle(fixture);
      expect(tools.charts()[0].metrics).toHaveLength(12);
      for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) {
        root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`; await settle(fixture);
        expect(textContrast(page.getByRole('button', { name: 'Meter groups', exact: true }).element() as HTMLElement)).toBeGreaterThanOrEqual(4.5);
        expect(textContrast(root.querySelector<HTMLElement>('.chart-traces__name')!, root.querySelector<HTMLElement>('app-chart-trace-panel')!)).toBeGreaterThanOrEqual(4.5);
        expect(textContrast(root.querySelector<HTMLElement>('.chart-traces__count')!, root.querySelector<HTMLElement>('app-chart-trace-panel')!)).toBeGreaterThanOrEqual(4.5);
      }
      root.className = 'v1-root';
      await page.screenshot({ element: root, path: '../../../../../../.angular/meter-charts-toolbar-wide.png' });
      await page.viewport(390, 800); await settle(fixture);
      const body = root.querySelector<HTMLElement>('.workspace-bottom-sheet__body')!;
      await vi.waitFor(() => expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1));
      expect(stage.getBoundingClientRect().top).toBeCloseTo(header.getBoundingClientRect().bottom, 0);
      const traceToggle = page.getByRole('button', { name: /^Traces / });
      await traceToggle.click(); await settle(fixture);
      const drawer = root.querySelector<HTMLElement>('[role="dialog"][aria-label="Choose traces"]')!;
      expect(drawer).not.toBeNull(); expect(drawer.contains(document.activeElement)).toBe(true);
      expect(drawer.querySelectorAll('.chart-traces__group-name')).toHaveLength(0);
      expect(drawer.querySelector('.chart-traces__facility')?.textContent).toContain('Other plant');
      await finishChartAnimation(root);
      await page.screenshot({ element: root, path: '../../../../../../.angular/meter-traces-drawer-narrow.png' });
      await userEvent.keyboard('{Escape}'); await settle(fixture);
      expect(root.querySelector('[aria-label="Choose traces"]')).toBeNull();
      expect(tools.chartsOpen()).toBe(true); expect(document.activeElement).toBe(traceToggle.element());
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print', features: [] }); await settle(fixture);
      expect(getComputedStyle(stage, '::after').display).toBe('none');
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await settle(fixture);
      await page.getByRole('button', { name: 'Close charts', exact: true }).click(); await settle(fixture);
      expect(stage.inert).toBe(false); expect(tools.chartsOpen()).toBe(false);
      expect(document.activeElement).toBe(opener.element());
    } finally {
      fixture.destroy();
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    }
  });
  it('uses grouped predictor traces with an explicit mixed-unit mode, scope memory and an accessible narrow drawer', async () => {
    await page.viewport(1300, 950); scope.set(undefined);
    const store = new AccountWorkspaceStore(), original = reportSnapshot();
    const facilities = [original.facilities[0], { ...original.facilities[0], guid: 'facility-b', name: 'Other plant' }];
    const predictors = Array.from({ length: 24 }, (_, index) => ({ ...getNewIdbPredictor(original.account.guid, facilities[index < 12 ? 0 : 1].guid),
      guid: `p${index}`, name: `Production ${String(index % 12).padStart(2, '0')}`, unit: index % 2 ? '°F' : 'tons' }));
    store.publish({ ...original, facilities, predictors, predictorData: predictors.flatMap(p => [
      inventoryReading(p.guid, { accountId: original.account.guid, facilityId: p.facilityId, guid: `${p.guid}-a`, amount: 0 }),
      inventoryReading(p.guid, { accountId: original.account.guid, facilityId: p.facilityId, guid: `${p.guid}-b`, month: 3, amount: 7 })]) });
    TestBed.configureTestingModule({ imports: [ToolsHost], providers: [provideRouter([]), ModalPortalService,
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { inventoryFacilityGuid: scope } }] });
    const fixture = TestBed.createComponent(ToolsHost); fixture.componentInstance.resource.set('predictors');
    try {
      await settle(fixture);
      await page.getByRole('button', { name: 'Charts', exact: true }).click(); await settle(fixture);
      const root = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
      const tools = fixture.debugElement.query(By.directive(InventoryToolsComponent)).componentInstance as InventoryToolsComponent;
      const renderer = fixture.debugElement.query(By.directive(MeterResultsChartComponent)).componentInstance as MeterResultsChartComponent;
      expect(TestBed.inject(ModalPortalService).workspaceBlocked()).toBe(true);
      expect(root.querySelector('.workspace-bottom-sheet__header')).toBeNull();
      expect(root.querySelector('[role="tablist"]')).toBeNull(); expect(root.querySelector('input[type="search"]')).toBeNull();
      expect(root.querySelector('[formControlName="source"]')).toBeNull();
      expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(24);
      expect(renderer.visibleMetrics()).toHaveLength(1);
      const target = tools.predictorCharts().find(chart => chart.id === 'p1')!;
      expect(target.title).toBe(`${facilities[0].name} / Production 01`);
      await page.getByRole('radio', { name: `Show ${target.title}`, exact: true }).click(); await settle(fixture);
      expect(tools.view().metric).toBe('p1'); expect(renderer.visibleMetrics()[0].unit).toBe('°F');
      expect(root.querySelector('.inventory-chart-sheet__coverage')?.textContent).toContain(`${facilities[0].name} / Production 01 °F`);
      expect(renderer.rows().map(row => row.values['p1'])).toEqual([0, null, 7]);
      const multiple = page.getByRole('switch', { name: 'Multiple predictors', exact: true });
      await multiple.click(); await settle(fixture);
      expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(0); expect(renderer.visibleMetrics()).toHaveLength(24);
      expect(root.textContent).toContain('Units ignored'); expect(root.textContent).toContain('no conversion or normalization');
      expect(renderer.visibleMetrics().every(trace => trace.unit === undefined)).toBe(true);
      expect(renderer.visibleMetrics().find(trace => trace.id === 'p1')?.label).toContain('(°F)');
      expect(tools.charts()[0].rows.map(row => row.values['p1'])).toEqual([0, null, 7]);
      const name = page.getByRole('button', { name: `${target.title} (°F)`, exact: true });
      await name.dblClick(); await settle(fixture); expect(renderer.visibleMetrics().map(trace => trace.id)).toEqual(['p1']);
      await name.dblClick(); await settle(fixture); expect(renderer.visibleMetrics()).toHaveLength(24);
      await page.getByRole('checkbox', { name: 'All traces', exact: true }).click(); await settle(fixture);
      expect(renderer.visibleMetrics()).toHaveLength(0); expect(root.textContent).toContain('No traces visible');
      expect(page.getByRole('button', { name: 'Download chart', exact: true }).element().hasAttribute('disabled')).toBe(true);
      await multiple.click(); await settle(fixture); expect(tools.view().metric).toBe('p1'); expect(renderer.visibleMetrics()).toHaveLength(1);
      await multiple.click(); await settle(fixture); expect(renderer.visibleMetrics()).toHaveLength(0);
      await page.getByRole('checkbox', { name: 'All traces', exact: true }).click(); await settle(fixture);
      for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) {
        root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`; await settle(fixture);
        expect(textContrast(root.querySelector<HTMLElement>('.inventory-tools__multiple')!, root)).toBeGreaterThanOrEqual(4.5);
      }
      root.className = 'v1-root'; await finishChartAnimation(root);
      await page.screenshot({ element: root, path: '../../../../../../.angular/predictor-traces-wide.png' });
      scope.set('facility-b'); await settle(fixture); expect(tools.multiplePredictors()).toBe(false);
      expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(12); expect(tools.chartsOpen()).toBe(true);
      scope.set(undefined); await settle(fixture); expect(tools.multiplePredictors()).toBe(true);
      expect(tools.charts()[0].metrics).toHaveLength(24);
      await page.viewport(390, 844); await settle(fixture);
      const toggle = page.getByRole('button', { name: /^Traces / }); await toggle.click(); await settle(fixture);
      const drawer = root.querySelector<HTMLElement>('[role="dialog"][aria-label="Choose traces"]')!;
      expect(drawer.contains(document.activeElement)).toBe(true);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      await finishChartAnimation(root); await page.screenshot({ element: root, path: '../../../../../../.angular/predictor-traces-narrow.png' });
      await userEvent.keyboard('{Escape}'); await settle(fixture); expect(document.activeElement).toBe(toggle.element());
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print', features: [] }); await settle(fixture);
      expect(getComputedStyle(root.querySelector('.workspace-bottom-sheet-layer')!).display).toBe('none');
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await settle(fixture);
      await page.getByRole('button', { name: 'Close charts', exact: true }).click(); await settle(fixture);
      expect(TestBed.inject(ModalPortalService).workspaceBlocked()).toBe(false);
    } finally {
      fixture.destroy();
      await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    }
  });
  it('keeps independent Predictor lines connected across another predictor’s duplicate while retaining real gaps', async () => {
    await page.viewport(1100, 900); scope.set(undefined);
    const store = new AccountWorkspaceStore(), original = reportSnapshot(), facility = original.facilities[0];
    const predictors = ['duplicate', 'independent'].map(guid => ({ ...getNewIdbPredictor(original.account.guid, facility.guid), guid, name: guid, unit: 'tons' }));
    const reading = (predictorId: string, guid: string, month: number, amount: number) => inventoryReading(predictorId,
      { guid, month, amount, accountId: original.account.guid, facilityId: facility.guid });
    store.publish({ ...original, predictors, predictorData: [reading('duplicate', 'a', 1, 1), reading('duplicate', 'b', 1, 2), reading('duplicate', 'c', 2, 3),
      reading('independent', 'd', 1, 10), reading('independent', 'e', 2, 20), reading('independent', 'f', 4, 30)] });
    TestBed.configureTestingModule({ imports: [ToolsHost], providers: [provideRouter([]), ModalPortalService,
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { inventoryFacilityGuid: scope } }] });
    const fixture = TestBed.createComponent(ToolsHost); fixture.componentInstance.resource.set('predictors');
    try {
      await settle(fixture); await page.getByRole('button', { name: 'Charts', exact: true }).click(); await settle(fixture);
      await page.getByRole('switch', { name: 'Multiple predictors', exact: true }).click(); await settle(fixture);
      const root = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
      const renderer = fixture.debugElement.query(By.directive(MeterResultsChartComponent)).componentInstance as MeterResultsChartComponent;
      await finishChartAnimation(root);
      const instance = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!)!;
      const series = (instance.getOption() as any).series;
      expect(series.find((item: any) => item.id === 'independent').data).toEqual([[0, 10], [2, 20], [3, null], [4, 30]]);
      expect(series.find((item: any) => item.id === 'independent').connectNulls).toBe(false);
      expect(series.find((item: any) => item.id === 'duplicate').data).toEqual([[0, 1], [1, 2], [2, 3]]);
      const tooltip = (renderer.chartOption() as any).tooltip.formatter;
      expect(tooltip([{ seriesId: 'independent', seriesName: `${facility.name} / independent (tons)`, value: [2, 20], axisValueLabel: 'Feb 2025' }])).toContain('independent (tons): 20');
      const columns = renderer.accessibleColumns();
      const savedGap = renderer.accessibleRows().find(row => row.periodLabel === 'Mar 2025');
      expect(columns.some(column => column.id === 'independent')).toBe(true);
      expect(savedGap?.cells.find(cell => cell.metricId === 'independent')?.valueLabel).toBe('Unavailable');
    } finally { fixture.destroy(); }
  });

});
