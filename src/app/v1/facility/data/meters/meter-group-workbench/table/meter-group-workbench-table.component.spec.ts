import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { vi } from 'vitest';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { MeterGroupResultRow, MeterGroupResultsView } from '../../facility-meters.models';
import { group } from '../../facility-meters.testing';
import { MeterGroupWorkbenchTableComponent } from './meter-group-workbench-table.component';

describe('MeterGroupWorkbenchTableComponent', () => {
  it('clamps the current page when switched results have fewer rows', () => {
    const results = signal(resultsView({ monthlyRows: monthlyRows(25) }));
    const fixture = setup({ results });
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.currentPage.set(3);
    fixture.detectChanges();
    expect(visiblePeriods(root)).toHaveLength(5);

    results.set(resultsView({ monthlyRows: monthlyRows(2) }));
    fixture.detectChanges();

    expect(component.currentPage()).toBe(1);
    expect(visiblePeriods(root)).toEqual(['Feb 2026', 'Jan 2026']);
    expect(root.textContent).not.toContain('No monthly results are available');
  });

  it('sorts, resets the page size, and copies the rendered table', () => {
    vi.useFakeTimers();
    const copyTable = vi.fn();
    const fixture = setup({
      results: signal(resultsView({
        monthlyRows: [
          row(2026, 0, 30, 30),
          row(2026, 1, 10, 10),
          row(2026, 2, 20, 20)
        ]
      })),
      copyTable
    });
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(visiblePeriods(root)).toEqual(['Mar 2026', 'Feb 2026', 'Jan 2026']);

    clickButton(root, 'Total Energy');
    fixture.detectChanges();
    expect(utilityValues(root)).toEqual(['30', '20', '10']);

    clickButton(root, 'Total Energy');
    fixture.detectChanges();
    expect(utilityValues(root)).toEqual(['10', '20', '30']);

    component.currentPage.set(2);
    const pageSize = root.querySelector<HTMLSelectElement>('select') as HTMLSelectElement;
    pageSize.value = '25';
    pageSize.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);

    clickButton(root, 'Copy Table');
    vi.advanceTimersByTime(200);
    expect(copyTable).toHaveBeenCalledWith(component.groupResultsTable);
    vi.useRealTimers();
  });
});

function setup(options: {
  results?: ReturnType<typeof signal<MeterGroupResultsView>>;
  copyTable?: ReturnType<typeof vi.fn>;
  period?: 'monthly' | 'yearly';
} = {}): ComponentFixture<MeterGroupWorkbenchTableComponent> {
  TestBed.configureTestingModule({
    declarations: [MeterGroupWorkbenchTableComponent],
    imports: [CommonModule, IconComponent, NgbPaginationModule],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          selectedMeterGroupResults: options.results ?? signal(resultsView()),
          calendarizationState: signal('ready')
        }
      },
      { provide: CopyTableService, useValue: { copyTable: options.copyTable ?? vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { meterGroupPeriod: options.period ?? 'monthly' } } } }
    ]
  });
  const fixture = TestBed.createComponent(MeterGroupWorkbenchTableComponent);
  fixture.detectChanges();
  return fixture;
}

function resultsView(options: Partial<MeterGroupResultsView> = {}): MeterGroupResultsView {
  const selectedGroup = group({ guid: 'group-energy', name: 'Energy Group', groupType: 'Energy' });
  return {
    group: selectedGroup,
    assignedMeters: [],
    calendarizedMeters: [],
    monthlyRows: monthlyRows(3),
    yearlyRows: [],
    showEnergyUse: true,
    showConsumption: false,
    showCost: true,
    utilityLabel: 'Total Energy',
    utilityUnit: 'MMBtu',
    summary: {
      assignedMeterCount: 0,
      firstDataLabel: 'Jan 2026',
      latestDataLabel: 'Mar 2026',
      utilityTotalLabel: '60',
      utilityTotalValue: 60,
      costTotalLabel: '$60.00',
      costTotalValue: 60
    },
    usageFacts: { facts: [] },
    ...options
  };
}

function monthlyRows(count: number): MeterGroupResultRow[] {
  return Array.from({ length: count }, (_, index) => row(2026, index, index + 1, index + 1));
}

function row(year: number, monthIndex: number, energyUse: number, energyCost: number): MeterGroupResultRow {
  const date = new Date(year, monthIndex, 1);
  return {
    periodKey: `${year}-${monthIndex}`,
    periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    sortValue: date.getTime(),
    fiscalYear: year,
    energyUse,
    energyConsumption: 0,
    energyCost
  };
}

function visiblePeriods(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLTableCellElement>('tbody tr td:first-child'))
    .map(cell => cell.textContent?.trim() ?? '');
}

function utilityValues(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLTableCellElement>('tbody tr td:nth-child(2)'))
    .map(cell => cell.textContent?.trim() ?? '');
}

function clickButton(root: HTMLElement, label: string): void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
  buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label))?.click();
}
