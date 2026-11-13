import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { SummaryTableComponent } from './summary-table.component';

describe('Group Summary equipment table', () => {
  it('defaults to latest-year consumption order, retains equipment links and totals, and expands chronological history', () => {
    const setup = resultsTestContext([resultsEquipment('older', 2022, 100), resultsEquipment('newer', 2025, 50)]);
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(SummaryTableComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.columns().map(column => column.year)).toEqual([2025]);
    expect(component.rows().map(row => row.entry.guid)).toEqual(['older', 'newer']);
    expect(fixture.nativeElement.querySelector('tbody a').getAttribute('href')).toContain('/items/older');
    expect(fixture.nativeElement.querySelector('tfoot').textContent).toContain('150');
    expect(component.columns().map(column => column.year)).toEqual([2025]);
    component.results.historyControl.setValue(true); fixture.detectChanges();
    expect(component.columns().map(column => column.year)).toEqual([2022, 2023, 2024, 2025]);
    expect(fixture.nativeElement.querySelectorAll('thead tr:last-child th')).toHaveLength(8);
    expect(component.rows().find(row => row.entry.guid === 'newer')?.cells[0].item?.amount).toBeNull();
    component.order('amount', 2025); fixture.detectChanges();
    expect(component.rows().map(row => row.entry.guid)).toEqual(['newer', 'older']);
  });

  it('shows every member without pagination and preserves zero values and unavailable percentage shares', () => {
    const setup = resultsTestContext(Array.from({ length: 30 }, (_, index) => resultsEquipment(`zero-${index}`, 2024, 0)));
    const before = JSON.stringify(setup.store.snapshot());
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(SummaryTableComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(30);
    expect(fixture.componentInstance.rows().every(row => row.cells[0].item?.amount === 0 && row.cells[0].item?.percent === null)).toBe(true);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Unavailable');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(JSON.stringify(setup.store.snapshot())).toBe(before);
  });
});
