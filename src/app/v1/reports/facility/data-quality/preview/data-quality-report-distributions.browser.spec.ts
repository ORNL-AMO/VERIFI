import { page, userEvent } from 'vitest/browser';
import { echarts } from '@app/v1/shared/charts/echarts';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityDistributionSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

describe('Data Quality dot-plot distributions in Chromium', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it.each([
    ['light', [], 1600], ['dark', ['v1-theme-dark'], 760], ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('renders full-history readings, hover, zoom, and PNG in %s', async (theme, classes, width) => {
    await page.viewport(width, 2000);
    const snapshot = dataQualityDistributionSnapshot();
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading,
      totalEnergyUse: index % 4 * 10, totalCost: index % 4 * 20 }));
    const savedSettings = structuredClone(snapshot.facilityReports[0].dataQualityReportSettings);
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open('report-a', 'report');
    const host = view.harness.fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...classes);
    Object.assign(host.style, { display: 'block', width: `${width}px`, height: '1950px', overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(host.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    const charts = () => [...host.querySelectorAll<HTMLElement>('.quality-dot-plot__chart')];
    expect(charts()).toHaveLength(3);
    expect(host.querySelectorAll('.report-component-divider')).toHaveLength(3);
    expect(host.querySelector('app-data-quality-report-histogram')).toBeNull();
    expect(host.textContent).not.toMatch(/Number of bins|Preview only/);
    await vi.waitFor(() => charts().forEach(chart =>
      expect(echarts.getInstanceByDom(chart)?.getOption().series).toHaveLength(3)));
    const chart = echarts.getInstanceByDom(charts()[0])!;
    const series = chart.getOption().series as { type: string; data: { value: number[] }[]; markArea?: unknown }[];
    expect(series.slice(0, 2).map(item => item.type)).toEqual(['scatter', 'scatter']);
    expect(series[0].data).toHaveLength(4);
    expect(series[0].markArea).toBeDefined();
    const [x, y] = chart.convertToPixel({ seriesIndex: 0 }, series[0].data[0].value) as number[];
    await userEvent.hover(charts()[0].querySelector('canvas')!, { position: { x, y } });
    await vi.waitFor(() => {
      const tooltip = charts()[0].querySelector('.v1-chart-tooltip')!.textContent;
      expect(tooltip).toContain('Total Consumption: 0');
      expect(tooltip!.match(/Total Consumption:/g)).toHaveLength(1);
    });
    chart.dispatchAction({ type: 'hideTip' });
    chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
    expect((chart.getOption().dataZoom as { start: number }[])[0].start).toBe(25);
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    expect(chart.getDataURL({ type: 'png' })).toMatch(/^data:image\/png/);
    for (const heading of host.querySelectorAll<HTMLElement>('.quality-dot-plot__heading h2')) {
      const groupHeading = heading.closest('article')!.querySelector<HTMLElement>('h3')!;
      expect(parseFloat(getComputedStyle(groupHeading).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(heading).fontSize));
    }
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    const detached = structuredClone(results.exportSnapshot()!);
    expect(detached).not.toHaveProperty('histogramBinCounts');
    expect(detached.results.meters[0].chartRows[0].date).toBeInstanceOf(Date);
    await view.open('report-a', 'setup');
    const setupText = host.textContent;
    expect(setupText).toContain('Consumption distribution'); expect(setupText).toContain('Cost distribution');
    expect(setupText).not.toMatch(/histogram|Number of bins/i);
    await view.open('report-a', 'report');
    await vi.waitFor(() => { view.harness.detectChanges(); expect(charts()).toHaveLength(3); });
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(view.store.facilityReports()[0].dataQualityReportSettings).toEqual(savedSettings);
    const readings = snapshot.meterData.filter(reading => reading.meterId === 'meter-a');
    const values = new Map(readings.map((reading, index) => [reading.guid, [10, 11, 12, 100][index]]));
    view.store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: view.store.meterData()
      .map(reading => values.has(reading.guid) ? { ...reading, totalEnergyUse: values.get(reading.guid)! } : reading) }] });
    await vi.waitFor(() => {
      view.harness.detectChanges();
      const option = echarts.getInstanceByDom(charts()[0])?.getOption();
      expect((option?.series as { data: unknown[] }[] | undefined)?.[1].data).toHaveLength(1);
    });
    await page.screenshot({ element: charts()[0].closest<HTMLElement>('app-data-quality-report-dot-plot')!,
      path: `../../../../../../../.angular/data-quality-dot-plot-${theme}.png` });
  });

  it('stacks constant values and removes stale charts when values become invalid', async () => {
    const snapshot = dataQualityDistributionSnapshot();
    snapshot.meterData = snapshot.meterData.map(reading => ({ ...reading, totalEnergyUse: 5, totalCost: 0 }));
    snapshot.predictorData = snapshot.predictorData.map(reading => ({ ...reading, amount: NaN }));
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open('report-a', 'report');
    const host = view.harness.fixture.nativeElement as HTMLElement;
    const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    const chart = host.querySelector<HTMLElement>('.quality-dot-plot__chart')!;
    await vi.waitFor(() => expect((echarts.getInstanceByDom(chart)?.getOption().series as
      { data: { value: number[] }[] }[])?.[0].data.map(item => item.value)).toEqual([[5, 1], [5, 2], [5, 3], [5, 4]]));
    const invalid = view.store.meterData().map(reading => ({ ...reading, totalEnergyUse: NaN }));
    view.store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: invalid }] });
    await vi.waitFor(() => { view.harness.detectChanges(); expect(host.textContent).toContain('No usable numeric readings'); });
    expect(host.querySelector('.quality-dot-plot__chart')).toBeNull();
    expect(echarts.getInstanceByDom(chart)).toBeUndefined();
  });
});
