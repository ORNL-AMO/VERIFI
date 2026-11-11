export const DEFAULT_QUALITY_HISTOGRAM_BINS = 50;
export const MAX_QUALITY_HISTOGRAM_BINS = 1000;

export interface DataQualityHistogramBin {
  readonly lower: number;
  readonly upper: number;
  readonly count: number;
}

export interface DataQualityHistogram {
  readonly state: 'ready' | 'empty' | 'unavailable';
  readonly binSize?: number;
  readonly bins: readonly DataQualityHistogramBin[];
}

export function isValidQualityHistogramBinCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_QUALITY_HISTOGRAM_BINS;
}

/** Match v0's explicit Plotly start/end/ceil(size), right-open bins, and empty-tail trimming. */
export function buildDataQualityHistogram(values: readonly unknown[], requestedBins = DEFAULT_QUALITY_HISTOGRAM_BINS): DataQualityHistogram {
  const data = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!data.length) return { state: 'empty', bins: [] };
  const count = isValidQualityHistogramBinCount(requestedBins) ? requestedBins : DEFAULT_QUALITY_HISTOGRAM_BINS;
  let min = data[0], max = data[0];
  for (const value of data) { min = Math.min(min, value); max = Math.max(max, value); }
  if (min === max) {
    const upper = min + 1;
    return { state: 'ready', binSize: 1, bins: [{ lower: min, upper: Number.isFinite(upper) ? upper : min, count: data.length }] };
  }
  const range = max - min;
  const binSize = Math.ceil(count > 1 ? range / count : max > 0 ? max : range);
  const length = Math.ceil(range / binSize - 1e-6);
  if (!Number.isFinite(range) || !Number.isFinite(binSize) || binSize <= 0 || !Number.isInteger(length)
    || length < 1 || length > MAX_QUALITY_HISTOGRAM_BINS || min + binSize <= min) {
    return { state: 'unavailable', bins: [] };
  }
  const bins = Array.from({ length }, (_, index) => ({ lower: min + index * binSize, upper: min + (index + 1) * binSize, count: 0 }));
  if (bins.some(bin => !Number.isFinite(bin.lower) || !Number.isFinite(bin.upper) || bin.upper <= bin.lower)) {
    return { state: 'unavailable', bins: [] };
  }
  for (const value of data) {
    const index = Math.floor((value - min) / binSize + 1e-9);
    if (index >= 0 && index < bins.length) bins[index].count++;
  }
  while (bins.length > 1 && bins[bins.length - 1].count === 0) bins.pop();
  return { state: 'ready', binSize, bins };
}
