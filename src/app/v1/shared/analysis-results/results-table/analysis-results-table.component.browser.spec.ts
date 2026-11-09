import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { AnalysisResultsTableComponent } from './analysis-results-table.component';
import { AnalysisResultsTableModule } from './analysis-results-table.module';

describe('Shared Analysis table styles in Chromium', () => {
  it('retains numeric alignment, themed headings and keyboard scrolling after sharing its table foundation', async () => {
    TestBed.configureTestingModule({ imports: [AnalysisResultsTableModule] });
    const fixture = TestBed.createComponent(AnalysisResultsTableComponent);
    fixture.componentRef.setInput('view', {
      headers: [{ id: 'actual', label: 'Actual Energy', section: 'use' },
        { id: 'savings', label: 'Savings', section: 'improvement' }],
      rows: [{ key: '2025', label: '2025', markers: [], cells: [{ value: 1234.5 }, { value: 20 }] }]
    });
    fixture.componentRef.setInput('period', 'annual');
    fixture.componentRef.setInput('caption', 'Annual energy results');
    fixture.componentRef.setInput('unit', 'MMBtu');
    const root = fixture.nativeElement as HTMLElement;
    try {
      for (const [width, theme] of [[1400, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 950); root.className = `v1-root ${theme}`; fixture.detectChanges(); await fixture.whenStable();
        const region = root.querySelector<HTMLElement>('[role=region]')!;
        const cell = root.querySelector<HTMLElement>('tbody td')!;
        const heading = root.querySelector<HTMLElement>('thead tr:last-child th')!;
        expect(getComputedStyle(cell).textAlign).toBe('right');
        expect(getComputedStyle(cell).whiteSpace).toBe('nowrap');
        expect(getComputedStyle(cell).paddingLeft).not.toBe('0px');
        expect(getComputedStyle(heading).textTransform).toBe('uppercase');
        expect(textContrast(cell, region)).toBeGreaterThanOrEqual(4.5);
        expect(region.scrollHeight).toBeLessThanOrEqual(region.clientHeight + 1);
        if (width === 390) {
          expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
          region.focus(); await userEvent.keyboard('{ArrowRight}');
          await vi.waitFor(() => expect(region.scrollLeft).toBeGreaterThan(0));
        }
        await page.screenshot({ element: root, path: `../../../../../../tmp/energy-use-results/shared-analysis-table-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
    } finally { fixture.destroy(); }
  });
});
