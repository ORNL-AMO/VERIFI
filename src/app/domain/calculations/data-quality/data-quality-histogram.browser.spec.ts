import * as PlotlyJS from 'plotly.js-dist-min';
import { buildDataQualityHistogram } from './data-quality-histogram';

// Reference the installed v0 renderer only in this compatibility test; production v1 uses ECharts.
const plotly = PlotlyJS as unknown as {
  newPlot(host: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
  purge(host: HTMLElement): void;
};
describe('Data Quality histogram compatibility with the v0 Plotly configuration', () => {
  it.each([
    ['consumption', [1, 2, 3, 4, 5], 2],
    ['cost', [-20, 0, 20, 40, 80], 3],
    ['predictor', [10, 10, 11, 12, 100], 50]
  ] as const)('matches ordinary %s bin boundaries and frequencies', async (_kind, values, numberOfBins) => {
    const host = document.createElement('div'); document.body.append(host);
    const min = Math.min(...values), max = Math.max(...values), size = Math.ceil((max - min) / numberOfBins);
    try {
      await plotly.newPlot(host, [{ type: 'histogram', x: [...values], xbins: { start: min, end: max, size } }],
        { width: 500, height: 350 }, { staticPlot: true });
      const legacy = host as unknown as { calcdata: { p: number; s: number }[][] };
      const result = buildDataQualityHistogram(values, numberOfBins);
      expect(result.binSize).toBe(size);
      expect(result.bins.map(bin => bin.count)).toEqual(legacy.calcdata[0].map(bin => bin.s));
      expect(result.bins.map(bin => (bin.lower + bin.upper) / 2)).toEqual(legacy.calcdata[0].map(bin => bin.p));
    } finally { plotly.purge(host); host.remove(); }
  });
});
