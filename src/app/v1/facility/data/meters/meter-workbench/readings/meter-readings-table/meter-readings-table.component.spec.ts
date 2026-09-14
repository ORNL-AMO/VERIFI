import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { reading } from '../../../facility-meters.testing';
import { MeterReadingColumn, MeterReadingTableRow, MeterReadingTableView } from '../meter-workbench-readings.models';
import { MeterReadingsTableComponent } from './meter-readings-table.component';

describe('MeterReadingsTableComponent', () => {
  it('groups adjacent columns under their table section headers', () => {
    const fixture = setup(tableView({
      columns: [
        column('readDate', 'Read Date', 'General Information'),
        column('totalEnergyUse', 'Energy Use', 'General Information'),
        column('totalEmissions', 'Total Emissions', 'Emissions'),
        column('charge-a:amount', 'Demand Charge', 'Detailed Charges')
      ],
      rows: [row()]
    }));

    const headings = Array.from(fixture.nativeElement.querySelectorAll('.meter-readings-table__section-heading')) as HTMLTableCellElement[];
    expect(headings.map(heading => heading.textContent?.trim())).toEqual(['General Information', 'Emissions', 'Charges']);
    expect(headings.map(heading => heading.colSpan)).toEqual([2, 1, 1]);
    expect(headings[0].classList).toContain('meter-readings-table__section-heading--general');
    expect(headings[1].classList).toContain('meter-readings-table__section-heading--emissions');
    expect(headings[2].classList).toContain('meter-readings-table__section-heading--charges');
    expect(fixture.nativeElement.querySelectorAll('.meter-readings-table__group-start').length).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('.meter-readings-table__group-end').length).toBe(6);
    expect(fixture.nativeElement.textContent).not.toContain('Actions');
  });

  it('uses a settings slider icon for choosing visible columns', () => {
    const fixture = setup(tableView());
    const chooseColumnsButton = fixture.debugElement.queryAll(By.css('button'))
      .find(button => (button.nativeElement as HTMLButtonElement).textContent?.includes('Choose Columns'));

    expect(chooseColumnsButton?.query(By.css('app-ui-icon')).componentInstance.name).toBe('settingsSliders');
  });

  it('sorts rows by date descending by default and toggles column sort direction', () => {
    const fixture = setup(tableView({
      rows: [
        row('reading-jan', '10', false, 0, 10),
        row('reading-mar', '30', false, 2, 30),
        row('reading-feb', '20', false, 1, 20)
      ]
    }));
    const root = fixture.nativeElement as HTMLElement;

    expect(readDates(root)).toEqual(['Mar 1, 2026', 'Feb 1, 2026', 'Jan 1, 2026']);

    clickButton(root, 'Energy Use');
    fixture.detectChanges();
    expect(energyValues(root)).toEqual(['30', '20', '10']);

    clickButton(root, 'Energy Use');
    fixture.detectChanges();
    expect(energyValues(root)).toEqual(['10', '20', '30']);
  });

  it('filters estimated readings and clears selection when the filter changes', () => {
    const fixture = setup(tableView({
      hasEstimatedReadings: true,
      rows: [
        row('reading-metered', '10'),
        row('reading-estimated', '20', true)
      ]
    }));
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    root.querySelector<HTMLInputElement>('tbody input[type="checkbox"]')?.click();
    fixture.detectChanges();
    expect(component.selectedCount()).toBe(1);

    const filter = Array.from(root.querySelectorAll<HTMLSelectElement>('select'))
      .find(select => select.textContent?.includes('Estimated Readings')) as HTMLSelectElement;
    filter.value = 'estimated';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(readDates(root)).toEqual(['Feb 1, 2026']);
    expect(component.selectedCount()).toBe(0);
  });

  it('resets the current page when the page size changes', () => {
    const fixture = setup(tableView({
      rows: Array.from({ length: 12 }, (_, index) => row(`reading-${index}`, String(index), false, index, index))
    }));
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    component.currentPage.set(2);
    fixture.detectChanges();

    const pageSize = root.querySelector<HTMLSelectElement>('select') as HTMLSelectElement;
    pageSize.value = '25';
    pageSize.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.currentPage()).toBe(1);
    expect(readDates(root).length).toBe(12);
  });

  it('emits selected readings for bulk delete and clears selection', () => {
    const fixture = setup(tableView({
      rows: [
        row('reading-a', '10', false, 0),
        row('reading-b', '20', false, 1)
      ]
    }));
    const component = fixture.componentInstance;
    const emitted: string[][] = [];
    component.bulkDeleteRequested.subscribe(readings => emitted.push(readings.map(reading => reading.guid)));
    const root = fixture.nativeElement as HTMLElement;

    Array.from(root.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'))
      .forEach(checkbox => checkbox.click());
    fixture.detectChanges();
    clickButton(root, 'Delete Selected');
    fixture.detectChanges();

    expect(emitted).toEqual([['reading-b', 'reading-a']]);
    expect(component.selectedCount()).toBe(0);
  });

  it('highlights the hovered column across the section, header, and visible rows', () => {
    const fixture = setup(tableView({
      columns: [
        column('readDate', 'Read Date', 'General Information'),
        column('totalEnergyUse', 'Energy Use', 'General Information'),
        column('charge-a:amount', 'Demand Charge', 'Detailed Charges')
      ],
      rows: [
        row('reading-a', '12'),
        row('reading-b', '34')
      ]
    }));
    const root = fixture.nativeElement as HTMLElement;
    const energyCells = Array.from(root.querySelectorAll<HTMLTableCellElement>('tbody td'))
      .filter(cell => cell.textContent?.trim() === '12' || cell.textContent?.trim() === '34');

    energyCells[0].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const highlightedColumnHeaders = root.querySelectorAll<HTMLTableCellElement>('thead tr:nth-child(2) th.meter-readings-table__column-hover');
    const highlightedBodyCells = root.querySelectorAll<HTMLTableCellElement>('tbody td.meter-readings-table__column-hover');
    const highlightedSectionHeaders = root.querySelectorAll<HTMLTableCellElement>('.meter-readings-table__section-heading.meter-readings-table__column-hover');
    expect(highlightedColumnHeaders.length).toBe(1);
    expect(highlightedColumnHeaders[0].textContent).toContain('Energy Use');
    expect(highlightedBodyCells.length).toBe(2);
    expect(Array.from(highlightedBodyCells).map(cell => cell.textContent?.trim())).toEqual(['12', '34']);
    expect(highlightedSectionHeaders.length).toBe(1);
    expect(highlightedSectionHeaders[0].textContent).toContain('General Information');

    energyCells[0].dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();

    expect(root.querySelectorAll('.meter-readings-table__column-hover').length).toBe(0);
  });

  it('marks estimated rows on the first visible value column and shows the estimated legend', () => {
    const fixture = setup(tableView({
      hasEstimatedReadings: true,
      columns: [
        column('readDate', 'Read Date', 'General Information'),
        column('totalEnergyUse', 'Energy Use', 'General Information'),
        column('totalCost', 'Total Cost', 'General Information')
      ],
      rows: [
        row('reading-estimated', '12', true),
        row('reading-metered', '34', false)
      ]
    }));

    const root = fixture.nativeElement as HTMLElement;
    const rows = root.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows[0].querySelectorAll('.meter-readings-table__estimated').length).toBe(1);
    expect(rows[0].querySelector('td:nth-child(3) .meter-readings-table__estimated')).not.toBeNull();
    expect(rows[1].querySelector('.meter-readings-table__estimated')).toBeNull();
    expect(root.querySelector('.meter-readings-table__estimated-note')?.textContent).toContain('Indicates Estimated Reading');
  });

  it('highlights negative readings and marks the negative value cell', () => {
    const fixture = setup(tableView({
      rows: [
        row('reading-negative', '-5', false, 1, -5, true, { totalEnergyUse: true }),
        row('reading-normal', '34', false, 0)
      ]
    }));

    const root = fixture.nativeElement as HTMLElement;
    const rows = root.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows[0].classList).toContain('meter-readings-table__row--negative');
    expect(rows[0].querySelector('td:nth-child(3) .meter-readings-table__negative')).not.toBeNull();
    expect(rows[0].querySelector('td:nth-child(3)')?.textContent).toContain('-5');
    expect(rows[1].classList).not.toContain('meter-readings-table__row--negative');
  });
});

function setup(view: MeterReadingTableView): ComponentFixture<MeterReadingsTableComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterReadingsTableComponent],
    providers: [
      { provide: CopyTableService, useValue: { copyTable: vi.fn() } }
    ]
  }).createComponent(MeterReadingsTableComponent);
  fixture.componentInstance.view = view;
  fixture.detectChanges();
  return fixture;
}

function tableView(options: {
  columns?: readonly MeterReadingColumn[];
  rows?: readonly MeterReadingTableRow[];
  hasEstimatedReadings?: boolean;
} = {}): MeterReadingTableView {
  return {
    columns: options.columns ?? [
      column('readDate', 'Read Date', 'General Information'),
      column('totalEnergyUse', 'Energy Use', 'General Information'),
      column('totalCost', 'Total Cost', 'General Information')
    ],
    rows: options.rows ?? [row()],
    type: 'electricity',
    hasEstimatedReadings: options.hasEstimatedReadings ?? options.rows?.some(item => item.reading.isEstimated) ?? false
  };
}

function column(id: string, label: string, section: MeterReadingColumn['section']): MeterReadingColumn {
  return {
    id,
    label,
    section,
    align: id === 'readDate' ? 'text' : 'number',
    value: () => undefined
  };
}

function row(
  guid = 'reading-a',
  totalEnergyUse = '12',
  isEstimated = false,
  readDateSort = 1,
  energySort = Number(totalEnergyUse),
  hasNegativeReading = false,
  negativeColumnIds: Readonly<Record<string, true>> = {}
): MeterReadingTableRow {
  return {
    reading: reading({ guid, meterId: 'meter-a', month: readDateSort + 1, year: 2026, isEstimated }),
    values: {
      readDate: new Date(2026, readDateSort, 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      totalEnergyUse,
      totalCost: '$20',
      totalEmissions: '3',
      'charge-a:amount': '$4'
    },
    sortValues: {
      readDate: readDateSort,
      totalEnergyUse: energySort,
      totalCost: 20,
      totalEmissions: 3,
      'charge-a:amount': 4
    },
    hasNegativeReading,
    negativeColumnIds
  };
}

function readDates(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLTableCellElement>('tbody tr td:nth-child(2)'))
    .map(cell => cell.textContent?.trim() ?? '');
}

function energyValues(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLTableCellElement>('tbody tr td:nth-child(3)'))
    .map(cell => cell.textContent?.trim() ?? '');
}

function clickButton(root: HTMLElement, label: string): void {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find(item => item.textContent?.includes(label));
  expect(button).toBeDefined();
  button?.click();
}
