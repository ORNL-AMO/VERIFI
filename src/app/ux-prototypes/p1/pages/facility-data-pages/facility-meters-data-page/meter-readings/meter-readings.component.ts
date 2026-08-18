import { Component, EventEmitter, Input, OnChanges, Output, computed, signal } from '@angular/core';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { readingDateValue } from '../facility-meters-workbench.helpers';

@Component({
  selector: 'app-p1-facility-meter-readings',
  templateUrl: './meter-readings.component.html',
  styleUrls: ['./meter-readings.component.css'],
  standalone: false
})
export class P1FacilityMeterReadingsComponent implements OnChanges {
  @Input({ required: true }) meter: IdbUtilityMeter;
  @Input({ required: true }) meterData: IdbUtilityMeterData[] = [];
  @Input() meterStatus?: MeterStatusCheck;
  @Input() canWrite = false;
  @Output() addBill = new EventEmitter<void>();
  @Output() editBill = new EventEmitter<IdbUtilityMeterData>();
  @Output() deleteBill = new EventEmitter<IdbUtilityMeterData>();
  @Output() bulkDelete = new EventEmitter<Set<string>>();
  @Output() fillMissing = new EventEmitter<void>();

  readonly search = signal('');
  readonly showEstimatedOnly = signal(false);
  readonly checked = signal<Set<string>>(new Set<string>());
  private readonly meterDataVersion = signal(0);

  readonly filteredData = computed(() => {
    this.meterDataVersion();
    const search = this.search().trim().toLowerCase();
    return [...this.meterData]
      .filter(data => !this.showEstimatedOnly() || data.isEstimated)
      .filter(data => !search || `${data.month}/${data.day}/${data.year}`.includes(search))
      .sort((first, second) => readingDateValue(second) - readingDateValue(first));
  });

  ngOnChanges(): void {
    this.meterDataVersion.update(version => version + 1);
    this.pruneChecked();
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setEstimatedOnly(checked: boolean): void {
    this.showEstimatedOnly.set(checked);
  }

  toggleChecked(guid: string, checked: boolean): void {
    const next = new Set(this.checked());
    if (checked) {
      next.add(guid);
    } else {
      next.delete(guid);
    }
    this.checked.set(next);
  }

  clearChecked(): void {
    this.checked.set(new Set<string>());
  }

  emitBulkDelete(): void {
    if (this.checked().size) {
      this.bulkDelete.emit(new Set(this.checked()));
      this.clearChecked();
    }
  }

  totalEnergy(): number {
    return this.meterData.reduce((sum, data) => sum + (data.totalEnergyUse || 0), 0);
  }

  totalCost(): number {
    return this.meterData.reduce((sum, data) => sum + (data.totalCost || 0), 0);
  }

  private pruneChecked(): void {
    const visibleGuids = new Set(this.meterData.map(data => data.guid));
    const next = new Set([...this.checked()].filter(guid => visibleGuids.has(guid)));
    if (next.size !== this.checked().size) {
      this.checked.set(next);
    }
  }
}
