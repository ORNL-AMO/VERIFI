import * as echarts from 'echarts/core';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisModelComparisonChartComponent } from '@app/v1/shared/analysis-results/model-comparison-chart/analysis-model-comparison-chart.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, of, take, timeout } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { analysisReportFixture, regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { analysisReviewFingerprint } from '@platform/reports/analysis-review-fingerprint';
import { runWorker } from '@platform/web-workers/run-worker';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { FacilityAnalysisResultsWorkerRequest, FacilityAnalysisResultsWorkerResponse } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { setupReportWorkbench } from '../testing/report-workbench-test-setup';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityAnalysisReportService } from './analysis-report.service';

describe('facility analysis report journey in Chromium', () => {
  let database: IndexedDbTestHarness;
  afterEach(async () => { TestBed.resetTestingModule(); await database?.destroy(); await page.viewport(1280, 900); });
  it.each([['energy', false, false], ['energy', true, false], ['water', false, false], ['energy', true, true]] as const)('displays %s (source: %s, regression: %s), reviews only the selected year and invalidates changed inputs', async (category, source, regression) => {
    const original = regression ? regressionAnalysisReportFixture() : analysisReportFixture(category), analysis = { ...original.facilityAnalyses[0], energyIsSource: source };
    const report = { ...getNewIdbFacilityReport('facility', 'account', 'analysis', []), id: 70, guid: 'facility-report', analysisItemId: analysis.guid, name: 'Facility analysis report' };
    report.analysisReportSettings.reportYear = 2023;
    Object.assign(report.analysisReportSettings, { facilityGroupContributions: true,
      facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true });
    const snapshot = { ...original, accountAnalyses: [], facilityAnalyses: [analysis], facilityReports: [report] };
    database = await IndexedDbTestHarness.create('facility-analysis-report-journey');
    await database.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })), analysisItems: [analysis],
      predictor: snapshot.predictors.map(item => ({ ...item })), predictorData: snapshot.predictorData.map(item => ({ ...item })),
      utilityMeter: snapshot.meters.map(item => ({ ...item })), utilityMeterData: snapshot.meterData.map(item => ({ ...item })), facilityReports: [report] });
    TestBed.resetTestingModule();
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: database.databaseName } });
    const checksUrl = new URL('../../../../platform/web-workers/analysis-report.worker', import.meta.url);
    const resultsUrl = new URL('../../../../platform/web-workers/facility-analysis-results.worker', import.meta.url);
    let calculations = 0, checksCalculations = 0;
    const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.facilities[0], false,
      { energyIsSource: source, neededUnits: category === 'water' ? 'kgal' : 'MMBtu' }, [], [], [...snapshot.facilities], snapshot.account.assessmentReportVersion, []);
    const view = await setupReportWorkbench([report], [
      { provide: WorkspaceCommandBoundary, useFactory: () => new WorkspaceCommandBoundary(TestBed.inject(AccountWorkspaceStore), {} as AccountWorkspaceService) },
      { provide: AnalysisReviewCommandHandler, useValue: new AnalysisReviewCommandHandler(transactions) },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready', meters }), project: () => ({ state: 'ready', meters }) } },
      { provide: AnalysisReportCalculationService, useValue: { fingerprint: analysisReviewFingerprint,
        execute: (request: AnalysisReportWorkerRequest) => { checksCalculations++; return runWorker<AnalysisReportWorkerResponse>(new Worker(checksUrl, { type: 'module' }), request); },
        executeFacility: (request: FacilityAnalysisResultsWorkerRequest) => { calculations++; return runWorker<FacilityAnalysisResultsWorkerResponse>(new Worker(resultsUrl, { type: 'module' }), request); } } }
    ], snapshot);
    const workbench = await view.open('facility-report'); view.harness.fixture.autoDetectChanges();
    const root = view.harness.fixture.nativeElement as HTMLElement; root.className = 'v1-root v1-palette-blueprint';
    const coordinator = workbench.workbench.session()!.injector.get(FacilityAnalysisReportService);
    const charts = (section: HTMLElement) => view.harness.fixture.debugElement.queryAll(By.directive(MeterResultsChartComponent))
      .filter(child => section.contains(child.nativeElement)).map(child => child.componentInstance as MeterResultsChartComponent);
    const waitFor = async (predicate: (state: ReturnType<typeof coordinator.state>) => boolean) => {
      const waiting = firstValueFrom(toObservable(coordinator.state, { injector: TestBed.inject(Injector) }).pipe(filter(predicate), take(1), timeout(10000)));
      TestBed.tick(); await waiting; view.harness.detectChanges();
    };
    expect(calculations).toBe(0); expect(view.store.committedRevision()).toBeUndefined();
    expect(root.querySelector<HTMLInputElement>('app-report-analysis-selection input:checked')).not.toBeNull();
    expect(workbench.editor.form.controls.analysis.value).toBe('facility-analysis');
    const setup = root.querySelector<HTMLElement>('app-analysis-report-setup')!;
    expect(root.querySelector('#report-configuration-heading')).toBeNull();
    expect(setup.querySelector('#report-name-help')).toBeNull();
    expect(setup.querySelector('label[for=facility-analysis-report-year]')?.textContent).toContain('Report year *');
    expect(setup.querySelector('#facility-report-analysis-title')?.textContent).toContain('Analysis *');
    expect(setup.querySelector<HTMLSelectElement>('#facility-analysis-report-year')?.required).toBe(true);
    expect(setup.querySelector('.report-analysis-card__status app-ui-icon')).not.toBeNull();
    for (const classes of ['', ' v1-theme-dark', ' v1-theme-dark v1-contrast-strong']) {
      root.className = 'v1-root v1-palette-blueprint' + classes;
      for (const width of [1024, 640, 390]) {
        await page.viewport(width, 900); view.harness.detectChanges();
        const name = setup.querySelector<HTMLElement>('#report-workbench-name')!.getBoundingClientRect();
        const year = setup.querySelector<HTMLElement>('#facility-analysis-report-year')!.getBoundingClientRect();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        if (width === 1024) { expect(year.left).toBeGreaterThan(name.right); expect(year.top).toBeCloseTo(name.top, 0); }
        else expect(year.top).toBeGreaterThan(name.bottom);
      }
    }
    root.className = 'v1-root v1-palette-blueprint';
    if (category === 'energy' && !source) {
      await page.viewport(1200, 900);
      root.querySelector<HTMLElement>('main.report-workbench-content')!.scrollTop = 0;
      await new Promise(requestAnimationFrame);
      await page.screenshot({ element: root, path: './__screenshots__/facility-analysis-setup.png' });
      await page.viewport(390, 900); root.classList.add('v1-theme-dark', 'v1-contrast-strong');
      root.querySelector<HTMLElement>('main.report-workbench-content')!.scrollTop = 0;
      await new Promise(requestAnimationFrame);
      await page.screenshot({ element: root, path: './__screenshots__/facility-analysis-setup-narrow.png' });
      root.classList.remove('v1-theme-dark', 'v1-contrast-strong');
    }
    if (regression) {
      await view.open('facility-report', 'report'); await waitFor(state => state.state === 'review-required');
      await view.open('facility-report', 'data-checks'); await waitFor(state => !!state.value?.checks);
      root.querySelector<HTMLInputElement>('footer input[type=checkbox]')!.click(); await waitFor(state => !!state.value?.completed);
    }
    await view.open('facility-report', 'report'); await waitFor(state => !!state.value?.results);
    expect(coordinator.state().value?.results?.annualAnalysisSummaries.map(row => row.year)).toEqual([2022, 2023]);
    const preview = root.querySelector<HTMLElement>('app-analysis-report-preview')!;
    expect(preview.querySelector('[role=tablist], [role=tabpanel], #report-group')).toBeNull();
    const papers = Array.from(preview.querySelectorAll<HTMLElement>('article.report-document'));
    expect(papers).toHaveLength(regression ? 6 : 5);
    const annual = preview.querySelector<HTMLElement>('#analysis-report-facility-annual')!;
    const monthly = preview.querySelector<HTMLElement>('#analysis-report-facility-monthly')!;
    const contributions = preview.querySelector<HTMLElement>('#analysis-report-facility-group-contributions')!;
    expect(papers[2]).toBe(contributions);
    expect(contributions.querySelector('.document-section-title')?.textContent).toBe('Group contributions');
    expect(contributions.querySelector('table.v1-analysis-contributions-table')).not.toBeNull();
    expect(contributions.querySelector('app-contribution-heatmap')).not.toBeNull();
    const groupMonthly = papers[papers.length - 1];
    annual.scrollIntoView({ block: 'start' });
    await new Promise(requestAnimationFrame);
    const annualTable = annual.querySelector<HTMLTableElement>('app-analysis-results-table table')!;
    expect(annualTable.classList.contains('v1-analysis-results-table')).toBe(true);
    expect(annualTable.querySelector('th[scope=colgroup]')?.textContent).toContain(category === 'water' ? 'Consumption' : 'Energy');
    expect(getComputedStyle(annualTable.querySelector('thead tr:last-child th')!).textTransform).toBe('uppercase');
    expect((charts(annual)[0].chartOption() as any).series.map((series: any) => series.type)).toEqual(['bar', 'bar']);
    expect(charts(annual).every(chart => chart.showValueLabels && chart.deferUntilVisible)).toBe(true);
    expect(root.querySelector('button[aria-label="Download PNG"]')).toBeNull();
    const outputButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('footer app-report-output-actions button'));
    expect(outputButtons.map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint', 'Present']);
    expect(outputButtons.every(button => button.disabled)).toBe(true);
    expect(monthly.querySelectorAll('app-analysis-report-results-table')).toHaveLength(2);
    expect(charts(monthly)[0].comparisonBand).toBeDefined();
    expect(charts(monthly)[1].allMetricSeriesStacked()).toBe(true);
    expect(groupMonthly.querySelectorAll('app-analysis-report-results-table')).toHaveLength(2);
    expect(charts(groupMonthly)[1].allMetricSeriesStacked()).toBe(true);
    // All data and accessible chart rows exist before off-screen canvases are initialized.
    expect(groupMonthly.querySelectorAll('.v1-meter-results-chart__accessible-data tbody tr').length).toBeGreaterThan(0);
    for (const table of monthly.querySelectorAll('app-analysis-report-results-table table')) {
      expect(table.querySelector('.v1-analysis-results-table__section-heading--use')).not.toBeNull();
      expect(table.querySelector('tbody tr:last-child')?.classList.contains('v1-analysis-results__fiscal-year-end')).toBe(true);
    }
    if (category === 'energy' && !source) {
      await page.viewport(1440, 1400);
      for (let parent = annual.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0;
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ element: root, path: './__screenshots__/facility-analysis-continuous-desktop.png' });
    }
    for (const classes of ['', ' v1-theme-dark', ' v1-theme-dark v1-contrast-strong']) {
      root.className = 'v1-root v1-palette-blueprint' + classes;
      for (const width of [1440, 1024, 640, 390]) {
        await page.viewport(width, 900); view.harness.detectChanges();
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
        const footer = root.querySelector<HTMLElement>('footer')!.getBoundingClientRect();
        for (const button of outputButtons) {
          const bounds = button.getBoundingClientRect();
          expect(bounds.left).toBeGreaterThanOrEqual(footer.left);
          expect(bounds.right).toBeLessThanOrEqual(footer.right);
        }
        expect(parseFloat(getComputedStyle(papers[0]).maxWidth)).toBe(76 * parseFloat(getComputedStyle(document.documentElement).fontSize));
        expect(parseFloat(getComputedStyle(papers[1]).marginBlockStart)).toBe(2 * parseFloat(getComputedStyle(document.documentElement).fontSize));
        expect(getComputedStyle(papers[0]).borderRadius).toBe('0px');
        expect(getComputedStyle(papers[0]).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        for (const canvas of preview.querySelectorAll<HTMLElement>('.v1-meter-results-chart__chart, .model-comparison-chart__canvas')) {
          expect(canvas.getBoundingClientRect().width).toBeGreaterThan(0);
          expect(canvas.getBoundingClientRect().width).toBeLessThanOrEqual(root.clientWidth);
        }
      }
    }
    if (category === 'energy' && !source) {
      for (let parent = annual.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0;
      await new Promise(requestAnimationFrame);
      await page.screenshot({ element: root, path: './__screenshots__/facility-analysis-continuous-narrow.png' });
    }
    const deepCanvas = groupMonthly.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!;
    deepCanvas.scrollIntoView({ block: 'center' });
    await vi.waitFor(() => expect(deepCanvas.querySelector('canvas')).not.toBeNull());
    const retainedChart = echarts.getInstanceByDom(deepCanvas)!;
    annual.scrollIntoView({ block: 'start' }); await new Promise(requestAnimationFrame);
    expect(echarts.getInstanceByDom(deepCanvas)).toBe(retainedChart);
    if (regression) {
      const model = preview.querySelector<HTMLElement>('app-analysis-report-model-details')!;
      expect(model.textContent).toContain('Predictor 0');
      const modelChart = view.harness.fixture.debugElement.query(By.directive(AnalysisModelComparisonChartComponent)).componentInstance as AnalysisModelComparisonChartComponent;
      expect((modelChart.option() as any).series.map((series: any) => series.type)).toEqual(['scatter', 'line']);
      const canvas = model.querySelector<HTMLElement>('.model-comparison-chart__canvas')!;
      canvas.scrollIntoView({ block: 'center' });
      await vi.waitFor(() => expect(canvas.querySelector('canvas')).not.toBeNull());
    }
    groupMonthly.scrollIntoView({ block: 'end' });
    for (let parent = groupMonthly.parentElement; parent; parent = parent.parentElement) parent.scrollTop = parent.scrollHeight;
    await new Promise(requestAnimationFrame);
    const footer = root.querySelector<HTMLElement>('footer')!;
    expect(groupMonthly.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top + 1);
    expect(calculations).toBe(1);
    await view.open('facility-report', 'data-checks'); await waitFor(state => !!state.value?.checks);
    expect(retainedChart.isDisposed()).toBe(true);
    expect(coordinator.state().value?.checks?.map(check => check.reportYear)).toEqual([2023]);
    if (!regression) expect((await database.getAll('analysisItems'))[0]['dataCheckReviews']).toBeUndefined();
    if (!regression) {
    view.status.items.set([{ id: 'report-warning', code: 'report.analysis.warning', severity: 'warning', category: 'quality',
      entity: { kind: 'facility-report', accountGuid: 'account', facilityGuid: 'facility', guid: 'facility-report', name: report.name }, evidence: {},
      title: 'Review linked analysis', description: 'Review this analysis.', todo: false, destination: { kind: 'unavailable' } } satisfies StatusItem]);
    await waitFor(state => !!state.value?.checks && !state.value.completed);
    expect(root.querySelector<HTMLButtonElement>('footer button.v1-btn--action')?.disabled).toBe(true);
    const acknowledgment = root.querySelector<HTMLInputElement>('footer input[type=checkbox]')!;
    acknowledgment.focus(); await userEvent.keyboard(' '); await waitFor(state => !!state.value?.completed);
    }
    expect((await database.getAll('analysisItems'))[0]['dataCheckReviews']).toHaveLength(1);
    expect((await database.getAll('analysisItems'))[0]['isAnalysisVisited']).toBe(false);
    expect(await database.getAll('accountAnalysisItems')).toEqual([]);
    await view.open('facility-report', 'report'); await waitFor(state => !!state.value?.results);
    const reviewBeforeContentChanges = structuredClone((await database.getAll('analysisItems'))[0]['dataCheckReviews']);
    const checksBeforeContentChanges = checksCalculations;
    await view.open('facility-report');
    workbench.editor.name.setValue('Reviewed contribution report');
    workbench.editor.form.controls.settings.patchValue({ facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: true });
    await view.open('facility-report', 'report'); await waitFor(state => !!state.value?.results);
    expect(root.querySelector('.document-title')?.textContent).toContain('Reviewed contribution report');
    const chartOnly = root.querySelector<HTMLElement>('#analysis-report-facility-group-contributions')!;
    expect(chartOnly.querySelector('table.v1-analysis-contributions-table')).toBeNull();
    expect(chartOnly.querySelector('.v1-contribution-heatmap__accessible-data')).not.toBeNull();
    expect(coordinator.workflow().completed).toBe(true);
    expect(calculations).toBe(1); expect(checksCalculations).toBe(checksBeforeContentChanges);
    expect((await database.getAll('analysisItems'))[0]['dataCheckReviews']).toEqual(reviewBeforeContentChanges);
    const reading = { ...view.store.meterData()[0], totalEnergyUse: 1, totalVolume: 1 };
    view.store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [reading] }] });
    expect(coordinator.state().value?.results).toBeUndefined();
    await waitFor(state => state.state === 'review-required');
    expect(root.querySelector('app-analysis-report-preview table')).toBeNull();
    await database.reopen(); expect((await database.getAll('facilityReports'))[0]['analysisItemId']).toBe(analysis.guid);
    expect(workbench.workbench.session()).toBeUndefined();
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
  });
});
