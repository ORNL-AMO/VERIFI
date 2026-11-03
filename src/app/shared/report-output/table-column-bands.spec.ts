import { projectTableHeaders, tableColumnBands } from './table-column-bands';

describe('report table column bands', () => {
  it('keeps the identifying column and each selected data column in order', () => {
    expect(tableColumnBands(10, 4)).toEqual([[0, 1, 2, 3], [0, 4, 5, 6], [0, 7, 8, 9]]);
    expect(tableColumnBands(3, 4)).toEqual([[0, 1, 2]]);
  });

  it('retains intersecting grouped headers without mutating their spans', () => {
    const headers = [{ content: 'Period', colspan: 1 }, { content: 'Use', colspan: 3 }, { content: 'Savings', colspan: 2 }];
    expect(projectTableHeaders(headers, [0, 3, 4, 5], cell => cell.colspan, (cell, colspan) => ({ ...cell, colspan })))
      .toEqual([{ content: 'Period', colspan: 1 }, { content: 'Use', colspan: 1 }, { content: 'Savings', colspan: 2 }]);
    expect(headers[1].colspan).toBe(3);
  });
});
