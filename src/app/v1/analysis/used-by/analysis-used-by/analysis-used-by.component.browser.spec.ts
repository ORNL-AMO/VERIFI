import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisUsageCommands } from '@data/account-workspace/analysis-usage-commands.service';
import { AnalysisUsageCommandHandler } from '@data/account-workspace/handlers/analysis-usage-command-handler.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { analysisUsageFixture } from '@data/account-workspace/testing/analysis-usage-fixtures';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { FacilityAnalysisWorkbenchFooterComponent } from '../../facility/workbench/footer/facility-analysis-workbench-footer.component';
import { FacilityAnalysisWorkbenchNavigationService } from '../../facility/workbench/navigation/facility-analysis-workbench-navigation.service';
import { ANALYSIS_USAGE_HOST } from '../analysis-usage-host';
import { AnalysisUsageService } from '../analysis-usage.service';
import { analysisUsageLeaveGuard } from '../analysis-usage-leave.guard';
import { AnalysisUsedByComponent } from './analysis-used-by.component';

@Component({ selector: 'app-usage-browser-root', standalone: true, imports: [RouterOutlet, PortalModule], template: '<main class="v1-root" style="height:100vh;width:100%;--v1-rail-width:0px;--v1-section-nav-width:0px;--v1-support-panel-width:0px"><div style="position:relative;isolation:isolate"><router-outlet/></div><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class BrowserRoot { readonly modal = inject(ModalPortalService); }
@Component({ selector: 'app-usage-browser-page', standalone: true, imports: [AnalysisUsedByComponent, FacilityAnalysisWorkbenchFooterComponent], template: '<app-analysis-used-by/><app-facility-analysis-workbench-footer/>' })
class UsagePage { readonly usage = inject(AnalysisUsageService); }
@Component({ selector: 'app-usage-browser-destination', standalone: true, template: '<h1>Destination workbench</h1>' })
class Destination { }

describe('Analysis Used By native journeys', () => {
  let database: IndexedDbTestHarness | undefined;
  afterEach(async () => { await database?.destroy(); database = undefined; await page.viewport(1280, 900); });
  async function setup() {
    const f = analysisUsageFixture();
    database = await IndexedDbTestHarness.create('analysis-usage-ui');
    await database.seed({ accounts: [f.account], facilities: [f.facility, f.other], analysisItems: [f.analysis], accountAnalysisItems: [f.accountAnalysis] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: database.databaseName } });
    const handler = new AnalysisUsageCommandHandler(transactions, new ReportCommandHandler(undefined, undefined, undefined, transactions));
    const store = new AccountWorkspaceStore(); store.publish(f.snapshot);
    const boundary = new WorkspaceCommandBoundary(store, undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BrowserRoot], providers: [provideRouter([
      { path: 'used-by', component: UsagePage, canDeactivate: [analysisUsageLeaveGuard] },
      { path: 'v1/workspace/facility/:facilityGuid/reports/workbench/:reportGuid/setup', component: Destination },
      { path: 'v1/workspace/account/:accountGuid/analysis/workbench/:analysisGuid/select-items', component: Destination }
    ]), AnalysisUsageService, AnalysisUsageCommands,
      { provide: ANALYSIS_USAGE_HOST, useValue: { scope: 'facility', analysis: signal(f.analysis), blocked: signal(false), flush: async () => true } },
      { provide: AccountWorkspaceStore, useValue: store }, { provide: AnalysisUsageCommandHandler, useValue: handler },
      { provide: WorkspaceCommandBoundary, useValue: boundary },
      { provide: FacilityAnalysisWorkbenchNavigationService, useValue: { activeStageId: signal('used-by'), nextStage: signal(undefined),
        navigationBlocked: signal(false), requirement: signal(undefined), back: vi.fn() } }
    ] });
    const fixture = TestBed.createComponent(BrowserRoot); fixture.detectChanges();
    const router = TestBed.inject(Router); await router.navigateByUrl('/used-by');
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); fixture.detectChanges(); };
    await settle();
    return { ...f, store, fixture, router, settle, root: fixture.nativeElement.querySelector('main') as HTMLElement };
  }

  it.each(['report', 'account analysis'] as const)('creates a durable %s through footer choices and opens its workbench', async kind => {
    const f = await setup();
    await page.getByRole('button', { name: kind === 'report' ? 'Add Report' : 'Add Account Analysis', exact: true }).click(); await f.settle();
    if (kind === 'report') { await page.getByRole('button', { name: 'Analysis', exact: true }).click(); await f.settle(); }
    expect((document.activeElement as HTMLElement).id).toBe('usage-name');
    await page.getByRole('textbox', { name: kind === 'report' ? /Report name/ : /Account analysis name/ }).fill('Created from Used By');
    await page.getByRole('button', { name: 'Create and open', exact: true }).click();
    await vi.waitFor(() => expect(f.router.url).toContain('/workbench/')); await f.settle();
    const saved = kind === 'report' ? f.store.facilityReports()[0] : f.store.accountAnalyses().find(item => item.name === 'Created from Used By')!;
    expect(saved).toBeDefined();
    if (kind === 'report') expect('analysisItemId' in saved && saved.analysisItemId).toBe(f.analysis.guid);
    else {
      expect('facilityAnalysisItems' in saved && saved.facilityAnalysisItems[0].analysisItemId).toBe(f.analysis.guid);
      expect(f.router.url).toContain(`facilityGuid=${f.facility.guid}`);
      expect(f.store.accountAnalyses()).toHaveLength(2);
      expect(f.store.accountAnalyses().find(item => item.guid === f.accountAnalysis.guid)).toEqual(f.accountAnalysis);
    }
    const records = await database!.getAll(kind === 'report' ? 'facilityReports' : 'accountAnalysisItems');
    expect(records.some(item => item.guid === saved.guid)).toBe(true);
    await f.router.navigateByUrl('/used-by'); await f.settle();
    expect(page.getByRole('link', { name: /Created from Used By/ }).element().getAttribute('href')).toContain('/workbench/');
    for (const width of [1280, 390]) {
      await page.viewport(width, 900); await f.settle();
      const card = page.getByRole('link', { name: /Created from Used By/ }).element() as HTMLElement;
      const bounds = card.getBoundingClientRect();
      expect(bounds.width).toBeCloseTo(bounds.height, 0);
      expect(bounds.width).toBeLessThanOrEqual(225);
      expect(card.querySelectorAll('app-ui-icon')).toHaveLength(1);
    }
    f.fixture.destroy();
  });

  it('preserves keyboard focus, contrast, narrow layouts, and portal discard behavior', async () => {
    const f = await setup();
    await page.getByRole('button', { name: 'Add Report', exact: true }).click(); await f.settle();
    expect(document.activeElement?.textContent?.trim()).toBe('Report type');
    await userEvent.keyboard('{Tab}{Enter}'); await f.settle();
    expect((document.activeElement as HTMLElement).id).toBe('usage-name');
    await page.getByRole('button', { name: 'Change Analysis', exact: true }).click(); await f.settle();
    expect(document.activeElement?.textContent?.trim()).toBe('Report type');
    for (const [width, theme] of [[1280, ''], [760, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 800); f.root.className = `v1-root ${theme}`; await f.settle();
      const panel = f.root.querySelector<HTMLElement>('.v1-workspace-slideout')!;
      const body = panel.querySelector<HTMLElement>('.v1-workspace-slideout__body')!;
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
      const card = panel.querySelector<HTMLElement>('.creation-choice')!;
      expect(textContrast(card.querySelector<HTMLElement>('strong')!, card)).toBeGreaterThanOrEqual(4.5);
      expect(panel.querySelector<HTMLElement>('.v1-workspace-slideout__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(801);
    }
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await f.settle();
    expect(page.getByRole('dialog', { name: 'Discard selections?', exact: true }).element()).toBeDefined();
    await userEvent.keyboard('{Escape}'); await f.settle();
    expect(f.root.querySelector('[role="dialog"]')).not.toBeNull();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await f.settle();
    await page.getByRole('button', { name: 'Discard selections', exact: true }).click(); await f.settle();
    expect((document.activeElement as HTMLElement).textContent).toContain('Add Report');
    f.fixture.destroy();
  });
});
