/** Population z-scores; gaps remain gaps. Scaled arithmetic bounds intermediate values. */
export function zScores(values: readonly (number | null)[]): { values: (number | null)[]; available: boolean } {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  // Scaling first bounds intermediate arithmetic even for very large or tiny usage values.
  const magnitude = finite.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  let mean = 0, squaredDeviations = 0, count = 0;
  for (const value of finite) {
    const scaled = magnitude ? value / magnitude : 0;
    const delta = scaled - mean;
    mean += delta / ++count;
    squaredDeviations += delta * (scaled - mean);
  }
  const deviation = Math.sqrt(squaredDeviations / count);
  const available = count >= 2 && deviation > 0 && Number.isFinite(deviation);
  return { available, values: values.map(value => available && value != null && Number.isFinite(value)
    ? (value / magnitude - mean) / deviation : null) };
}
