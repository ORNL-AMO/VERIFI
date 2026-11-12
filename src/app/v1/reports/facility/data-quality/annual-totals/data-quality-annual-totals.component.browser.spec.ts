import { page, userEvent } from 'vitest/browser';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { annualTotalsSnapshot, ANNUAL_TEST_EMISSIONS } from '../testing/data-quality-annual-totals-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';
import { dataQualityPredictorReadingsSnapshot } from '../testing/data-quality-report-test-fixtures';
import { echarts } from '@app/v1/shared/charts/echarts';

describe('Annual Totals with native calendarization', () => {
  beforeEach(() => {
    // Vite serves source modules/assets; production builds validate emitted Worker and asset paths.
    const NativeWorker = globalThis.Worker;
    const workerUrl = new URL('../../../../../platform/web-workers/calanderization.worker', import.meta.url);
    vi.stubGlobal('Worker', class extends NativeWorker { constructor() { super(workerUrl, { type: 'module' }); } });
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => nativeFetch(
      input === 'assets/eGrid_data/eGrid_zipcode_lookup_2025.xlsx'
        ? new URL('../../../../../../assets/eGrid_data/eGrid_zipcode_lookup_2025.xlsx', import.meta.url) : input, init));
  });
  afterEach(async () => { vi.unstubAllGlobals(); await page.viewport(1280, 720); });
  it.each([
    ['manual', 'light', [], 1440, 900], ['analysis', 'light', [], 1440, 900],
    ['manual', 'dark', ['v1-theme-dark'], 1024, 700], ['analysis', 'dark', ['v1-theme-dark'], 1024, 700],
    ['manual', 'high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 390, 844],
    ['analysis', 'high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 390, 844]
  ] as const)('completes Setup → Report with all content in %s mode and %s', async (mode, theme, classes, width, height) => {
    await page.viewport(width, height);
    const snapshot = annualTotalsSnapshot(), predictorSnapshot = dataQualityPredictorReadingsSnapshot();
    snapshot.predictors = predictorSnapshot.predictors;
    snapshot.predictorData = predictorSnapshot.predictorData;
    Object.assign(snapshot.predictors[1], { predictorType: 'Weather', weatherDataType: 'HDD', heatingBaseTemperature: 65, unit: undefined });
    const view = await setupReportWorkbench(snapshot.facilityReports, [WorkspaceCalendarizationService,
      { provide: EGridService, useValue: { excelCo2Emissions: ANNUAL_TEST_EMISSIONS } }], snapshot);
    const workbench = await view.open();
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: `${height - 40}px`, overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
    const activate = async (element: HTMLElement) => {
      element.scrollIntoView({ block: 'center' }); element.focus();
      await userEvent.keyboard(element instanceof HTMLAnchorElement ? '{Enter}' : ' ');
      view.harness.detectChanges();
    };
    await userEvent.fill(host.querySelector<HTMLInputElement>('#report-workbench-name')!, 'Complete Data Quality Report');
    await activate(host.querySelector<HTMLInputElement>('.selection-mode input[value="analysis"]')!);
    if (mode === 'analysis') await activate(host.querySelector<HTMLInputElement>('.report-analysis-card input[type="radio"]')!);
    else {
      await activate(host.querySelector<HTMLInputElement>('.selection-mode input[value="manual"]')!);
      for (const tag of host.querySelectorAll<HTMLButtonElement>('.source-tag')) await activate(tag);
    }
    await activate([...host.querySelectorAll<HTMLButtonElement>('.content-presets button')].find(button => button.textContent?.trim() === 'All content')!);
    expect(results.editor.selection().meters).toHaveLength(2); expect(results.editor.selection().predictors).toHaveLength(2);
    expect(results.state().state).toBe('idle');
    expect([...host.querySelectorAll<HTMLInputElement>('.content-matrix input')].every(input => input.checked)).toBe(true);
    await activate(host.querySelector<HTMLAnchorElement>('footer a.v1-btn--action')!);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state, results.state().message).toBe('ready'); }, { timeout: 5000 });
    const preview = () => host.querySelector<HTMLElement>('app-data-quality-report-preview')!;
    expect(preview().querySelectorAll('.meter-report')).toHaveLength(2);
    expect(preview().querySelectorAll('.predictor-report')).toHaveLength(2);
    expect(preview().querySelectorAll('.v1-meter-quality__statistics-panel')).toHaveLength(2);
    expect(preview().querySelectorAll('.predictor-quality__table')).toHaveLength(2);
    expect(preview().querySelectorAll('app-data-quality-annual-totals')).toHaveLength(2);
    expect(preview().querySelectorAll('app-data-quality-report-histogram')).toHaveLength(6);
    expect(preview().querySelectorAll('.report-component-divider')).toHaveLength(18);
    expect(preview().querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
    expect(preview().querySelector('h2')!.textContent).toBe('Complete Data Quality Report');
    expect(preview().textContent).toContain('Heating Degree Days (Base Temperature: 65');
    expect(preview().textContent).not.toMatch(/pending migration|Sections being implemented/);
    expect(results.state().value!.meters[0].energyStats.average).toBe(250);
    expect(results.state().value!.predictors[0].statistics.average).toBe(28.6);
    expect(results.state().value!.annualTotals[0].rows.map(row => [row.year, row.energyCost])).toEqual([[2023, 30], [2024, 70]]);
    const charts = [...preview().querySelectorAll<HTMLElement>('.v1-meter-quality__chart, .predictor-quality__chart, .quality-histogram__chart')];
    expect(charts).toHaveLength(12);
    await vi.waitFor(() => charts.forEach(chart => expect(echarts.getInstanceByDom(chart)?.getOption().series).toBeDefined()), { timeout: 5000 });
    expect((echarts.getInstanceByDom(charts[0])!.getOption().xAxis as { axisLabel: { hideOverlap: boolean } }[])[0].axisLabel.hideOverlap).toBe(true);
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    for (const frame of preview().querySelectorAll<HTMLElement>('.report-document')) {
      expect(frame.getBoundingClientRect().width).toBeLessThanOrEqual(preview().clientWidth + 1);
    }
    const statistics = preview().querySelector<HTMLElement>('.v1-meter-quality__scroller')!;
    expect(statistics.getAttribute('role')).toBe('region'); expect(statistics.tabIndex).toBe(0);
    statistics.scrollIntoView({ block: 'center' }); statistics.focus();
    expect(document.activeElement).toBe(statistics); expect(getComputedStyle(statistics).outlineStyle).toBe('solid');
    if (width === 390) {
      expect(statistics.scrollWidth).toBeGreaterThan(statistics.clientWidth);
      await userEvent.keyboard('{ArrowRight}');
      await vi.waitFor(() => expect(statistics.scrollLeft).toBeGreaterThan(0));
    }
    const annual = preview().querySelector('app-data-quality-annual-totals')!;
    expect(getComputedStyle(annual.querySelector('thead th')!).textAlign).toBe('center');
    expect(getComputedStyle(annual.querySelector('tbody th')!).textAlign).toBe('left');
    const pdf = host.querySelector<HTMLButtonElement>('footer app-report-output-actions button')!;
    expect(pdf.disabled).toBe(false); expect(pdf.title).toBe('');
    if (mode === 'manual' && theme !== 'dark') await page.screenshot({ element: host,
      path: `../../../../../../../.angular/data-quality-complete-${theme}.png` });
    await activate(host.querySelector<HTMLAnchorElement>('footer a')!);
    expect(host.querySelector<HTMLInputElement>('#report-workbench-name')!.value).toBe('Complete Data Quality Report');
    await activate([...host.querySelectorAll<HTMLButtonElement>('.content-presets button')].find(button => button.textContent?.trim() === 'Tables only')!);
    await activate(host.querySelector<HTMLAnchorElement>('footer a.v1-btn--action')!);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    expect(preview().querySelectorAll('.v1-meter-quality__chart, .predictor-quality__chart, app-data-quality-report-histogram')).toHaveLength(0);
    expect(preview().querySelectorAll('table')).toHaveLength(6);
  }, 15000);
  it.each([
    ['light', [], 1400], ['dark', ['v1-theme-dark'], 760], ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('renders Worker totals and keyboard sorting in %s', async (theme, classes, width) => {
    await page.viewport(width, 1200);
    const snapshot = annualTotalsSnapshot();
    const view = await setupReportWorkbench(snapshot.facilityReports, [WorkspaceCalendarizationService,
      { provide: EGridService, useValue: { excelCo2Emissions: ANNUAL_TEST_EMISSIONS } }], snapshot);
    const workbench = await view.open('report-a', 'report');
    const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '1150px', overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state, service.state().message).toBe('ready'); });
    expect(service.state().value!.annualTotals[0].rows[0].totalWithLocationEmissions).toBeGreaterThan(0);
    const scroller = host.querySelector<HTMLElement>('.annual-totals-scroller')!;
    const table = scroller.querySelector('table')!;
    const year = table.querySelector<HTMLButtonElement>('thead button')!;
    year.scrollIntoView({ block: 'center' }); year.focus();
    await userEvent.keyboard('{Enter}'); view.harness.detectChanges();
    expect(table.querySelector('tbody th')!.textContent?.trim()).toBe('2024');
    expect(table.querySelector('th[aria-sort="descending"]')!.textContent).toContain('Year');
    expect(document.activeElement).toBe(year);
    expect(scroller.getBoundingClientRect().width).toBeLessThanOrEqual(host.querySelector('.meter-report')!.getBoundingClientRect().width);
    expect(getComputedStyle(table).color).not.toBe(getComputedStyle(table.querySelector('thead th')!).backgroundColor);
    if (width === 420) {
      expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
      scroller.focus(); await userEvent.keyboard('{ArrowRight}');
    }
    await page.screenshot({ element: host.querySelector<HTMLElement>('.meter-report')!,
      path: `../../../../../../../.angular/data-quality-annual-totals-${theme}.png` });
  });
  it('loads the bundled eGRID rates before calculating standard electricity emissions', async () => {
    const snapshot = annualTotalsSnapshot(); snapshot.facilities[0].eGridSubregion = 'CAMX';
    const view = await setupReportWorkbench(snapshot.facilityReports, [WorkspaceCalendarizationService], snapshot);
    const workbench = await view.open('report-a', 'report');
    const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
    // Loading/parsing the workbook and starting a native Worker can exceed one second in the full suite.
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state, service.state().message).toBe('ready'); }, { timeout: 5000 });
    expect(service.state().value!.annualTotals[0].rows[0].totalWithLocationEmissions).toBeGreaterThan(0);
  }, 10000);
});
