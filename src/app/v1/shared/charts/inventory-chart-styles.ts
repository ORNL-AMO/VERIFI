export interface InventorySeriesStyle {
  readonly slot: number;
  readonly color: string;
  readonly lineStyle: 'solid' | readonly number[];
}

export function buildInventoryChartStyles(guids: readonly string[], previous: ReadonlyMap<string, InventorySeriesStyle> = new Map()): ReadonlyMap<string, InventorySeriesStyle> {
  const current = new Set(guids);
  const styles = new Map([...previous].filter(([guid]) => current.has(guid)));
  const occupied = new Set([...styles.values()].map(style => style.slot));
  let slot = 0;
  for (const guid of [...current].sort()) {
    if (styles.has(guid)) continue;
    while (occupied.has(slot)) slot++;
    const pattern = Math.floor(slot / 12);
    const dash = pattern === 0 ? null : pattern === 1 ? [8, 4] : pattern === 2 ? [2, 4]
      : [10 + (pattern - 3) * 2, 4, 2, 4];
    styles.set(guid, { slot, color: `var(--v1-chart-series-${slot % 12 + 1})`, lineStyle: dash ?? 'solid' });
    occupied.add(slot);
  }
  return styles;
}
