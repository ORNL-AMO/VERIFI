import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
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
import { reportAnalysisToken } from '../account-report-workbench/account-report-workbench.models';

const dashboardUrl = '/v1/workspace/account/account-a/reports/dashboard';
@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: '<main class="v1-root" style="height:600px;min-height:0;overflow:auto;width:100%"><div style="position:relative;isolation:isolate"><router-outlet/></div><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class ReportsBrowserHost { readonly modal = inject(ModalPortalService); }
function setup(count = 30) {
  const store = new AccountWorkspaceStore();
  const report = { ...getNewIdbAccountReport(reportAccount, [reportFacility], []), guid: 'account-report', id: 4, name: 'Saved account report', reportType: 'analysis' as const, reportYear: 2024 };
  store.publish({ ...reportSnapshot(Array.from({ length: count }, (_, i) => reportFixture({ guid: `report-${i}`, id: i + 10, name: `Report ${String(i).padStart(2, '0')}` }))), accountReports: [report] }, { facility: reportFacility });
  const accountActions = { updateName: vi.fn(async () => report), create: vi.fn(), copy: vi.fn(), delete: vi.fn(),
    updateSetup: vi.fn(async (guid: string, changes: AccountReportSetupChanges) => {
      const latest = store.accountReports().find(item => item.guid === guid)!;
      const key = accountReportAnalysisSetupKey(latest.reportType);
      const updated = { ...latest, ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(key && changes.analysis !== undefined ? { [key]: { ...latest[key], analysisItemId: changes.analysis?.analysisGuid } } : {}) };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [updated] }] }); return updated;
    }) };
  const status = signal<'ready' | 'evaluating'>('ready');
  TestBed.configureTestingModule({ imports: [ReportsBrowserHost, AccountReportsModule, FacilityReportsModule], providers: [provideRouter([
    { path: 'v1/workspace/account/:accountGuid/reports', children: ACCOUNT_REPORT_ROUTES },
    { path: 'v1/workspace/facility/:facilityGuid/reports', children: FACILITY_REPORT_ROUTES }
  ]), { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountWorkspaceService, useValue: {} },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [reportAccount] } },
    { provide: WorkspaceStatusService, useValue: { state: status, items: signal([]) } },
    { provide: AccountReportActionsService, useValue: accountActions }, { provide: FacilityReportActionsService, useValue: {} },
    { provide: WorkbenchLayoutService, useFactory: () => { const factsExpanded = signal(true); return { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) }; } },
    { provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }
  ] });
  const fixture = TestBed.createComponent(ReportsBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const dashboard = () => fixture.debugElement.query(By.directive(ReportsDashboardComponent)).componentInstance as ReportsDashboardComponent;
  return { fixture, router, store, status, accountActions, dashboard, root: fixture.nativeElement.querySelector('main') as HTMLElement };
}
async function settle(fixture: ReturnType<typeof setup>['fixture']): Promise<void> {
  fixture.detectChanges(); await fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  fixture.detectChanges();
}
describe('report inventory browser journeys and presentation', () => {
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
    const choice = reportAnalysisToken({ scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' });
    expect(view.root.querySelector<HTMLSelectElement>('#account-report-analysis')!.value).toBe(choice);
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
    expect(document.activeElement?.id).toBe('account-report-analysis');
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
