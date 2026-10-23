import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { PortalModule } from '@angular/cdk/portal';
import { Component, Provider, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationStart, Router, RouterOutlet, provideRouter } from '@angular/router';
import { BehaviorSubject, filter, firstValueFrom, take } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ReportsDashboardComponent } from '@app/v1/shared/reports/reports-dashboard/reports-dashboard.component';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/account/data/portfolio/portfolio-browser-test.helpers';
import { FacilityReportsModule } from '@app/v1/facility/reports/facility-reports.module';
import { FACILITY_REPORT_ROUTES } from '@app/v1/facility/reports/facility-reports.routes';
import { FacilityReportActionsService } from '@app/v1/facility/reports/facility-report-actions.service';
import { reportAccount, reportFacility, reportFixture, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { AccountReportsModule } from '../account-reports.module';
import { ACCOUNT_REPORT_ROUTES } from '../account-reports.routes';
import { AccountReportActionsService } from '../account-report-actions.service';
import { AccountReportSetupChanges, accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { accountReportSnapshot } from '../testing/account-report-test-fixtures';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { singleFacilityAnalysisPairGuard } from '@app/v1/facility/analysis/single-facility-analysis-pair.guard';
import { SingleFacilityAnalysisPairService } from '@app/v1/facility/analysis/single-facility-analysis-pair.service';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';

const dashboardUrl = '/v1/workspace/account/account-a/reports/dashboard';
@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: '<main class="v1-root" style="height:600px;min-height:0;overflow:auto;width:100%"><div style="position:relative;isolation:isolate"><router-outlet/></div><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ReportsBrowserHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: '<h1>Analysis Setup</h1>' })
class StatusAnalysisTarget { }
function setup(count = 30, realStatus = false, existingStore?: AccountWorkspaceStore, providers: Provider[] = []) {
  const store = existingStore ?? new AccountWorkspaceStore();
  const report = { ...getNewIdbAccountReport(reportAccount, [reportFacility], []), guid: 'account-report', id: 4, name: 'Saved account report', reportType: 'analysis' as const, reportYear: 2024 };
  if (!existingStore) store.publish({ ...reportSnapshot(Array.from({ length: count }, (_, i) => reportFixture({ guid: `report-${i}`, id: i + 10, name: `Report ${String(i).padStart(2, '0')}` }))), accountReports: [report] }, { facility: reportFacility });
  const accountActions = { updateName: vi.fn(async () => report), create: vi.fn(), copy: vi.fn(), delete: vi.fn(),
    updateSetup: vi.fn(async (guid: string, changes: AccountReportSetupChanges) => {
      const latest = store.accountReports().find(item => item.guid === guid)!;
      const key = accountReportAnalysisSetupKey(latest.reportType);
      const updated = { ...latest, ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(key && changes.analysis !== undefined ? { [key]: { ...latest[key], analysisItemId: changes.analysis?.analysisGuid } } : {}) };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [updated] }] }); return updated;
    }) };
  const status = signal<'ready' | 'evaluating'>('ready');
  const coverage = new BehaviorSubject<WorkspaceCalendarizationBaseResult>({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'reports-status', meters: [] });
  TestBed.configureTestingModule({ imports: [ReportsBrowserHost, AccountReportsModule, FacilityReportsModule], providers: [provideRouter([
    { path: 'v1/workspace/account/:accountGuid/reports', children: ACCOUNT_REPORT_ROUTES },
    { path: 'v1/workspace/facility/:facilityGuid/reports', children: FACILITY_REPORT_ROUTES },
    { path: 'v1/workspace/facility/:facilityGuid/analysis', canActivateChild: [singleFacilityAnalysisPairGuard], children: [
      { path: 'workbench/:analysisGuid/setup', component: StatusAnalysisTarget }
    ] }
  ]), { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountWorkspaceService, useValue: {} },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [reportAccount] } },
    ...(realStatus ? [WorkspaceStatusService,
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => coverage.asObservable(), currentInputFingerprint: () => 'reports-status' } },
      { provide: AccountCommandHandler, useValue: {} }, { provide: WorkspaceCommandBoundary, useValue: {} }]
      : [{ provide: WorkspaceStatusService, useValue: { state: status, items: signal([]) } }]),
    { provide: AccountReportActionsService, useValue: accountActions }, { provide: FacilityReportActionsService, useValue: {} },
    { provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs: vi.fn(async () => true) } },
    { provide: WorkbenchLayoutService, useFactory: () => { const factsExpanded = signal(true); return { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) }; } },
    { provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }, ...providers
  ] });
  const fixture = TestBed.createComponent(ReportsBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const dashboard = () => fixture.debugElement.query(By.directive(ReportsDashboardComponent)).componentInstance as ReportsDashboardComponent;
  return { fixture, router, store, status, coverage, accountActions, dashboard, root: fixture.nativeElement.querySelector('main') as HTMLElement };
}
async function settle(fixture: ReturnType<typeof setup>['fixture']): Promise<void> {
  fixture.detectChanges(); await fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  fixture.detectChanges();
}
describe('report inventory browser journeys and presentation', () => {
  let database: IndexedDbTestHarness | undefined;
  afterEach(async () => { await database?.destroy(); database = undefined; });
  it('opens a linked single-facility analysis through its saved pair and keeps browser Forward read-only', async () => {
    const view = setup(1, true), snapshot = accountReportSnapshot(true); snapshot.accountAnalyses[0].name = 'Stale pair metadata'; view.store.publish(snapshot);
    await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/account-report/setup'); await settle(view.fixture);
    const before = structuredClone(view.store.snapshot());
    const status = TestBed.inject(WorkspaceStatusService);
    const item = presentFinding(makeFinding('report.analysis.warning', 'warning', 'quality', {
      kind: 'account-report', guid: 'account-report', name: 'Saved account report', accountGuid: 'account-a'
    }));
    const url = '/v1/workspace/facility/facility-a/analysis/workbench/facility-analysis/setup';
    status.navigateTo(item); await vi.waitFor(() => expect(view.router.url).toBe(url)); await settle(view.fixture);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toContain('/reports/workbench/account-report/setup')); await settle(view.fixture);
    TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toBe(url)); await settle(view.fixture);
    expect(TestBed.inject(SingleFacilityAnalysisPairService).ensurePairs).not.toHaveBeenCalled();
    expect(view.store.snapshot()).toEqual(before); expect(view.accountActions.updateSetup).not.toHaveBeenCalled(); view.fixture.destroy();
  });
  it.each(['account', 'facility'] as const)('opens a %s finding from saved data and restores browse state without navigation writes', async scope => {
    await page.viewport(1200, 900);
    const snapshot = accountReportSnapshot(true);
    snapshot.accountReports = Array.from({ length: 30 }, (_, index) => ({ ...snapshot.accountReports[0], id: 500 + index, guid: `account-report-${index}`, name: '', reportYear: undefined }));
    snapshot.facilityReports = Array.from({ length: 30 }, (_, index) => reportFixture({ id: 100 + index, guid: `facility-report-${index}`, name: '' }));
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    database = await IndexedDbTestHarness.create('report-status-navigation');
    await database.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      accountReports: snapshot.accountReports.map(item => ({ ...item })), facilityReports: snapshot.facilityReports.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses.map(item => ({ ...item })) });
    const access = new IndexedDbAccessService(database.dbService);
    const transaction = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: database.databaseName } });
    const handler = new ReportCommandHandler(new FacilityReportsDbService(database.dbService, access), new AccountReportDbService(database.dbService, access), store, transaction);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const writing = vi.spyOn(transaction, 'runTransaction');
    // The database harness instantiates its own TestBed before the routed UI is configured.
    TestBed.resetTestingModule();
    const view = setup(0, true, store, [
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler },
      { provide: AccountReportActionsService, useClass: AccountReportActionsService }, { provide: FacilityReportActionsService, useClass: FacilityReportActionsService }
    ]);
    const accountNames = vi.spyOn(TestBed.inject(AccountReportActionsService), 'updateName');
    const accountSetup = vi.spyOn(TestBed.inject(AccountReportActionsService), 'updateSetup');
    const facilityNames = vi.spyOn(TestBed.inject(FacilityReportActionsService), 'updateName');
    await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.dashboard().filtersForm.patchValue({ scope, status: 'error', sort: 'name' }); await settle(view.fixture);
    view.dashboard().inventory.selectPage(1); await settle(view.fixture);
    const entry = view.dashboard().inventory.visibleTiles()[0];
    view.dashboard().inventory.setTileDetail({ guid: entry.guid, level: 'detailed' }); await settle(view.fixture);
    const action = [...view.root.querySelectorAll<HTMLAnchorElement>('.portfolio-inventory app-report-snapshot a')].find(link => link.textContent === 'Review name')!;
    expect(action.textContent).toContain('Review name'); action.focus(); view.root.scrollTop = 160;
    let scroll = 0;
    view.router.events.pipe(filter(event => event instanceof NavigationStart), take(1)).subscribe(() => { scroll = view.root.scrollTop; });
    await userEvent.keyboard('{Enter}'); await settle(view.fixture);
    expect(scroll).toBeGreaterThan(0);
    expect(view.router.url).toContain(scope === 'account' ? '/account/account-a/reports/workbench/' : '/facility/facility-a/reports/workbench/');
    expect(view.root.textContent).toContain('Other report settings are pending migration.');
    expect(view.root.textContent).toContain('Report-specific settings');
    view.coverage.next({ state: 'evaluating', meters: [] });
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(dashboardUrl)); await settle(view.fixture);
    expect(view.dashboard().browseReady()).toBe(false);
    view.coverage.next({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'reports-status', meters: [] }); await settle(view.fixture);
    expect(view.dashboard().filtersForm.controls.scope.value).toBe(scope); expect(view.dashboard().inventory.page()).toBe(1);
    expect(view.dashboard().inventory.overrides()[entry.guid]).toBe('detailed');
    await vi.waitFor(() => { expect((document.activeElement as HTMLElement)?.dataset['browseId']).toBe(entry.guid); expect(view.root.scrollTop).toBeCloseTo(scroll, 0); });
    expect(accountNames).not.toHaveBeenCalled(); expect(accountSetup).not.toHaveBeenCalled(); expect(facilityNames).not.toHaveBeenCalled(); expect(writing).not.toHaveBeenCalled();
    expect(store.selectedFacility()?.guid).toBe('facility-a');
    for (const dark of [false, true]) {
      view.root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`; await settle(view.fixture);
      const link = view.root.querySelector<HTMLElement>('.portfolio-inventory app-report-snapshot a')!;
      expect(textContrast(link, link.closest<HTMLElement>('.portfolio-tile')!)).toBeGreaterThanOrEqual(4.5);
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 800); await settle(view.fixture);
        const edge = view.root.getBoundingClientRect().right;
        const overflow = [...view.root.querySelectorAll<HTMLElement>('*')].filter(element => element.getBoundingClientRect().right > edge + 1)
          .map(element => `${element.tagName}.${element.className}: ${element.getBoundingClientRect().right}`).slice(0, 16);
        expect(view.root.scrollWidth, overflow.join('\n')).toBeLessThanOrEqual(view.root.clientWidth + 1);
      }
    }
    view.fixture.destroy();
    await database.reopen();
    expect(await database.getAll('accountReports')).toEqual(snapshot.accountReports);
    expect(await database.getAll('facilityReports')).toEqual(snapshot.facilityReports);
    expect(await database.getAll('accountAnalysisItems')).toEqual(snapshot.accountAnalyses);
  });
  it('protects status navigation during invalid, pending and failed account-report saves', async () => {
    const view = setup(1, true); const saved = view.store.snapshot()!;
    view.store.publish({ ...saved, accountReports: [...saved.accountReports, { ...saved.accountReports[0], guid: 'second-report', id: 50, name: 'Second report' }] });
    await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/account-report/setup'); await settle(view.fixture);
    const status = TestBed.inject(WorkspaceStatusService);
    const destination = status.items().find(item => item.entity.guid === 'second-report' && item.code === 'report.analysis.invalid')!;
    await page.getByRole('textbox', { name: /^Name/ }).fill(' '); await settle(view.fixture);
    let completed = firstValueFrom(view.router.events.pipe(filter(event => event instanceof NavigationCancel)));
    status.navigateTo(destination); await completed; expect(view.router.url).toContain('/account-report/setup');
    await page.getByRole('textbox', { name: /^Name/ }).fill('Saved after waiting');
    let release!: () => void;
    const persist = view.accountActions.updateSetup.getMockImplementation()!;
    view.accountActions.updateSetup.mockImplementationOnce((guid, changes) => new Promise(resolve => { release = async () => resolve(await persist(guid, changes)); }));
    const ended = firstValueFrom(view.router.events.pipe(filter(event => event instanceof NavigationEnd)));
    status.navigateTo(destination); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(view.router.url).toContain('/account-report/setup'); release(); await ended; await settle(view.fixture);
    expect(view.router.url).toContain('/second-report/setup'); expect(view.store.accountReports()[0].name).toBe('Saved after waiting');
    await page.getByRole('textbox', { name: /^Name/ }).fill('Failed draft');
    view.accountActions.updateSetup.mockRejectedValueOnce(new Error('Save failed'));
    const first = status.items().find(item => item.entity.guid === 'account-report' && item.code === 'report.analysis.invalid')!;
    completed = firstValueFrom(view.router.events.pipe(filter(event => event instanceof NavigationCancel)));
    status.navigateTo(first); await completed; await settle(view.fixture);
    expect(view.router.url).toContain('/second-report/setup'); expect(view.root.querySelector<HTMLInputElement>('#account-report-name')!.value).toBe('Failed draft');
    expect(view.root.textContent).toContain('Save failed'); view.fixture.destroy();
  });
  it.each(['account', 'facility'] as const)('restores filters, page, detail, scroll and focus after a %s report drill-in and delayed browser Back', async scope => {
    await page.viewport(1200, 900);
    const view = setup();
    if (scope === 'account') { const saved = view.store.snapshot()!; view.store.publish({ ...saved, accountReports: Array.from({ length: 30 }, (_, index) => ({ ...saved.accountReports[0], guid: `account-report-${index}`, name: `Account report ${String(index).padStart(2, '0')}` })) }); }
    await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    view.dashboard().filtersForm.patchValue({ scope, status: 'ready' }); await settle(view.fixture);
    view.dashboard().inventory.selectPage(1); await settle(view.fixture);
    const entry = view.dashboard().inventory.visibleTiles()[0];
    view.dashboard().inventory.setTileDetail({ guid: entry.guid, level: 'detailed' }); await settle(view.fixture);
    const target = view.root.querySelector<HTMLAnchorElement>('.portfolio-inventory .portfolio-tile__name')!;
    target.focus(); view.root.scrollTop = 160; const scroll = view.root.scrollTop;
    target.click(); await settle(view.fixture); expect(view.router.url).toContain(scope === 'facility' ? '/facility/facility-a/reports/workbench/' : '/account/account-a/reports/workbench/');
    view.status.set('evaluating');
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(dashboardUrl)); await settle(view.fixture);
    expect(view.dashboard().filtersForm.controls.status.value).toBe('ready');
    expect(view.dashboard().filteredEntries()).toHaveLength(0);
    expect(view.dashboard().inventory.page()).toBe(1);
    expect(view.dashboard().browseReady()).toBe(false);
    view.status.set('ready'); await settle(view.fixture);
    expect(view.dashboard().filtersForm.controls.scope.value).toBe(scope); expect(view.dashboard().inventory.page()).toBe(1);
    expect(view.dashboard().inventory.overrides()[entry.guid]).toBe('detailed');
    await vi.waitFor(() => {
      expect((document.activeElement as HTMLElement)?.dataset['browseId']).toBe(entry.guid);
      expect(view.root.scrollTop).toBeCloseTo(scroll, 0);
    });
    view.fixture.destroy();
  });
  it('blocks invalid account-report changes across same-component links and browser history until discarded', async () => {
    const view = setup(1); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/account-report/setup'); await settle(view.fixture);
    await page.getByRole('textbox', { name: /^Name/ }).fill(' '); await settle(view.fixture);
    expect(await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/missing/setup')).toBe(false);
    TestBed.inject(Location).back(); await settle(view.fixture); expect(view.router.url).toContain('/account-report/setup');
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click(); await settle(view.fixture);
    expect(view.root.querySelector('[role="dialog"]')).not.toBeNull();
    await page.getByRole('button', { name: 'Discard edits', exact: true }).click(); await settle(view.fixture);
    await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    expect(view.accountActions.updateSetup).not.toHaveBeenCalled(); view.fixture.destroy();
  });
  it('edits common setup, keeps account reports accessible for single facilities, and fits practical themed windows', async () => {
    await page.viewport(1200, 900);
    const view = setup(1), snapshot = accountReportSnapshot(true); view.store.publish(snapshot);
    await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/account-report/setup'); await settle(view.fixture);
    expect(view.root.querySelector('#account-report-analysis input:checked')?.closest('label')?.textContent).toContain('Energy analysis');
    await page.getByRole('textbox', { name: /^Name/ }).fill('A long account report name that remains readable in a narrow window');
    await page.getByRole('link', { name: 'Continue', exact: true }).click(); await settle(view.fixture);
    expect(view.accountActions.updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'A long account report name that remains readable in a narrow window' });
    expect(view.root.textContent).toContain('Report content pending');
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) {
      view.root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`;
      await settle(view.fixture);
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 800); await settle(view.fixture);
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      }
    }
    await page.getByRole('link', { name: 'Back', exact: true }).click(); await settle(view.fixture);
    const name = view.root.querySelector<HTMLInputElement>('#account-report-name')!; name.focus(); await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.id).toBe('account-report-analysis-baseline');
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(view.root.querySelector('#account-report-analysis input:checked'));
    view.fixture.destroy();
  });
  it('filters report analysis cards by type and baseline year without saving or replacing a hidden selection', async () => {
    await page.viewport(1200, 900);
    const view = setup(1), snapshot = accountReportSnapshot();
    snapshot.accountAnalyses.push({ ...snapshot.accountAnalyses[0], id: 31, guid: 'water-analysis', name: 'Water analysis', analysisCategory: 'water', baselineYear: 2020 });
    view.store.publish(snapshot);
    await view.router.navigateByUrl('/v1/workspace/account/account-a/reports/workbench/account-report/setup'); await settle(view.fixture);
    await page.getByRole('button', { name: 'Hide facts', exact: true }).click(); await settle(view.fixture);
    const names = () => [...view.root.querySelectorAll('.report-analysis-card:not(.report-analysis-card--empty) strong')].map(item => item.textContent);
    await page.getByRole('combobox', { name: 'Type', exact: true }).selectOptions('water'); await settle(view.fixture);
    expect(names()).toEqual(['Water analysis']);
    const baseline = view.root.querySelector<HTMLSelectElement>('#account-report-analysis-baseline')!;
    await page.getByRole('combobox', { name: 'Baseline year', exact: true }).selectOptions([...baseline.options].find(option => option.textContent?.trim() === '2018')!.value);
    await settle(view.fixture);
    expect(names()).toEqual([]);
    expect(view.root.textContent).toContain('No analyses match these filters');
    expect(view.root.textContent).toContain('Selected analysis: Energy analysis');
    for (const dark of [false, true]) {
      view.root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''}`;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 800); await settle(view.fixture);
        expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      }
    }
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click(); await settle(view.fixture);
    expect(names()).toEqual(['Energy analysis', 'Water analysis']);
    expect(view.root.querySelector('#account-report-analysis input:checked')?.closest('label')?.textContent).toContain('Energy analysis');
    expect(view.store.accountReports()[0].analysisReportSetup.analysisItemId).toBe('account-analysis');
    expect(view.accountActions.updateSetup).not.toHaveBeenCalled();
    view.fixture.destroy();
  });
  it('matches Analysis insets and action placement, with flush scope headers and responsive themed cards', async () => {
    await page.viewport(1200, 900);
    const view = setup(1); await view.router.navigateByUrl(dashboardUrl); await settle(view.fixture);
    const host = view.root.querySelector<HTMLElement>('app-reports-dashboard')!;
    const inset = parseFloat(getComputedStyle(host).paddingLeft); expect(inset).toBeGreaterThanOrEqual(16);
    const header = view.root.querySelector<HTMLElement>('.v1-inventory-page-header')!;
    const add = header.querySelector<HTMLButtonElement>('button')!;
    expect(add.getBoundingClientRect().width).toBeLessThan(header.getBoundingClientRect().width / 2);
    expect(add.getBoundingClientRect().left).toBeGreaterThan(header.querySelector('h1')!.getBoundingClientRect().right);
    for (const level of ['simple', 'summary', 'detailed'] as const) {
      view.dashboard().inventory.detailControl.setValue(level); await settle(view.fixture);
      for (const tile of view.root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile')) {
        const bounds = tile.getBoundingClientRect(), scope = tile.querySelector<HTMLElement>('app-inventory-card-header')!.getBoundingClientRect();
        expect(scope.top).toBeCloseTo(bounds.top + parseFloat(getComputedStyle(tile).borderTopWidth), 0);
        expect(scope.left).toBeCloseTo(bounds.left + parseFloat(getComputedStyle(tile).borderLeftWidth), 0);
        expect(scope.right).toBeCloseTo(bounds.right - parseFloat(getComputedStyle(tile).borderRightWidth), 0);
        expect(tile.textContent).toContain('Report content pending');
        if (tile.dataset['reportScope'] === 'facility') {
          expect(!!tile.querySelector('app-inventory-card-header .portfolio-tile__owner')).toBe(level !== 'simple');
          expect(!!tile.querySelector('.portfolio-tile__ownership .portfolio-tile__owner')).toBe(level === 'simple');
        }
      }
    }
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      view.root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      await settle(view.fixture);
      for (const label of view.root.querySelectorAll<HTMLElement>('.portfolio-inventory app-inventory-card-header')) expect(textContrast(label)).toBeGreaterThanOrEqual(4.5);
    }
    for (const width of [1024, 640, 390]) {
      await page.viewport(width, 800); await settle(view.fixture);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      expect(add.getBoundingClientRect().right).toBeLessThanOrEqual(header.getBoundingClientRect().right);
    }
    const menu = view.root.querySelector<HTMLButtonElement>('.portfolio-tile__menu-button')!; menu.focus(); await userEvent.keyboard('{Enter}'); await settle(view.fixture);
    expect(document.querySelector('[role="menu"]')).not.toBeNull(); await userEvent.keyboard('{Escape}'); await settle(view.fixture);
    expect(document.activeElement).toBe(menu); view.fixture.destroy();
  });
});
