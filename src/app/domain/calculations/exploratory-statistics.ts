/** Ordinary least squares with an intercept and signed Pearson r. Full precision, no rendering dependencies. */
export interface CorrelationStatistics { readonly r?: number; readonly rSquared?: number; readonly slope?: number; readonly intercept?: number; readonly unavailableReason?: string; }
export function correlationStatistics(pairs: readonly { readonly x: number; readonly y: number }[]): CorrelationStatistics {
  if (pairs.length < 3) return { unavailableReason: 'At least three complete paired months are needed for a linear fit and correlation.' };
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let xx = 0, yy = 0, xy = 0;
  for (const pair of pairs) {
    const x = pair.x - meanX, y = pair.y - meanY;
    xx += x * x; yy += y * y; xy += x * y;
  }
  if (xx === 0 || yy === 0) return { unavailableReason: 'Both predictor and group usage must vary to calculate a linear fit and correlation.' };
  const r = Math.max(-1, Math.min(1, xy / Math.sqrt(xx) / Math.sqrt(yy)));
  const slope = xy / xx, intercept = meanY - slope * meanX;
  if (![r, slope, intercept].every(Number.isFinite)) return { unavailableReason: 'The values exceed the supported range for correlation.' };
  return { r, rSquared: r * r, slope, intercept };
}
