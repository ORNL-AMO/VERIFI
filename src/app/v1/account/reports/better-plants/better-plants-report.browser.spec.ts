import { Injector, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, of, take, timeout } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { analysisReviewFingerprint } from '@platform/reports/analysis-review-fingerprint';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { AnalysisReportCalculationService } from '@app/v1/shared/reports/analysis-report-calculation.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { setupAccountReportWorkbench } from '../testing/account-report-workbench-test-setup';
import { StatusItem } from '@app/v1/status/status.models';
import { BetterPlantsReportService } from './better-plants-report.service';

describe('Better Plants review and display in Chromium', () => {
  let database: IndexedDbTestHarness;
  afterEach(async () => { TestBed.resetTestingModule(); await database?.destroy(); await page.viewport(1200, 900); });
  it.each(['energy', 'water'] as const)('confirms shared %s checks, displays the form, and invalidates it after input changes', async category => {
    const original = analysisReportFixture(category);
    const report = { ...original.accountReports[0], name: `Better Plants ${category}`, reportYear: 2024, betterPlantsReportSetup: {
      ...original.accountReports[0].betterPlantsReportSetup, includeAllYears: true, includePerformanceTable: true, includeFacilityNames: true, modificationNotes: 'Process improvements\nVerified with the facilities team.' } };
    const snapshot = { ...original, accountReports: [report, { ...report, id: 51, guid: 'second-report', name: 'Shared analysis report' }] };
    database = await IndexedDbTestHarness.create('better-plants-journey');
    await database.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses.map(item => ({ ...item })),
      utilityMeter: snapshot.meters.map(item => ({ ...item })), utilityMeterData: snapshot.meterData.map(item => ({ ...item })), accountReports: snapshot.accountReports });
    TestBed.resetTestingModule();
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: database.databaseName } });
    // Vite serves source Worker modules; the production build owns emitted Worker URLs.
    const workerUrl = new URL('../../../../platform/web-workers/analysis-report.worker', import.meta.url);
    expect((await fetch(workerUrl)).ok).toBe(true);
    const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.account, false,
      { energyIsSource: true, neededUnits: 'MMBtu' }, [], [], [...snapshot.facilities], snapshot.account.assessmentReportVersion, []);
    const view = await setupAccountReportWorkbench(snapshot, [
      { provide: WorkspaceCommandBoundary, useFactory: () => new WorkspaceCommandBoundary(inject(AccountWorkspaceStore), {} as AccountWorkspaceService) },
      { provide: AnalysisReviewCommandHandler, useValue: new AnalysisReviewCommandHandler(transactions) },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready', meters }), project: () => ({ state: 'ready', meters }) } },
      { provide: AnalysisReportCalculationService, useValue: { fingerprint: analysisReviewFingerprint,
        execute: (request: AnalysisReportWorkerRequest) => runWorker<AnalysisReportWorkerResponse>(new Worker(workerUrl, { type: 'module' }), request) } }
    ]);
    const root = view.harness.fixture.nativeElement as HTMLElement; root.className = 'v1-root v1-palette-blueprint';
    const component = await view.open('report'); view.harness.fixture.autoDetectChanges();
    const expectBottomCorners = (surface: HTMLElement) => {
      for (const square of [false, true]) {
        root.classList.toggle('v1-corners-square', square);
        const radius = getComputedStyle(root).getPropertyValue('--v1-radius').trim();
        const style = getComputedStyle(surface);
        expect(style.borderBottomLeftRadius).toBe(radius);
        expect(style.borderBottomRightRadius).toBe(radius);
        if (!square) { expect(style.borderTopLeftRadius).toBe('0px'); expect(style.borderTopRightRadius).toBe('0px'); }
      }
      root.classList.remove('v1-corners-square');
    };
    const coordinator = view.harness.routeDebugElement!.injector.get(BetterPlantsReportService);
    const waitFor = async (predicate: (state: ReturnType<typeof coordinator.state>) => boolean) => {
      const waiting = firstValueFrom(toObservable(coordinator.state, { injector: TestBed.inject(Injector) }).pipe(filter(predicate), take(1), timeout(10000)));
      TestBed.tick(); await waiting; view.harness.detectChanges();
    };
    expect(view.store.committedRevision()).toBeUndefined();
    await page.viewport(1200, 900);
    const setup = root.querySelector<HTMLElement>('app-account-report-setup')!;
    expectBottomCorners(setup.querySelector<HTMLElement>('.report-setup')!);
    const information = setup.querySelector<HTMLElement>('.report-setup-top h2')!.getBoundingClientRect();
    const period = setup.querySelector<HTMLElement>('app-better-plants-reporting-period h2')!.getBoundingClientRect();
    expect(period.left).toBeGreaterThan(information.right);
    expect(period.top).toBeCloseTo(information.top, 0);
    const radio = setup.querySelector<HTMLInputElement>('.report-analysis-card input:checked')!;
    const selectedAnalysis = component.editor.form.controls.analysis.value;
    radio.focus(); await userEvent.keyboard('{ArrowRight}');
    expect(component.editor.form.controls.analysis.value).toBe(selectedAnalysis);
    expect(setup.querySelectorAll('.report-analysis-card input')).toHaveLength(1);
    const includedContent = setup.querySelector<HTMLElement>('.report-setup-content')!;
    expect(includedContent.closest('.report-setup-top')).not.toBeNull();
    expect(includedContent.getBoundingClientRect().top).toBeGreaterThan(setup.querySelector('#account-report-name')!.getBoundingClientRect().bottom);
    for (const helpId of ['better-plants-baseline-help', 'better-plants-modifications-help', ...(category === 'water' ? ['better-plants-methodology-help'] : [])]) {
      const help = setup.querySelector<HTMLElement>(`#${helpId}`)!;
      const textarea = setup.querySelector<HTMLTextAreaElement>(`textarea[aria-describedby="${helpId}"]`)!;
      expect(help.getBoundingClientRect().bottom).toBeLessThanOrEqual(textarea.getBoundingClientRect().top);
      expect(parseFloat(getComputedStyle(help).fontSize)).toBeCloseTo(.95 * parseFloat(getComputedStyle(document.documentElement).fontSize), 1);
    }
    expect(setup.querySelector('#account-report-analysis-help')).toBeNull();
    expect(setup.querySelector('#better-plants-period-help')).toBeNull();
    expect(setup.querySelector('#account-report-name-help')).toBeNull();
    const inspect = setup.querySelector<HTMLButtonElement>('.report-analysis-card__inspect')!;
    inspect.focus(); await userEvent.keyboard('{Enter}');
    let dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Facility selections');
    expect(dialog.querySelector('footer .v1-btn--action')?.textContent).toContain('Select for report');
    expect(dialog.querySelector('footer .v1-btn--secondary')?.textContent).toContain('Go To Analysis');
    expect(component.editor.form.controls.analysis.value).toBe(selectedAnalysis);
    await userEvent.keyboard('{Escape}');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(inspect);
    await userEvent.keyboard('{Enter}');
    dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    dialog.querySelector<HTMLButtonElement>('footer .v1-btn--action')!.click();
    view.harness.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(component.editor.form.controls.analysis.value).toBe(selectedAnalysis);
    expect(view.updateSetup).not.toHaveBeenCalled();
    const main = root.querySelector<HTMLElement>('main')!;
    const mainTop = main.getBoundingClientRect().top;
    await page.getByRole('textbox', { name: /^Name/ }).fill(`Updated ${category} report`);
    expect(root.querySelector('app-report-workbench-header .v1-alert')).toBeNull();
    expect(main.getBoundingClientRect().top).toBeCloseTo(mainTop, 0);
    await component.editor.flush(); view.harness.detectChanges();
    for (const dark of [false, true]) {
      root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 900); view.harness.detectChanges();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        if (width === 390) {
          expect(setup.querySelector<HTMLElement>('app-better-plants-reporting-period h2')!.getBoundingClientRect().top)
            .toBeGreaterThan(setup.querySelector<HTMLElement>('#account-report-name')!.getBoundingClientRect().bottom);
        }
      }
    }
    await page.viewport(1200, 1100); root.className = 'v1-root v1-palette-blueprint';
    await page.screenshot({ element: setup, path: `./__screenshots__/better-plants-setup-${category}.png` });
    await view.open('report', 'report'); await waitFor(state => !!state.value?.summaries);
    expect(coordinator.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2024, 2023]);
    expect(view.harness.routeNativeElement!.querySelector('app-better-plants-preview table')).not.toBeNull();
    expect((await database.getAll('accountAnalysisItems'))[0]['dataCheckReviews']).toBeUndefined();
    await view.open('report', 'data-checks'); await waitFor(state => state.state === 'ready' && !!state.value?.checks);
    expect(coordinator.state().value?.checks?.map(check => check.reportYear)).toEqual([2024]);
    expect(view.store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
    expectBottomCorners(root.querySelector<HTMLElement>('app-analysis-data-checks > .report-section:last-of-type')!);
    expect(getComputedStyle(root.querySelector<HTMLElement>('app-analysis-data-checks > .report-section')!).borderBottomLeftRadius).toBe('0px');
    expect(root.querySelector('footer input[type="checkbox"]')).toBeNull();
    expect(root.querySelector('footer')!.textContent).toContain('Data Checks Completed');
    expect(root.querySelector('footer a.v1-btn--action')!.textContent).toContain('Continue');
    // Report findings participate in the same review gate as model warnings.
    view.status.items.set(snapshot.accountReports.map(item => ({ id: `warning-${item.guid}`, code: 'report.analysis.warning', severity: 'warning',
      category: 'readiness', entity: { kind: 'account-report', guid: item.guid, accountGuid: snapshot.account.guid, name: item.name },
      evidence: {}, title: 'Analysis needs review', description: 'Review the linked analysis warning.', todo: false,
      destination: { kind: 'unavailable' } } satisfies StatusItem)));
    await waitFor(state => state.state === 'ready' && !!state.value?.checks && !state.value.completed);
    expect(root.querySelector('app-report-workbench-header')!.textContent).toContain('Data Check Pending');
    expect(root.querySelector<HTMLButtonElement>('footer button.v1-btn--action')!.disabled).toBe(true);
    const checksPage = root.querySelector<HTMLElement>('app-better-plants-data-checks')!;
    for (const dark of [false, true]) {
      root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 900); view.harness.detectChanges();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        const checkbox = root.querySelector<HTMLInputElement>('footer input[type="checkbox"]')!;
        expect(checkbox.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
        if (category === 'energy' && width === 390) await page.screenshot({ element: root, path: `./__screenshots__/better-plants-checks-footer-${dark ? 'dark' : 'light'}.png` });
      }
    }
    await page.viewport(1024, 900); root.className = 'v1-root v1-palette-blueprint';
    await page.screenshot({ element: checksPage, path: `./__screenshots__/better-plants-checks-${category}.png` });
    const confirmation = root.querySelector<HTMLInputElement>('footer input[type="checkbox"]')!;
    confirmation.focus(); await userEvent.keyboard(' '); await waitFor(state => state.value?.reviewed === true);
    expect(view.store.accountAnalyses()[0].dataCheckReviews?.map(review => review.reportYear)).toEqual([2024]);
    expect(root.querySelector('footer input[type="checkbox"]')).toBeNull();
    expect(root.querySelector('footer')!.textContent).toContain('Data Checks Completed');
    expect(document.activeElement?.textContent).toContain('Data Checks Completed');
    await userEvent.keyboard('{Tab}'); expect(document.activeElement?.textContent).toContain('Continue');
    expect(view.store.accountAnalyses()[0].isAnalysisVisited).toBe(false);
    expect(component.context.stages().find(stage => stage.id === 'data-checks')?.completed).toBe(true);
    await view.open('report', 'report'); await waitFor(state => !!state.value?.summaries);
    expect(coordinator.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2024, 2023]);
    root.className = 'v1-root v1-palette-blueprint';
    expect(root.querySelectorAll('app-better-plants-preview table').length).toBeGreaterThanOrEqual(4);
    expect(root.textContent).toContain('Process improvements');
    for (const dark of [false, true]) {
      root.className = `v1-root v1-palette-blueprint${dark ? ' v1-theme-dark' : ''} v1-contrast-strong`;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 900); view.harness.detectChanges();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      }
    }
    await page.viewport(1100, 900); root.className = 'v1-root v1-palette-blueprint';
    // Capture the complete rendered form independently of the workbench's scroll viewport.
    const frame = document.createElement('div'); frame.className = 'v1-root v1-palette-blueprint';
    frame.style.cssText = 'position:absolute;inset:0 auto auto 0;width:1100px;height:auto;min-height:0;overflow:visible;z-index:10000';
    const form = root.querySelector('app-better-plants-preview')!.cloneNode(true) as HTMLElement;
    frame.append(form); document.body.append(frame);
    try {
      await page.viewport(1100, Math.ceil(frame.scrollHeight) + 20);
      await page.screenshot({ element: frame, path: `./__screenshots__/better-plants-${category}.png` });
      frame.classList.add('v1-theme-dark');
      await page.screenshot({ element: frame, path: `./__screenshots__/better-plants-${category}-dark.png` });
    } finally { frame.remove(); await page.viewport(1100, 900); }
    await view.open('second-report', 'report'); await waitFor(state => !!state.value?.summaries);
    const changed = { ...snapshot.meterData[0], totalEnergyUse: 5, totalVolume: 5 };
    await transactions.runTransaction(['utilityMeterData'], 'readwrite', tx => tx.put('utilityMeterData', changed));
    view.store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] });
    view.harness.detectChanges(); expect(view.harness.routeNativeElement!.querySelector('app-better-plants-preview table')).toBeNull();
    await waitFor(state => state.state === 'review-required');
    await database.reopen(); expect((await database.getAll('accountAnalysisItems'))[0]['dataCheckReviews']).toHaveLength(1);
  });
});
