import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import {
  MeterReadingColumn,
  MeterReadingFilterOption,
  MeterReadingSortDirection,
  MeterReadingTableRow,
  MeterReadingTableView,
  MeterReadingsBulkDeleteRequest
} from '../meter-workbench-readings.models';

type MeterReadingSectionTone = 'general' | 'emissions' | 'charges';

interface MeterReadingColumnSectionSpan {
  readonly label: string;
  readonly section: MeterReadingColumn['section'];
  readonly tone: MeterReadingSectionTone;
  readonly colspan: number;
  readonly isHovered: boolean;
}

interface MeterReadingDisplayColumn {
  readonly column: MeterReadingColumn;
  readonly startsSection: boolean;
  readonly endsSection: boolean;
  readonly tone: MeterReadingSectionTone;
  readonly isHovered: boolean;
  readonly showsEstimatedMarker: boolean;
}

@Component({
  selector: 'app-meter-readings-table',
  templateUrl: './meter-readings-table.component.html',
  styleUrls: ['./meter-readings-table.component.css'],
  standalone: true,
  imports: [CommonModule, NgbPaginationModule]
})
export class MeterReadingsTableComponent {
  private static readonly emptyView: MeterReadingTableView = {
    columns: [],
    rows: [],
    type: 'electricity',
    hasEstimatedReadings: false
  };

  private readonly copyTableService = inject(CopyTableService);
  private readonly selectedGuidsState = signal<ReadonlySet<string>>(new Set<string>());
  private readonly viewState = signal<MeterReadingTableView>(MeterReadingsTableComponent.emptyView);

  @Input() set view(value: MeterReadingTableView | undefined) {
    this.viewState.set(value ?? MeterReadingsTableComponent.emptyView);
    this.currentPage.set(1);
    this.selectedGuidsState.set(new Set<string>());
    if (!value?.hasEstimatedReadings) {
      this.filterOption.set('all');
    }
    if (!value?.columns.some(column => column.id === this.sortColumnId())) {
      this.sortColumnId.set('readDate');
      this.sortDirection.set('desc');
    }
  }
  @Input() canAct = true;
  @Input() isElectron = false;
  @Input() isDataOutdated = false;

  @Output() chooseColumnsRequested = new EventEmitter<void>();
  @Output() addBillRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<IdbUtilityMeterData>();
  @Output() deleteRequested = new EventEmitter<IdbUtilityMeterData>();
  @Output() bulkDeleteRequested = new EventEmitter<MeterReadingsBulkDeleteRequest>();
  @Output() viewBillRequested = new EventEmitter<IdbUtilityMeterData>();

  @ViewChild('meterTable', { static: false }) meterTable?: ElementRef<HTMLTableElement>;

  readonly currentPage = signal(1);
  readonly copyingTable = signal(false);
  readonly filterOption = signal<MeterReadingFilterOption>('all');
  readonly hoveredColumnId = signal<string | undefined>(undefined);
  readonly pageSize = signal(10);
  readonly sortColumnId = signal('readDate');
  readonly sortDirection = signal<MeterReadingSortDirection>('desc');
  readonly viewModel = this.viewState.asReadonly();
  readonly visibleColumns = computed(() => this.viewModel().columns);
  readonly rowItems = computed(() => this.viewModel().rows);
  readonly activePageSize = this.pageSize.asReadonly();
  readonly hasEstimatedRows = computed(() => this.viewModel().hasEstimatedReadings);
  readonly filteredRows = computed(() => {
    const rows = this.rowItems();
    return this.filterOption() === 'estimated'
      ? rows.filter(row => row.reading.isEstimated)
      : rows;
  });
  readonly sortedRows = computed(() => {
    const sortColumnId = this.sortColumnId();
    const sortDirection = this.sortDirection();
    return [...this.filteredRows()].sort((first, second) => compareSortValues(
      first.sortValues[sortColumnId],
      second.sortValues[sortColumnId],
      sortDirection
    ));
  });
  readonly hoveredSection = computed(() => {
    const hoveredColumnId = this.hoveredColumnId();
    return this.visibleColumns().find(column => column.id === hoveredColumnId)?.section;
  });
  readonly displayColumns = computed<readonly MeterReadingDisplayColumn[]>(() => {
    const columns = this.visibleColumns();
    const hoveredColumnId = this.hoveredColumnId();
    const estimatedMarkerColumnId = columns.find(column => column.id !== 'readDate')?.id;
    return columns.map((column, index) => ({
      column,
      startsSection: index === 0 || columns[index - 1].section !== column.section,
      endsSection: index === columns.length - 1 || columns[index + 1].section !== column.section,
      tone: sectionTone(column.section),
      isHovered: column.id === hoveredColumnId,
      showsEstimatedMarker: column.id === estimatedMarkerColumnId
    }));
  });
  readonly columnSectionSpans = computed<readonly MeterReadingColumnSectionSpan[]>(() => {
    const hoveredSection = this.hoveredSection();
    return this.visibleColumns().reduce<MeterReadingColumnSectionSpan[]>((sections, column) => {
      const section = column.section;
      const current = sections[sections.length - 1];
      if (current?.section === section) {
        sections[sections.length - 1] = {
          ...current,
          colspan: current.colspan + 1,
          isHovered: current.isHovered || section === hoveredSection
        };
      } else {
        sections.push({
          section,
          label: sectionLabel(section),
          tone: sectionTone(section),
          colspan: 1,
          isHovered: section === hoveredSection
        });
      }
      return sections;
    }, []);
  });
  readonly displayedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.activePageSize();
    return this.sortedRows().slice(start, start + this.activePageSize());
  });
  readonly allVisibleChecked = computed(() => {
    const visibleRows = this.displayedRows();
    const selected = this.selectedGuidsState();
    return visibleRows.length > 0 && visibleRows.every(row => selected.has(row.reading.guid));
  });
  readonly selectedReadings = computed(() => {
    const selected = this.selectedGuidsState();
    return this.sortedRows()
      .filter(row => selected.has(row.reading.guid))
      .map(row => row.reading);
  });
  readonly selectedCount = computed(() => this.selectedReadings().length);

  requestSort(columnId: string): void {
    if (this.sortColumnId() === columnId) {
      this.sortDirection.update(direction => direction === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumnId.set(columnId);
      this.sortDirection.set('desc');
    }
    this.currentPage.set(1);
  }

  setColumnHover(columnId: string | undefined): void {
    this.hoveredColumnId.set(columnId);
  }

  toggleVisible(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedGuidsState());
    this.displayedRows().forEach(row => {
      if (checked) {
        next.add(row.reading.guid);
      } else {
        next.delete(row.reading.guid);
      }
    });
    this.selectedGuidsState.set(next);
  }

  toggleRow(guid: string): void {
    const next = new Set(this.selectedGuidsState());
    next.has(guid) ? next.delete(guid) : next.add(guid);
    this.selectedGuidsState.set(next);
  }

  isChecked(guid: string): boolean {
    return this.selectedGuidsState().has(guid);
  }

  setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
  }

  setFilterOption(event: Event): void {
    this.filterOption.set((event.target as HTMLSelectElement).value as MeterReadingFilterOption);
    this.currentPage.set(1);
    this.selectedGuidsState.set(new Set<string>());
  }

  requestBulkDelete(): void {
    const readings = this.selectedReadings();
    if (this.canAct && readings.length > 0) {
      this.bulkDeleteRequested.emit(readings);
      this.selectedGuidsState.set(new Set<string>());
    }
  }

  copyTable(): void {
    if (!this.meterTable) {
      return;
    }
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable.set(false);
    }, 200);
  }
}

function sectionLabel(section: MeterReadingColumn['section']): string {
  return section === 'Detailed Charges' ? 'Charges' : section;
}

function sectionTone(section: MeterReadingColumn['section']): MeterReadingSectionTone {
  if (section === 'Emissions') {
    return 'emissions';
  }
  if (section === 'Detailed Charges') {
    return 'charges';
  }
  return 'general';
}

function compareSortValues(
  first: number | string | undefined | null,
  second: number | string | undefined | null,
  direction: MeterReadingSortDirection
): number {
  const firstValue = first ?? '';
  const secondValue = second ?? '';
  const result = typeof firstValue === 'number' && typeof secondValue === 'number'
    ? firstValue - secondValue
    : String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true });
  return direction === 'asc' ? result : -result;
}
