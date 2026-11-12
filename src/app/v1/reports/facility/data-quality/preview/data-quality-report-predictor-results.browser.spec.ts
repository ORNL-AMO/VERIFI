import { page, userEvent } from 'vitest/browser';
import { echarts } from '@app/v1/shared/charts/echarts';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityPredictorReadingsSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

describe('Data Quality predictor report in Chromium', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it.each([
    ['light', [], 1600], ['dark', ['v1-theme-dark'], 760],
    ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('renders predictor-only weather results, chart interaction, and refresh in %s', async (theme, classes, width) => {
    await page.viewport(width, 1000);
    const snapshot = dataQualityPredictorReadingsSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
      selectedMeterIds: [], selectedPredictorIds: ['predictor-a', 'predictor-b'], includePredictorHistogram: false
    });
    Object.assign(snapshot.predictors[0], { predictorType: 'Weather', weatherDataType: 'HDD', unit: '',
      heatingBaseTemperature: 65, ignoreWeatherDataWarning: true, ignoreDateStatusChecks: true });
    snapshot.predictorData = snapshot.predictorData.filter(reading => reading.predictorId === 'predictor-a');
    snapshot.account.expectedRangeSettings = { ...snapshot.account.expectedRangeSettings, enabled: false };
    const copyTable = vi.fn();
    const view = await setupReportWorkbench(snapshot.facilityReports, [{ provide: CopyTableService, useValue: { copyTable } }], snapshot);
    const workbench = await view.open('report-a', 'report');
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '950px', overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(host.querySelectorAll('.predictor-report')).toHaveLength(2);
    expect(host.querySelector('.meter-report')).toBeNull();
    expect(host.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
    expect(host.querySelectorAll('.report-component-divider')).toHaveLength(2);
    expect(host.textContent).toContain('No readings found for this predictor.');
    expect(host.textContent).toContain('Base Temperature: 65 °F');
    expect(host.textContent).toContain('Missing months: Feb 2024');
    expect(host.textContent).toContain('Incomplete weather source data: Jan 2024');
    for (const heading of host.querySelectorAll<HTMLElement>('.predictor-report h3')) {
      expect(getComputedStyle(heading).textAlign).toBe('center');
      expect(Number(getComputedStyle(heading).fontWeight)).toBeGreaterThanOrEqual(700);
    }
    for (const heading of host.querySelectorAll<HTMLElement>('.predictor-quality__panel-heading h2')) {
      const groupHeading = heading.closest('article')!.querySelector<HTMLElement>('h3')!;
      expect(parseFloat(getComputedStyle(groupHeading).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(heading).fontSize));
    }
    const frame = host.querySelector<HTMLElement>('.predictor-report')!.getBoundingClientRect();
    const preview = host.querySelector<HTMLElement>('app-data-quality-report-preview')!.getBoundingClientRect();
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(frame.width).toBeLessThanOrEqual(76 * rootFont + 1);
    expect(Math.abs(frame.x + frame.width / 2 - preview.x - preview.width / 2)).toBeLessThanOrEqual(1);
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    const chart = () => host.querySelector<HTMLElement>('.predictor-quality__chart')!;
    await vi.waitFor(() => { expect(echarts.getInstanceByDom(chart())?.getOption().series).toHaveLength(5); });
    const instance = echarts.getInstanceByDom(chart())!;
    const option = instance.getOption() as { series: { name: string; data: unknown[]; markArea?: { label: { show: boolean } } }[] };
    expect(option.series.map(series => series.name)).toEqual([
      'Predictor values', 'Outliers', 'Weather warnings', 'Revised weather data', 'Missing months'
    ]);
    expect(option.series[0].data).toHaveLength(5);
    expect(option.series[0].markArea!.label.show).toBe(false);
    expect(host.querySelector('.predictor-quality__accessible-data')!.textContent).toContain('Outlier');
    instance.setOption({ animation: false });
    await page.viewport(width, 2000); host.style.height = '1950px';
    host.querySelector<HTMLElement>('.predictor-report')!.scrollIntoView({ block: 'center' });
    instance.getZr().refreshImmediately();
    for (const seriesName of ['Weather warnings', 'Outliers', 'Revised weather data']) {
      const seriesIndex = option.series.findIndex(series => series.name === seriesName);
      const point = option.series[seriesIndex].data[0] as { value: number[] };
      const readingCount = snapshot.predictorData.filter(reading => Date.UTC(reading.year, reading.month - 1, 1) === point.value[0]).length;
      const [x, y] = instance.convertToPixel({ seriesIndex }, point.value) as number[];
      // Edge markers extend beyond the plot; hover their interior so the axis tooltip is activated.
      await userEvent.hover(chart().querySelector('canvas')!, { position: { x: x + (seriesName === 'Weather warnings' ? 2 : -2), y: y + 2 } });
      await vi.waitFor(() => {
        const tooltip = chart().querySelector<HTMLElement>('.v1-chart-tooltip')!;
        expect(getComputedStyle(tooltip).visibility).toBe('visible');
        expect(tooltip.textContent).toContain(`Predictor values: ${point.value[1]}`);
        expect(tooltip.textContent!.match(/Predictor values:/g)).toHaveLength(readingCount);
        expect(tooltip.textContent).not.toMatch(/Outliers:|Weather warnings:|Revised weather data:/);
      });
    }
    instance.dispatchAction({ type: 'hideTip' });
    await page.screenshot({ element: host.querySelector<HTMLElement>('.predictor-report')!,
      path: `../../../../../../../.angular/data-quality-predictor-${theme}.png` });
    await page.viewport(width, 1000); host.style.height = '950px';
    instance.dispatchAction({ type: 'dataZoom', start: 10, end: 90 });
    expect((instance.getOption().dataZoom as { start: number }[])[0].start).toBe(10);
    expect(instance.getDataURL({ type: 'png' })).toMatch(/^data:image\/png/);
    const copy = host.querySelector<HTMLButtonElement>('.predictor-quality__footer button')!;
    copy.scrollIntoView(); copy.focus(); await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(copyTable).toHaveBeenCalledOnce());
    const oldChart = chart();
    const changed = { ...snapshot.predictorData[0], amount: 50 };
    view.store.publishCommittedPatch({ collections: [{ collection: 'predictorData', upsert: [changed] }] });
    expect(service.state().value).toBeUndefined(); view.harness.detectChanges();
    expect(echarts.getInstanceByDom(oldChart)).toBeUndefined();
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(service.state().value!.predictors[0].statistics.average).toBe(36.6);
    await view.open('report-a', 'setup'); expect(service.state().value).toBeUndefined();
    await view.open('report-a', 'report');
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(service.state().value!.predictors[0].statistics.average).toBe(36.6);
    expect(host.querySelector<HTMLButtonElement>('footer app-report-output-actions button')!.disabled).toBe(true);
  });
  it('renders both source types in analysis mode with unique headings and native charts', async () => {
    const snapshot = dataQualityPredictorReadingsSnapshot();
    Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, { selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a',
      includePredictorHistogram: false, includeMeterConsumptionHistogram: false });
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open('report-a', 'report');
    const service = workbench.workbench.session()!.injector.get(DataQualityReportService);
    const host = view.harness.fixture.nativeElement as HTMLElement;
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.state().state).toBe('ready'); });
    expect(host.querySelectorAll('.meter-report')).toHaveLength(2);
    expect(host.querySelectorAll('.predictor-report')).toHaveLength(2);
    const ids = [...host.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(host.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
    const charts = [...host.querySelectorAll<HTMLElement>('.predictor-quality__chart')];
    await vi.waitFor(() => charts.forEach(chart => expect(echarts.getInstanceByDom(chart)?.getOption().series).toBeDefined()));
  });
});
