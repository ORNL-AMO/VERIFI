import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import {
  filterP1MeterRows,
  P1MeterFilterState,
  P1MeterGroupFilter,
  P1MeterRow,
  P1MeterStatusFilter
} from '../facility-meters-workbench.helpers';

@Component({
  selector: 'app-p1-facility-meter-index',
  templateUrl: './meter-index.component.html',
  styleUrls: ['./meter-index.component.css'],
  standalone: false
})
export class P1FacilityMeterIndexComponent {
  @Input({ required: true }) rows: P1MeterRow[] = [];
  @Input({ required: true }) groups: IdbUtilityMeterGroup[] = [];
  @Input() selectedMeterGuid?: string;
  @Output() selectMeter = new EventEmitter<IdbUtilityMeter>();

  readonly sources = AllSources;
  readonly search = signal('');
  readonly source = signal<'all' | MeterSource>('all');
  readonly status = signal<P1MeterStatusFilter>('all');
  readonly group = signal<P1MeterGroupFilter>('all');

  setSearch(value: string): void {
    this.search.set(value);
  }

  filteredRows(): P1MeterRow[] {
    return filterP1MeterRows(this.rows, this.filters());
  }

  setSource(value: string): void {
    this.source.set(value as 'all' | MeterSource);
  }

  setStatus(value: string): void {
    this.status.set(value as P1MeterStatusFilter);
  }

  setGroup(value: string): void {
    this.group.set(value as P1MeterGroupFilter);
  }

  statusLabel(row: P1MeterRow): string {
    if (row.readingCount === 0) {
      return 'No data';
    }
    return row.status?.status || 'good';
  }

  private filters(): P1MeterFilterState {
    return {
      search: this.search(),
      source: this.source(),
      status: this.status(),
      group: this.group()
    };
  }
}
