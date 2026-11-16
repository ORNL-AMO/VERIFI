/** Identity-derived defaults remain stable when live members arrive or disappear. */
export function visualizationSeriesStyle(identity: string): { color: string; lineStyle: 'solid' | 'dashed' | 'dotted' } {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index++) hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619) >>> 0;
  return { color: `var(--v1-chart-series-${hash % 12 + 1})`, lineStyle: (['solid', 'dashed', 'dotted'] as const)[Math.floor(hash / 12) % 3] };
}
