/** Keep the identifying first column on every band without changing data-column order. */
export function tableColumnBands(columnCount: number, maximumColumns: number): readonly (readonly number[])[] {
  if (columnCount <= maximumColumns) return [Array.from({ length: columnCount }, (_, index) => index)];
  const bands: number[][] = [];
  for (let start = 1; start < columnCount; start += maximumColumns - 1) {
    bands.push([0, ...Array.from({ length: Math.min(maximumColumns - 1, columnCount - start) }, (_, index) => start + index)]);
  }
  return bands;
}

/** Retain grouped headers when a column band intersects only part of a group. */
export function projectTableHeaders<T extends { content: string }>(headers: readonly (string | T)[], columns: readonly number[],
  span: (cell: T) => number, resize: (cell: T, count: number) => T): (string | T)[] {
  const selected = new Set(columns);
  let offset = 0;
  return headers.flatMap(cell => {
    const width = typeof cell === 'string' ? 1 : Math.max(1, span(cell));
    const count = Array.from({ length: width }, (_, index) => offset + index).filter(index => selected.has(index)).length;
    offset += width;
    return count ? [typeof cell === 'string' ? cell : resize(cell, count)] : [];
  });
}
