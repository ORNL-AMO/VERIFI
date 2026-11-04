import { TestBed } from '@angular/core/testing';
import { AnalysisResultsTableComponent } from './analysis-results-table.component';
import { AnalysisResultsTableModule } from './analysis-results-table.module';
import { AnalysisResultsTableView } from './analysis-results-table.models';

describe('shared analysis results table', () => {
  const view: AnalysisResultsTableView = {
    headers: [
      { id: 'actual', label: 'Actual', section: 'use' },
      { id: 'production', label: 'Production', unit: 'widgets', section: 'predictors' },
      { id: 'savings', label: 'Savings', section: 'improvement' },
      { id: 'improvement', label: 'Annual savings % improvement', section: 'improvement' }
    ],
    rows: [{ key: '2023', label: '2023', markers: ['transition'], missing: true, fiscalYearEnd: true,
      cells: [{ value: 1203.25 }, { value: 0, missing: true }, { value: null }, { value: 3.126, percent: true }] }]
  };

  function render() {
    TestBed.configureTestingModule({ imports: [AnalysisResultsTableModule] });
    const fixture = TestBed.createComponent(AnalysisResultsTableComponent);
    fixture.componentRef.setInput('view', view);
    fixture.componentRef.setInput('period', 'annual');
    fixture.componentRef.setInput('caption', 'Facility annual results');
    fixture.componentRef.setInput('showCaption', true);
    fixture.componentRef.setInput('category', 'water');
    fixture.componentRef.setInput('unit', 'kgal');
    fixture.detectChanges();
    return fixture;
  }

  it('shares grouped headings, numeric formatting, markers and accessible scrolling', () => {
    const fixture = render(), root = fixture.nativeElement as HTMLElement;
    const headings = Array.from(root.querySelectorAll<HTMLTableCellElement>('th[scope=colgroup]'));
    expect(headings.map(heading => heading.textContent?.trim())).toEqual(['Consumption (kgal)', 'Production Variables', 'Incremental Improvement']);
    expect(headings.map(heading => heading.colSpan)).toEqual([1, 1, 2]);
    expect(root.querySelector('[role=region]')?.getAttribute('tabindex')).toBe('0');
    expect(root.querySelector('caption')?.textContent).toBe('Facility annual results');
    expect(Array.from(root.querySelectorAll('tbody td')).map(cell => cell.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['1,203.3', '0 ⚠', '—', '3.13%']);
    expect(root.querySelector('tbody tr')?.classList.contains('v1-analysis-results__fiscal-year-end')).toBe(true);
    expect(root.querySelector('tbody tr')?.classList.contains('v1-analysis-results__missing')).toBe(true);
    expect(root.querySelector('tbody th [role=img][aria-label="Transition period"]')).not.toBeNull();
  });

  it('highlights matching columns and recalculates group spans when the caller changes visible columns', () => {
    const fixture = render(), root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll('tbody td')[2].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(root.querySelectorAll('.v1-analysis-results-table__column-hover')).toHaveLength(3);
    root.querySelector('table')!.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(root.querySelectorAll('.v1-analysis-results-table__column-hover')).toHaveLength(0);
    fixture.componentRef.setInput('view', { headers: view.headers.slice(0, 1), rows: view.rows.map(row => ({ ...row, cells: row.cells.slice(0, 1) })) });
    fixture.detectChanges();
    expect(root.querySelectorAll('th[scope=colgroup]')).toHaveLength(1);
    expect(view.headers).toHaveLength(4);
  });
});
