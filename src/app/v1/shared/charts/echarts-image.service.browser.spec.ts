import { TestBed } from '@angular/core/testing';
import { EChartsImageService } from './echarts-image.service';
import { V1EChartsOption } from './echarts';
import { metricResultsChartOption } from './metric-results-chart/metric-results-chart-option';

describe('EChartsImageService in Chromium', () => {
  beforeEach(() => TestBed.configureTestingModule({}));
  afterEach(() => TestBed.resetTestingModule());

  it('renders a complete high-resolution chart without a mounted preview and removes its canvas', async () => {
    const dataUrl = await TestBed.inject(EChartsImageService).capture({
      xAxis: { type: 'category', data: ['Baseline', 'Report'] }, yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [100, 75], label: { show: true } }]
    });
    const image = await decodeImage(dataUrl);
    expect([image.width, image.height]).toEqual([2400, 1350]);
    expect(await coloredPixels(image)).toBeGreaterThan(1000);
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
  });

  it.each(['light', 'dark', 'high-contrast'])('keeps white document colors in %s appearance', async appearance => {
    const root = document.createElement('div'); root.className = `v1-root v1-theme-${appearance}`;
    root.style.setProperty('--v1-text', '#ffffff'); root.style.setProperty('--v1-chart-series-1', '#ffff00');
    document.body.appendChild(root);
    try {
      const service = TestBed.inject(EChartsImageService);
      const option = { xAxis: { type: 'category', data: ['First', 'Second'] }, yAxis: { type: 'value' },
        series: [{ type: 'line', data: [5, 9], lineStyle: { color: 'var(--v1-chart-series-1)' } }] } as V1EChartsOption;
      const themed = await service.capture(option, { width: 320, height: 180 });
      root.remove();
      const plain = await service.capture(option, { width: 320, height: 180 });
      expect(themed).toBe(plain);
      const image = await decodeImage(plain);
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      expect([...context.getImageData(0, 0, 1, 1).data]).toEqual([255, 255, 255, 255]);
    } finally { root.remove(); }
  });

  it('captures custom comparison bands, scatter/model areas, and heatmaps using the registered renderer', async () => {
    const service = TestBed.inject(EChartsImageService);
    const comparison = metricResultsChartOption({
      rows: [
        { periodKey: '1', periodLabel: 'January', sortValue: 1, values: { actual: 10, calculated: 20 } },
        { periodKey: '2', periodLabel: 'February', sortValue: 2, values: { actual: 20, calculated: 10 } }
      ], metrics: [{ id: 'actual', label: 'Actual' }, { id: 'calculated', label: 'Calculated' }], allMetrics: true,
      comparisonBand: { referenceMetricId: 'actual', comparisonMetricId: 'calculated',
        comparisonAboveColor: 'var(--v1-success)', referenceAboveColor: 'var(--v1-danger)' }
    });
    const options: V1EChartsOption[] = [comparison, {
      xAxis: { type: 'value' }, yAxis: { type: 'value' },
      series: [{ type: 'scatter', data: [[0, 2], [1, 3], [2, 1]],
        markArea: { data: [[{ xAxis: 0 }, { xAxis: 1 }]] } }]
    }, {
      xAxis: { type: 'category', data: ['2024', '2025'] }, yAxis: { type: 'category', data: ['Group one', 'Group two'] },
      visualMap: { min: -2, max: 2, inRange: { color: ['var(--v1-danger)', 'var(--v1-panel)', 'var(--v1-success)'] } },
      series: [{ type: 'heatmap', data: [[0, 0, 2], [0, 1, -2], [1, 0, 1], [1, 1, 0]] }]
    }];
    for (const option of options) {
      const image = await decodeImage(await service.capture(option, { width: 480, height: 270, pixelRatio: 1 }));
      expect(await coloredPixels(image)).toBeGreaterThan(100);
      expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
    }
  });

  it('cancels queued work and still permits a subsequent capture', async () => {
    const service = TestBed.inject(EChartsImageService), controller = new AbortController();
    const option: V1EChartsOption = { xAxis: { type: 'category', data: ['A'] }, yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [1] }] };
    const first = service.capture(option, { width: 320, height: 180 });
    const second = service.capture(option, { width: 320, height: 180 }, controller.signal);
    const rejected = expect(second).rejects.toMatchObject({ name: 'AbortError' }); controller.abort();
    await rejected; await first;
    expect(await service.capture(option, { width: 320, height: 180 })).toMatch(/^data:image\/png;base64,/);
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
  });
});

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url;
  });
}

async function coloredPixels(image: HTMLImageElement): Promise<number> {
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]) > 20) count++;
  }
  return count;
}
