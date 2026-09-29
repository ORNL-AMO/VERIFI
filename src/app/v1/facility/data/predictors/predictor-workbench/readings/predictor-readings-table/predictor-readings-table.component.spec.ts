import { TestBed } from '@angular/core/testing';
import { buildPredictorReadingTableView } from '../../../models';
import { PredictorReadingsTableComponent } from './predictor-readings-table.component';

describe('PredictorReadingsTableComponent', () => {
  const predictor = { guid: 'predictor-a', name: 'Production', unit: 'tons', predictorType: 'Standard', canBeNegative: false } as any;

  it('sorts newest first and filters entries needing attention', () => {
    const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingsTableComponent] })
      .createComponent(PredictorReadingsTableComponent);
    fixture.componentInstance.view = buildPredictorReadingTableView(predictor, [
      reading('jan', 2026, 1, -2), reading('mar', 2026, 3, 10), reading('feb', 2026, 2, 5)
    ]);
    fixture.detectChanges();

    expect(months(fixture.nativeElement)).toEqual(['Mar 2026', 'Feb 2026', 'Jan 2026']);
    const filter = fixture.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    filter.value = 'attention';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(months(fixture.nativeElement)).toEqual(['Jan 2026']);
  });

  it('emits the selected readings for bulk deletion', () => {
    const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingsTableComponent] })
      .createComponent(PredictorReadingsTableComponent);
    fixture.componentInstance.view = buildPredictorReadingTableView(predictor, [reading('a', 2026, 1, 1)]);
    const emitted: string[][] = [];
    fixture.componentInstance.bulkDeleteRequested.subscribe(items => emitted.push(items.map(item => item.guid)));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    root.querySelector<HTMLInputElement>('tbody input')?.click();
    fixture.detectChanges();
    Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Delete Selected'))?.click();

    expect(emitted).toEqual([['a']]);
  });

  it('preserves selection while paging and clears it when the filter changes', () => {
    const fixture = TestBed.configureTestingModule({ imports: [PredictorReadingsTableComponent] })
      .createComponent(PredictorReadingsTableComponent);
    fixture.componentInstance.view = buildPredictorReadingTableView(predictor, Array.from(
      { length: 12 },
      (_, index) => reading(`reading-${index}`, 2025 + Math.floor(index / 12), index % 12 + 1, index === 0 ? -1 : index)
    ));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLInputElement>('tbody input')?.click();
    fixture.componentInstance.currentPage.set(2);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedCount()).toBe(1);

    const filter = root.querySelectorAll<HTMLSelectElement>('select')[1];
    filter.value = 'attention';
    filter.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });
});

function months(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr')).map(row => row.cells[1].textContent!.trim());
}

function reading(guid: string, year: number, month: number, amount: number): any {
  return { id: 1, guid, predictorId: 'predictor-a', year, month, amount, notes: '', weatherOverride: false, weatherDataWarning: false };
}
