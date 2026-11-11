import { page, userEvent } from 'vitest/browser';
import { echarts } from '@app/v1/shared/charts/echarts';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityHistogramSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

describe('Data Quality distribution charts in Chromium', () => {
  afterEach(async () => { await page.viewport(1280, 720); });
  it.each([
    ['light', [], 1600], ['dark', ['v1-theme-dark'], 760], ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 420]
  ] as const)('renders and edits all histogram types with session-only preferences in %s', async (theme, classes, width) => {
    await page.viewport(width, 2000);
    const snapshot = dataQualityHistogramSnapshot();
    snapshot.meterData = snapshot.meterData.map((reading, index) => ({ ...reading, totalEnergyUse: index % 4 * 10, totalCost: index % 4 * 20 }));
    snapshot.predictorData = snapshot.predictorData.map((reading, index) => ({ ...reading, amount: index % 5 * 10 }));
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
    const charts = () => [...host.querySelectorAll<HTMLElement>('.quality-histogram__chart')];
    const inputs = () => [...host.querySelectorAll<HTMLInputElement>('.quality-histogram__bin-input')];
    expect(inputs().map(input => input.value)).toEqual(['50', '50', '50']);
    await vi.waitFor(() => charts().forEach(chart => expect(echarts.getInstanceByDom(chart)?.getOption().series).toHaveLength(1)));
    expect(charts().map(chart => ((echarts.getInstanceByDom(chart)!.getOption().series as { data: number[][] }[])[0].data.length))).toEqual([21, 21, 31]);
    for (const chart of charts()) {
      const axis = (echarts.getInstanceByDom(chart)!.getOption().xAxis as { type: string; data?: unknown[] }[])[0];
      expect(axis.type).toBe('value'); expect(axis.data).toBeUndefined();
    }
    expect(host.querySelectorAll('#data-quality-report-heading')).toHaveLength(1);
    expect(host.querySelectorAll('.report-component-divider')).toHaveLength(3);
    expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
    expect(inputs()[0].labels![0].textContent).toBe('Number of bins');
    const first = () => echarts.getInstanceByDom(charts()[0])!;
    await userEvent.fill(inputs()[0], '2');
    await vi.waitFor(() => {
      view.harness.detectChanges(); expect((first().getOption().series as { data: number[][] }[])[0].data.map(point => point[1])).toEqual([2, 1]);
    });
    expect(host.querySelector('.quality-histogram__controls')!.textContent).toContain('Bin Size: 15');
    await userEvent.fill(inputs()[0], ''); view.harness.detectChanges();
    expect(inputs()[0].getAttribute('aria-invalid')).toBe('true');
    expect(host.textContent).toContain('The chart keeps the last valid count.');
    expect((first().getOption().series as { data: number[][] }[])[0].data.map(point => point[1])).toEqual([2, 1]);
    await userEvent.fill(inputs()[0], '2'); view.harness.detectChanges();
    first().setOption({ animation: false }); first().getZr().refreshImmediately();
    const point = (first().getOption().series as { data: number[][] }[])[0].data[0];
    const [x, y] = first().convertToPixel({ seriesIndex: 0 }, point) as number[];
    await userEvent.hover(charts()[0].querySelector('canvas')!, { position: { x, y: y + 4 } });
    await vi.waitFor(() => {
      const tooltip = charts()[0].querySelector('.v1-chart-tooltip')!.textContent;
      expect(tooltip).toContain('Range: 0 \u2013 15'); expect(tooltip).toContain('Frequency: 2');
    });
    first().dispatchAction({ type: 'hideTip' });
    first().dispatchAction({ type: 'dataZoom', start: 25, end: 75 });
    expect((first().getOption().dataZoom as { start: number }[])[0].start).toBe(25);
    first().dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    first().getZr().refreshImmediately();
    expect(first().getDataURL({ type: 'png' })).toMatch(/^data:image\/png/);
    for (const chart of charts()) {
      const bounds = chart.getBoundingClientRect(), frame = chart.closest('.report-document')!.getBoundingClientRect();
      expect(bounds.width).toBeGreaterThan(100); expect(bounds.width).toBeLessThanOrEqual(frame.width);
    }
    await page.screenshot({ element: host.querySelector<HTMLElement>('.meter-report')!,
      path: `../../../../../../../.angular/data-quality-histograms-${theme}.png` });
    await view.open('report-a', 'setup'); await view.open('report-a', 'report');
    await vi.waitFor(() => { view.harness.detectChanges(); expect(inputs().map(input => input.value)).toEqual(['2', '50', '50']); });
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(view.store.facilityReports()[0].dataQualityReportSettings).toEqual(savedSettings);
    expect(host.querySelector<HTMLButtonElement>('footer app-report-output-actions button')!.disabled).toBe(true);
  });
  it('renders constant values as one bar and removes it for invalid-only readings', async () => {
    const snapshot = dataQualityHistogramSnapshot();
    snapshot.meterData = snapshot.meterData.map(reading => ({ ...reading, totalEnergyUse: 5, totalCost: 0 }));
    snapshot.predictorData = snapshot.predictorData.map(reading => ({ ...reading, amount: NaN }));
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open('report-a', 'report');
    const host = view.harness.fixture.nativeElement as HTMLElement;
    const results = workbench.workbench.session()!.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    const chart = host.querySelector<HTMLElement>('.quality-histogram__chart')!;
    await vi.waitFor(() => expect((echarts.getInstanceByDom(chart)?.getOption().series as { data: number[][] }[])?.[0].data).toEqual([[5.5, 4]]));
    expect(host.textContent).toContain('No usable values.');
    const invalid = view.store.meterData().map(reading => ({ ...reading, totalEnergyUse: NaN }));
    view.store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: invalid }] });
    await vi.waitFor(() => { view.harness.detectChanges(); expect(host.textContent).toContain('No usable numeric readings'); });
    expect(host.querySelector('.quality-histogram__chart')).toBeNull();
    expect(echarts.getInstanceByDom(chart)).toBeUndefined();
  });
});
