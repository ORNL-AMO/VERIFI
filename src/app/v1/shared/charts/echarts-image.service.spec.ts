import { TestBed } from '@angular/core/testing';
import { EChartsImageService, documentChartOption, ECHARTS_IMAGE_TIMEOUT_MS, ECHARTS_IMAGE_FACTORY } from './echarts-image.service';

const rendering = { charts: [] as Array<{
  events: Map<string, () => void>;
  setOption: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  getDataURL: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}> };

const createChart = () => {
  const events = new Map<string, () => void>();
  const chart = { events, setOption: vi.fn(), dispose: vi.fn(), getDataURL: vi.fn(() => 'data:image/png;base64,aW1hZ2U='),
    on: vi.fn((event: string, callback: () => void) => events.set(event, callback)), off: vi.fn() };
  rendering.charts.push(chart); return chart;
};

describe('EChartsImageService', () => {
  beforeEach(() => { rendering.charts.length = 0; TestBed.configureTestingModule({ providers: [{ provide: ECHARTS_IMAGE_FACTORY, useValue: createChart }] }); });
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });

  it('registers completion before setOption, serializes captures, and removes every temporary host', async () => {
    const service = TestBed.inject(EChartsImageService);
    const first = service.capture({ series: [{ type: 'bar', data: [1] }] });
    const second = service.capture({ series: [{ type: 'line', data: [2] }] });
    await Promise.resolve();
    expect(rendering.charts).toHaveLength(1);
    expect(document.querySelectorAll('[data-report-chart-capture]')).toHaveLength(1);
    const a = rendering.charts[0];
    expect(a.on.mock.invocationCallOrder[0]).toBeLessThan(a.setOption.mock.invocationCallOrder[0]);
    a.events.get('finished')!();
    await expect(first).resolves.toContain('data:image/png');
    await Promise.resolve();
    expect(a.dispose).toHaveBeenCalledOnce();
    expect(rendering.charts).toHaveLength(2);
    rendering.charts[1].events.get('finished')!();
    await second;
    expect(rendering.charts[1].dispose).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
  });

  it('aborts an active capture, cleans its listeners, and continues the queue', async () => {
    const service = TestBed.inject(EChartsImageService), controller = new AbortController();
    const capture = service.capture({ series: [] }, {}, controller.signal);
    const rejected = expect(capture).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve(); controller.abort(); await rejected; await Promise.resolve();
    expect(rendering.charts[0].dispose).toHaveBeenCalledOnce();
    expect(rendering.charts[0].off).toHaveBeenCalledWith('finished', expect.any(Function));
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
    const retry = service.capture({ series: [] });
    await Promise.resolve(); await Promise.resolve();
    rendering.charts[1].events.get('finished')!(); await retry;
  });

  it('fails finitely if ECharts never completes and removes its resources', async () => {
    vi.useFakeTimers();
    const capture = TestBed.inject(EChartsImageService).capture({ series: [] });
    const rejected = expect(capture).rejects.toThrow('did not finish rendering');
    await Promise.resolve(); await vi.advanceTimersByTimeAsync(ECHARTS_IMAGE_TIMEOUT_MS); await rejected;
    expect(rendering.charts[0].dispose).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-report-chart-capture]')).toBeNull();
  });

  it('rejects invalid dimensions and already cancelled work before creating a chart', async () => {
    const service = TestBed.inject(EChartsImageService), controller = new AbortController(); controller.abort();
    await expect(service.capture({}, { width: 0 })).rejects.toThrow('dimensions');
    await expect(service.capture({}, {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(rendering.charts).toHaveLength(0);
  });
});

describe('documentChartOption', () => {
  it('resolves semantic colors without reading UI styles and removes animation and zoom', () => {
    const source: any = { animation: true, dataZoom: [{ start: 30, end: 70 }],
      legend: [{ textStyle: { color: 'var(--v1-text)' } }],
      series: [{ type: 'bar', animation: true, itemStyle: { color: 'var(--v1-success)' }, data: [0, -2] }] };
    const option = documentChartOption(source) as any;
    expect(option).toMatchObject({ animation: false, backgroundColor: '#ffffff', tooltip: { show: false }, dataZoom: [] });
    expect(option.series[0]).toMatchObject({ animation: false, itemStyle: { color: '#18794d' }, data: [0, -2] });
    expect(option.legend[0].textStyle.color).toBe('#17231f');
    expect(source.series[0].itemStyle.color).toBe('var(--v1-success)');
  });

  it('rejects unresolved semantic colors instead of silently creating unreadable images', () => {
    expect(() => documentChartOption({ color: ['var(--unknown-color)'] })).toThrow('unsupported color');
  });
});
